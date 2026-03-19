import { GoogleGenerativeAI } from "@google/generative-ai";
import { GoogleGenAI, Modality } from "@google/genai";
import type { LiveConnectConfig, LiveServerMessage } from "@google/genai";
import { AIConfig } from "./types";
import type { ChatMessage } from "./ai-models";
import {
    AI_TIMEOUT_MS,
    MultimodalPart,
    resolveModel,
    TokenUsage,
    withTimeout,
} from "./ai-provider-shared";

export async function geminiGenerateContent(
    config: AIConfig,
    prompt: string,
    systemInstruction?: string
): Promise<{ text: string; tokens?: TokenUsage }> {
    const genAI = new GoogleGenerativeAI(config.apiKey);
    const modelId = resolveModel(config);
    const model = genAI.getGenerativeModel({
        model: modelId,
        ...(systemInstruction && { systemInstruction }),
    });

    const result = await withTimeout(model.generateContent(prompt), AI_TIMEOUT_MS);
    const response = result.response;
    const meta = response.usageMetadata;
    return {
        text: response.text(),
        tokens: meta ? { inputTokens: meta.promptTokenCount || 0, outputTokens: meta.candidatesTokenCount || 0, totalTokens: meta.totalTokenCount || 0 } : undefined,
    };
}

export async function geminiGenerateContentWithParts(
    config: AIConfig,
    parts: MultimodalPart[],
    systemInstruction?: string
): Promise<{ text: string; tokens?: TokenUsage }> {
    const genAI = new GoogleGenerativeAI(config.apiKey);
    const modelId = resolveModel(config);
    const model = genAI.getGenerativeModel({
        model: modelId,
        ...(systemInstruction && { systemInstruction }),
    });
    const normalizedParts = parts.map((part) => typeof part === "string" ? { text: part } : part);

    const result = await withTimeout(model.generateContent({ contents: [{ role: "user", parts: normalizedParts }] }), AI_TIMEOUT_MS);
    const response = result.response;
    const meta = response.usageMetadata;
    return {
        text: response.text(),
        tokens: meta ? { inputTokens: meta.promptTokenCount || 0, outputTokens: meta.candidatesTokenCount || 0, totalTokens: meta.totalTokenCount || 0 } : undefined,
    };
}

export async function geminiChat(
    config: AIConfig,
    history: ChatMessage[],
    systemInstruction: string,
    userMessage: string
): Promise<{ text: string; tokens?: TokenUsage }> {
    const genAI = new GoogleGenerativeAI(config.apiKey);
    const modelId = resolveModel(config);
    const model = genAI.getGenerativeModel({
        model: modelId,
        systemInstruction,
    });
    const chat = model.startChat({
        history: history.map((message) => ({
            role: message.role === "model" ? "model" : "user",
            parts: [{ text: message.content }],
        })),
    });
    const result = await withTimeout(chat.sendMessage(userMessage), AI_TIMEOUT_MS);
    const meta = result.response.usageMetadata;
    return {
        text: result.response.text(),
        tokens: meta ? { inputTokens: meta.promptTokenCount || 0, outputTokens: meta.candidatesTokenCount || 0, totalTokens: meta.totalTokenCount || 0 } : undefined,
    };
}

export async function liveGenerateContent(
    config: AIConfig,
    prompt: string,
    systemInstruction?: string
): Promise<string> {
    const modelId = resolveModel(config);

    let fullPrompt = "";
    if (systemInstruction) {
        fullPrompt += systemInstruction.trim() + "\n\n---\n\n";
    }
    fullPrompt += prompt.trim();
    console.log("[Gemini Live] Prompt length:", fullPrompt.length);

    const ai = new GoogleGenAI({ apiKey: config.apiKey });
    const messageQueue: LiveServerMessage[] = [];

    const waitMessage = (): Promise<LiveServerMessage> => {
        return new Promise((resolve) => {
            const check = () => {
                const message = messageQueue.shift();
                if (message) resolve(message);
                else setTimeout(check, 100);
            };
            check();
        });
    };

    console.log("[Gemini Live] Connecting via SDK...");
    const liveConfig: LiveConnectConfig = {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
            voiceConfig: {
                prebuiltVoiceConfig: { voiceName: "Zephyr" }
            }
        },
        outputAudioTranscription: {},
    };
    const session = await ai.live.connect({
        model: `models/${modelId}`,
        config: liveConfig,
        callbacks: {
            onopen: () => console.log("[Gemini Live] Connected"),
            onmessage: (message: LiveServerMessage) => messageQueue.push(message),
            onerror: (event) => console.error("[Gemini Live] Error:", event?.message || event),
            onclose: (event) => console.log("[Gemini Live] Closed:", event?.reason || ""),
        },
    });

    console.log("[Gemini Live] Sending prompt...");
    session.sendClientContent({ turns: [fullPrompt] });

    let transcriptText = "";
    let thoughtText = "";
    let done = false;

    const timeoutId = setTimeout(() => {
        console.error("[Gemini Live] Timeout after 60s");
        done = true;
    }, 60000);

    while (!done) {
        const message = await waitMessage();

        const transcriptChunk = message.serverContent?.outputTranscription?.text;
        if (transcriptChunk) {
            transcriptText += transcriptChunk;
        }

        if (message.serverContent?.modelTurn?.parts) {
            for (const part of message.serverContent.modelTurn.parts) {
                if (part.text) {
                    thoughtText += part.text;
                }
            }
        }

        if (message.serverContent?.turnComplete) {
            done = true;
        }
    }

    clearTimeout(timeoutId);

    const drainEnd = Date.now() + 2000;
    while (Date.now() < drainEnd) {
        const remaining = messageQueue.shift();
        if (!remaining) {
            await new Promise((resolve) => setTimeout(resolve, 100));
            continue;
        }
        const transcriptChunk = remaining.serverContent?.outputTranscription?.text;
        if (transcriptChunk) {
            transcriptText += transcriptChunk;
        }
    }

    session.close();

    console.log("[Gemini Live] Done. Transcript:", transcriptText.length, "chars, Thought:", thoughtText.length, "chars");

    if (transcriptText.trim()) {
        return transcriptText.trim();
    }

    const cleaned = thoughtText
        .replace(/\*\*[A-Z][^*]*\*\*\s*\n\n/g, "")
        .trim();

    return cleaned || thoughtText.trim();
}

export async function liveChat(
    config: AIConfig,
    history: ChatMessage[],
    systemInstruction: string,
    userMessage: string
): Promise<string> {
    let contextPrompt = systemInstruction.trim() + "\n\n---\n\n";

    if (history.length > 0) {
        contextPrompt += "Conversation so far:\n";
        for (const message of history) {
            contextPrompt += `${message.role === "user" ? "User" : "Assistant"}: ${message.content}\n\n`;
        }
    }

    contextPrompt += `User: ${userMessage}`;
    return liveGenerateContent(config, contextPrompt);
}

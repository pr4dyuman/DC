"use server";

import { GoogleGenerativeAI } from "@google/generative-ai";
import { GoogleGenAI, Modality } from "@google/genai";
import type { LiveServerMessage } from "@google/genai";
import { AIConfig, AIProvider } from "./types";
import type { ChatMessage } from "./ai-models";

// =============================================================================
// SINGULARITY — Unified AI Provider Abstraction
// All AI requests are server-side only. API keys never reach the client.
// =============================================================================

// Token usage metadata returned from AI calls
export type TokenUsage = {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
};

// Timeout for AI API calls to prevent indefinite hangs (BUG-063)
const AI_TIMEOUT_MS = 60_000; // 60 seconds

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
    return Promise.race([
        promise,
        new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error(`AI request timed out after ${ms / 1000}s`)), ms)
        ),
    ]);
}

// Resolve the model ID from the config (handles default fallback)
function resolveModel(config: AIConfig): string {
    return config.model || "gemini-2.5-flash-lite";
}

// Provider-specific base URLs for OpenAI-compatible APIs
const OPENAI_COMPAT_BASE_URLS: Record<string, string> = {
    openai: "https://api.openai.com/v1",
    nvidia: "https://integrate.api.nvidia.com/v1",
    github: "https://models.inference.ai.azure.com",
};

// =============================================================================
// GEMINI TEXT API ADAPTER (Standard REST — for text models)
// =============================================================================

async function geminiGenerateContent(
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

async function geminiGenerateContentWithParts(
    config: AIConfig,
    parts: any[],
    systemInstruction?: string
): Promise<{ text: string; tokens?: TokenUsage }> {
    const genAI = new GoogleGenerativeAI(config.apiKey);
    const modelId = resolveModel(config);
    const model = genAI.getGenerativeModel({
        model: modelId,
        ...(systemInstruction && { systemInstruction }),
    });

    const result = await withTimeout(model.generateContent({ contents: [{ role: "user", parts }] }), AI_TIMEOUT_MS);
    const response = result.response;
    const meta = response.usageMetadata;
    return {
        text: response.text(),
        tokens: meta ? { inputTokens: meta.promptTokenCount || 0, outputTokens: meta.candidatesTokenCount || 0, totalTokens: meta.totalTokenCount || 0 } : undefined,
    };
}

async function geminiChat(
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
        history: history.map(msg => ({
            role: msg.role === "model" ? "model" : "user",
            parts: [{ text: msg.content }],
        })),
    });
    const result = await withTimeout(chat.sendMessage(userMessage), AI_TIMEOUT_MS);
    const meta = result.response.usageMetadata;
    return {
        text: result.response.text(),
        tokens: meta ? { inputTokens: meta.promptTokenCount || 0, outputTokens: meta.candidatesTokenCount || 0, totalTokens: meta.totalTokenCount || 0 } : undefined,
    };
}

// =============================================================================
// GEMINI LIVE API ADAPTER (for native-audio models — unlimited free quota)
// Uses @google/genai SDK with ai.live.connect() matching official Google docs.
// The model generates audio + thinking; ALL text parts are thought-marked.
// The clean text shown in Google Playground IS the thought text with headers stripped.
// =============================================================================

function isLiveModel(modelId: string): boolean {
    return modelId.includes('native-audio');
}

/**
 * Generate content using the Gemini Live API (SDK-based).
 * Uses ai.live.connect() with message queue polling — matching official Google docs.
 * ALL text from this model is thought-marked; we clean thinking headers to get
 * the same clean text that Google Playground shows.
 */
async function liveGenerateContent(
    config: AIConfig,
    prompt: string,
    systemInstruction?: string
): Promise<string> {
    const modelId = resolveModel(config);

    // Merge system instruction into the prompt for full context
    let fullPrompt = '';
    if (systemInstruction) {
        fullPrompt += systemInstruction.trim() + '\n\n---\n\n';
    }
    fullPrompt += prompt.trim();
    console.log('[Gemini Live] Prompt length:', fullPrompt.length);

    const ai = new GoogleGenAI({ apiKey: config.apiKey });
    const messageQueue: LiveServerMessage[] = [];

    // Wait for next message (polling pattern from official Google docs)
    const waitMessage = (): Promise<LiveServerMessage> => {
        return new Promise((resolve) => {
            const check = () => {
                const msg = messageQueue.shift();
                if (msg) resolve(msg);
                else setTimeout(check, 100);
            };
            check();
        });
    };

    console.log('[Gemini Live] Connecting via SDK...');
    const session = await ai.live.connect({
        model: `models/${modelId}`,
        config: {
            responseModalities: [Modality.AUDIO],
            speechConfig: {
                voiceConfig: {
                    prebuiltVoiceConfig: { voiceName: 'Zephyr' }
                }
            },
            // Captures what the model SPEAKS (the actual response, not thought)
            outputAudioTranscription: {},
        } as any,
        callbacks: {
            onopen: () => console.log('[Gemini Live] Connected'),
            onmessage: (message: LiveServerMessage) => messageQueue.push(message),
            onerror: (e: any) => console.error('[Gemini Live] Error:', e?.message || e),
            onclose: (e: any) => console.log('[Gemini Live] Closed:', e?.reason || ''),
        },
    });

    // Send prompt using the SDK's sendClientContent (matches official docs)
    console.log('[Gemini Live] Sending prompt...');
    session.sendClientContent({ turns: [fullPrompt] });

    // Collect BOTH transcript (priority) and thought text (fallback)
    let transcriptText = '';
    let thoughtText = '';
    let done = false;

    const timeoutId = setTimeout(() => {
        console.error('[Gemini Live] Timeout after 60s');
        done = true;
    }, 60000);

    while (!done) {
        const message = await waitMessage();

        // Collect audio transcript (the ACTUAL spoken response)
        if ((message.serverContent as any)?.outputTranscription?.text) {
            transcriptText += (message.serverContent as any).outputTranscription.text;
        }

        // Collect thought text as fallback
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

    // Drain late transcript chunks (can arrive after turnComplete)
    const drainEnd = Date.now() + 2000;
    while (Date.now() < drainEnd) {
        const remaining = messageQueue.shift();
        if (!remaining) {
            await new Promise(r => setTimeout(r, 100));
            continue;
        }
        if ((remaining.serverContent as any)?.outputTranscription?.text) {
            transcriptText += (remaining.serverContent as any).outputTranscription.text;
        }
    }

    session.close();

    console.log('[Gemini Live] Done. Transcript:', transcriptText.length, 'chars, Thought:', thoughtText.length, 'chars');

    // Priority: transcript > cleaned thought
    if (transcriptText.trim()) {
        return transcriptText.trim();
    }

    // Fallback to cleaned thought text
    const cleaned = thoughtText
        .replace(/\*\*[A-Z][^*]*\*\*\s*\n\n/g, '')
        .trim();

    return cleaned || thoughtText.trim();
}

async function liveChat(
    config: AIConfig,
    history: ChatMessage[],
    systemInstruction: string,
    userMessage: string
): Promise<string> {
    // Build combined prompt with full context for the Live API
    let contextPrompt = systemInstruction.trim() + '\n\n---\n\n';

    if (history.length > 0) {
        contextPrompt += 'Conversation so far:\n';
        for (const msg of history) {
            contextPrompt += `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}\n\n`;
        }
    }

    contextPrompt += `User: ${userMessage}`;
    return liveGenerateContent(config, contextPrompt);
}

// =============================================================================
// OPENAI-COMPATIBLE ADAPTER (OpenAI, NVIDIA NIM, GitHub Models)
// All three use the same /v1/chat/completions format
// =============================================================================

async function openaiCompatGenerateContent(
    config: AIConfig,
    prompt: string,
    systemInstruction?: string
): Promise<{ text: string; tokens?: TokenUsage }> {
    const baseUrl = OPENAI_COMPAT_BASE_URLS[config.provider];
    if (!baseUrl) throw new Error(`Unknown provider: ${config.provider}`);

    const modelId = resolveModel(config);

    const messages: { role: string; content: string }[] = [];
    if (systemInstruction) {
        messages.push({ role: "system", content: systemInstruction });
    }
    messages.push({ role: "user", content: prompt });

    const response = await withTimeout(fetch(`${baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${config.apiKey}`,
        },
        body: JSON.stringify({
            model: modelId,
            messages,
            max_tokens: 4096,
        }),
    }), AI_TIMEOUT_MS);

    if (!response.ok) {
        const errorBody = await response.text().catch(() => "Unknown error");
        throw new Error(
            `AI Provider Error (${config.provider}): ${response.status} — ${errorBody}`
        );
    }

    const data = await response.json();
    const usage = data.usage;
    return {
        text: data.choices?.[0]?.message?.content || "",
        tokens: usage ? { inputTokens: usage.prompt_tokens || 0, outputTokens: usage.completion_tokens || 0, totalTokens: usage.total_tokens || 0 } : undefined,
    };
}

async function openaiCompatChat(
    config: AIConfig,
    history: ChatMessage[],
    systemInstruction: string,
    userMessage: string
): Promise<{ text: string; tokens?: TokenUsage }> {
    const baseUrl = OPENAI_COMPAT_BASE_URLS[config.provider];
    if (!baseUrl) throw new Error(`Unknown provider: ${config.provider}`);

    const modelId = resolveModel(config);

    const messages: { role: string; content: string }[] = [
        { role: "system", content: systemInstruction },
    ];

    // Convert history
    for (const msg of history) {
        messages.push({
            role: msg.role === "model" ? "assistant" : "user",
            content: msg.content,
        });
    }

    messages.push({ role: "user", content: userMessage });

    const response = await withTimeout(fetch(`${baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${config.apiKey}`,
        },
        body: JSON.stringify({
            model: modelId,
            messages,
            max_tokens: 4096,
        }),
    }), AI_TIMEOUT_MS);

    if (!response.ok) {
        const errorBody = await response.text().catch(() => "Unknown error");
        throw new Error(
            `AI Provider Error (${config.provider}): ${response.status} — ${errorBody}`
        );
    }

    const data = await response.json();
    const usage = data.usage;
    return {
        text: data.choices?.[0]?.message?.content || "",
        tokens: usage ? { inputTokens: usage.prompt_tokens || 0, outputTokens: usage.completion_tokens || 0, totalTokens: usage.total_tokens || 0 } : undefined,
    };
}

// =============================================================================
// PUBLIC API — Unified interface used by server actions
// =============================================================================

/**
 * Generate content using the configured AI provider.
 * Returns { text, tokens } where tokens may be undefined for Live API models.
 */
export async function generateContent(
    config: AIConfig,
    prompt: string,
    systemInstruction?: string
): Promise<{ text: string; tokens?: TokenUsage }> {
    if (config.provider === "gemini") {
        const modelId = resolveModel(config);
        if (isLiveModel(modelId)) {
            return { text: await liveGenerateContent(config, prompt, systemInstruction) };
        }
        return geminiGenerateContent(config, prompt, systemInstruction);
    }
    return openaiCompatGenerateContent(config, prompt, systemInstruction);
}

/**
 * Generate content with multimodal parts (text + images).
 * Returns { text, tokens } where tokens may be undefined for Live/OpenAI providers.
 */
export async function generateContentWithParts(
    config: AIConfig,
    parts: any[],
    systemInstruction?: string
): Promise<{ text: string; tokens?: TokenUsage }> {
    if (config.provider === "gemini") {
        const modelId = resolveModel(config);
        if (isLiveModel(modelId)) {
            const textContent = parts
                .filter((p: any) => typeof p === 'string' || p.text)
                .map((p: any) => (typeof p === 'string' ? p : p.text))
                .join('\n');
            return { text: await liveGenerateContent(config, textContent, systemInstruction) };
        }
        return geminiGenerateContentWithParts(config, parts, systemInstruction);
    }
    const textParts = parts
        .filter((p: any) => typeof p === "string" || p.text)
        .map((p: any) => (typeof p === "string" ? p : p.text))
        .join("\n");
    return openaiCompatGenerateContent(config, textParts, systemInstruction);
}

/**
 * Chat with AI using conversation history.
 * Returns { text, tokens } where tokens may be undefined for Live API models.
 */
export async function generateContentWithChat(
    config: AIConfig,
    history: ChatMessage[],
    systemInstruction: string,
    userMessage: string
): Promise<{ text: string; tokens?: TokenUsage }> {
    if (config.provider === "gemini") {
        const modelId = resolveModel(config);
        if (isLiveModel(modelId)) {
            return { text: await liveChat(config, history, systemInstruction, userMessage) };
        }
        return geminiChat(config, history, systemInstruction, userMessage);
    }
    return openaiCompatChat(config, history, systemInstruction, userMessage);
}

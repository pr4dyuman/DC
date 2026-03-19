import "server-only";

import type { AIConfig } from "../types";
import { generateContent } from "../ai-provider";
import { resolveModel } from "../ai-provider-shared";
import { logAIUsage } from "../ai-usage";
import { getErrorMessage } from "./shared";

type LiveMessage = {
    serverContent?: {
        outputTranscription?: {
            text?: string;
        };
        modelTurn?: {
            parts?: Array<{ text?: string }>;
        };
        turnComplete?: boolean;
    };
};

export async function singularityChatImpl(
    aiConfig: AIConfig,
    agencyId: string | undefined,
    userId: string,
    history: Array<{ role: "user" | "model"; content: string }>,
    userMessage: string
): Promise<{ response: string; thinking: string }> {
    let fullPrompt = "";
    if (history.length > 0) {
        fullPrompt += history
            .map((message) => `${message.role === "user" ? "User" : "Singularity"}: ${message.content}`)
            .join("\n\n");
        fullPrompt += "\n\n";
    }
    fullPrompt += `User: ${userMessage}`;

    const modelId = resolveModel(aiConfig);
    const isLive = modelId.includes("native-audio");

    if (isLive) {
        const { GoogleGenAI, Modality } = await import("@google/genai");
        const ai = new GoogleGenAI({ apiKey: aiConfig.apiKey });
        const messageQueue: LiveMessage[] = [];

        const waitMsg = (): Promise<LiveMessage> => new Promise((resolve) => {
            const check = () => {
                const message = messageQueue.shift();
                if (message) resolve(message);
                else setTimeout(check, 100);
            };
            check();
        });

        const session = await ai.live.connect({
            model: `models/${modelId}`,
            config: {
                responseModalities: [Modality.AUDIO],
                speechConfig: {
                    voiceConfig: {
                        prebuiltVoiceConfig: { voiceName: "Zephyr" },
                    },
                },
                outputAudioTranscription: {},
            },
            callbacks: {
                onopen: () => { },
                onmessage: (message) => messageQueue.push(message),
                onerror: (error) => console.error("[Singularity] Error:", getErrorMessage(error)),
                onclose: () => { },
            },
        });

        session.sendClientContent({ turns: [fullPrompt] });

        let transcriptText = "";
        let thoughtText = "";
        let done = false;
        const timeout = setTimeout(() => { done = true; }, 60000);

        while (!done) {
            const message = await waitMsg();
            if (message.serverContent?.outputTranscription?.text) {
                transcriptText += message.serverContent.outputTranscription.text;
            }
            if (message.serverContent?.modelTurn?.parts) {
                for (const part of message.serverContent.modelTurn.parts) {
                    if (part.text) thoughtText += part.text;
                }
            }
            if (message.serverContent?.turnComplete) done = true;
        }

        clearTimeout(timeout);
        session.close();

        const response = transcriptText.trim()
            || thoughtText.replace(/\*\*[A-Z][^*]*\*\*\s*\n\n/g, "").trim()
            || thoughtText.trim();

        const botInputTokens = Math.ceil((fullPrompt || "").length / 4);
        const botOutputTokens = Math.ceil((response || "").length / 4);
        logAIUsage({
            agencyId: agencyId || "unknown",
            userId,
            feature: "ai-chatbot",
            model: modelId,
            provider: aiConfig.provider,
            inputTokens: botInputTokens,
            outputTokens: botOutputTokens,
            totalTokens: botInputTokens + botOutputTokens,
        });
        return {
            response,
            thinking: thoughtText.trim(),
        };
    }

    const { text, tokens } = await generateContent(aiConfig, fullPrompt);
    logAIUsage({
        agencyId: agencyId || "unknown",
        userId,
        feature: "ai-chatbot",
        model: modelId,
        provider: aiConfig.provider,
        ...tokens,
    });
    return { response: text, thinking: "" };
}

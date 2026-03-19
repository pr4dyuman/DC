"use server";

import { AIConfig } from "./types";
import type { ChatMessage } from "./ai-models";
import {
    extractTextFromParts,
    isLiveModel,
    type MultimodalPart,
    resolveModel,
    type TokenUsage,
} from "./ai-provider-shared";
import {
    geminiChat,
    geminiGenerateContent,
    geminiGenerateContentWithParts,
    liveChat,
    liveGenerateContent,
} from "./ai-provider-gemini";
import {
    openaiCompatChat,
    openaiCompatGenerateContent,
} from "./ai-provider-openai-compat";

export type { TokenUsage } from "./ai-provider-shared";

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

export async function generateContentWithParts(
    config: AIConfig,
    parts: MultimodalPart[],
    systemInstruction?: string
): Promise<{ text: string; tokens?: TokenUsage }> {
    if (config.provider === "gemini") {
        const modelId = resolveModel(config);
        if (isLiveModel(modelId)) {
            const textContent = extractTextFromParts(parts);
            return { text: await liveGenerateContent(config, textContent, systemInstruction) };
        }
        return geminiGenerateContentWithParts(config, parts, systemInstruction);
    }
    const textParts = extractTextFromParts(parts);
    return openaiCompatGenerateContent(config, textParts, systemInstruction);
}

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

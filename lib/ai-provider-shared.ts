import type { Part as GeminiPart } from "@google/generative-ai";
import { AIConfig } from "./types";

export type TokenUsage = {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
};

export type MultimodalPart = string | GeminiPart;

export const AI_TIMEOUT_MS = 60_000;

export function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
    return Promise.race([
        promise,
        new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error(`AI request timed out after ${ms / 1000}s`)), ms)
        ),
    ]);
}

export function resolveModel(config: AIConfig): string {
    if (config.model === "custom" && config.customModelId) {
        return config.customModelId;
    }
    return config.model || "gemini-2.5-flash-lite";
}

export type AIFeature = "chat" | "agent" | "taskExplain" | "hourEstimate" | "taskChatbot" | "heavyTasks";

/**
 * Resolves the full configuration (provider, key, model) for a specific AI feature.
 * Features can optionally supply an override config. If the override has an empty API key,
 * it will inherit the main config's API key but ONLY if the provider matches.
 */
export function getResolvedFeatureConfig(config: AIConfig, feature: AIFeature): AIConfig {
    let override;
    switch (feature) {
        case "chat": override = config.chatConfig; break;
        case "agent": override = config.agentConfig; break;
        case "taskExplain": override = config.taskExplainConfig; break;
        case "hourEstimate": override = config.hourEstimateConfig; break;
        case "taskChatbot": override = config.taskChatbotConfig; break;
        case "heavyTasks": override = config.heavyTasksConfig; break;
    }

    if (!override) {
        return config;
    }

    const resolvedApiKey = (override.apiKey?.trim() || "") || 
        (override.provider === config.provider ? config.apiKey : "");

    return {
        provider: override.provider,
        apiKey: resolvedApiKey,
        model: override.model,
        customModelId: override.customModelId
    };
}

export const OPENAI_COMPAT_BASE_URLS: Record<string, string> = {
    openai: "https://api.openai.com/v1",
    nvidia: "https://integrate.api.nvidia.com/v1",
    github: "https://models.inference.ai.azure.com",
    groq: "https://api.groq.com/openai/v1",
};

export function isLiveModel(modelId: string): boolean {
    return modelId.includes("native-audio");
}

export function extractTextFromParts(parts: MultimodalPart[]): string {
    return parts
        .flatMap((part) => {
            if (typeof part === "string") return [part];
            return part.text ? [part.text] : [];
        })
        .join("\n");
}

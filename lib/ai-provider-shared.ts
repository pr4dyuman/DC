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

export type AIFeature = "chat" | "agent" | "taskExplain" | "hourEstimate" | "taskChatbot";

const FEATURE_MODEL_KEY: Record<AIFeature, keyof AIConfig> = {
    chat:          "modelChat",
    agent:         "modelAgent",
    taskExplain:   "modelTaskExplain",
    hourEstimate:  "modelHourEstimate",
    taskChatbot:   "modelTaskChatbot",
};

/**
 * Resolves the model for a specific AI feature.
 * Returns the per-feature override if configured, otherwise falls back to the
 * main model (via resolveModel). Pass the result as an override on the config:
 *   const featureConfig = { ...aiConfig, model: resolveFeatureModel(aiConfig, 'chat') };
 */
export function resolveFeatureModel(config: AIConfig, feature: AIFeature): string {
    const key = FEATURE_MODEL_KEY[feature];
    const override = config[key] as string | undefined;
    if (override && override.trim() !== "") return override.trim();
    return resolveModel(config);
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

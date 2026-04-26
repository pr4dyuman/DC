import { AIConfig } from "./types";
import type { ChatMessage } from "./ai-models";
import {
    AI_TIMEOUT_MS,
    OPENAI_COMPAT_BASE_URLS,
    resolveModel,
    TokenUsage,
    withTimeout,
} from "./ai-provider-shared";

export async function openaiCompatGenerateContent(
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
        }),
    }), AI_TIMEOUT_MS);

    if (!response.ok) {
        const errorBody = await response.text().catch(() => "Unknown error");
        throw new Error(
            `AI Provider Error (${config.provider}): ${response.status} - ${errorBody}`
        );
    }

    const data = await response.json();
    const usage = data.usage;
    return {
        text: data.choices?.[0]?.message?.content || "",
        tokens: usage ? { inputTokens: usage.prompt_tokens || 0, outputTokens: usage.completion_tokens || 0, totalTokens: usage.total_tokens || 0 } : undefined,
    };
}

export async function openaiCompatChat(
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

    for (const message of history) {
        messages.push({
            role: message.role === "model" ? "assistant" : "user",
            content: message.content,
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
        }),
    }), AI_TIMEOUT_MS);

    if (!response.ok) {
        const errorBody = await response.text().catch(() => "Unknown error");
        throw new Error(
            `AI Provider Error (${config.provider}): ${response.status} - ${errorBody}`
        );
    }

    const data = await response.json();
    const usage = data.usage;
    return {
        text: data.choices?.[0]?.message?.content || "",
        tokens: usage ? { inputTokens: usage.prompt_tokens || 0, outputTokens: usage.completion_tokens || 0, totalTokens: usage.total_tokens || 0 } : undefined,
    };
}

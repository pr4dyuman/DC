"use server";

import { connectDB, AIUsageLogModel } from "./mongodb";

export type AIFeature =
    | 'singularity-agent'
    | 'singularity-chat'
    | 'ai-explain'
    | 'ai-enhance'
    | 'ai-task-chat'
    | 'ai-chatbot'
    | 'ai-hour-estimate';

/**
 * Log an AI API call for usage tracking.
 * Fire-and-forget — never throws to avoid disrupting the AI feature.
 */
export async function logAIUsage(params: {
    agencyId: string;
    userId: string;
    feature: AIFeature;
    model: string;
    provider: string;
    inputTokens?: number;
    outputTokens?: number;
    totalTokens?: number;
    durationMs?: number;
    success?: boolean;
    error?: string;
}) {
    try {
        await connectDB();
        await AIUsageLogModel.create({
            agencyId: params.agencyId,
            userId: params.userId,
            feature: params.feature,
            model: params.model,
            provider: params.provider,
            inputTokens: params.inputTokens || 0,
            outputTokens: params.outputTokens || 0,
            totalTokens: params.totalTokens || (params.inputTokens || 0) + (params.outputTokens || 0),
            durationMs: params.durationMs || 0,
            success: params.success ?? true,
            error: params.error,
        });
    } catch (err) {
        console.error('[AI Usage] Failed to log:', err);
    }
}

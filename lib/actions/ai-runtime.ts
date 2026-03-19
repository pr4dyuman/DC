import "server-only";

import type { AIConfig } from "../types";
import { getCurrentAgency } from "../agency-context";
import { closeSession, sendMessage } from "../live-session";
import { aiEstimateTaskHoursImpl } from "./ai-estimation";
import { ensureAIAccess, requireAuth } from "./access";
import {
    explainTaskImpl,
    enhanceTaskDescriptionImpl,
    extractTaskFieldsImpl,
    type ExtractedTaskFields,
} from "./ai-task";
import {
    chatWithTaskAIImpl,
    createAISessionImpl,
    type ChatMessage,
} from "./ai-task-chat";
import { getErrorMessage } from "./shared";
import { singularityChatImpl } from "./singularity-chat";

async function getAgencyAIConfigInternal(): Promise<AIConfig | null> {
    const { getAgencyAIConfigServer } = await import("../utils-server");
    return getAgencyAIConfigServer();
}

async function requireAIContext() {
    const user = await requireAuth();
    const agency = await getCurrentAgency();
    if (!agency?.id) throw new Error("Agency context required");
    await ensureAIAccess(user, agency.id);
    return { user, agencyId: agency.id };
}

export async function extractTaskFieldsAction(
    aiResponseText: string,
    availableCategories: string[],
): Promise<ExtractedTaskFields> {
    await requireAIContext();
    const aiConfig = await getAgencyAIConfigInternal();
    if (!aiConfig) throw new Error('Singularity is not configured.');
    return extractTaskFieldsImpl(aiConfig, aiResponseText, availableCategories);
}

export async function explainTaskAction(taskId: string, userId: string) {
    const { agencyId } = await requireAIContext();
    const aiConfig = await getAgencyAIConfigInternal();
    if (!aiConfig) {
        return "Singularity is not configured. Please contact your administrator to set up AI.";
    }
    return explainTaskImpl(aiConfig, agencyId, taskId, userId);
}

export async function enhanceTaskDescriptionAction(projectId: string, title: string, content: string, userId: string) {
    const { agencyId } = await requireAIContext();
    const aiConfig = await getAgencyAIConfigInternal();
    if (!aiConfig) throw new Error("Singularity is not configured. Contact your administrator.");
    return enhanceTaskDescriptionImpl(aiConfig, agencyId, projectId, title, content, userId);
}

export async function createAISessionAction(
    projectId: string,
    currentTitle: string,
    currentDescription: string,
    userId: string,
): Promise<string> {
    const { agencyId } = await requireAIContext();
    void userId;
    const aiConfig = await getAgencyAIConfigInternal();
    if (!aiConfig) throw new Error("Singularity is not configured.");
    return createAISessionImpl(aiConfig, agencyId, projectId, currentTitle, currentDescription);
}

export async function chatWithTaskAIAction(
    projectId: string,
    currentTitle: string,
    currentDescription: string,
    history: ChatMessage[],
    userMessage: string,
    userId: string,
) {
    const { agencyId } = await requireAIContext();
    const aiConfig = await getAgencyAIConfigInternal();
    if (!aiConfig) throw new Error('Singularity is not configured.');
    return chatWithTaskAIImpl(aiConfig, agencyId, projectId, currentTitle, currentDescription, history, userMessage, userId);
}

export async function sendAIMessageAction(
    sessionId: string,
    userMessage: string,
    projectId?: string,
    currentTitle?: string,
    currentDescription?: string,
    history?: ChatMessage[],
    userId?: string,
): Promise<string> {
    await requireAIContext();
    if (sessionId === 'legacy') {
        return chatWithTaskAIAction(
            projectId!,
            currentTitle!,
            currentDescription!,
            history || [],
            userMessage,
            userId!,
        );
    }

    try {
        return await sendMessage(sessionId, userMessage);
    } catch (error: unknown) {
        console.error('[AI Session] Send error:', getErrorMessage(error));
        return "I encountered an error. Please try again.";
    }
}

export async function closeAISessionAction(sessionId: string): Promise<void> {
    await requireAIContext();
    if (sessionId === 'legacy') return;
    closeSession(sessionId);
    console.log(`[AI Session] Closed ${sessionId}`);
}

export async function singularityChatAction(
    history: Array<{ role: 'user' | 'model'; content: string }>,
    userMessage: string,
): Promise<{ response: string; thinking: string }> {
    const { user, agencyId } = await requireAIContext();
    const aiConfig = await getAgencyAIConfigInternal();
    if (!aiConfig) throw new Error("Singularity is not configured.");
    return singularityChatImpl(aiConfig, agencyId, user.id, history, userMessage);
}

export async function aiEstimateTaskHoursAction(
    projectId: string,
    title: string,
    description: string,
    priority: string,
): Promise<number> {
    const { user, agencyId } = await requireAIContext();
    const aiConfig = await getAgencyAIConfigInternal();
    if (!aiConfig) throw new Error('Singularity is not configured.');
    return aiEstimateTaskHoursImpl(aiConfig, agencyId, user.id, projectId, title, description, priority);
}

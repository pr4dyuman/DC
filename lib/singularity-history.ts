"use server";

import type { ChatMessage, CheckpointAction } from "./singularity-history-shared";
import {
    getSingularitySessions as getSingularitySessionsStore,
    getSingularitySession as getSingularitySessionStore,
    createSingularitySession as createSingularitySessionStore,
    updateSingularitySession as updateSingularitySessionStore,
    updateSingularitySessionMode as updateSingularitySessionModeStore,
    deleteSingularitySession as deleteSingularitySessionStore,
    getCheckpointSessionId as getCheckpointSessionIdStore,
    createCheckpoint as createCheckpointStore,
    getCheckpoints as getCheckpointsStore,
} from "./singularity-history-store";
import {
    analyzeRollback as analyzeRollbackFlow,
    executeRollback as executeRollbackFlow,
} from "./singularity-history-rollback";

export async function getSingularitySessions(_userId?: string) {
    return getSingularitySessionsStore(_userId);
}

export async function getSingularitySession(sessionId: string) {
    return getSingularitySessionStore(sessionId);
}

export async function createSingularitySession(_userId: string, mode: "chat" | "agent"): Promise<string> {
    return createSingularitySessionStore(_userId, mode);
}

export async function updateSingularitySession(
    sessionId: string,
    messages: ChatMessage[],
    title?: string,
) {
    return updateSingularitySessionStore(sessionId, messages, title);
}

export async function updateSingularitySessionMode(sessionId: string, mode: "chat" | "agent") {
    return updateSingularitySessionModeStore(sessionId, mode);
}

export async function deleteSingularitySession(sessionId: string) {
    return deleteSingularitySessionStore(sessionId);
}

export async function getCheckpointSessionId(checkpointId: string): Promise<string | null> {
    return getCheckpointSessionIdStore(checkpointId);
}

export async function createCheckpoint(
    sessionId: string,
    messageIndex: number,
    actions: CheckpointAction[],
    label: string,
): Promise<string> {
    return createCheckpointStore(sessionId, messageIndex, actions, label);
}

export async function getCheckpoints(sessionId: string) {
    return getCheckpointsStore(sessionId);
}

export async function analyzeRollback(checkpointId: string) {
    return analyzeRollbackFlow(checkpointId);
}

export async function executeRollback(checkpointId: string, scope: "safe" | "all") {
    return executeRollbackFlow(checkpointId, scope);
}

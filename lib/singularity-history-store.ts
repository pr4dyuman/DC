"use server";

import {
    connectDB,
    SingularityChatSessionModel,
    SingularityCheckpointModel,
} from "./mongodb";
import { getCurrentAgency } from "./agency-context";
import { generateId } from "./utils-server";
import { getSessionUser } from "./auth";
import {
    type ChatSessionSummary,
    type ChatMessage,
    type CheckpointAction,
    type CheckpointRecord,
    type ChatSessionUpdate,
    buildSessionOwnershipFilter,
} from "./singularity-history-shared";

const MAX_MESSAGES_PER_SESSION = 200;

async function requireCurrentAgencyId(): Promise<string> {
    const agency = await getCurrentAgency();
    if (!agency?.id) {
        throw new Error("Agency context required");
    }
    return agency.id;
}

export async function getSingularitySessions(_userId?: string): Promise<ChatSessionSummary[]> {
    void _userId;
    const session = await getSessionUser();
    if (!session) throw new Error("Unauthorized");
    const userId = session.userId;

    await connectDB();
    const agencyId = await requireCurrentAgencyId();

    const sessions = await SingularityChatSessionModel.find({ userId, agencyId })
        .sort({ updatedAt: -1 })
        .lean();

    return sessions.map((sessionRecord) => ({
        id: sessionRecord.id,
        title: sessionRecord.title || "New Chat",
        mode: sessionRecord.mode,
        updatedAt: sessionRecord.updatedAt,
        messageCount: sessionRecord.messages?.length || 0,
    }));
}

export async function getSingularitySession(sessionId: string) {
    const session = await getSessionUser();
    if (!session) throw new Error("Unauthorized");

    await connectDB();
    const agencyId = await requireCurrentAgencyId();
    const chatSession = await SingularityChatSessionModel.findOne({
        id: sessionId,
        userId: session.userId,
        agencyId,
    }).lean();
    if (!chatSession) return null;

    return {
        id: chatSession.id,
        userId: chatSession.userId,
        title: chatSession.title,
        mode: chatSession.mode,
        messages: chatSession.messages || [],
        createdAt: chatSession.createdAt,
        updatedAt: chatSession.updatedAt,
    };
}

export async function createSingularitySession(_userId: string, mode: "chat" | "agent"): Promise<string> {
    void _userId;
    const session = await getSessionUser();
    if (!session) throw new Error("Unauthorized");
    const userId = session.userId;

    await connectDB();
    const agencyId = await requireCurrentAgencyId();
    const now = new Date().toISOString();
    const id = generateId();

    await SingularityChatSessionModel.create({
        id,
        agencyId,
        userId,
        title: "New Chat",
        mode,
        messages: [],
        createdAt: now,
        updatedAt: now,
    });

    return id;
}

export async function updateSingularitySession(
    sessionId: string,
    messages: ChatMessage[],
    title?: string,
) {
    const authSession = await getSessionUser();
    if (!authSession) throw new Error("Unauthorized");

    await connectDB();
    const agencyId = await requireCurrentAgencyId();
    const chatSession = await SingularityChatSessionModel.findOne({
        id: sessionId,
        userId: authSession.userId,
        agencyId,
    }).select("id").lean();
    if (!chatSession) throw new Error("Unauthorized: Session does not belong to you");

    const now = new Date().toISOString();
    const cappedMessages = messages.length > MAX_MESSAGES_PER_SESSION
        ? [messages[0], ...messages.slice(-(MAX_MESSAGES_PER_SESSION - 1))]
        : messages;

    const update: ChatSessionUpdate = { messages: cappedMessages, updatedAt: now };
    if (title) update.title = title;

    await SingularityChatSessionModel.updateOne(
        { id: sessionId, userId: authSession.userId, agencyId },
        { $set: update },
    );
}

export async function updateSingularitySessionMode(sessionId: string, mode: "chat" | "agent") {
    const authSession = await getSessionUser();
    if (!authSession) throw new Error("Unauthorized");

    await connectDB();
    const agencyId = await requireCurrentAgencyId();
    const chatSession = await SingularityChatSessionModel.findOne({
        id: sessionId,
        userId: authSession.userId,
        agencyId,
    }).select("id").lean();
    if (!chatSession) throw new Error("Unauthorized: Session does not belong to you");

    await SingularityChatSessionModel.updateOne(
        { id: sessionId, userId: authSession.userId, agencyId },
        { $set: { mode, updatedAt: new Date().toISOString() } },
    );
}

export async function deleteSingularitySession(sessionId: string) {
    const authSession = await getSessionUser();
    if (!authSession) throw new Error("Unauthorized");

    await connectDB();
    const agencyId = await requireCurrentAgencyId();
    const chatSession = await SingularityChatSessionModel.findOne({
        id: sessionId,
        userId: authSession.userId,
        agencyId,
    }).select("agencyId").lean();
    if (!chatSession) throw new Error("Unauthorized: Session does not belong to you");
    const checkpointAgencyId = chatSession.agencyId;

    await Promise.all([
        SingularityChatSessionModel.deleteOne({ id: sessionId, userId: authSession.userId, agencyId }),
        SingularityCheckpointModel.deleteMany({
            sessionId,
            ...(checkpointAgencyId ? { agencyId: checkpointAgencyId } : {}),
        }),
    ]);
}

export async function getCheckpointSessionId(checkpointId: string): Promise<string | null> {
    const authSession = await getSessionUser();
    if (!authSession) throw new Error("Unauthorized");

    await connectDB();
    const checkpoint = await resolveOwnedCheckpoint(checkpointId, authSession.userId);
    return checkpoint ? checkpoint.sessionId : null;
}

export async function createCheckpoint(
    sessionId: string,
    messageIndex: number,
    actions: CheckpointAction[],
    label: string,
): Promise<string> {
    const authSession = await getSessionUser();
    if (!authSession) throw new Error("Unauthorized");

    await connectDB();
    const currentAgencyId = await requireCurrentAgencyId();
    const chatSession = await SingularityChatSessionModel.findOne({
        id: sessionId,
        userId: authSession.userId,
        agencyId: currentAgencyId,
    }).select("userId agencyId").lean();
    if (!chatSession) throw new Error("Unauthorized: Session does not belong to you");

    const agencyId = chatSession.agencyId || currentAgencyId;
    const id = generateId();

    await SingularityCheckpointModel.create({
        id,
        sessionId,
        agencyId,
        messageIndex,
        actions,
        label,
        status: "active",
        createdAt: new Date().toISOString(),
    });

    return id;
}

export async function getCheckpoints(sessionId: string) {
    const authSession = await getSessionUser();
    if (!authSession) throw new Error("Unauthorized");

    await connectDB();
    const agencyId = await requireCurrentAgencyId();
    const chatSession = await SingularityChatSessionModel.findOne({
        id: sessionId,
        userId: authSession.userId,
        agencyId,
    }).select("agencyId").lean();
    if (!chatSession) throw new Error("Unauthorized: Session does not belong to you");
    const checkpointAgencyId = chatSession.agencyId;

    const checkpoints = await SingularityCheckpointModel.find({
        sessionId,
        status: "active",
        ...(checkpointAgencyId ? { agencyId: checkpointAgencyId } : {}),
    })
        .sort({ createdAt: -1 })
        .lean();

    return checkpoints.map((checkpoint) => ({
        id: checkpoint.id,
        sessionId: checkpoint.sessionId,
        messageIndex: checkpoint.messageIndex,
        actions: checkpoint.actions,
        label: checkpoint.label,
        status: checkpoint.status,
        createdAt: checkpoint.createdAt,
    }));
}

export async function resolveOwnedCheckpoint(checkpointId: string, userId: string): Promise<CheckpointRecord | null> {
    const agencyId = await requireCurrentAgencyId();
    const checkpoint = await SingularityCheckpointModel.findOne({ id: checkpointId, agencyId })
        .select("id sessionId agencyId messageIndex actions label")
        .lean() as CheckpointRecord | null;
    if (!checkpoint) return null;

    const sessionFilter = buildSessionOwnershipFilter(checkpoint.sessionId, userId, checkpoint.agencyId);
    const ownedSession = await SingularityChatSessionModel.findOne(sessionFilter).select("id").lean();
    if (!ownedSession) return null;

    return checkpoint;
}

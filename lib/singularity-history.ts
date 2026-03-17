"use server";

import { connectDB, SingularityChatSessionModel, SingularityCheckpointModel, TaskModel, ProjectModel, ClientModel, InvoiceModel, TransactionModel, ServiceModel, LeaveRequestModel } from "./mongodb";
import { getCurrentAgency } from "./agency-context";
import { generateId } from "./utils-server";
import { getSessionUser } from "./auth";

// ============================================================================
// TYPES
// ============================================================================

export interface ChatSessionSummary {
    id: string;
    title: string;
    mode: 'chat' | 'agent';
    updatedAt: string;
    messageCount: number;
}

export interface ChatMessage {
    role: 'user' | 'model';
    content: string;
    thinking?: string;
    images?: string[];
    toolActions?: {
        name: string;
        displayName: string;
        status: 'calling' | 'done' | 'error';
        summary?: string;
        success?: boolean;
    }[];
    timestamp: string;
}

export interface CheckpointAction {
    toolName: string;
    actionType: 'create' | 'update' | 'delete';
    entityType: 'task' | 'project' | 'client' | 'invoice' | 'transaction' | 'service' | 'leaveRequest' | 'comment';
    entityId: string;
    beforeSnapshot?: any;
    createdEntityIds?: string[];
    executedAt: string;
}

export interface ConflictInfo {
    entityType: string;
    entityId: string;
    entityName: string;
    reason: string; // e.g. "Modified after creation", "Has new child tasks", "Comments added"
}

export interface RollbackAnalysis {
    checkpointId: string;
    label: string;
    totalActions: number;
    safeActions: CheckpointAction[];
    conflictedActions: { action: CheckpointAction; conflict: ConflictInfo }[];
}

// ============================================================================
// CHAT SESSION CRUD
// ============================================================================

export async function getSingularitySessions(_userId?: string): Promise<ChatSessionSummary[]> {
    const session = await getSessionUser();
    if (!session) throw new Error('Unauthorized');
    const userId = session.userId;

    await connectDB();
    const agency = await getCurrentAgency();
    const agencyId = agency?.id || 'default-agency';

    const sessions = await SingularityChatSessionModel
        .find({ userId, agencyId })
        .sort({ updatedAt: -1 })
        .lean();

    return sessions.map((s: any) => ({
        id: s.id,
        title: s.title || 'New Chat',
        mode: s.mode,
        updatedAt: s.updatedAt,
        messageCount: s.messages?.length || 0,
    }));
}

export async function getSingularitySession(sessionId: string) {
    const session = await getSessionUser();
    if (!session) throw new Error('Unauthorized');

    await connectDB();
    const chatSession = await SingularityChatSessionModel.findOne({ id: sessionId, userId: session.userId }).lean();
    if (!chatSession) return null;
    return {
        id: (chatSession as any).id,
        userId: (chatSession as any).userId,
        title: (chatSession as any).title,
        mode: (chatSession as any).mode,
        messages: (chatSession as any).messages || [],
        createdAt: (chatSession as any).createdAt,
        updatedAt: (chatSession as any).updatedAt,
    };
}

export async function createSingularitySession(_userId: string, mode: 'chat' | 'agent'): Promise<string> {
    const session = await getSessionUser();
    if (!session) throw new Error('Unauthorized');
    const userId = session.userId;

    await connectDB();
    const agency = await getCurrentAgency();
    const agencyId = agency?.id || 'default-agency';
    const now = new Date().toISOString();
    const id = generateId();

    await SingularityChatSessionModel.create({
        id,
        agencyId,
        userId,
        title: 'New Chat',
        mode,
        messages: [],
        createdAt: now,
        updatedAt: now,
    });

    return id;
}

const MAX_MESSAGES_PER_SESSION = 200;

export async function updateSingularitySession(
    sessionId: string,
    messages: ChatMessage[],
    title?: string
) {
    const authSession = await getSessionUser();
    if (!authSession) throw new Error('Unauthorized');

    await connectDB();
    // Verify ownership
    const chatSession = await SingularityChatSessionModel.findOne({ id: sessionId, userId: authSession.userId }).select('id').lean();
    if (!chatSession) throw new Error('Unauthorized: Session does not belong to you');

    const now = new Date().toISOString();

    // Cap to prevent MongoDB 16MB document limit
    // Keep the first message (user context) + the most recent ones
    const cappedMessages = messages.length > MAX_MESSAGES_PER_SESSION
        ? [messages[0], ...messages.slice(-(MAX_MESSAGES_PER_SESSION - 1))]
        : messages;

    const update: any = { messages: cappedMessages, updatedAt: now };
    if (title) update.title = title;

    await SingularityChatSessionModel.updateOne(
        { id: sessionId, userId: authSession.userId },
        { $set: update }
    );
}

export async function updateSingularitySessionMode(sessionId: string, mode: 'chat' | 'agent') {
    const authSession = await getSessionUser();
    if (!authSession) throw new Error('Unauthorized');

    await connectDB();
    // Verify ownership
    const chatSession = await SingularityChatSessionModel.findOne({ id: sessionId, userId: authSession.userId }).select('id').lean();
    if (!chatSession) throw new Error('Unauthorized: Session does not belong to you');

    await SingularityChatSessionModel.updateOne(
        { id: sessionId, userId: authSession.userId },
        { $set: { mode, updatedAt: new Date().toISOString() } }
    );
}

export async function deleteSingularitySession(sessionId: string) {
    const authSession = await getSessionUser();
    if (!authSession) throw new Error('Unauthorized');

    await connectDB();
    // Verify ownership
    const chatSession = await SingularityChatSessionModel.findOne({ id: sessionId, userId: authSession.userId }).select('agencyId').lean();
    if (!chatSession) throw new Error('Unauthorized: Session does not belong to you');

    // Delete session and all associated checkpoints
    await Promise.all([
        SingularityChatSessionModel.deleteOne({ id: sessionId, userId: authSession.userId }),
        SingularityCheckpointModel.deleteMany({ sessionId, ...(chatSession as any)?.agencyId ? { agencyId: (chatSession as any).agencyId } : {} }),
    ]);
}

// ============================================================================
// CHECKPOINT SYSTEM
// ============================================================================

export async function getCheckpointSessionId(checkpointId: string): Promise<string | null> {
    const authSession = await getSessionUser();
    if (!authSession) throw new Error('Unauthorized');

    await connectDB();
    const cp = await resolveOwnedCheckpoint(checkpointId, authSession.userId);
    return cp ? cp.sessionId : null;
}
export async function createCheckpoint(
    sessionId: string,
    messageIndex: number,
    actions: CheckpointAction[],
    label: string
): Promise<string> {
    const authSession = await getSessionUser();
    if (!authSession) throw new Error('Unauthorized');

    await connectDB();
    // Verify session ownership
    const chatSession = await SingularityChatSessionModel.findOne({ id: sessionId, userId: authSession.userId }).select('userId agencyId').lean();
    if (!chatSession) throw new Error('Unauthorized: Session does not belong to you');

    const agency = await getCurrentAgency();
    const agencyId = (chatSession as any)?.agencyId || agency?.id || 'default-agency';
    const id = generateId();

    await SingularityCheckpointModel.create({
        id,
        sessionId,
        agencyId,
        messageIndex,
        actions,
        label,
        status: 'active',
        createdAt: new Date().toISOString(),
    });

    return id;
}

export async function getCheckpoints(sessionId: string) {
    const authSession = await getSessionUser();
    if (!authSession) throw new Error('Unauthorized');

    await connectDB();
    // Verify session ownership
    const chatSession = await SingularityChatSessionModel.findOne({ id: sessionId, userId: authSession.userId }).select('agencyId').lean();
    if (!chatSession) throw new Error('Unauthorized: Session does not belong to you');

    const checkpoints = await SingularityCheckpointModel
        .find({ sessionId, status: 'active', ...(chatSession as any)?.agencyId ? { agencyId: (chatSession as any).agencyId } : {} })
        .sort({ createdAt: -1 })
        .lean();

    return checkpoints.map((cp: any) => ({
        id: cp.id,
        sessionId: cp.sessionId,
        messageIndex: cp.messageIndex,
        actions: cp.actions,
        label: cp.label,
        status: cp.status,
        createdAt: cp.createdAt,
    }));
}

// ============================================================================
// CONFLICT DETECTION — Check if entities were modified after agent touched them
// ============================================================================

function getModelForEntity(entityType: string): any {
    switch (entityType) {
        case 'task': return TaskModel;
        case 'project': return ProjectModel;
        case 'client': return ClientModel;
        case 'invoice': return InvoiceModel;
        case 'transaction': return TransactionModel;
        case 'service': return ServiceModel;
        case 'leaveRequest': return LeaveRequestModel;
        default: return null;
    }
}

async function checkEntityConflict(action: CheckpointAction): Promise<ConflictInfo | null> {
    const Model = getModelForEntity(action.entityType);
    if (!Model) return null;
    const actionAgencyId = action.beforeSnapshot?.agencyId;

    if (action.actionType === 'create') {
        // For created entities: check if it was modified since creation
        const createFilter: any = { id: action.entityId };
        if (actionAgencyId) createFilter.agencyId = actionAgencyId;
        const entity = await Model.findOne(createFilter).lean() as any;
        if (!entity) {
            // Entity was already deleted by user — no conflict, but nothing to undo
            return {
                entityType: action.entityType,
                entityId: action.entityId,
                entityName: 'Deleted entity',
                reason: 'Already deleted — no action needed',
            };
        }

        const createdAt = new Date(action.executedAt).getTime();
        const updatedAt = entity.updatedAt ? new Date(entity.updatedAt).getTime() : createdAt;

        // Allow 5-second buffer for concurrent writes during creation
        if (updatedAt - createdAt > 5000) {
            return {
                entityType: action.entityType,
                entityId: action.entityId,
                entityName: entity.name || entity.title || entity.description || action.entityId,
                reason: `Modified after creation`,
            };
        }

        // For tasks: check if comments were added after creation
        if (action.entityType === 'task' && entity.comments?.length > 0) {
            const commentsAfterCreate = entity.comments.filter((c: any) => {
                const commentTime = new Date(c.timestamp).getTime();
                return commentTime > createdAt + 5000;
            });
            if (commentsAfterCreate.length > 0) {
                return {
                    entityType: action.entityType,
                    entityId: action.entityId,
                    entityName: entity.title || action.entityId,
                    reason: `${commentsAfterCreate.length} comment(s) added after creation`,
                };
            }
        }

        // For projects: check if tasks were added after creation
        if (action.entityType === 'project') {
            const projectTaskFilter: any = { projectId: action.entityId };
            const entityAgencyId = entity?.agencyId || actionAgencyId;
            if (entityAgencyId) projectTaskFilter.agencyId = entityAgencyId;
            const childTasks = await TaskModel.find(projectTaskFilter).lean();
            // Filter tasks not created by AI in this checkpoint
            const allCreatedIds = new Set(action.createdEntityIds || []);
            const externalTasks = childTasks.filter((t: any) => !allCreatedIds.has(t.id));
            if (externalTasks.length > 0) {
                return {
                    entityType: action.entityType,
                    entityId: action.entityId,
                    entityName: entity.name || action.entityId,
                    reason: `${externalTasks.length} task(s) were added to this project`,
                };
            }
        }

        return null; // No conflict — safe to rollback
    }

    if (action.actionType === 'update') {
        // For updated entities: check if someone else changed it after the agent did
        const updateFilter: any = { id: action.entityId };
        if (actionAgencyId) updateFilter.agencyId = actionAgencyId;
        const entity = await Model.findOne(updateFilter).lean() as any;
        if (!entity) return null; // Entity deleted — nothing to restore

        const agentUpdateTime = new Date(action.executedAt).getTime();
        const currentUpdateTime = entity.updatedAt ? new Date(entity.updatedAt).getTime() : 0;

        if (currentUpdateTime - agentUpdateTime > 5000) {
            return {
                entityType: action.entityType,
                entityId: action.entityId,
                entityName: entity.name || entity.title || action.entityId,
                reason: 'Modified after AI update',
            };
        }

        return null;
    }

    // For deletes: we're re-creating, so no typical conflict
    return null;
}

async function resolveOwnedCheckpoint(checkpointId: string, userId: string) {
    const checkpoint = await SingularityCheckpointModel
        .findOne({ id: checkpointId })
        .select('id sessionId agencyId messageIndex actions label')
        .lean() as any;
    if (!checkpoint) return null;

    const sessionFilter: any = { id: checkpoint.sessionId, userId };
    if (checkpoint.agencyId) sessionFilter.agencyId = checkpoint.agencyId;
    const ownedSession = await SingularityChatSessionModel.findOne(sessionFilter).select('id').lean();
    if (!ownedSession) return null;

    return checkpoint;
}

async function buildRollbackAnalysis(checkpoint: any): Promise<RollbackAnalysis> {
    const safeActions: CheckpointAction[] = [];
    const conflictedActions: { action: CheckpointAction; conflict: ConflictInfo }[] = [];

    for (const action of checkpoint.actions || []) {
        const conflict = await checkEntityConflict(action);
        if (conflict) {
            if (conflict.reason.includes('Already deleted')) continue;
            conflictedActions.push({ action, conflict });
        } else {
            safeActions.push(action);
        }
    }

    return {
        checkpointId: checkpoint.id,
        label: checkpoint.label,
        totalActions: (checkpoint.actions || []).length,
        safeActions,
        conflictedActions,
    };
}

export async function analyzeRollback(checkpointId: string): Promise<RollbackAnalysis | null> {
    const authSession = await getSessionUser();
    if (!authSession) throw new Error('Unauthorized');

    await connectDB();
    const checkpoint = await resolveOwnedCheckpoint(checkpointId, authSession.userId);
    if (!checkpoint) return null;
    return await buildRollbackAnalysis(checkpoint);
}

// ============================================================================
// ROLLBACK EXECUTION
// ============================================================================

export async function executeRollback(
    checkpointId: string,
    scope: 'safe' | 'all'
): Promise<{ success: boolean; rolledBack: number; skipped: number; errors: string[] }> {
    const authSession = await getSessionUser();
    if (!authSession) throw new Error('Unauthorized');

    await connectDB();
    const checkpoint = await resolveOwnedCheckpoint(checkpointId, authSession.userId);
    if (!checkpoint) return { success: false, rolledBack: 0, skipped: 0, errors: ['Checkpoint not found'] };
    const analysis = await buildRollbackAnalysis(checkpoint);

    const actionsToRollback = scope === 'all'
        ? [...analysis.safeActions, ...analysis.conflictedActions.map(c => c.action)]
        : analysis.safeActions;

    let rolledBack = 0;
    let skipped = 0;
    const errors: string[] = [];

    // Execute rollbacks in reverse order (undo last action first)
    for (const action of [...actionsToRollback].reverse()) {
        try {
            await rollbackAction(action);
            rolledBack++;
        } catch (err: any) {
            errors.push(`Failed to rollback ${action.entityType} ${action.entityId}: ${err.message}`);
            skipped++;
        }
    }

    // Mark checkpoint as rolled back
    await SingularityCheckpointModel.updateOne(
        { id: checkpointId, sessionId: checkpoint.sessionId, ...(checkpoint.agencyId ? { agencyId: checkpoint.agencyId } : {}) },
        { $set: { status: 'rolled_back' } }
    );

    // Also truncate the chat messages back to the checkpoint's messageIndex
    const session = await SingularityChatSessionModel.findOne({
        id: checkpoint.sessionId,
        userId: authSession.userId,
        ...(checkpoint.agencyId ? { agencyId: checkpoint.agencyId } : {}),
    }).lean() as any;
    if (session && session.messages) {
        const truncatedMessages = session.messages.slice(0, checkpoint.messageIndex);
        await SingularityChatSessionModel.updateOne(
            {
                id: checkpoint.sessionId,
                userId: authSession.userId,
                ...(checkpoint.agencyId ? { agencyId: checkpoint.agencyId } : {}),
            },
            { $set: { messages: truncatedMessages, updatedAt: new Date().toISOString() } }
        );
    }

    return { success: errors.length === 0, rolledBack, skipped, errors };
}

async function rollbackAction(action: CheckpointAction) {
    const Model = getModelForEntity(action.entityType);
    if (!Model) throw new Error(`Unknown entity type: ${action.entityType}`);

    // Derive agencyId from beforeSnapshot or existing entity for safety
    const agencyId = action.beforeSnapshot?.agencyId;

    switch (action.actionType) {
        case 'create': {
            // Rollback a create = delete the entity
            // For bulk operations, delete all created entities
            const idsToDelete = action.createdEntityIds?.length
                ? action.createdEntityIds
                : [action.entityId];

            for (const id of idsToDelete) {
                // Include agencyId when available to prevent cross-tenant deletion
                const filter: any = { id };
                if (agencyId) filter.agencyId = agencyId;
                await Model.deleteOne(filter);
            }
            break;
        }

        case 'update': {
            // Rollback an update = restore the beforeSnapshot
            if (!action.beforeSnapshot) {
                throw new Error('No snapshot available for update rollback');
            }

            // Remove MongoDB internal fields from snapshot
            const { _id, __v, ...restoreData } = action.beforeSnapshot;
            const updateFilter: any = { id: action.entityId };
            if (agencyId) updateFilter.agencyId = agencyId;
            await Model.updateOne(
                updateFilter,
                { $set: restoreData }
            );
            break;
        }

        case 'delete': {
            // Rollback a delete = re-create the entity from snapshot
            if (!action.beforeSnapshot) {
                throw new Error('No snapshot available for delete rollback');
            }
            if (
                action.entityType === 'project'
                && action.beforeSnapshot?.project
            ) {
                const projectDoc = action.beforeSnapshot.project;
                const tasks = Array.isArray(action.beforeSnapshot.tasks) ? action.beforeSnapshot.tasks : [];
                const invoices = Array.isArray(action.beforeSnapshot.invoices) ? action.beforeSnapshot.invoices : [];
                const transactions = Array.isArray(action.beforeSnapshot.transactions) ? action.beforeSnapshot.transactions : [];

                await ProjectModel.updateOne(
                    { id: projectDoc.id, ...(projectDoc.agencyId ? { agencyId: projectDoc.agencyId } : {}) },
                    { $set: projectDoc },
                    { upsert: true }
                );
                if (tasks.length > 0) {
                    await Promise.all(tasks.map((task: any) =>
                        TaskModel.updateOne({ id: task.id }, { $set: task }, { upsert: true })
                    ));
                }
                if (invoices.length > 0) {
                    await Promise.all(invoices.map((invoice: any) =>
                        InvoiceModel.updateOne({ id: invoice.id }, { $set: invoice }, { upsert: true })
                    ));
                }
                if (transactions.length > 0) {
                    await Promise.all(transactions.map((transaction: any) =>
                        TransactionModel.updateOne({ id: transaction.id }, { $set: transaction }, { upsert: true })
                    ));
                }
                break;
            }

            const { _id, __v, ...createData } = action.beforeSnapshot;
            await Model.create(createData);
            break;
        }

        default:
            throw new Error(`Unknown action type: ${action.actionType}`);
    }
}

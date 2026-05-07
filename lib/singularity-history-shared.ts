// ============================================================================
// SHARED TYPES AND PURE HELPERS FOR SINGULARITY HISTORY
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
    attachments?: {
        fileName: string;
        fileType: 'image' | 'document';
        mimeType?: string;
    }[];
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
    entityType: 'task' | 'project' | 'client' | 'user' | 'invoice' | 'transaction' | 'service' | 'leaveRequest' | 'comment';
    entityId: string;
    beforeSnapshot?: Record<string, unknown>;
    createdEntityIds?: string[];
    executedAt: string;
}

export interface ConflictInfo {
    entityType: string;
    entityId: string;
    entityName: string;
    reason: string;
}

export interface RollbackAnalysis {
    checkpointId: string;
    label: string;
    totalActions: number;
    safeActions: CheckpointAction[];
    conflictedActions: { action: CheckpointAction; conflict: ConflictInfo }[];
}

export type SnapshotComment = {
    timestamp?: string;
};

export type SnapshotEntity = Record<string, unknown> & {
    id?: string;
    agencyId?: string;
    updatedAt?: string;
    name?: string;
    title?: string;
    description?: string;
    comments?: SnapshotComment[];
};

export type ProjectRollbackSnapshot = Record<string, unknown> & {
    agencyId?: string;
    project?: SnapshotEntity;
    tasks?: SnapshotEntity[];
    invoices?: SnapshotEntity[];
    transactions?: SnapshotEntity[];
};

export type SessionRecord = {
    id: string;
    userId: string;
    agencyId?: string;
    title?: string;
    mode?: 'chat' | 'agent';
    messages?: ChatMessage[];
    createdAt?: string;
    updatedAt?: string;
};

export type CheckpointRecord = {
    id: string;
    sessionId: string;
    agencyId?: string;
    messageIndex: number;
    actions?: CheckpointAction[];
    label: string;
    status?: 'active' | 'rolled_back';
    createdAt?: string;
};

export type ChatSessionUpdate = {
    messages: ChatMessage[];
    updatedAt: string;
    title?: string;
};

export type AgencyScopedIdFilter = {
    id: string;
    agencyId?: string;
};

export type SessionOwnershipFilter = {
    id: string;
    userId: string;
    agencyId?: string;
};

export type ProjectTaskFilter = {
    projectId: string;
    agencyId?: string;
};

export type LeanQueryLike = {
    lean: () => Promise<unknown>;
};

export type RollbackModel = {
    findOne: (filter: Record<string, unknown>) => LeanQueryLike;
    updateOne: (filter: Record<string, unknown>, update: Record<string, unknown>, options?: Record<string, unknown>) => Promise<unknown>;
    deleteOne: (filter: Record<string, unknown>) => Promise<unknown>;
    create: (doc: Record<string, unknown>) => Promise<unknown>;
};

export function withoutMongoMeta<T extends Record<string, unknown>>(value: T) {
    const clone = { ...value };
    delete (clone as { _id?: unknown })._id;
    delete (clone as { __v?: unknown }).__v;
    return clone;
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function asSnapshotEntity(value: unknown): SnapshotEntity | null {
    return isRecord(value) ? value as SnapshotEntity : null;
}

export function asSnapshotEntityList(value: unknown): SnapshotEntity[] {
    return Array.isArray(value)
        ? value.map(asSnapshotEntity).filter((item): item is SnapshotEntity => Boolean(item))
        : [];
}

export function asProjectRollbackSnapshot(value: unknown): ProjectRollbackSnapshot | null {
    return isRecord(value) ? value as ProjectRollbackSnapshot : null;
}

export function getSnapshotAgencyId(snapshot: unknown): string | undefined {
    const record = asSnapshotEntity(snapshot);
    return typeof record?.agencyId === 'string' ? record.agencyId : undefined;
}

export function buildAgencyScopedIdFilter(id: string, agencyId?: string): AgencyScopedIdFilter {
    const filter: AgencyScopedIdFilter = { id };
    if (agencyId) {
        filter.agencyId = agencyId;
    }
    return filter;
}

export function buildSessionOwnershipFilter(id: string, userId: string, agencyId?: string): SessionOwnershipFilter {
    const filter: SessionOwnershipFilter = { id, userId };
    if (agencyId) {
        filter.agencyId = agencyId;
    }
    return filter;
}

export function getEntityName(entity: SnapshotEntity, fallback: string): string {
    if (typeof entity.name === 'string' && entity.name) return entity.name;
    if (typeof entity.title === 'string' && entity.title) return entity.title;
    if (typeof entity.description === 'string' && entity.description) return entity.description;
    return fallback;
}

export function getErrorMessage(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
}

export async function restoreEntities(
    model: RollbackModel,
    entities: SnapshotEntity[],
    fallbackAgencyId?: string
) {
    await Promise.all(
        entities.map((entity) => {
            if (typeof entity.id !== 'string' || !entity.id) {
                return Promise.resolve();
            }
            const entityAgencyId = typeof entity.agencyId === 'string' ? entity.agencyId : fallbackAgencyId;
            return model.updateOne(
                buildAgencyScopedIdFilter(entity.id, entityAgencyId),
                { $set: entity },
                { upsert: true }
            );
        })
    );
}

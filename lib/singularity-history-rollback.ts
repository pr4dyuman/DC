"use server";

import {
    connectDB,
    SingularityChatSessionModel,
    SingularityCheckpointModel,
    TaskModel,
    ProjectModel,
    ClientModel,
    InvoiceModel,
    TransactionModel,
    ServiceModel,
    LeaveRequestModel,
} from "./mongodb";
import { getSessionUser } from "./auth";
import {
    type CheckpointAction,
    type ConflictInfo,
    type RollbackAnalysis,
    type SnapshotEntity,
    type SessionRecord,
    type CheckpointRecord,
    type ProjectTaskFilter,
    type RollbackModel,
    asProjectRollbackSnapshot,
    asSnapshotEntity,
    asSnapshotEntityList,
    buildAgencyScopedIdFilter,
    getEntityName,
    getErrorMessage,
    getSnapshotAgencyId,
    restoreEntities,
    withoutMongoMeta,
} from "./singularity-history-shared";
import { resolveOwnedCheckpoint } from "./singularity-history-store";

function getModelForEntity(entityType: CheckpointAction["entityType"]): RollbackModel | null {
    switch (entityType) {
        case "task": return TaskModel as unknown as RollbackModel;
        case "project": return ProjectModel as unknown as RollbackModel;
        case "client": return ClientModel as unknown as RollbackModel;
        case "invoice": return InvoiceModel as unknown as RollbackModel;
        case "transaction": return TransactionModel as unknown as RollbackModel;
        case "service": return ServiceModel as unknown as RollbackModel;
        case "leaveRequest": return LeaveRequestModel as unknown as RollbackModel;
        default: return null;
    }
}

async function checkEntityConflict(action: CheckpointAction): Promise<ConflictInfo | null> {
    const Model = getModelForEntity(action.entityType);
    if (!Model) return null;
    const actionAgencyId = getSnapshotAgencyId(action.beforeSnapshot);

    if (action.actionType === "create") {
        const entity = await Model.findOne(buildAgencyScopedIdFilter(action.entityId, actionAgencyId)).lean() as SnapshotEntity | null;
        if (!entity) {
            return {
                entityType: action.entityType,
                entityId: action.entityId,
                entityName: "Deleted entity",
                reason: "Already deleted - no action needed",
            };
        }

        const createdAt = new Date(action.executedAt).getTime();
        const updatedAt = entity.updatedAt ? new Date(entity.updatedAt).getTime() : createdAt;

        if (updatedAt - createdAt > 5000) {
            return {
                entityType: action.entityType,
                entityId: action.entityId,
                entityName: getEntityName(entity, action.entityId),
                reason: "Modified after creation",
            };
        }

        const entityComments = Array.isArray(entity.comments) ? entity.comments : [];
        if (action.entityType === "task" && entityComments.length > 0) {
            const commentsAfterCreate = entityComments.filter((comment) => {
                const commentTime = comment.timestamp ? new Date(comment.timestamp).getTime() : 0;
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

        if (action.entityType === "project") {
            const projectTaskFilter: ProjectTaskFilter = { projectId: action.entityId };
            const entityAgencyId = entity?.agencyId || actionAgencyId;
            if (entityAgencyId) projectTaskFilter.agencyId = entityAgencyId;
            const childTasks = await TaskModel.find(projectTaskFilter).lean();
            const allCreatedIds = new Set(action.createdEntityIds || []);
            const externalTasks = childTasks.filter((task) => !allCreatedIds.has(task.id));
            if (externalTasks.length > 0) {
                return {
                    entityType: action.entityType,
                    entityId: action.entityId,
                    entityName: getEntityName(entity, action.entityId),
                    reason: `${externalTasks.length} task(s) were added to this project`,
                };
            }
        }

        return null;
    }

    if (action.actionType === "update") {
        const entity = await Model.findOne(buildAgencyScopedIdFilter(action.entityId, actionAgencyId)).lean() as SnapshotEntity | null;
        if (!entity) return null;

        const agentUpdateTime = new Date(action.executedAt).getTime();
        const currentUpdateTime = entity.updatedAt ? new Date(entity.updatedAt).getTime() : 0;

        if (currentUpdateTime - agentUpdateTime > 5000) {
            return {
                entityType: action.entityType,
                entityId: action.entityId,
                entityName: getEntityName(entity, action.entityId),
                reason: "Modified after AI update",
            };
        }

        return null;
    }

    return null;
}

async function buildRollbackAnalysis(checkpoint: CheckpointRecord): Promise<RollbackAnalysis> {
    const safeActions: CheckpointAction[] = [];
    const conflictedActions: { action: CheckpointAction; conflict: ConflictInfo }[] = [];
    const checkpointActions = Array.isArray(checkpoint.actions) ? checkpoint.actions : [];

    for (const action of checkpointActions) {
        const conflict = await checkEntityConflict(action);
        if (conflict) {
            if (conflict.reason.includes("Already deleted")) continue;
            conflictedActions.push({ action, conflict });
        } else {
            safeActions.push(action);
        }
    }

    return {
        checkpointId: checkpoint.id,
        label: checkpoint.label,
        totalActions: checkpointActions.length,
        safeActions,
        conflictedActions,
    };
}

export async function analyzeRollback(checkpointId: string): Promise<RollbackAnalysis | null> {
    const authSession = await getSessionUser();
    if (!authSession) throw new Error("Unauthorized");

    await connectDB();
    const checkpoint = await resolveOwnedCheckpoint(checkpointId, authSession.userId);
    if (!checkpoint) return null;
    return buildRollbackAnalysis(checkpoint);
}

export async function executeRollback(
    checkpointId: string,
    scope: "safe" | "all",
): Promise<{ success: boolean; rolledBack: number; skipped: number; errors: string[] }> {
    const authSession = await getSessionUser();
    if (!authSession) throw new Error("Unauthorized");

    await connectDB();
    const checkpoint = await resolveOwnedCheckpoint(checkpointId, authSession.userId);
    if (!checkpoint) return { success: false, rolledBack: 0, skipped: 0, errors: ["Checkpoint not found"] };
    const analysis = await buildRollbackAnalysis(checkpoint);

    const actionsToRollback = scope === "all"
        ? [...analysis.safeActions, ...analysis.conflictedActions.map((conflicted) => conflicted.action)]
        : analysis.safeActions;

    let rolledBack = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (const action of [...actionsToRollback].reverse()) {
        try {
            await rollbackAction(action);
            rolledBack++;
        } catch (error: unknown) {
            errors.push(`Failed to rollback ${action.entityType} ${action.entityId}: ${getErrorMessage(error)}`);
            skipped++;
        }
    }

    await SingularityCheckpointModel.updateOne(
        {
            id: checkpointId,
            sessionId: checkpoint.sessionId,
            ...(checkpoint.agencyId ? { agencyId: checkpoint.agencyId } : {}),
        },
        { $set: { status: "rolled_back" } },
    );

    const session = await SingularityChatSessionModel.findOne({
        id: checkpoint.sessionId,
        userId: authSession.userId,
        ...(checkpoint.agencyId ? { agencyId: checkpoint.agencyId } : {}),
    }).lean() as SessionRecord | null;
    if (session && session.messages) {
        const truncatedMessages = session.messages.slice(0, checkpoint.messageIndex);
        await SingularityChatSessionModel.updateOne(
            {
                id: checkpoint.sessionId,
                userId: authSession.userId,
                ...(checkpoint.agencyId ? { agencyId: checkpoint.agencyId } : {}),
            },
            { $set: { messages: truncatedMessages, updatedAt: new Date().toISOString() } },
        );
    }

    return { success: errors.length === 0, rolledBack, skipped, errors };
}

async function rollbackAction(action: CheckpointAction) {
    const Model = getModelForEntity(action.entityType);
    if (!Model) throw new Error(`Unknown entity type: ${action.entityType}`);

    const agencyId = getSnapshotAgencyId(action.beforeSnapshot);

    switch (action.actionType) {
        case "create": {
            const idsToDelete = action.createdEntityIds?.length
                ? action.createdEntityIds
                : [action.entityId];

            for (const id of idsToDelete) {
                await Model.deleteOne(buildAgencyScopedIdFilter(id, agencyId));
            }
            break;
        }

        case "update": {
            if (!action.beforeSnapshot) {
                throw new Error("No snapshot available for update rollback");
            }

            const restoreData = withoutMongoMeta(action.beforeSnapshot as Record<string, unknown>);
            await Model.updateOne(
                buildAgencyScopedIdFilter(action.entityId, agencyId),
                { $set: restoreData },
            );
            break;
        }

        case "delete": {
            if (!action.beforeSnapshot) {
                throw new Error("No snapshot available for delete rollback");
            }
            if (action.entityType === "project" && action.beforeSnapshot?.project) {
                const projectSnapshot = asProjectRollbackSnapshot(action.beforeSnapshot);
                const projectDoc = asSnapshotEntity(projectSnapshot?.project);
                if (!projectSnapshot || !projectDoc) {
                    throw new Error("Project snapshot unavailable for rollback");
                }
                const tasks = asSnapshotEntityList(projectSnapshot.tasks);
                const invoices = asSnapshotEntityList(projectSnapshot.invoices);
                const transactions = asSnapshotEntityList(projectSnapshot.transactions);
                const projectId = typeof projectDoc.id === "string" ? projectDoc.id : action.entityId;
                const projectAgencyId = typeof projectDoc.agencyId === "string" ? projectDoc.agencyId : agencyId;

                await ProjectModel.updateOne(
                    buildAgencyScopedIdFilter(projectId, projectAgencyId),
                    { $set: projectDoc },
                    { upsert: true },
                );
                if (tasks.length > 0) {
                    await restoreEntities(TaskModel, tasks, projectAgencyId);
                }
                if (invoices.length > 0) {
                    await restoreEntities(InvoiceModel, invoices, projectAgencyId);
                }
                if (transactions.length > 0) {
                    await restoreEntities(TransactionModel, transactions, projectAgencyId);
                }
                break;
            }

            const createData = withoutMongoMeta(action.beforeSnapshot as Record<string, unknown>);
            await Model.create(createData);
            break;
        }

        default:
            throw new Error(`Unknown action type: ${action.actionType}`);
    }
}

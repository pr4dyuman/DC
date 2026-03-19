import {
    createTask,
    getTasks,
    getUsers,
    getUserTasks,
    updateTask,
    updateTaskStatus,
} from "./actions";
import { ProjectModel, TaskModel } from "./mongodb";
import {
    getBooleanArg,
    getRequiredAgencyId,
    getOptionalStringArg,
    getRecordArg,
    getStringArg,
    getStringArrayArg,
    type ToolArgs,
    type ToolExecutionResult,
} from "./singularity-tool-project-task-shared";
import type { Project, Task } from "./types";
export type ProjectTaskBulkToolName =
    | "bulk_update_task_status"
    | "bulk_edit_tasks"
    | "bulk_create_tasks";
type BulkSnapshotEntity = (entityType: "task", entityId: string) => Promise<unknown>;
type TaskEditFields = Partial<Pick<Task, "priority" | "category">>;
type TaskTimestampFields = Partial<Pick<Task, "createdAt" | "updatedAt">>;
type BulkTaskInput = {
    title: string;
    description?: string;
    assigneeId?: string;
    category?: string;
    priority?: Task["priority"];
    dueDate?: string;
    estimatedDays?: number;
    estimatedHours?: number;
    status?: Task["status"];
    createdAt?: string;
    completedAt?: string;
    phase?: string;
};
type CreatedTaskSummary = {
    id: string;
    title: string;
    assignee: string;
    dueDate: string;
    phase: string;
    category: string;
};

function getBulkTasks(args: ToolArgs): BulkTaskInput[] {
    const value = args.tasks;
    return Array.isArray(value)
        ? value.filter((entry): entry is BulkTaskInput => typeof entry === "object" && entry !== null)
        : [];
}

export async function executeProjectTaskBulkTool(
    name: ProjectTaskBulkToolName,
    args: ToolArgs,
    userId: string,
    snapshotEntity: BulkSnapshotEntity
): Promise<ToolExecutionResult> {
    switch (name) {
        case "bulk_update_task_status": {
            const targetStatus = getOptionalStringArg(args, "status") as Task["status"] | undefined;
            if (!targetStatus) {
                return { success: false, data: null, summary: "No status specified" };
            }

            let taskIdsToUpdate = getStringArrayArg(args, "taskIds");
            const perTaskDates: Record<string, string> = {};
            const projectId = getOptionalStringArg(args, "projectId");
            const completedAt = getOptionalStringArg(args, "completedAt");

            if (projectId && taskIdsToUpdate.length === 0) {
                const projectTasks = await getTasks(projectId);
                const isAutoBackdate = getBooleanArg(args, "autoBackdate");
                const filtered = (getBooleanArg(args, "force") || isAutoBackdate)
                    ? projectTasks
                    : projectTasks.filter((task) => task.status !== targetStatus);
                taskIdsToUpdate = filtered.map((task) => task.id);

                if (getBooleanArg(args, "autoBackdate") && targetStatus === "Done") {
                    for (const task of filtered) {
                        if (task.dueDate) {
                            const due = new Date(task.dueDate);
                            due.setDate(due.getDate() + Math.floor(Math.random() * 2) + 1);
                            perTaskDates[task.id] = due.toISOString().split("T")[0];
                        }
                    }
                }
            }

            if (taskIdsToUpdate.length === 0) {
                return { success: false, data: null, summary: `No tasks to update (all may already be ${targetStatus})` };
            }

            const taskSnapshots = await Promise.all(
                taskIdsToUpdate.map((id) => snapshotEntity("task", id))
            );
            let updated = 0;
            let failed = 0;
            const batchSize = 20;

            for (let index = 0; index < taskIdsToUpdate.length; index += batchSize) {
                const batch = taskIdsToUpdate.slice(index, index + batchSize);
                const results = await Promise.allSettled(
                    batch.map((id) => updateTaskStatus(id, targetStatus, perTaskDates[id] || completedAt || undefined))
                );
                for (const result of results) {
                    if (result.status === "fulfilled") updated++;
                    else failed++;
                }
            }

            const backdateInfo = getBooleanArg(args, "autoBackdate")
                ? " (auto-backdated per task dueDate)"
                : (completedAt ? ` (backdated to ${completedAt})` : "");
            const rollbackTaskId = taskIdsToUpdate[0] ?? "";

            return {
                success: true,
                data: { updated, failed, status: targetStatus, totalProcessed: taskIdsToUpdate.length },
                summary: `Updated ${updated}/${taskIdsToUpdate.length} tasks to "${targetStatus}"${failed > 0 ? ` (${failed} failed)` : ""}${backdateInfo}`,
                rollbackData: [{
                    toolName: "bulk_update_task_status",
                    actionType: "update",
                    entityType: "task",
                    entityId: rollbackTaskId,
                    beforeSnapshot: taskSnapshots.filter(Boolean),
                    createdEntityIds: taskIdsToUpdate,
                    executedAt: new Date().toISOString(),
                }],
            };
        }

        case "bulk_edit_tasks": {
            let taskIdsToEdit = getStringArrayArg(args, "taskIds");
            let projectTasks: Task[] = [];
            const projectId = getOptionalStringArg(args, "projectId");

            if (projectId && taskIdsToEdit.length === 0) {
                projectTasks = await getTasks(projectId);
                taskIdsToEdit = projectTasks.map((task) => task.id);
            }

            if (taskIdsToEdit.length === 0) {
                return { success: false, data: null, summary: "No tasks found to edit" };
            }

            if (projectTasks.length === 0) {
                const agencyId = await getRequiredAgencyId();
                projectTasks = await Promise.all(
                    taskIdsToEdit.map(async (id) => {
                        const taskDoc = await TaskModel.findOne({ id, agencyId }).lean() as Task | null;
                        return taskDoc;
                    })
                ).then((results) => results.filter((result): result is Task => Boolean(result)));
            }

            const editSnapshots = await Promise.all(
                taskIdsToEdit.map((id) => snapshotEntity("task", id))
            );
            let edited = 0;
            let failed = 0;
            const updates = getRecordArg(args, "updates");
            const createdAtStart = getOptionalStringArg(args, "createdAtStart");
            const createdAtEnd = getOptionalStringArg(args, "createdAtEnd");

            for (const task of projectTasks) {
                try {
                    const editUpdates: TaskEditFields = {};
                    const timestampUpdates: TaskTimestampFields = {};

                    if (updates) {
                        const priorityValue = getOptionalStringArg(updates, "priority");
                        const categoryValue = getOptionalStringArg(updates, "category");
                        if (priorityValue) editUpdates.priority = priorityValue as Task["priority"];
                        if (categoryValue) editUpdates.category = categoryValue;
                    }

                    if (getBooleanArg(args, "autoBackdateCreatedAt") && createdAtStart && createdAtEnd) {
                        const rangeStart = new Date(createdAtStart).getTime();
                        const rangeEnd = new Date(createdAtEnd).getTime();
                        const index = projectTasks.indexOf(task);
                        const fraction = projectTasks.length > 1 ? index / (projectTasks.length - 1) : 0;
                        const taskDate = new Date(rangeStart + fraction * (rangeEnd - rangeStart));
                        taskDate.setDate(taskDate.getDate() + Math.floor(Math.random() * 3));
                        timestampUpdates.createdAt = taskDate.toISOString();
                    }

                    if (getBooleanArg(args, "autoBackdateUpdatedAt") && task.status === "Done" && task.dueDate) {
                        const due = new Date(task.dueDate);
                        due.setDate(due.getDate() + Math.floor(Math.random() * 2) + 1);
                        timestampUpdates.updatedAt = due.toISOString();
                    }

                    if (Object.keys(editUpdates).length > 0) {
                        await updateTask(task.id, editUpdates);
                    }

                    if (Object.keys(timestampUpdates).length > 0) {
                        const agencyId = await getRequiredAgencyId();
                        await TaskModel.updateOne(
                            { id: task.id, agencyId },
                            { $set: timestampUpdates },
                            { timestamps: false }
                        );
                    }

                    if (Object.keys(editUpdates).length > 0 || Object.keys(timestampUpdates).length > 0) {
                        edited++;
                    }
                } catch {
                    failed++;
                }
            }

            const changes: string[] = [];
            if (updates) changes.push(`fields: ${Object.keys(updates).join(", ")}`);
            if (getBooleanArg(args, "autoBackdateCreatedAt")) changes.push("createdAt spread");
            if (getBooleanArg(args, "autoBackdateUpdatedAt")) changes.push("updatedAt backdated");
            const rollbackTaskId = taskIdsToEdit[0] ?? "";

            return {
                success: true,
                data: { edited, failed, total: taskIdsToEdit.length },
                summary: `Edited ${edited}/${taskIdsToEdit.length} tasks (${changes.join(", ")})${failed > 0 ? ` (${failed} failed)` : ""}`,
                rollbackData: [{
                    toolName: "bulk_edit_tasks",
                    actionType: "update",
                    entityType: "task",
                    entityId: rollbackTaskId,
                    beforeSnapshot: editSnapshots.filter(Boolean),
                    createdEntityIds: taskIdsToEdit,
                    executedAt: new Date().toISOString(),
                }],
            };
        }

        case "bulk_create_tasks": {
            const tasks = getBulkTasks(args);
            if (tasks.length === 0) {
                return { success: false, data: null, summary: "No tasks provided" };
            }

            const allUsers = await getUsers();
            const teamMembers = allUsers.filter((user) => user.role !== "client");
            const userNameMap = new Map<string, string>();
            for (const user of teamMembers) {
                userNameMap.set(user.id, user.name);
            }

            const workloads = await Promise.all(
                teamMembers.map(async (user) => {
                    const userTasks = await getUserTasks(user.id).catch(() => [] as Task[]);
                    const activeTasks = userTasks.filter((task) => task.status !== "Done").length;
                    return { id: user.id, name: user.name, role: user.role, activeTasks, assigned: 0 };
                })
            );
            workloads.sort((a, b) => (a.activeTasks + a.assigned) - (b.activeTasks + b.assigned));

            let startDate: Date;
            const requestedStartDate = getOptionalStringArg(args, "startDate");
            if (requestedStartDate) {
                startDate = new Date(requestedStartDate);
            } else {
                const agencyId = await getRequiredAgencyId();
                const projectId = getStringArg(args, "projectId");
                const projectForDate = await ProjectModel.findOne({ id: projectId, agencyId }).lean() as Pick<Project, "createdAt"> | null;
                startDate = projectForDate?.createdAt ? new Date(projectForDate.createdAt) : new Date();
            }

            const assigneeSchedule = new Map<string, Date>();
            const createdTasks: CreatedTaskSummary[] = [];
            const failedTasks: string[] = [];
            const phaseBreakdown: Record<string, number> = {};
            const agencyId = await getRequiredAgencyId();

            for (const task of tasks) {
                try {
                    let assigneeId = task.assigneeId || "";
                    if (!assigneeId && workloads.length > 0) {
                        workloads.sort((a, b) => (a.activeTasks + a.assigned) - (b.activeTasks + b.assigned));
                        assigneeId = workloads[0].id;
                        workloads[0].assigned++;
                    }

                    let dueDateStr = task.dueDate || "";
                    if (!dueDateStr) {
                        const estimatedDays = task.estimatedDays || 3;
                        const assigneeStart = assigneeSchedule.get(assigneeId) || new Date(startDate);
                        const dueDate = new Date(assigneeStart);
                        dueDate.setDate(dueDate.getDate() + estimatedDays);
                        assigneeSchedule.set(assigneeId, new Date(dueDate));
                        dueDateStr = dueDate.toISOString().split("T")[0];
                    }

                    const taskStatus = task.status || "Todo";
                    const newTask = await createTask({
                        projectId: getStringArg(args, "projectId"),
                        title: task.title,
                        description: task.description || "",
                        assigneeId: assigneeId || userId,
                        category: task.category || "",
                        priority: task.priority || "Medium",
                        dueDate: dueDateStr,
                        status: taskStatus,
                        estimatedHours: task.estimatedHours || undefined,
                    });

                    if (task.createdAt) {
                        await TaskModel.updateOne(
                            { id: newTask.id, agencyId },
                            { $set: { createdAt: new Date(task.createdAt).toISOString() } },
                            { timestamps: false }
                        );
                    }

                    if (task.completedAt && taskStatus === "Done") {
                        await TaskModel.updateOne(
                            { id: newTask.id, agencyId },
                            { $set: { updatedAt: new Date(task.completedAt).toISOString() } },
                            { timestamps: false }
                        );
                    } else if (taskStatus === "Done" && !task.completedAt && dueDateStr) {
                        // Auto-backdate: if task is Done but no completedAt provided,
                        // use dueDate + 1-2 days as the completion date for the heatmap
                        const autoDate = new Date(dueDateStr);
                        autoDate.setDate(autoDate.getDate() + Math.floor(Math.random() * 2) + 1);
                        await TaskModel.updateOne(
                            { id: newTask.id, agencyId },
                            { $set: { updatedAt: autoDate.toISOString() } },
                            { timestamps: false }
                        );
                    }

                    const assigneeName = userNameMap.get(assigneeId) || "Unassigned";
                    createdTasks.push({
                        id: newTask.id,
                        title: task.title,
                        assignee: assigneeName,
                        dueDate: dueDateStr,
                        phase: task.phase || "General",
                        category: task.category || "",
                    });

                    const phase = task.phase || "General";
                    phaseBreakdown[phase] = (phaseBreakdown[phase] || 0) + 1;
                } catch (error: unknown) {
                    const message = error instanceof Error ? error.message : "Unknown error";
                    failedTasks.push(`${task.title}: ${message}`);
                }
            }

            const assigneeCounts: Record<string, number> = {};
            for (const task of createdTasks) {
                assigneeCounts[task.assignee] = (assigneeCounts[task.assignee] || 0) + 1;
            }

            const distSummary = Object.entries(assigneeCounts)
                .map(([name, count]) => `${name}: ${count}`)
                .join(", ");
            const phaseSummary = Object.entries(phaseBreakdown)
                .map(([phase, count]) => `${phase}: ${count}`)
                .join(", ");
            const projectEndDate = createdTasks.length > 0
                ? createdTasks.reduce((latest, task) => task.dueDate > latest ? task.dueDate : latest, createdTasks[0].dueDate)
                : "N/A";

            const summary = `Created ${createdTasks.length}/${tasks.length} tasks` +
                (failedTasks.length > 0 ? ` (${failedTasks.length} failed)` : "") +
                ` | Phases: ${phaseSummary}` +
                ` | Distribution: ${distSummary}` +
                ` | Project timeline: ${startDate.toISOString().split("T")[0]} -> ${projectEndDate}`;

            return {
                success: true,
                data: {
                    created: createdTasks.length,
                    failed: failedTasks.length,
                    tasks: createdTasks,
                    failedDetails: failedTasks,
                    phaseBreakdown,
                    assigneeDistribution: assigneeCounts,
                    projectEndDate,
                },
                summary,
                rollbackData: createdTasks.length > 0 ? [{
                    toolName: "bulk_create_tasks",
                    actionType: "create",
                    entityType: "task",
                    entityId: createdTasks[0].id,
                    createdEntityIds: createdTasks.map((task) => task.id),
                    executedAt: new Date().toISOString(),
                }] : undefined,
            };
        }
    }
}

import {
    addComment,
    createTask,
    deleteTask,
    getUser,
    getUsers,
    getUserTasks,
    updateTask,
    updateTaskStatus,
} from "./actions";
import { TaskModel } from "./mongodb";
import {
    getRequiredAgencyId,
    getOptionalNumberArg,
    getOptionalStringArg,
    getStringArg,
    getStringArrayArg,
    type SnapshotEntity,
    type ToolArgs,
    type ToolExecutionResult,
} from "./singularity-tool-project-task-shared";
import { normalizeTaskAssigneeIds } from "./task-assignees";
import type { Task } from "./types";

export type TaskWriteToolName =
    | "create_task"
    | "update_task_status"
    | "edit_task"
    | "reassign_task"
    | "delete_task"
    | "add_task_comment";

type TaskEditFields = Partial<Pick<Task, "title" | "description" | "priority" | "category" | "dueDate" | "status" | "estimatedHours">>;
type TaskTimestampFields = Partial<Pick<Task, "createdAt" | "updatedAt">>;

export async function executeTaskWriteTool(
    name: TaskWriteToolName,
    args: ToolArgs,
    userId: string,
    snapshotEntity: SnapshotEntity
): Promise<ToolExecutionResult> {
    switch (name) {
        case "create_task": {
            let assigneeId = getStringArg(args, "assigneeId");
            let assigneeIds = normalizeTaskAssigneeIds(getStringArrayArg(args, "assigneeIds"), assigneeId);
            let assigneeName = "";
            let autoAssigned = false;

            if (assigneeIds.length === 0) {
                const allUsers = await getUsers();
                const teamMembers = allUsers.filter((user) => user.role !== "client");

                if (teamMembers.length > 0) {
                    const workloads = await Promise.all(
                        teamMembers.map(async (user) => {
                            const tasks = await getUserTasks(user.id).catch(() => [] as Task[]);
                            const activeTasks = tasks.filter((task) => task.status !== "Done").length;
                            return { id: user.id, name: user.name, activeTasks };
                        })
                    );
                    workloads.sort((a, b) => a.activeTasks - b.activeTasks);
                    assigneeId = workloads[0].id;
                    assigneeIds = [assigneeId];
                    assigneeName = workloads[0].name;
                    autoAssigned = true;
                } else {
                    assigneeId = userId;
                    assigneeIds = [assigneeId];
                    assigneeName = "you";
                }
            } else {
                assigneeId = assigneeIds[0] || "";
                const assigneeNames = await Promise.all(
                    assigneeIds.map(async (id) => (await getUser(id).catch(() => null))?.name || id)
                );
                assigneeName = assigneeNames.join(", ");
            }

            const dueDate = getOptionalStringArg(args, "dueDate") || new Date(Date.now() + 7 * 86400000).toISOString().split("T")[0];
            const taskStatus = (getOptionalStringArg(args, "status") as Task["status"] | undefined) || "Todo";
            const estimatedHours = getOptionalNumberArg(args, "estimatedHours");
            const newTask = await createTask({
                projectId: getStringArg(args, "projectId"),
                title: getStringArg(args, "title"),
                description: getStringArg(args, "description"),
                assigneeId,
                assigneeIds,
                category: getStringArg(args, "category"),
                priority: (getOptionalStringArg(args, "priority") as Task["priority"] | undefined) || "Medium",
                dueDate,
                status: taskStatus,
                estimatedHours: estimatedHours || undefined,
            });

            const createdAt = getOptionalStringArg(args, "createdAt");
            const agencyId = (createdAt || (getOptionalStringArg(args, "completedAt") && taskStatus === "Done"))
                ? await getRequiredAgencyId()
                : null;
            if (createdAt) {
                await TaskModel.updateOne(
                    { id: newTask.id, agencyId: agencyId! },
                    { $set: { createdAt: new Date(createdAt).toISOString() } },
                    { timestamps: false }
                );
            }

            const completedAt = getOptionalStringArg(args, "completedAt");
            if (completedAt && taskStatus === "Done") {
                await TaskModel.updateOne(
                    { id: newTask.id, agencyId: agencyId! },
                    { $set: { updatedAt: new Date(completedAt).toISOString() } },
                    { timestamps: false }
                );
            } else if (taskStatus === "Done" && !completedAt && dueDate) {
                // Auto-backdate: use dueDate + 1-2 days as completion date for heatmap
                const agId = agencyId || await getRequiredAgencyId();
                const autoDate = new Date(dueDate);
                autoDate.setDate(autoDate.getDate() + Math.floor(Math.random() * 2) + 1);
                await TaskModel.updateOne(
                    { id: newTask.id, agencyId: agId },
                    { $set: { updatedAt: autoDate.toISOString() } },
                    { timestamps: false }
                );
            }

            const assignInfo = autoAssigned
                ? `auto-assigned to ${assigneeName} (fewest active tasks)`
                : `assigned to ${assigneeName}`;
            const category = getStringArg(args, "category") || "none";
            return {
                success: true,
                data: { id: newTask.id, title: newTask.title, projectId: newTask.projectId, assigneeId, assigneeIds, assigneeName },
                summary: `Task "${newTask.title}" created - ${assignInfo}, category: ${category}, due: ${dueDate}`,
                rollbackData: [{
                    toolName: "create_task",
                    actionType: "create",
                    entityType: "task",
                    entityId: newTask.id,
                    executedAt: new Date().toISOString(),
                }],
            };
        }

        case "update_task_status": {
            const taskId = getStringArg(args, "taskId");
            const status = getOptionalStringArg(args, "status") as Task["status"] | undefined;
            const completedAt = getOptionalStringArg(args, "completedAt");
            if (!status) {
                return { success: false, data: null, summary: "No status specified" };
            }
            const taskStatusSnapshot = await snapshotEntity("task", taskId);
            await updateTaskStatus(taskId, status, completedAt || undefined);
            return {
                success: true,
                data: { taskId, newStatus: status },
                summary: `Task moved to "${status}"${completedAt ? ` (backdated to ${completedAt})` : ""}`,
                rollbackData: taskStatusSnapshot ? [{
                    toolName: "update_task_status",
                    actionType: "update",
                    entityType: "task",
                    entityId: taskId,
                    beforeSnapshot: taskStatusSnapshot,
                    executedAt: new Date().toISOString(),
                }] : undefined,
            };
        }

        case "edit_task": {
            const taskId = getStringArg(args, "taskId");
            const editUpdates: TaskEditFields = {};
            const title = getOptionalStringArg(args, "title");
            const description = getOptionalStringArg(args, "description");
            const priority = getOptionalStringArg(args, "priority");
            const category = getOptionalStringArg(args, "category");
            const dueDate = getOptionalStringArg(args, "dueDate");
            const status = getOptionalStringArg(args, "status");
            const estimatedHours = getOptionalNumberArg(args, "estimatedHours");
            if (title) editUpdates.title = title;
            if (description) editUpdates.description = description;
            if (priority) editUpdates.priority = priority as Task["priority"];
            if (category) editUpdates.category = category;
            if (dueDate) editUpdates.dueDate = dueDate;
            if (status) editUpdates.status = status as Task["status"];
            if (estimatedHours !== undefined) editUpdates.estimatedHours = estimatedHours;

            const timestampUpdates: TaskTimestampFields = {};
            const createdAt = getOptionalStringArg(args, "createdAt");
            const updatedAt = getOptionalStringArg(args, "updatedAt");
            if (createdAt) timestampUpdates.createdAt = new Date(createdAt).toISOString();
            if (updatedAt) timestampUpdates.updatedAt = new Date(updatedAt).toISOString();

            if (Object.keys(editUpdates).length === 0 && Object.keys(timestampUpdates).length === 0) {
                return { success: false, data: null, summary: "No changes specified" };
            }

            const editSnapshot = await snapshotEntity("task", taskId);
            if (Object.keys(editUpdates).length > 0) {
                await updateTask(taskId, editUpdates);
            }
            if (Object.keys(timestampUpdates).length > 0) {
                const agencyId = await getRequiredAgencyId();
                await TaskModel.updateOne(
                    { id: taskId, agencyId },
                    { $set: timestampUpdates },
                    { timestamps: false }
                );
            }

            const changedFields = [...Object.keys(editUpdates), ...Object.keys(timestampUpdates)].join(", ");
            return {
                success: true,
                data: { taskId, updates: { ...editUpdates, ...timestampUpdates } },
                summary: `Task updated - changed: ${changedFields}`,
                rollbackData: editSnapshot ? [{
                    toolName: "edit_task",
                    actionType: "update",
                    entityType: "task",
                    entityId: taskId,
                    beforeSnapshot: editSnapshot,
                    executedAt: new Date().toISOString(),
                }] : undefined,
            };
        }

        case "reassign_task": {
            const taskId = getStringArg(args, "taskId");
            const assigneeIds = normalizeTaskAssigneeIds(getStringArrayArg(args, "assigneeIds"), getStringArg(args, "assigneeId"));
            if (assigneeIds.length === 0) {
                return { success: false, data: null, summary: "No assignee specified" };
            }
            const assigneeId = assigneeIds[0] || "";
            const newAssigneeNames = await Promise.all(
                assigneeIds.map(async (id) => (await getUser(id).catch(() => null))?.name || id)
            );
            const newAssigneeName = newAssigneeNames.join(", ");

            const reassignSnapshot = await snapshotEntity("task", taskId);
            await updateTask(taskId, { assigneeId, assigneeIds });
            return {
                success: true,
                data: { taskId, newAssigneeId: assigneeId, newAssigneeIds: assigneeIds, newAssigneeName },
                summary: `Task reassigned to ${newAssigneeName}`,
                rollbackData: reassignSnapshot ? [{
                    toolName: "reassign_task",
                    actionType: "update",
                    entityType: "task",
                    entityId: taskId,
                    beforeSnapshot: reassignSnapshot,
                    executedAt: new Date().toISOString(),
                }] : undefined,
            };
        }

        case "delete_task": {
            const taskId = getStringArg(args, "taskId");
            const deleteSnapshot = await snapshotEntity("task", taskId);
            await deleteTask(taskId);
            return {
                success: true,
                data: { taskId },
                summary: "Task deleted",
                rollbackData: deleteSnapshot ? [{
                    toolName: "delete_task",
                    actionType: "delete",
                    entityType: "task",
                    entityId: taskId,
                    beforeSnapshot: deleteSnapshot,
                    executedAt: new Date().toISOString(),
                }] : undefined,
            };
        }

        case "add_task_comment": {
            const taskId = getStringArg(args, "taskId");
            const comment = getStringArg(args, "comment");
            const createdAt = getOptionalStringArg(args, "createdAt");
            const commentSnapshot = await snapshotEntity("task", taskId);
            await addComment(taskId, userId, comment, createdAt ? new Date(createdAt).toISOString() : undefined);
            return {
                success: true,
                data: { taskId },
                summary: "Comment added to task",
                rollbackData: commentSnapshot ? [{
                    toolName: "add_task_comment",
                    actionType: "update",
                    entityType: "task",
                    entityId: taskId,
                    beforeSnapshot: commentSnapshot,
                    executedAt: new Date().toISOString(),
                }] : undefined,
            };
        }
    }
}

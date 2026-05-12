import "server-only";

import { DEFAULT_TASK_EMAIL_EVENTS } from "../email-constants";
import {
    sendTaskAssignedEmail,
    sendTaskStatusChangedEmail,
} from "../brevo-mail";
import type { User } from "../db";
import {
    ActivityModel,
    ClientModel,
    NotificationModel,
    ProjectModel,
    UserModel,
} from "../mongodb";
import { generateId } from "../utils-server";
import { getTaskAssigneeIds } from "../task-assignees";
import { isNotifEnabled } from "./shared";
import {
    getEmailCategories,
    getProjectSummary,
    type TaskEffectArgs,
} from "./task-shared";
import { shouldSuppressTaskEmailNotifications } from "./task-email-context";

export async function handleTaskStatusChangeEffectsImpl({
    previousTask,
    currentTask,
    agency,
    userName,
    userId,
    completedAt,
}: TaskEffectArgs) {
    const activityTimestamp = completedAt ? new Date(completedAt).toISOString() : new Date().toISOString();
    const suppressEmailNotifications = shouldSuppressTaskEmailNotifications();

    // When backdating a Done status: remove ALL existing "moved task to Done" activity entries
    // for this task BEFORE inserting the new backdated one. This ensures the heatmap
    // only ever sees one Done event per task.
    //
    // IMPORTANT: Match by title + action string (NOT entityId/entityType) because old
    // activity entries may have been created before those fields were added to the schema,
    // so entityId-based queries silently match nothing on legacy data.
    // Use case-insensitive regex for target to handle any title casing differences.
    if (completedAt && currentTask.status === "Done") {
        const escapedTitle = currentTask.title.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        const deleteResult = await ActivityModel.deleteMany({
            agencyId: agency.id,
            userId,
            target: { $regex: new RegExp(`^${escapedTitle}$`, "i") },
            action: "moved task to Done",
        });
        if (deleteResult.deletedCount > 0) {
            console.log(`[backdate] Removed ${deleteResult.deletedCount} old "Done" activity entries for task "${currentTask.title}"`);
        }
    }

    await ActivityModel.create({
        id: generateId(),
        agencyId: agency.id,
        user: userName,
        userId,
        action: "moved task to " + currentTask.status,
        target: currentTask.title,
        timestamp: activityTimestamp,
        entityId: currentTask.id,
        entityType: "task",
    });

    const projectForNotif = await getProjectSummary(agency.id, currentTask.projectId);
    const currentAssigneeIds = getTaskAssigneeIds(currentTask);
    if (await isNotifEnabled("task")) {
        const notifiedUserIds = new Set<string>();

        const assigneeNotifs = currentAssigneeIds
            .filter((assigneeId) => assigneeId !== userId)
            .map((assigneeId) => {
                notifiedUserIds.add(assigneeId);
                return {
                    id: generateId(),
                    agencyId: agency.id,
                    userId: assigneeId,
                    message: `${userName} moved your task "${currentTask.title}" to ${currentTask.status}`,
                    read: false,
                    timestamp: new Date().toISOString(),
                    link: `/dashboard/projects/${currentTask.projectId}?task=${currentTask.id}`,
                };
            });
        if (assigneeNotifs.length > 0) {
            await NotificationModel.insertMany(assigneeNotifs);
        }

        const adminsForTask = await UserModel.find({ agencyId: agency.id, role: { $in: ["admin", "manager"] } })
            .select("id email")
            .lean() as Array<Pick<User, "id" | "email">>;
        const adminNotifs = adminsForTask
            .filter((admin) => admin.id !== userId && !notifiedUserIds.has(admin.id))
            .map((admin) => {
                notifiedUserIds.add(admin.id);
                return {
                    id: generateId(),
                    agencyId: agency.id,
                    userId: admin.id,
                    message: `${userName} moved task "${currentTask.title}" to ${currentTask.status}`,
                    read: false,
                    timestamp: new Date().toISOString(),
                    link: `/dashboard/projects/${currentTask.projectId}?task=${currentTask.id}`,
                };
            });
        if (adminNotifs.length > 0) {
            await NotificationModel.insertMany(adminNotifs);
        }

        if (projectForNotif?.clientId && !notifiedUserIds.has(projectForNotif.clientId)) {
            await NotificationModel.create({
                id: generateId(),
                agencyId: agency.id,
                userId: projectForNotif.clientId,
                message: `Task "${currentTask.title}" has been moved to ${currentTask.status}`,
                read: false,
                timestamp: new Date().toISOString(),
                link: `/dashboard/projects/${currentTask.projectId}`,
            });
        }
    }

    const emailCats = getEmailCategories(agency);
    const taskEmailEvents = emailCats.taskEmailEvents || {};
    const eventKey = currentTask.status === "Done" ? "taskDone" : (currentTask.status === "In Progress" ? "taskInProgress" : null);
    const eventConfig = eventKey ? { ...DEFAULT_TASK_EMAIL_EVENTS[eventKey], ...taskEmailEvents[eventKey] } : null;
    const shouldSendTaskEmail = !suppressEmailNotifications && emailCats.taskUpdates !== false && eventConfig?.enabled;

    if (shouldSendTaskEmail) {
        try {
            if (eventConfig?.notifyAssignee && currentAssigneeIds.length > 0) {
                const assignees = await UserModel.find({
                    id: { $in: currentAssigneeIds.filter((assigneeId) => assigneeId !== userId) },
                    agencyId: agency.id,
                }).select("id name email").lean() as Array<Pick<User, "id" | "name" | "email">>;
                for (const assignee of assignees) {
                    if (assignee?.email) {
                        await sendTaskStatusChangedEmail({
                            recipientEmail: assignee.email,
                            recipientName: assignee.name,
                            taskTitle: currentTask.title,
                            oldStatus: previousTask.status,
                            newStatus: currentTask.status,
                            updatedBy: userName,
                            taskLink: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/dashboard/projects/${currentTask.projectId}?task=${currentTask.id}`,
                        });
                    }
                }
            }

            if (eventConfig?.notifyClient && projectForNotif?.clientId) {
                const clientDoc = await ClientModel.findOne({ id: projectForNotif.clientId, agencyId: agency.id })
                    .select("email name")
                    .lean() as { email?: string; name?: string } | null;
                if (clientDoc?.email && clientDoc.name) {
                    await sendTaskStatusChangedEmail({
                        recipientEmail: clientDoc.email,
                        recipientName: clientDoc.name,
                        taskTitle: currentTask.title,
                        oldStatus: previousTask.status,
                        newStatus: currentTask.status,
                        updatedBy: userName,
                        taskLink: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/dashboard/projects/${currentTask.projectId}`,
                    });
                }
            }
        } catch (emailError) {
            console.error("[Email] Failed to send task status change email:", emailError);
        }
    }

    // NOTE: We intentionally do NOT auto-complete the project when all tasks are "Done".
    // Clients can add more tasks in the future, so project completion should only
    // happen manually (via project status change), not automatically.

    const project = await getProjectSummary(agency.id, currentTask.projectId);

    // If a project was manually marked "Completed" but a task is re-opened, revert to "Active"
    if (project && project.status === "Completed" && previousTask.status === "Done" && currentTask.status !== "Done") {
        await ProjectModel.updateOne(
            { id: currentTask.projectId, agencyId: agency.id },
            {
                $set: { status: "Active" },
                $unset: { clientArchiveHold: "", clientArchiveHoldAt: "" },
            }
        );
    }
}

export async function handleTaskAssignmentChangeEffectsImpl({
    previousTask,
    currentTask,
    agency,
    userName,
    userId,
}: Omit<TaskEffectArgs, "completedAt">) {
    const previousAssigneeIds = getTaskAssigneeIds(previousTask);
    const currentAssigneeIds = getTaskAssigneeIds(currentTask);
    const newAssigneeIds = currentAssigneeIds.filter((assigneeId) => !previousAssigneeIds.includes(assigneeId));
    if (newAssigneeIds.length === 0) return;

    if (await isNotifEnabled("task")) {
        const assignmentNotifs = newAssigneeIds
            .filter((assigneeId) => assigneeId !== userId)
            .map((assigneeId) => ({
                id: generateId(),
                agencyId: agency.id,
                userId: assigneeId,
                message: `${userName} assigned you the task "${currentTask.title}"`,
                read: false,
                timestamp: new Date().toISOString(),
                link: `/dashboard/projects/${currentTask.projectId}?task=${currentTask.id}`,
            }));
        if (assignmentNotifs.length > 0) {
            await NotificationModel.insertMany(assignmentNotifs);
        }
    }

    const emailCats = getEmailCategories(agency);
    const taskEmailEvents = emailCats.taskEmailEvents || {};
    const createdEventConfig = { ...DEFAULT_TASK_EMAIL_EVENTS.taskCreated, ...taskEmailEvents.taskCreated };
    const shouldSendTaskEmail = !shouldSuppressTaskEmailNotifications() && emailCats.taskUpdates !== false && createdEventConfig.enabled;

    if (!shouldSendTaskEmail) return;

    try {
        const project = await getProjectSummary(agency.id, currentTask.projectId);
        const assignees = newAssigneeIds.length > 0
            ? await UserModel.find({ id: { $in: newAssigneeIds }, agencyId: agency.id })
                .select("id name email")
                .lean() as Array<Pick<User, "id" | "name" | "email">>
            : [];

        if (createdEventConfig.notifyAssignee && project) {
            for (const assignee of assignees) {
                if (!assignee.email) continue;
                await sendTaskAssignedEmail({
                    assigneeEmail: assignee.email,
                    assigneeName: assignee.name,
                    taskTitle: currentTask.title,
                    taskDescription: currentTask.description || "",
                    projectName: project.name,
                    dueDate: currentTask.dueDate || "",
                    priority: currentTask.priority || "Medium",
                    taskLink: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/dashboard/projects/${currentTask.projectId}?task=${currentTask.id}`,
                });
            }
        }

        if (createdEventConfig.notifyClient && project?.clientId) {
            const clientDoc = await ClientModel.findOne({ id: project.clientId, agencyId: agency.id })
                .select("email name")
                .lean() as { email?: string; name?: string } | null;
            if (clientDoc?.email && clientDoc.name) {
                await sendTaskAssignedEmail({
                    assigneeEmail: clientDoc.email,
                    assigneeName: clientDoc.name,
                    taskTitle: currentTask.title,
                    taskDescription: currentTask.description || "",
                    projectName: project.name,
                    dueDate: currentTask.dueDate || "",
                    priority: currentTask.priority || "Medium",
                    taskLink: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/dashboard/projects/${currentTask.projectId}?task=${currentTask.id}`,
                });
            }
        }
    } catch (emailError) {
        console.error("[Email] Failed to send task assignment email:", emailError);
    }
}

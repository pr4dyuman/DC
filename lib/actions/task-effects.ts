import "server-only";

import { DEFAULT_TASK_EMAIL_EVENTS } from "../email-constants";
import {
    sendProjectCompletedEmail,
    sendTaskAssignedEmail,
    sendTaskStatusChangedEmail,
} from "../brevo-mail";
import type { Task, User } from "../db";
import {
    ActivityModel,
    ClientModel,
    NotificationModel,
    ProjectModel,
    TaskModel,
    UserModel,
} from "../mongodb";
import { generateId } from "../utils-server";
import { isNotifEnabled } from "./shared";
import {
    getAgencyUser,
    getEmailCategories,
    getProjectSummary,
    type TaskEffectArgs,
} from "./task-shared";

export async function handleTaskStatusChangeEffectsImpl({
    previousTask,
    currentTask,
    agency,
    userName,
    userId,
    completedAt,
}: TaskEffectArgs) {
    const activityTimestamp = completedAt ? new Date(completedAt).toISOString() : new Date().toISOString();

    // When backdating a Done status: remove ALL existing "moved task to Done" activity entries
    // for this task BEFORE inserting the new backdated one. This ensures the heatmap
    // only ever sees one Done event per task.
    //
    // IMPORTANT: Match by title + action string (NOT entityId/entityType) because old
    // activity entries may have been created before those fields were added to the schema,
    // so entityId-based queries silently match nothing on legacy data.
    if (completedAt && currentTask.status === "Done") {
        const deleteResult = await ActivityModel.deleteMany({
            agencyId: agency.id,
            userId,
            target: currentTask.title,
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
    if (await isNotifEnabled("task")) {
        const notifiedUserIds = new Set<string>();

        if (currentTask.assigneeId && currentTask.assigneeId !== userId) {
            await NotificationModel.create({
                id: generateId(),
                agencyId: agency.id,
                userId: currentTask.assigneeId,
                message: `${userName} moved your task "${currentTask.title}" to ${currentTask.status}`,
                read: false,
                timestamp: new Date().toISOString(),
                link: `/dashboard/projects/${currentTask.projectId}?task=${currentTask.id}`,
            });
            notifiedUserIds.add(currentTask.assigneeId);
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
    const shouldSendTaskEmail = emailCats.taskUpdates !== false && eventConfig?.enabled;

    if (shouldSendTaskEmail) {
        try {
            if (eventConfig?.notifyAssignee && currentTask.assigneeId && currentTask.assigneeId !== userId) {
                const assignee = await getAgencyUser(agency.id, currentTask.assigneeId);
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

    const projectTasks = await TaskModel.find({ projectId: currentTask.projectId, agencyId: agency.id }).lean() as Task[];
    const project = await getProjectSummary(agency.id, currentTask.projectId);
    const allDone = projectTasks.length > 0 && projectTasks.every((task) => task.status === "Done");

    if (project && allDone && ["Active", "On Hold"].includes(project.status || "")) {
        await ProjectModel.updateOne(
            { id: currentTask.projectId, agencyId: agency.id },
            {
                $set: { status: "Completed" },
                $unset: { clientArchiveHold: "", clientArchiveHoldAt: "" },
            }
        );

        if (project.clientId && await isNotifEnabled("project")) {
            await NotificationModel.create({
                id: generateId(),
                agencyId: agency.id,
                userId: project.clientId,
                message: `Project "${project.name}" has been completed! All tasks are done.`,
                read: false,
                timestamp: new Date().toISOString(),
                link: `/dashboard/projects/${project.id}`,
            });
        }

        const admins = await UserModel.find({ agencyId: agency.id, role: "admin" })
            .select("id email")
            .lean() as Array<Pick<User, "id" | "email">>;
        if (await isNotifEnabled("project")) {
            await NotificationModel.insertMany(admins.map((admin) => ({
                id: generateId(),
                agencyId: agency.id,
                userId: admin.id,
                message: `Project "${project.name}" auto-completed - all tasks done`,
                read: false,
                timestamp: new Date().toISOString(),
                link: `/dashboard/projects/${project.id}`,
            })));
        }

        try {
            const client = project.clientId
                ? await ClientModel.findOne({ id: project.clientId, agencyId: agency.id })
                    .select("email name")
                    .lean() as { email?: string; name?: string } | null
                : null;
            const adminEmails = admins.map((admin) => admin.email).filter(Boolean) as string[];
            if (client?.email || adminEmails.length > 0) {
                await sendProjectCompletedEmail({
                    clientEmail: client?.email || "",
                    adminEmails,
                    clientName: client?.name || "",
                    projectName: project.name,
                    projectLink: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/dashboard/projects/${project.id}`,
                });
            }
        } catch (emailError) {
            console.error("[Email] Failed to send project completion email:", emailError);
        }
    } else if (project && project.status === "Completed" && previousTask.status === "Done" && currentTask.status !== "Done") {
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
    if (!currentTask.assigneeId || currentTask.assigneeId === previousTask.assigneeId) return;

    if (await isNotifEnabled("task") && currentTask.assigneeId !== userId) {
        await NotificationModel.create({
            id: generateId(),
            agencyId: agency.id,
            userId: currentTask.assigneeId,
            message: `${userName} assigned you the task "${currentTask.title}"`,
            read: false,
            timestamp: new Date().toISOString(),
            link: `/dashboard/projects/${currentTask.projectId}?task=${currentTask.id}`,
        });
    }

    const emailCats = getEmailCategories(agency);
    const taskEmailEvents = emailCats.taskEmailEvents || {};
    const createdEventConfig = { ...DEFAULT_TASK_EMAIL_EVENTS.taskCreated, ...taskEmailEvents.taskCreated };
    const shouldSendTaskEmail = emailCats.taskUpdates !== false && createdEventConfig.enabled;

    if (!shouldSendTaskEmail) return;

    try {
        const project = await getProjectSummary(agency.id, currentTask.projectId);
        const assignee = currentTask.assigneeId ? await getAgencyUser(agency.id, currentTask.assigneeId) : null;

        if (createdEventConfig.notifyAssignee && assignee?.email && project) {
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

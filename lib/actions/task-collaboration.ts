import "server-only";

import { revalidatePath } from "next/cache";
import { sendTaskCommentEmail } from "../brevo-mail";
import { getEffectiveEmailSettings } from "../email-policy";
import { extractMentionedUserIds } from "../mention-utils";
import { getNotificationPreview } from "../notification-text";
import type { Task, UserPermissions } from "../db";
import { NotificationModel, ActivityModel, ClientModel, ProjectModel, TaskModel, UserModel, connectDB } from "../mongodb";
import { getTaskAssigneeIds } from "../task-assignees";
import { sanitizeString } from "../validation";
import { generateId, resolveUserOrClient } from "../utils-server";
import { isNotifEnabled } from "./shared";
import { createNotifications } from "./notification-service";
import {
    type CommentAgencyContext,
    getAgencyUser,
    type TaskMutationActor,
} from "./task-shared";

export async function deleteTaskImpl(
    taskId: string,
    agencyId: string,
    actor: TaskMutationActor,
    deleteAccess: UserPermissions["deleteAccess"]
) {
    await connectDB();

    const task = await TaskModel.findOne({ id: taskId, agencyId }).lean() as Task | null;
    if (!task) throw new Error("Task not found");

    if (deleteAccess === "none") {
        throw new Error("Unauthorized: You do not have permission to delete tasks.");
    }
    if (deleteAccess === "own" && task.createdBy !== actor.id) {
        throw new Error("Unauthorized: You can only delete your own tasks.");
    }

    await TaskModel.deleteOne({ id: taskId, agencyId });

    await NotificationModel.deleteMany({
        agencyId,
        link: { $regex: taskId },
    });

    await ActivityModel.create({
        id: generateId(),
        agencyId,
        user: actor.name,
        userId: actor.id,
        action: "deleted task",
        target: task.title,
        timestamp: new Date().toISOString(),
    });

    revalidatePath("/dashboard/projects/[id]", "page");
    revalidatePath("/dashboard/projects");
}

export async function addCommentImpl(
    taskId: string,
    userId: string,
    text: string,
    agency: CommentAgencyContext,
    timestamp?: string
) {
    await connectDB();

    text = sanitizeString(text, 5000);
    if (!text) throw new Error("Comment text is required");

    const newComment = {
        id: generateId(),
        userId,
        text,
        timestamp: timestamp || new Date().toISOString(),
    };

    const task = await TaskModel.findOne({ id: taskId, agencyId: agency.id }).lean() as Task | null;
    if (!task) throw new Error("Task not found");

    await TaskModel.updateOne(
        { id: taskId, agencyId: agency.id },
        { $push: { comments: newComment } }
    );

    const commenter = await resolveUserOrClient(userId, agency.id);
    await ActivityModel.create({
        id: generateId(),
        agencyId: agency.id,
        user: commenter?.name || "Unknown User",
        userId,
        action: "commented on task",
        target: task.title,
        timestamp: new Date().toISOString(),
    });

    const emailSettings = await getEffectiveEmailSettings({ agency });
    const shouldSendTaskEmail = emailSettings.enabled && emailSettings.categories.taskUpdates;

    if (shouldSendTaskEmail) {
        try {
            const commenterUser = await getAgencyUser(agency.id, userId);
            if (commenterUser) {
                const participantIds = new Set<string>();
                getTaskAssigneeIds(task).forEach((assigneeId) => participantIds.add(assigneeId));
                if (task.createdBy) participantIds.add(task.createdBy);
                task.comments?.forEach((comment) => participantIds.add(comment.userId));
                participantIds.delete(userId);

                const participantEmails: string[] = [];
                for (const participantId of participantIds) {
                    const user = await getAgencyUser(agency.id, participantId);
                    if (user?.email) participantEmails.push(user.email);
                }

                if (participantEmails.length > 0) {
                    await sendTaskCommentEmail({
                        recipientEmails: participantEmails,
                        taskTitle: task.title,
                        commenterName: commenterUser.name,
                        commentText: text,
                        taskLink: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/dashboard/projects/${task.projectId}?task=${taskId}`,
                    });
                }
            }
        } catch (emailError) {
            console.error("[Email] Failed to send task comment email:", emailError);
        }
    }

    try {
        if (await isNotifEnabled("task")) {
            const participantIds = new Set<string>();
            getTaskAssigneeIds(task).forEach((assigneeId) => participantIds.add(assigneeId));
            if (task.createdBy) participantIds.add(task.createdBy);
            task.comments?.forEach((comment) => participantIds.add(comment.userId));
            participantIds.delete(userId);

            const mentionedIds = extractMentionedUserIds(text).filter((mentionedId) => mentionedId !== userId);
            const commenterDoc = await resolveUserOrClient(userId, agency.id);
            const commenterName = commenterDoc?.name || "Someone";
            const link = `/dashboard/projects/${task.projectId}?task=${taskId}`;
            const timestamp = new Date().toISOString();
            const recipientNotifications = new Map<string, {
                agencyId: string;
                userId: string;
                message: string;
                read: false;
                timestamp: string;
                link: string;
            }>();

            const commentPreview = getNotificationPreview(text);
            for (const participantId of participantIds) {
                recipientNotifications.set(participantId, {
                    agencyId: agency.id,
                    userId: participantId,
                    message: `${commenterName} commented on "${task.title}": ${commentPreview}`,
                    read: false,
                    timestamp,
                    link,
                });
            }

            if (mentionedIds.length > 0) {
                const [projectForMentions, validUsers, validClients] = await Promise.all([
                    ProjectModel.findOne({ id: task.projectId, agencyId: agency.id })
                        .select("clientId clientIds")
                        .lean() as Promise<{ clientId?: string; clientIds?: string[] } | null>,
                    UserModel.find({ id: { $in: mentionedIds }, agencyId: agency.id, archived: { $ne: true } })
                        .select("id")
                        .lean() as Promise<Array<{ id: string }>>,
                    ClientModel.find({ id: { $in: mentionedIds }, agencyId: agency.id, archived: { $ne: true } })
                        .select("id")
                        .lean() as Promise<Array<{ id: string }>>,
                ]);
                const linkedClientIds = new Set([
                    ...(projectForMentions?.clientIds || []),
                    ...(projectForMentions?.clientId ? [projectForMentions.clientId] : []),
                ]);
                const validMentionIds = new Set([
                    ...validUsers.map((user) => user.id),
                    ...validClients.map((client) => client.id).filter((clientId) => linkedClientIds.has(clientId)),
                ]);

                for (const mentionedId of mentionedIds) {
                    if (!validMentionIds.has(mentionedId)) continue;
                    recipientNotifications.set(mentionedId, {
                        agencyId: agency.id,
                        userId: mentionedId,
                        message: `${commenterName} mentioned you in a comment on "${task.title}"`,
                        read: false,
                        timestamp,
                        link,
                    });
                }
            }

            if (recipientNotifications.size > 0) {
                await createNotifications([...recipientNotifications.values()], { dedupeWindowMs: 10 * 60 * 1000 });
            }
        }
    } catch (notifError) {
        console.error("[Notification] Failed to create comment notifications:", notifError);
    }

    revalidatePath("/dashboard/projects/[id]", "page");
    revalidatePath("/dashboard/projects");
    return newComment;
}

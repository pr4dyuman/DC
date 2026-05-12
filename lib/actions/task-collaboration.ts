import "server-only";

import { revalidatePath } from "next/cache";
import { sendTaskCommentEmail } from "../brevo-mail";
import { extractMentionedUserIds } from "../mention-utils";
import type { Task, UserPermissions } from "../db";
import { NotificationModel, ActivityModel, TaskModel, UserModel, connectDB } from "../mongodb";
import { getTaskAssigneeIds } from "../task-assignees";
import { sanitizeString } from "../validation";
import { generateId, resolveUserOrClient } from "../utils-server";
import { isNotifEnabled } from "./shared";
import {
    type CommentAgencyContext,
    getAgencyUser,
    getEmailCategories,
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

    const emailCats = getEmailCategories(agency);
    const shouldSendTaskEmail = emailCats.taskUpdates !== false;

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

            if (participantIds.size > 0) {
                const commenterDoc = await getAgencyUser(agency.id, userId);
                const commenterName = commenterDoc?.name || "Someone";
                await NotificationModel.insertMany([...participantIds].map((participantId) => ({
                    id: generateId(),
                    agencyId: agency.id,
                    userId: participantId,
                    message: `${commenterName} commented on "${task.title}": ${text.substring(0, 80)}${text.length > 80 ? "..." : ""}`,
                    read: false,
                    timestamp: new Date().toISOString(),
                    link: `/dashboard/projects/${task.projectId}?task=${taskId}`,
                })));
            }
        }
    } catch (notifError) {
        console.error("[Notification] Failed to create comment notifications:", notifError);
    }

    try {
        const mentionedIds = extractMentionedUserIds(text);
        const filteredMentionIds = mentionedIds.filter((mentionedId) => mentionedId !== userId);
        if (filteredMentionIds.length > 0 && await isNotifEnabled("task")) {
            const alreadyNotified = new Set<string>();
            getTaskAssigneeIds(task).forEach((assigneeId) => alreadyNotified.add(assigneeId));
            if (task.createdBy) alreadyNotified.add(task.createdBy);
            task.comments?.forEach((comment) => alreadyNotified.add(comment.userId));
            alreadyNotified.delete(userId);

            const newMentionIds = filteredMentionIds.filter((mentionedId) => !alreadyNotified.has(mentionedId));
            if (newMentionIds.length > 0) {
                const validUsers = await UserModel.find({ id: { $in: newMentionIds }, agencyId: agency.id })
                    .select("id")
                    .lean() as Array<{ id: string }>;
                const validIds = new Set(validUsers.map((user) => user.id));
                const verifiedIds = newMentionIds.filter((mentionedId) => validIds.has(mentionedId));

                if (verifiedIds.length > 0) {
                    const commenterDoc = await getAgencyUser(agency.id, userId);
                    const commenterName = commenterDoc?.name || "Someone";
                    await NotificationModel.insertMany(verifiedIds.map((mentionedId) => ({
                        id: generateId(),
                        agencyId: agency.id,
                        userId: mentionedId,
                        message: `${commenterName} mentioned you in a comment on "${task.title}"`,
                        read: false,
                        timestamp: new Date().toISOString(),
                        link: `/dashboard/projects/${task.projectId}?task=${taskId}`,
                    })));
                }
            }
        }
    } catch (mentionError) {
        console.error("[Notification] Failed to create mention notifications:", mentionError);
    }

    revalidatePath("/dashboard/projects/[id]", "page");
    revalidatePath("/dashboard/projects");
    return newComment;
}

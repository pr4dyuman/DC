import "server-only";

import type { Activity, Project, Task, User } from "../db";
import { ActivityModel, ProjectModel, TaskModel, UserModel, connectDB } from "../mongodb";
import { resolveUserOrClient } from "../utils-server";
import { sanitizeDoc, withAgencyIdFallback } from "./shared";

type UserQueryActor = {
    id: string;
    role: string;
} | null;

const REDACTED_USER_FIELDS = [
    "salary",
    "adharCardImage",
    "panCardImage",
    "pendingAdharCardImage",
    "pendingPanCardImage",
    "contracts",
    "otherDocuments",
] as const;

function redactSensitiveUserFields<T extends Record<string, unknown>>(value: T, includePassword = false) {
    const clone = { ...value };
    if (includePassword) {
        delete (clone as { password?: unknown }).password;
    }
    for (const field of REDACTED_USER_FIELDS) {
        delete (clone as Record<string, unknown>)[field];
    }
    return clone;
}

function isAdminOrManager(actor: UserQueryActor) {
    return actor?.role === "admin" || actor?.role === "manager";
}

export async function getUsersImpl(actor: UserQueryActor, agencyId: string) {
    await connectDB();

    const usersRaw = await UserModel.find({ agencyId, archived: { $ne: true } }).select("-password").lean();
    const users = usersRaw.map((user) => withAgencyIdFallback(sanitizeDoc(user) as User & { agencyId?: string }, agencyId));

    if (actor?.role === "client") {
        return users.map((user) => redactSensitiveUserFields(user as Record<string, unknown>, true) as User);
    }

    return users.map((user) => {
        if (isAdminOrManager(actor) || user.id === actor?.id) {
            return user as User;
        }
        return redactSensitiveUserFields(user as Record<string, unknown>) as User;
    });
}

export async function getUserImpl(actor: UserQueryActor, agencyId: string | undefined, id: string) {
    const targetUser = await resolveUserOrClient(id, agencyId);
    if (!targetUser || !actor) return undefined;

    if (isAdminOrManager(actor) || actor.id === id) {
        return sanitizeDoc(targetUser) as User;
    }

    return sanitizeDoc(redactSensitiveUserFields(targetUser)) as User;
}

export async function getUserByUsernameImpl(actor: UserQueryActor, agencyId: string | undefined, username: string) {
    const user = await resolveUserOrClient(username, agencyId);
    if (!user || !actor) return undefined;

    if (isAdminOrManager(actor) || actor.id === user.id) {
        return sanitizeDoc(user) as User;
    }

    return sanitizeDoc(redactSensitiveUserFields(user, true)) as User;
}

export async function getUserTasksImpl(agencyId: string, userId: string, offset = 0, limit = 1000) {
    await connectDB();

    const tasksRaw = await TaskModel.find({
        agencyId,
        $or: [{ assigneeId: userId }, { assigneeIds: userId }],
    }).lean();
    const projectIds = [...new Set(tasksRaw.map((task) => task.projectId))];
    const validProjects = await ProjectModel.find({ id: { $in: projectIds }, agencyId }).select("id").lean() as Array<Pick<Project, "id">>;
    const validProjectIdSet = new Set(validProjects.map((project) => project.id));
    const validTasks = tasksRaw.filter((task) => validProjectIdSet.has(task.projectId));

    return validTasks
        .slice(offset, offset + limit)
        .map((task) => withAgencyIdFallback(sanitizeDoc(task) as Task & { agencyId?: string }, agencyId));
}

export async function getUserActivityImpl(agencyId: string, userId: string) {
    await connectDB();

    const activities = await ActivityModel.find({ userId, agencyId })
        .sort({ timestamp: -1 })
        .limit(20)
        .lean();

    return activities.map((activity) => sanitizeDoc(activity) as Activity);
}

export async function getUserContributionHistoryImpl(agencyId: string, userId: string) {
    await connectDB();

    const activities = await ActivityModel.find({ userId, agencyId }).lean();
    return activities.map((activity) => sanitizeDoc(activity) as Activity);
}

import "server-only";

import { type Project, type Task, type UserPermissions, getDefaultUserPermissionsForRole } from "../db";
import { ClientModel, ProjectModel, SettingsModel, TaskModel, UserModel, connectDB } from "../mongodb";
import { sanitizeDoc, withAgencyIdFallback } from "./shared";

type SettingsSnapshot = {
    userPermissions?: Record<string, UserPermissions>;
};

type ProjectTaskSummary = Pick<Task, "projectId" | "status" | "assigneeId">;

async function getPermissionSubjectRole(agencyId: string, userId: string) {
    const user = await UserModel.findOne({ id: userId, agencyId })
        .select("role")
        .lean() as Pick<{ role?: string }, "role"> | null;

    if (user?.role) {
        return user.role;
    }

    const client = await ClientModel.findOne({ id: userId, agencyId })
        .select("id")
        .lean() as { id?: string } | null;

    if (client?.id) {
        return "client";
    }

    return undefined;
}

export async function getTasksImpl(agencyId: string, projectId: string) {
    await connectDB();
    const tasks = await TaskModel.find({ projectId, agencyId }).sort({ createdAt: -1 }).lean() as Task[];
    return tasks.map((task) => sanitizeDoc(task) as Task);
}

export async function getTaskByIdImpl(agencyId: string, taskId: string) {
    await connectDB();
    const task = await TaskModel.findOne({ id: taskId, agencyId }).lean() as Task | null;
    return task ? sanitizeDoc(task) as Task : null;
}

export async function getAllProjectTasksImpl(agencyId: string, scopedProjectIds: string[] | null): Promise<Task[]> {
    await connectDB();
    const taskQuery = scopedProjectIds === null
        ? { agencyId }
        : { agencyId, projectId: { $in: scopedProjectIds || [] } };

    const tasks = await TaskModel.find(taskQuery)
        .select("projectId status assigneeId")
        .lean() as ProjectTaskSummary[];

    return tasks.map((task) => sanitizeDoc(task) as Task);
}

export async function getUserPermissionsImpl(agencyId: string, userId: string): Promise<UserPermissions> {
    await connectDB();
    const defaultPermissions = getDefaultUserPermissionsForRole(await getPermissionSubjectRole(agencyId, userId));
    const settings = await SettingsModel.findOne({ agencyId }).lean() as SettingsSnapshot | null;
    const storedPermissions = settings?.userPermissions?.[userId];
    return storedPermissions
        ? { ...defaultPermissions, ...storedPermissions }
        : defaultPermissions;
}

export async function getHighPriorityTasksImpl(agencyId: string, offset = 0, limit = 5) {
    await connectDB();

    const tasks = await TaskModel.find({ agencyId, status: { $ne: "Done" }, priority: "High" })
        .sort({ dueDate: 1 })
        .skip(offset)
        .limit(limit)
        .lean() as Task[];

    const sanitizedTasks = tasks.map((task) => withAgencyIdFallback(sanitizeDoc(task) as Task & { agencyId?: string }, agencyId));
    const projectIds = [...new Set(sanitizedTasks.map((task) => task.projectId))];
    const projects = await ProjectModel.find({ agencyId, id: { $in: projectIds } })
        .select("id name slug")
        .lean() as Array<Pick<Project, "id" | "name" | "slug">>;

    const projectMap = new Map(
        projects.map((project) => [project.id, { name: project.name, slug: project.slug || project.id }] as const)
    );

    return sanitizedTasks.map((task) => ({
        ...task,
        projectName: projectMap.get(task.projectId)?.name ?? "Unknown Project",
        projectSlug: projectMap.get(task.projectId)?.slug ?? task.projectId,
    }));
}

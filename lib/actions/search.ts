import "server-only";

import type { Client, Project, Task, User } from "../db";
import { ClientModel, ProjectModel, TaskModel, UserModel, connectDB } from "../mongodb";

export type SearchResult = {
    id: string;
    type: "project" | "client" | "task" | "user";
    title: string;
    subtitle?: string;
    url: string;
};

type SearchProjectRecord = Project & { description?: string };
type SearchActor = {
    id: string;
    role: string;
};

function buildScopedProjectFilter(scopedProjectIds: string[] | null) {
    if (scopedProjectIds === null) {
        return {};
    }

    return { id: { $in: scopedProjectIds } };
}

function buildScopedTaskFilter(scopedProjectIds: string[] | null) {
    if (scopedProjectIds === null) {
        return {};
    }

    return { projectId: { $in: scopedProjectIds } };
}

export async function globalSearchImpl(
    query: string,
    agencyId: string,
    scopedProjectIds: string[] | null = null,
    actor?: SearchActor,
): Promise<SearchResult[]> {
    await connectDB();

    const results: SearchResult[] = [];
    const agencyFilter = { agencyId };
    const scopedProjectFilter = buildScopedProjectFilter(scopedProjectIds);
    const scopedTaskFilter = buildScopedTaskFilter(scopedProjectIds);
    const canSearchClients = actor?.role === "admin" || actor?.role === "manager" || actor?.role === "superadmin";
    const canSearchTeam = canSearchClients || actor?.role === "employee";

    const q = query.toLowerCase().trim();
    const isProjectQuery = /^(all\s+)?projects?$|^list\s+projects?$/i.test(q);
    const isClientQuery = /^(all\s+)?clients?$|^list\s+clients?$/i.test(q);
    const isTaskQuery = /^(all\s+)?tasks?$|^list\s+tasks?$/i.test(q);
    const isTeamQuery = /^(all\s+)?(team|employees?|members?|staff|people)$|^list\s+(team|employees?)$/i.test(q);

    if (isProjectQuery) {
        const allProjects = await ProjectModel.find({ ...agencyFilter, ...scopedProjectFilter }).sort({ createdAt: -1 }).limit(15).lean() as SearchProjectRecord[];
        for (const project of allProjects) {
            results.push({
                id: project.id,
                type: "project",
                title: project.name,
                subtitle: `Status: ${project.status || "Active"}`,
                url: `/dashboard/projects/${project.slug || project.id}`,
            });
        }
        return results;
    }

    if (isClientQuery) {
        if (!canSearchClients) return [];

        const allClients = await ClientModel.find({ ...agencyFilter, archived: { $ne: true } }).sort({ createdAt: -1 }).limit(15).select("-password").lean() as Client[];
        for (const client of allClients) {
            results.push({
                id: client.id,
                type: "client",
                title: client.name,
                subtitle: client.companyName,
                url: `/dashboard/clients/${client.username || client.id}`,
            });
        }
        return results;
    }

    if (isTaskQuery) {
        const allTasks = await TaskModel.find({ ...agencyFilter, ...scopedTaskFilter }).sort({ createdAt: -1 }).limit(15).lean() as Task[];
        for (const task of allTasks) {
            results.push({
                id: task.id,
                type: "task",
                title: task.title,
                subtitle: task.status,
                url: `/dashboard/projects/${task.projectId}?task=${task.id}`,
            });
        }
        return results;
    }

    if (isTeamQuery) {
        if (!canSearchTeam) return [];

        const allUsers = await UserModel.find({ ...agencyFilter, archived: { $ne: true } }).sort({ createdAt: -1 }).limit(15).select("-password").lean() as User[];
        for (const user of allUsers) {
            results.push({
                id: user.id,
                type: "user",
                title: user.name,
                subtitle: user.role,
                url: `/dashboard/team/${user.username || user.id}`,
            });
        }
        return results;
    }

    const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(escapedQuery, "i");

    const projects = await ProjectModel.find({
        ...agencyFilter,
        ...scopedProjectFilter,
        $or: [{ name: regex }, { client: regex }],
    }).limit(5).lean() as SearchProjectRecord[];

    for (const project of projects) {
        const clientDoc = project.clientId
            ? await ClientModel.findOne({ id: project.clientId, ...agencyFilter }).select("-password").lean() as Pick<Client, "name"> | null
            : null;
        const clientName = clientDoc ? clientDoc.name : (project.client || "");
        results.push({
            id: project.id,
            type: "project",
            title: project.name,
            subtitle: clientName ? `Client: ${clientName}` : "",
            url: `/dashboard/projects/${project.slug || project.id}`,
        });
    }

    if (canSearchClients) {
        const clients = await ClientModel.find({
            ...agencyFilter,
            archived: { $ne: true },
            $or: [{ name: regex }, { companyName: regex }],
        }).limit(5).select("-password").lean() as Client[];

        for (const client of clients) {
            results.push({
                id: client.id,
                type: "client",
                title: client.name,
                subtitle: client.companyName,
                url: `/dashboard/clients/${client.username || client.id}`,
            });
        }
    }

    const tasks = await TaskModel.find({
        ...agencyFilter,
        ...scopedTaskFilter,
        $or: [{ title: regex }, { description: regex }],
    }).limit(5).lean() as Task[];

    for (const task of tasks) {
        const taskProject = await ProjectModel.findOne({ id: task.projectId, ...agencyFilter }).select("slug id").lean() as Pick<Project, "slug" | "id"> | null;
        const projectSlug = taskProject ? (taskProject.slug || taskProject.id) : task.projectId;
        results.push({
            id: task.id,
            type: "task",
            title: task.title,
            subtitle: task.status,
            url: `/dashboard/projects/${projectSlug}?task=${task.id}`,
        });
    }

    if (canSearchTeam) {
        const users = await UserModel.find({
            ...agencyFilter,
            archived: { $ne: true },
            $or: [{ name: regex }, { email: regex }],
        }).limit(5).select("-password").lean() as User[];

        for (const user of users) {
            results.push({
                id: user.id,
                type: "user",
                title: user.name,
                subtitle: user.role,
                url: `/dashboard/team/${user.username || user.id}`,
            });
        }
    }

    return results.slice(0, 10);
}

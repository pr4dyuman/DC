import "server-only";

import type { Task, User } from "../db";
import { ClientModel, ProjectModel, ServiceModel, TaskModel, UserModel, connectDB } from "../mongodb";
import { sanitizeDoc, withAgencyIdFallback } from "./shared";
import { hydrateProjectsWithCurrentClients, type ProjectLike } from "./projects-shared";

type ProjectQueryActor = {
    id: string;
    role: string;
};

type ProjectDirectoryProject = {
    id: string;
    clientId?: string;
};

type ProjectDirectoryTask = {
    assigneeId?: string;
    createdBy?: string;
    comments?: Array<{ userId?: string }>;
};

type ProjectDirectoryService = {
    employees?: string[];
};

type ProjectDirectoryUser = {
    id: string;
    agencyId?: string;
    name: string;
    email: string;
    role: User["role"];
    username?: string;
    avatar?: string;
    jobTitle?: string;
    employmentType?: User["employmentType"];
};

type ProjectDirectoryClient = {
    id: string;
    agencyId?: string;
    name: string;
    email: string;
    username?: string;
    companyName?: string;
    logo?: string;
};

export async function getProjectsImpl(
    agencyId: string,
    actor: ProjectQueryActor,
    offset = 0,
    limit = 1000,
    scopedProjectIds: string[] | null = null
) {
    await connectDB();

    const query: Record<string, unknown> = { agencyId };
    if (actor.role === "client") {
        query.clientId = actor.id;
    } else if (actor.role === "employee") {
        query.id = { $in: scopedProjectIds || [] };
    }

    const projects = await ProjectModel.find(query).skip(offset).limit(limit).lean() as ProjectLike[];
    const hydratedProjects = await hydrateProjectsWithCurrentClients(projects, agencyId);
    return hydratedProjects.map((project) => withAgencyIdFallback(sanitizeDoc(project) as ProjectLike & { agencyId?: string }, agencyId));
}

export async function getUserProjectsImpl(agencyId: string, userId: string) {
    await connectDB();

    const isClient = await ClientModel.exists({ id: userId, agencyId });
    if (isClient) {
        const projects = await ProjectModel.find({ clientId: userId, agencyId }).lean() as ProjectLike[];
        const hydratedProjects = await hydrateProjectsWithCurrentClients(projects, agencyId);
        return hydratedProjects.map((project) => withAgencyIdFallback(sanitizeDoc(project) as ProjectLike & { agencyId?: string }, agencyId));
    }

    const taskProjectIds = await TaskModel.distinct("projectId", { assigneeId: userId, agencyId });
    const projects = await ProjectModel.find({ id: { $in: taskProjectIds }, agencyId }).lean() as ProjectLike[];
    const hydratedProjects = await hydrateProjectsWithCurrentClients(projects, agencyId);
    return hydratedProjects.map((project) => withAgencyIdFallback(sanitizeDoc(project) as ProjectLike & { agencyId?: string }, agencyId));
}

export async function getProjectImpl(agencyId: string, id: string) {
    await connectDB();
    const project = await ProjectModel.findOne({ id, agencyId }).lean() as ProjectLike | null;
    if (!project) return undefined;
    const [hydratedProject] = await hydrateProjectsWithCurrentClients([project], agencyId);
    return withAgencyIdFallback(sanitizeDoc(hydratedProject) as ProjectLike & { agencyId?: string }, agencyId);
}

export async function getProjectBySlugImpl(agencyId: string, slug: string) {
    await connectDB();
    const project = await ProjectModel.findOne({ $or: [{ slug }, { id: slug }], agencyId }).lean() as ProjectLike | null;
    if (!project) return undefined;
    const [hydratedProject] = await hydrateProjectsWithCurrentClients([project], agencyId);
    return withAgencyIdFallback(sanitizeDoc(hydratedProject) as ProjectLike & { agencyId?: string }, agencyId);
}

export async function getProjectDirectoryUsersImpl(agencyId: string, projectId: string, sessionUserId?: string | null) {
    await connectDB();

    const [project, tasks, services] = await Promise.all([
        ProjectModel.findOne({ id: projectId, agencyId }).select("id clientId").lean() as Promise<ProjectDirectoryProject | null>,
        TaskModel.find({ projectId, agencyId }).select("assigneeId createdBy comments").lean() as Promise<ProjectDirectoryTask[]>,
        ServiceModel.find({ projectId, agencyId }).select("employees").lean() as Promise<ProjectDirectoryService[]>,
    ]);

    if (!project) throw new Error("Project not found");

    const directoryUserIds = new Set<string>();
    if (sessionUserId) directoryUserIds.add(sessionUserId);

    tasks.forEach((task) => {
        if (task.assigneeId) directoryUserIds.add(task.assigneeId);
        if (task.createdBy) directoryUserIds.add(task.createdBy);
        task.comments?.forEach((comment) => {
            if (comment?.userId) directoryUserIds.add(comment.userId);
        });
    });

    services.forEach((service) => {
        service.employees?.forEach((employeeId) => {
            if (employeeId) directoryUserIds.add(employeeId);
        });
    });

    const teamUsersRaw = directoryUserIds.size > 0
        ? await UserModel.find({
            id: { $in: Array.from(directoryUserIds) },
            agencyId,
            archived: { $ne: true },
        }).select("id agencyId name email role username avatar jobTitle employmentType").lean() as ProjectDirectoryUser[]
        : [];

    const teamUsers = teamUsersRaw.map((user) => withAgencyIdFallback(sanitizeDoc(user) as ProjectDirectoryUser & { agencyId?: string }, agencyId));

    if (!project.clientId) {
        return teamUsers;
    }

    const client = await ClientModel.findOne({
        id: project.clientId,
        agencyId,
        archived: { $ne: true },
    }).select("id agencyId name email username companyName logo").lean() as ProjectDirectoryClient | null;

    if (!client) {
        return teamUsers;
    }

    return [
        ...teamUsers,
        {
            id: client.id,
            agencyId: client.agencyId || agencyId,
            name: client.name,
            email: client.email,
            role: "client" as const,
            username: client.username || client.id,
            avatar: client.logo || "",
            jobTitle: client.companyName || "",
        },
    ];
}

export async function getProjectTasksImpl(agencyId: string, projectIds: string[]) {
    await connectDB();
    const tasks = await TaskModel.find({ projectId: { $in: projectIds }, agencyId }).lean();
    return tasks.map((task) => withAgencyIdFallback(sanitizeDoc(task) as Task & { agencyId?: string }, agencyId));
}

export async function getClientCreatedTasksImpl(agencyId: string, userId: string) {
    await connectDB();
    const tasks = await TaskModel.find({ createdBy: userId, agencyId }).sort({ createdAt: -1 }).lean();
    return tasks.map((task) => withAgencyIdFallback(sanitizeDoc(task) as Task & { agencyId?: string }, agencyId));
}

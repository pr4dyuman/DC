import "server-only";

import { revalidatePath } from "next/cache";
import type { Task, User, UserPermissions } from "../db";
import {
    sendTaskAssignedEmail,
} from "../brevo-mail";
import { DEFAULT_TASK_EMAIL_EVENTS } from "../email-constants";
import { sanitizeMongoInput, sanitizeName, sanitizeString, sanitizeUpdates } from "../validation";
import { generateId } from "../utils-server";
import {
    ActivityModel,
    ClientModel,
    NotificationModel,
    ProjectModel,
    ServiceModel,
    TaskModel,
    UserModel,
    connectDB,
} from "../mongodb";
import { isNotifEnabled, sanitizeDoc } from "./shared";
import {
    buildProjectServiceLookupQuery,
    buildNormalizedProjectServiceConfigs,
    getActiveProjectServiceDocs,
    mapProjectServicesByProjectId,
    type ProjectServiceOwnerSnapshot,
    type ProjectServiceSnapshot,
} from "./projects-shared";
import {
    type CommentAgencyContext,
    getAgencyUser,
    getEmailCategories,
    getProjectSummary,
    type TaskEffectRecord,
    type TaskMutationActor,
    type TaskMutationUser,
} from "./task-shared";
import {
    handleTaskAssignmentChangeEffectsImpl,
    handleTaskStatusChangeEffectsImpl,
} from "./task-effects";

export { addCommentImpl, deleteTaskImpl } from "./task-collaboration";

async function ensureProjectServiceReferenceForTask(
    projectId: string,
    agencyId: string,
    rawServiceRef: string,
    assigneeId?: string
): Promise<ProjectServiceSnapshot | null> {
    const normalizedServiceRef = sanitizeName(String(rawServiceRef || ""), 200);
    if (!normalizedServiceRef) return null;

    // Reject UUID-like strings — the AI sometimes passes IDs as category names
    const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (UUID_PATTERN.test(normalizedServiceRef)) return null;

    const projectDoc = await ProjectModel.findOne({ id: projectId, agencyId })
        .select("id services serviceConfigs")
        .lean() as ProjectServiceOwnerSnapshot | null;

    if (!projectDoc) throw new Error("Project not found");

    const serviceLookupQuery = buildProjectServiceLookupQuery([projectDoc]);
    const serviceCandidates = serviceLookupQuery
        ? await ServiceModel.find({ agencyId, ...serviceLookupQuery })
            .select("id name projectId employees agencyId")
            .lean() as ProjectServiceSnapshot[]
        : [];
    const existingServices = mapProjectServicesByProjectId([projectDoc], serviceCandidates).get(projectId) || [];
    const serviceById = new Map(existingServices.map((service) => [String(service.id), service] as const));
    const serviceByName = new Map(existingServices.map((service) => [String(service.name).toLowerCase(), service] as const));
    let resolvedService = serviceById.get(normalizedServiceRef) || serviceByName.get(normalizedServiceRef.toLowerCase());

    if (!resolvedService) {
        resolvedService = {
            id: generateId(),
            agencyId,
            name: normalizedServiceRef,
            projectId,
            employees: assigneeId ? [assigneeId] : [],
        };
        await ServiceModel.create(resolvedService);
        existingServices.push(resolvedService);
    } else if (assigneeId) {
        // Add assignee to existing service if not already a member
        const currentEmployees = resolvedService.employees || [];
        if (!currentEmployees.includes(assigneeId)) {
            await ServiceModel.updateOne(
                { id: resolvedService.id, agencyId },
                { $addToSet: { employees: assigneeId } }
            );
        }
    }

    const activeServices = getActiveProjectServiceDocs(projectDoc.services, existingServices);
    const finalServices = activeServices.some((service) => service.id === resolvedService!.id)
        ? activeServices
        : [...activeServices, resolvedService];

    await ProjectModel.updateOne(
        { id: projectId, agencyId },
        {
            $set: {
                services: finalServices.map((service) => service.id),
                serviceConfigs: buildNormalizedProjectServiceConfigs(finalServices, projectDoc.serviceConfigs),
            },
        }
    );

    return resolvedService;
}

export async function createTaskImpl(
    task: Omit<TaskEffectRecord, "id" | "agencyId">,
    agency: CommentAgencyContext,
    currentUser: TaskMutationActor
) {
    await connectDB();

    task = sanitizeMongoInput(task);
    task.title = sanitizeName(task.title, 500);
    if (!task.title) throw new Error("Task title is required");
    if (typeof task.category === "string") {
        task.category = sanitizeName(task.category, 200) || undefined;
    }
    if (task.description) {
        task.description = sanitizeString(task.description, 10000);
    }
    if (!task.projectId) throw new Error("Project is required");
    task.assigneeId = typeof task.assigneeId === "string" ? task.assigneeId.trim() : "";

    const projectExists = await ProjectModel.exists({ id: task.projectId, agencyId: agency.id });
    if (!projectExists) throw new Error(`Project with ID ${task.projectId} not found`);

    if (task.assigneeId) {
        const userExists = await UserModel.exists({ id: task.assigneeId, agencyId: agency.id });
        if (!userExists) throw new Error(`User with ID ${task.assigneeId} not found`);
    }

    if (task.category) {
        const canonicalService = await ensureProjectServiceReferenceForTask(task.projectId, agency.id, task.category, task.assigneeId);
        if (canonicalService?.name) task.category = canonicalService.name;
    }

    const newTask: TaskEffectRecord = {
        ...task,
        id: generateId(),
        agencyId: agency.id,
        createdAt: new Date().toISOString(),
        createdBy: currentUser.id,
        comments: [],
    };

    await TaskModel.create(newTask);

    await ActivityModel.create({
        id: generateId(),
        agencyId: agency.id,
        user: currentUser.name,
        userId: currentUser.id,
        action: "created task",
        target: task.title,
        timestamp: new Date().toISOString(),
    });

    const emailCats = getEmailCategories(agency);
    const taskEmailEvents = emailCats.taskEmailEvents || {};
    const createdEventConfig = { ...DEFAULT_TASK_EMAIL_EVENTS.taskCreated, ...taskEmailEvents.taskCreated };
    const shouldSendTaskEmail = emailCats.taskUpdates !== false && createdEventConfig.enabled;

    if (shouldSendTaskEmail) {
        try {
            const assignee = task.assigneeId ? await getAgencyUser(agency.id, task.assigneeId) : null;
            const project = await getProjectSummary(agency.id, task.projectId);

            if (createdEventConfig.notifyAssignee && task.assigneeId && assignee?.email && project) {
                await sendTaskAssignedEmail({
                    assigneeEmail: assignee.email,
                    assigneeName: assignee.name,
                    taskTitle: task.title,
                    taskDescription: task.description || "",
                    projectName: project.name,
                    dueDate: task.dueDate || "",
                    priority: task.priority || "Medium",
                    taskLink: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/dashboard/projects/${task.projectId}?task=${newTask.id}`,
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
                        taskTitle: task.title,
                        taskDescription: task.description || "",
                        projectName: project.name,
                        dueDate: task.dueDate || "",
                        priority: task.priority || "Medium",
                        taskLink: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/dashboard/projects/${task.projectId}?task=${newTask.id}`,
                    });
                }
            }
        } catch (emailError) {
            console.error("[Email] Failed to send task creation email:", emailError);
        }
    }

    if (task.assigneeId && await isNotifEnabled("task")) {
        await NotificationModel.create({
            id: generateId(),
            agencyId: agency.id,
            userId: task.assigneeId,
            message: `You've been assigned a new task: "${task.title}"`,
            read: false,
            timestamp: new Date().toISOString(),
            link: `/dashboard/projects/${task.projectId}?task=${newTask.id}`,
        });
    }

    const adminsForNewTask = await UserModel.find({ agencyId: agency.id, role: { $in: ["admin", "manager"] } })
        .select("id")
        .lean() as Array<Pick<User, "id">>;
    const adminNewTaskNotifs = adminsForNewTask
        .filter((admin) => admin.id !== currentUser.id)
        .map((admin) => ({
            id: generateId(),
            agencyId: agency.id,
            userId: admin.id,
            message: `${currentUser.name} created a new task: "${task.title}"`,
            read: false,
            timestamp: new Date().toISOString(),
            link: `/dashboard/projects/${task.projectId}?task=${newTask.id}`,
        }));
    if (adminNewTaskNotifs.length > 0 && await isNotifEnabled("task")) {
        await NotificationModel.insertMany(adminNewTaskNotifs);
    }

    revalidatePath("/dashboard/projects/[id]", "page");
    revalidatePath("/dashboard/projects");
    return sanitizeDoc(newTask);
}

export async function updateTaskStatusImpl(
    taskId: string,
    status: Task["status"],
    completedAt: string | undefined,
    agency: CommentAgencyContext,
    currentUser: TaskMutationActor,
    permissions: Pick<UserPermissions, "canMarkDone" | "canManageTasks">
) {
    const validStatuses: Task["status"][] = ["Todo", "In Progress", "Review", "Done"];
    if (!validStatuses.includes(status)) {
        throw new Error(`Invalid task status: ${status}`);
    }

    await connectDB();

    if (status === "Done") {
        if (!permissions.canMarkDone) {
            throw new Error("Unauthorized: You do not have permission to mark tasks as Done.");
        }
    } else if (!permissions.canManageTasks) {
        throw new Error("Unauthorized: You do not have permission to manage tasks.");
    }

    const updateFields: { status: Task["status"]; updatedAt?: string } = { status };
    if (completedAt) {
        updateFields.updatedAt = new Date(completedAt).toISOString();
    }

    const task = await TaskModel.findOneAndUpdate(
        { id: taskId, agencyId: agency.id },
        { $set: updateFields },
        { returnDocument: "before", lean: true, timestamps: completedAt ? false : true }
    ) as Task | null;
    if (!task) throw new Error("Task not found");

    const currentTask: TaskEffectRecord = {
        ...task,
        id: task.id,
        status,
        updatedAt: completedAt ? new Date(completedAt).toISOString() : task.updatedAt,
    };

    await handleTaskStatusChangeEffectsImpl({
        previousTask: task,
        currentTask,
        agency,
        userName: currentUser.name,
        userId: currentUser.id,
        completedAt,
    });
}

export async function updateTaskImpl(
    taskId: string,
    updates: Partial<Task>,
    agency: CommentAgencyContext,
    currentUser: TaskMutationUser,
    permissions: Pick<UserPermissions, "canMarkDone" | "canManageTasks">
) {
    await connectDB();

    updates = sanitizeUpdates(updates) as Partial<Task>;
    if (updates.title) updates.title = sanitizeName(updates.title, 500);
    if (typeof updates.category === "string") updates.category = sanitizeName(updates.category, 200) || undefined;
    if (updates.description) updates.description = sanitizeString(updates.description, 10000);
    const requestedAssigneeChange = Object.prototype.hasOwnProperty.call(updates, "assigneeId");
    if (requestedAssigneeChange) {
        updates.assigneeId = typeof updates.assigneeId === "string" ? updates.assigneeId.trim() : "";
    }

    if (updates.status === "Done" && !permissions.canMarkDone) {
        throw new Error("Unauthorized: You do not have permission to mark tasks as Done.");
    }
    const isStatusOnly = Object.keys(updates).length === 1 && typeof updates.status === "string";
    if ((!isStatusOnly || (updates.status && updates.status !== "Done")) && !permissions.canManageTasks) {
        throw new Error("Unauthorized: You do not have permission to edit tasks.");
    }

    if (updates.projectId) {
        const projectExists = await ProjectModel.exists({ id: updates.projectId, agencyId: agency.id });
        if (!projectExists) throw new Error(`Project with ID ${updates.projectId} not found`);
    }
    if (updates.assigneeId) {
        const userExists = await UserModel.exists({ id: updates.assigneeId, agencyId: agency.id });
        if (!userExists) throw new Error(`User with ID ${updates.assigneeId} not found`);
    }

    const task = await TaskModel.findOne({ id: taskId, agencyId: agency.id }).lean() as Task | null;
    if (!task) throw new Error("Task not found");

    if (requestedAssigneeChange && updates.assigneeId !== task.assigneeId) {
        const canReassignTask = currentUser.role === "admin" || currentUser.role === "manager";
        if (!canReassignTask) {
            throw new Error("Unauthorized: Only admins and managers can change task assignees.");
        }
    }

    const targetProjectId = updates.projectId || task.projectId;
    const categoryToSync = typeof updates.category === "string"
        ? updates.category
        : (updates.projectId ? task.category : undefined);
    if (targetProjectId && categoryToSync) {
        const resolvedAssigneeId = Object.prototype.hasOwnProperty.call(updates, "assigneeId") ? updates.assigneeId : task.assigneeId;
        const canonicalService = await ensureProjectServiceReferenceForTask(targetProjectId, agency.id, categoryToSync, resolvedAssigneeId);
        if (canonicalService?.name) {
            updates.category = canonicalService.name;
        }
    }

    await TaskModel.updateOne(
        { id: taskId, agencyId: agency.id },
        { $set: updates },
        { runValidators: true }
    );
    const currentTask: TaskEffectRecord = {
        ...task,
        ...updates,
        id: task.id,
        projectId: targetProjectId,
        assigneeId: Object.prototype.hasOwnProperty.call(updates, "assigneeId") ? updates.assigneeId : task.assigneeId,
        title: typeof updates.title === "string" ? updates.title : task.title,
        category: Object.prototype.hasOwnProperty.call(updates, "category") ? updates.category : task.category,
        description: Object.prototype.hasOwnProperty.call(updates, "description") ? updates.description : task.description,
        dueDate: Object.prototype.hasOwnProperty.call(updates, "dueDate") ? updates.dueDate : task.dueDate,
        priority: Object.prototype.hasOwnProperty.call(updates, "priority") ? updates.priority : task.priority,
        status: typeof updates.status === "string" ? updates.status : task.status,
    };

    const changedKeys = Object.keys(updates);
    const hasStatusChange = typeof updates.status === "string" && updates.status !== task.status;
    const hasAssigneeChange = Object.prototype.hasOwnProperty.call(updates, "assigneeId") && updates.assigneeId !== task.assigneeId;

    if (hasStatusChange) {
        await handleTaskStatusChangeEffectsImpl({
            previousTask: task,
            currentTask,
            agency,
            userName: currentUser.name,
            userId: currentUser.id,
        });
    }

    if (hasAssigneeChange) {
        await handleTaskAssignmentChangeEffectsImpl({
            previousTask: task,
            currentTask,
            agency,
            userName: currentUser.name,
            userId: currentUser.id,
        });
    }

    const hasNonStatusChanges = changedKeys.some((key) => key !== "status");
    if (hasNonStatusChanges || !hasStatusChange) {
        await ActivityModel.create({
            id: generateId(),
            agencyId: agency.id,
            user: currentUser.name,
            userId: currentUser.id,
            action: "updated task",
            target: currentTask.title,
            timestamp: new Date().toISOString(),
            entityId: task.id,
            entityType: "task",
        });
    }

    revalidatePath("/dashboard/projects/[id]", "page");
    revalidatePath("/dashboard/projects");
}

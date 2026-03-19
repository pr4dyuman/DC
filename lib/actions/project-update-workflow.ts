import "server-only";

import { revalidatePath } from "next/cache";
import { sendProjectStatusChangedEmail } from "../brevo-mail";
import { generateId } from "../utils-server";
import { sanitizeName, sanitizeString, sanitizeUpdates } from "../validation";
import {
    ClientModel,
    NotificationModel,
    ProjectModel,
    ServiceModel,
    TaskModel,
    connectDB,
} from "../mongodb";
import { isNotifEnabled } from "./shared";
import {
    buildProjectServiceLookupQuery,
    buildNormalizedProjectServiceConfigs,
    mapProjectServicesByProjectId,
    resolveProjectClientFields,
    type ProjectLike,
    type ProjectServiceConfigSnapshot,
    type ProjectServiceOwnerSnapshot,
    type ProjectServiceSnapshot,
} from "./projects-shared";
import type { Project } from "../db";

async function syncProjectServicesImpl(
    projectId: string,
    agencyId: string,
    rawServiceRefs: unknown[]
): Promise<{ services: string[]; serviceConfigs: ProjectServiceConfigSnapshot[] }> {
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
    const desiredServiceNames: string[] = [];
    const desiredNamesLower = new Set<string>();

    for (const rawRef of Array.isArray(rawServiceRefs) ? rawServiceRefs : []) {
        const normalizedRef = sanitizeName(String(rawRef || ""), 200);
        if (!normalizedRef) continue;

        const existingService = serviceById.get(normalizedRef) || serviceByName.get(normalizedRef.toLowerCase());
        const canonicalName = existingService?.name || normalizedRef;
        const canonicalNameLower = canonicalName.toLowerCase();
        if (desiredNamesLower.has(canonicalNameLower)) continue;

        desiredNamesLower.add(canonicalNameLower);
        desiredServiceNames.push(canonicalName);
    }

    const removedServices = existingServices.filter((service) => !desiredNamesLower.has(String(service.name).toLowerCase()));
    if (removedServices.length > 0) {
        const removedNames = removedServices.map((service) => service.name);
        const taskCounts = await TaskModel.aggregate([
            { $match: { agencyId, projectId, category: { $in: removedNames } } },
            { $group: { _id: "$category", count: { $sum: 1 } } },
        ]) as Array<{ _id: string; count: number }>;
        const taskCountByName = new Map(taskCounts.map((item) => [String(item._id), Number(item.count)] as const));
        const blockingServices = removedServices
            .map((item) => ({ service: item, count: taskCountByName.get(item.name) || 0 }))
            .filter((item) => item.count > 0);

        if (blockingServices.length > 0) {
            const details = blockingServices.map((item) => `"${item.service.name}" (${item.count})`).join(", ");
            throw new Error(`Cannot remove service(s) still used by tasks: ${details}. Reassign those tasks first.`);
        }
    }

    const newServices = desiredServiceNames
        .filter((serviceName) => !serviceByName.has(serviceName.toLowerCase()))
        .map((serviceName) => ({
            id: generateId(),
            agencyId,
            name: serviceName,
            projectId,
            employees: [],
        }));

    if (newServices.length > 0) {
        await ServiceModel.insertMany(newServices);
    }

    if (removedServices.length > 0) {
        await ServiceModel.deleteMany({
            agencyId,
            id: { $in: removedServices.map((service) => service.id) },
        });
    }

    const createdServiceByName = new Map(newServices.map((service) => [service.name.toLowerCase(), service] as const));
    const finalServices = desiredServiceNames
        .map((serviceName) => serviceByName.get(serviceName.toLowerCase()) || createdServiceByName.get(serviceName.toLowerCase()))
        .filter((service): service is ProjectServiceSnapshot => Boolean(service));

    return {
        services: finalServices.map((service) => service.id),
        serviceConfigs: buildNormalizedProjectServiceConfigs(finalServices, projectDoc.serviceConfigs),
    };
}

export async function updateProjectImpl(
    id: string,
    updates: Partial<ProjectLike>,
    agencyId: string
) {
    await connectDB();

    updates = sanitizeUpdates(updates) as Partial<Project>;
    if (updates.name) updates.name = sanitizeName(updates.name, 300);
    if (typeof updates.client === "string") updates.client = sanitizeName(updates.client, 200) || undefined;
    if (updates.description) updates.description = sanitizeString(updates.description, 10000);

    const oldProject = await ProjectModel.findOne({ id, agencyId }).lean() as ProjectLike | null;

    if (updates.status === "Completed") {
        const openCount = await TaskModel.countDocuments({ projectId: id, agencyId, status: { $ne: "Done" } });
        if (openCount > 0) {
            console.warn(`Warning: Marking project as Completed with ${openCount} unfinished tasks.`);
        }
    }

    const setUpdates: Record<string, unknown> = { ...updates };
    const unsetUpdates: Record<string, ""> = {};

    if (Object.prototype.hasOwnProperty.call(setUpdates, "clientId")) {
        const clientFields = await resolveProjectClientFields(setUpdates.clientId, agencyId);
        delete setUpdates.clientId;
        delete setUpdates.client;
        if (clientFields.unsetClient) {
            unsetUpdates.clientId = "";
            unsetUpdates.client = "";
        } else {
            setUpdates.clientId = clientFields.clientId;
            setUpdates.client = clientFields.client;
        }
    }

    if (Array.isArray(setUpdates.services)) {
        const normalizedServices = await syncProjectServicesImpl(id, agencyId, setUpdates.services);
        setUpdates.services = normalizedServices.services;
        setUpdates.serviceConfigs = normalizedServices.serviceConfigs;
    }

    if (Object.prototype.hasOwnProperty.call(setUpdates, "status")) {
        unsetUpdates.clientArchiveHold = "";
        unsetUpdates.clientArchiveHoldAt = "";
    }

    if (Object.keys(setUpdates).length > 0 || Object.keys(unsetUpdates).length > 0) {
        await ProjectModel.updateOne(
            { id, agencyId },
            {
                ...(Object.keys(setUpdates).length > 0 ? { $set: setUpdates } : {}),
                ...(Object.keys(unsetUpdates).length > 0 ? { $unset: unsetUpdates } : {}),
            }
        );
    }

    if (updates.status && oldProject && oldProject.status !== updates.status && oldProject.clientId && await isNotifEnabled("project")) {
        const statusMessages: Record<string, string> = {
            Active: "is now active and in progress",
            Completed: "has been completed",
            "On Hold": "has been put on hold",
            Cancelled: "has been cancelled",
        };
        await NotificationModel.create({
            id: generateId(),
            agencyId,
            userId: oldProject.clientId,
            message: `Project "${oldProject.name}" ${statusMessages[updates.status] || `status updated to ${updates.status}`}`,
            read: false,
            timestamp: new Date().toISOString(),
            link: `/dashboard/projects/${id}`,
        });
    }

    if (updates.status && oldProject && oldProject.status !== updates.status && oldProject.clientId) {
        try {
            const client = await ClientModel.findOne({ id: oldProject.clientId, agencyId })
                .select("email name")
                .lean() as { email?: string; name?: string } | null;
            if (client?.email && client.name) {
                const statusMessages: Record<string, string> = {
                    Active: "is now active and in progress",
                    Completed: "has been completed",
                    "On Hold": "has been put on hold",
                    Cancelled: "has been cancelled",
                };

                await sendProjectStatusChangedEmail({
                    clientEmail: client.email,
                    clientName: client.name,
                    projectName: oldProject.name,
                    oldStatus: oldProject.status,
                    newStatus: updates.status,
                    statusMessage: statusMessages[updates.status] || `status updated to ${updates.status}`,
                    projectLink: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/dashboard/projects/${id}`,
                });
            }
        } catch (emailError) {
            console.error("[Email] Failed to send project status change email:", emailError);
        }
    }

    revalidatePath("/dashboard/projects");
    revalidatePath(`/dashboard/projects/${id}`);
}

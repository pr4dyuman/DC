import "server-only";

import type { Client } from "../db";
import { ClientModel, ProjectModel, ServiceModel, connectDB } from "../mongodb";
import { sanitizeDoc, withAgencyIdFallback } from "./shared";
import {
    buildProjectServiceLookupQuery,
    hydrateProjectsWithCurrentClients,
    hydrateProjectsWithCurrentServiceNames,
    type ProjectLike,
    type ProjectServiceSnapshot,
} from "./projects-shared";

type ClientQueryActor = {
    id: string;
    role: string;
};

export async function getClientsImpl(agencyId: string) {
    await connectDB();
    const clients = await ClientModel.find({ agencyId, archived: { $ne: true } }).select("-password").lean();
    return clients.map(sanitizeDoc);
}

export async function getClientByUsernameImpl(actor: ClientQueryActor, agencyId: string, username: string) {
    await connectDB();
    const client = await ClientModel.findOne({
        agencyId,
        $or: [{ username }, { id: username }],
    }).select("-password").lean() as Client | null;

    if (actor.role === "client" && client && String(client.id) !== actor.id) {
        throw new Error("Unauthorized: You can only view your own client profile.");
    }

    return client ? sanitizeDoc(client) : null;
}

export async function getClientByIdImpl(agencyId: string, id: string) {
    await connectDB();
    const client = await ClientModel.findOne({ id, agencyId }).select("-password").lean();
    return client ? sanitizeDoc(client) : null;
}

export async function getClientProjectsImpl(
    actor: ClientQueryActor,
    agencyId: string,
    clientId: string,
    offset = 0,
    limit = 1000
) {
    const isPrivileged = actor.role === "admin" || actor.role === "manager";
    const isSelfClient = actor.role === "client" && actor.id === clientId;

    if (!isPrivileged && !isSelfClient) {
        throw new Error("Unauthorized: You do not have permission to view this client's projects.");
    }

    await connectDB();
    const projects = await ProjectModel.find({
        $or: [{ clientId }, { clientIds: clientId }],
        agencyId,
    }).skip(offset).limit(limit).lean() as ProjectLike[];
    const hydratedProjects = await hydrateProjectsWithCurrentClients(projects, agencyId);
    const serviceLookupQuery = buildProjectServiceLookupQuery(hydratedProjects);
    const services = serviceLookupQuery
        ? await ServiceModel.find({ agencyId, ...serviceLookupQuery })
            .select("id name projectId employees agencyId")
            .lean() as ProjectServiceSnapshot[]
        : [];
    const normalizedProjects = hydrateProjectsWithCurrentServiceNames(hydratedProjects, services);

    return normalizedProjects.map((project) => withAgencyIdFallback(sanitizeDoc(project) as ProjectLike & { agencyId?: string }, agencyId));
}

import "server-only";

import { ProjectModel, ServiceModel, TaskModel, connectDB } from "../mongodb";
import { sanitizeDoc } from "./shared";
import {
    buildProjectServiceLookupQuery,
    getActiveProjectServiceDocs,
    mapProjectServicesByProjectId,
    type ProjectServiceOwnerSnapshot,
    type ProjectServiceSnapshot,
} from "./projects-shared";

export async function getServicesImpl(agencyId: string, scopedProjectIds: string[] | null) {
    await connectDB();

    const serviceQuery = scopedProjectIds === null
        ? { agencyId }
        : { agencyId, projectId: { $in: scopedProjectIds || [] } };

    const services = await ServiceModel.find(serviceQuery).lean();
    return services.map(sanitizeDoc);
}

export async function getProjectServicesImpl(agencyId: string, projectId: string) {
    await connectDB();

    const project = await ProjectModel.findOne({ id: projectId, agencyId })
        .select("id services serviceConfigs")
        .lean() as ProjectServiceOwnerSnapshot | null;

    if (!project) return [];

    const serviceLookupQuery = buildProjectServiceLookupQuery([project]);
    const services = serviceLookupQuery
        ? await ServiceModel.find({ agencyId, ...serviceLookupQuery }).lean() as ProjectServiceSnapshot[]
        : [];
    const servicesByProjectId = mapProjectServicesByProjectId([project], services);
    return getActiveProjectServiceDocs(project.services, servicesByProjectId.get(projectId) || []).map(sanitizeDoc);
}

export async function getServiceTaskCountImpl(agencyId: string, projectId: string, serviceName: string) {
    await connectDB();
    return TaskModel.countDocuments({ agencyId, projectId, category: serviceName });
}

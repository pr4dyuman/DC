import "server-only";

import { ProjectModel, ServiceModel, TaskModel, connectDB } from "../mongodb";
import { sanitizeDoc } from "./shared";
import { getActiveProjectServiceDocs, type ProjectServiceSnapshot } from "./projects-shared";

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

    const [project, services] = await Promise.all([
        ProjectModel.findOne({ id: projectId, agencyId }).select("services").lean() as Promise<{ services?: string[] } | null>,
        ServiceModel.find({ agencyId, projectId }).lean() as Promise<ProjectServiceSnapshot[]>,
    ]);

    if (!project) return [];

    const activeServices = getActiveProjectServiceDocs(project.services, services);
    return activeServices.map(sanitizeDoc);
}

export async function getServiceTaskCountImpl(agencyId: string, projectId: string, serviceName: string) {
    await connectDB();
    return TaskModel.countDocuments({ agencyId, projectId, category: serviceName });
}

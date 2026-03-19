import "server-only";

import type { PaymentConfig, Project } from "../db";
import { ClientModel } from "../mongodb";

export type ProjectLike = Project & { description?: string };

export type ProjectServiceSnapshot = {
    id: string;
    name: string;
    projectId?: string;
    employees?: string[];
    agencyId?: string;
};

export type ProjectServiceConfigSnapshot = {
    serviceId?: string;
    name?: string;
    paymentConfig?: PaymentConfig;
};

export type ProjectServiceOwnerSnapshot = {
    id: string;
    services?: string[];
    serviceConfigs?: ProjectServiceConfigSnapshot[];
};

export function createDefaultProjectPaymentConfig(): PaymentConfig {
    return {
        type: "installment",
        paymentDetailsLater: true,
        installments: 1,
        installmentAmount: 0,
        monthlyAmount: 0,
    };
}

export async function hydrateProjectsWithCurrentClients<T extends { clientId?: string; client?: string }>(
    projects: T[],
    agencyId: string
): Promise<T[]> {
    if (!Array.isArray(projects) || projects.length === 0) return projects;

    const clientIds = Array.from(new Set(
        projects
            .map((project) => String(project?.clientId || "").trim())
            .filter(Boolean)
    ));

    if (clientIds.length === 0) return projects;

    const clients = await ClientModel.find({ id: { $in: clientIds }, agencyId })
        .select("id name")
        .lean() as Array<{ id: string; name: string }>;

    const clientNameById = new Map(clients.map((client) => [String(client.id), String(client.name)] as const));

    return projects.map((project) => {
        const clientId = String(project?.clientId || "").trim();
        if (!clientId) return project;
        const clientName = clientNameById.get(clientId);
        if (!clientName || clientName === project.client) return project;
        return { ...project, client: clientName };
    });
}

export async function resolveProjectClientFields(
    clientIdValue: unknown,
    agencyId: string
): Promise<{ clientId?: string; client?: string; unsetClient: boolean }> {
    const normalizedClientId = typeof clientIdValue === "string" ? clientIdValue.trim() : "";
    if (!normalizedClientId) {
        return { unsetClient: true };
    }

    const clientDoc = await ClientModel.findOne({ id: normalizedClientId, agencyId })
        .select("id name")
        .lean() as { id: string; name: string } | null;

    if (!clientDoc) throw new Error(`Client with ID ${normalizedClientId} not found`);

    return {
        clientId: String(clientDoc.id),
        client: String(clientDoc.name),
        unsetClient: false,
    };
}

export function getActiveProjectServiceDocs<T extends ProjectServiceSnapshot>(
    projectServiceRefs: string[] | undefined,
    serviceDocs: T[]
): T[] {
    if (!Array.isArray(serviceDocs) || serviceDocs.length === 0) return [];
    if (!Array.isArray(projectServiceRefs) || projectServiceRefs.length === 0) return [...serviceDocs];

    const serviceById = new Map(serviceDocs.map((service) => [String(service.id), service] as const));
    const serviceByName = new Map(serviceDocs.map((service) => [String(service.name).toLowerCase(), service] as const));
    const activeServices: T[] = [];
    const seen = new Set<string>();

    for (const rawRef of projectServiceRefs) {
        const ref = String(rawRef || "");
        const service = serviceById.get(ref) || serviceByName.get(ref.toLowerCase());
        if (!service || seen.has(service.id)) continue;
        seen.add(service.id);
        activeServices.push(service);
    }

    return activeServices.length > 0 ? activeServices : [...serviceDocs];
}

function getNormalizedProjectServiceReferenceValues(project: ProjectServiceOwnerSnapshot): string[] {
    const values: string[] = [];
    const seen = new Set<string>();

    const pushValue = (rawValue: unknown) => {
        const normalizedValue = String(rawValue || "").trim();
        if (!normalizedValue) return;

        const valueKey = normalizedValue.toLowerCase();
        if (seen.has(valueKey)) return;

        seen.add(valueKey);
        values.push(normalizedValue);
    };

    (project.services || []).forEach(pushValue);
    (project.serviceConfigs || []).forEach((config) => {
        pushValue(config?.serviceId);
        pushValue(config?.name);
    });

    return values;
}

export function buildProjectServiceLookupQuery(projects: ProjectServiceOwnerSnapshot[]): Record<string, unknown> | null {
    if (!Array.isArray(projects) || projects.length === 0) return null;

    const projectIds = Array.from(new Set(
        projects
            .map((project) => String(project?.id || "").trim())
            .filter(Boolean)
    ));

    const referenceValues = Array.from(new Set(
        projects.flatMap((project) => getNormalizedProjectServiceReferenceValues(project))
    ));

    const orClauses: Array<Record<string, unknown>> = [];

    if (projectIds.length > 0) {
        orClauses.push({ projectId: { $in: projectIds } });
    }

    if (referenceValues.length > 0) {
        orClauses.push({ id: { $in: referenceValues } });
        orClauses.push({ name: { $in: referenceValues } });
    }

    if (orClauses.length === 0) return null;
    return orClauses.length === 1 ? orClauses[0] : { $or: orClauses };
}

export function mapProjectServicesByProjectId<T extends ProjectServiceOwnerSnapshot, U extends ProjectServiceSnapshot>(
    projects: T[],
    serviceDocs: U[]
): Map<string, U[]> {
    const directServicesByProjectId = new Map<string, U[]>();
    const servicesById = new Map<string, U>();
    const servicesByName = new Map<string, U[]>();

    serviceDocs.forEach((service) => {
        const serviceId = String(service.id || "").trim();
        if (serviceId) {
            servicesById.set(serviceId, service);
        }

        const serviceNameKey = String(service.name || "").trim().toLowerCase();
        if (serviceNameKey) {
            const namedServices = servicesByName.get(serviceNameKey) || [];
            namedServices.push(service);
            servicesByName.set(serviceNameKey, namedServices);
        }

        const projectId = String(service.projectId || "").trim();
        if (!projectId) return;

        const projectServices = directServicesByProjectId.get(projectId) || [];
        projectServices.push(service);
        directServicesByProjectId.set(projectId, projectServices);
    });

    return new Map(
        projects.map((project) => {
            const projectId = String(project?.id || "").trim();
            const matchedServices: U[] = [];
            const seenServiceIds = new Set<string>();

            const addService = (service: U | undefined) => {
                if (!service) return;
                const serviceId = String(service.id || "").trim();
                if (!serviceId || seenServiceIds.has(serviceId)) return;
                seenServiceIds.add(serviceId);
                matchedServices.push(service);
            };

            (directServicesByProjectId.get(projectId) || []).forEach(addService);

            getNormalizedProjectServiceReferenceValues(project).forEach((referenceValue) => {
                const exactService = servicesById.get(referenceValue);
                if (exactService) {
                    const exactServiceProjectId = String(exactService.projectId || "").trim();
                    if (!exactServiceProjectId || exactServiceProjectId === projectId) {
                        addService(exactService);
                    }
                }

                (servicesByName.get(referenceValue.toLowerCase()) || []).forEach((service) => {
                    const serviceProjectId = String(service.projectId || "").trim();
                    if (serviceProjectId && serviceProjectId !== projectId) return;
                    addService(service);
                });
            });

            return [projectId, matchedServices] as const;
        })
    );
}

export function normalizeProjectServiceRefs(
    projectServiceRefs: string[] | undefined,
    serviceDocs: ProjectServiceSnapshot[]
): string[] {
    if (!Array.isArray(serviceDocs) || serviceDocs.length === 0) {
        if (!Array.isArray(projectServiceRefs) || projectServiceRefs.length === 0) return [];

        const seen = new Set<string>();
        const normalizedRefs: string[] = [];

        for (const rawRef of projectServiceRefs) {
            const ref = String(rawRef || "").trim();
            if (!ref) continue;

            const refKey = ref.toLowerCase();
            if (seen.has(refKey)) continue;

            seen.add(refKey);
            normalizedRefs.push(ref);
        }

        return normalizedRefs;
    }

    return getActiveProjectServiceDocs(projectServiceRefs, serviceDocs).map((service) => service.id);
}

export function getProjectServiceDisplayNames(
    projectServiceRefs: string[] | undefined,
    serviceDocs: ProjectServiceSnapshot[]
): string[] {
    const activeServices = getActiveProjectServiceDocs(projectServiceRefs, serviceDocs);
    if (activeServices.length > 0) {
        return Array.from(
            new Map(activeServices.map((service) => [service.name.toLowerCase(), service.name] as const)).values()
        );
    }

    return normalizeProjectServiceRefs(projectServiceRefs, serviceDocs);
}

export function hydrateProjectsWithCurrentServiceNames<T extends { id: string; services?: string[] }>(
    projects: T[],
    services: ProjectServiceSnapshot[]
): T[] {
    if (!Array.isArray(projects) || projects.length === 0) return projects;

    const servicesByProjectId = mapProjectServicesByProjectId(
        projects as Array<T & ProjectServiceOwnerSnapshot>,
        services
    );

    return projects.map((project) => {
        const serviceNames = getProjectServiceDisplayNames(
            project.services,
            servicesByProjectId.get(project.id) || []
        );

        const currentServices = Array.isArray(project.services) ? project.services : [];
        if (JSON.stringify(currentServices) === JSON.stringify(serviceNames)) {
            return project;
        }

        return {
            ...project,
            services: serviceNames,
        };
    });
}

function findMatchingProjectServiceConfig(
    configs: ProjectServiceConfigSnapshot[] | undefined,
    service: ProjectServiceSnapshot
): ProjectServiceConfigSnapshot | undefined {
    return (configs || []).find((config) => {
        const rawServiceId = String(config?.serviceId || "");
        const rawName = String(config?.name || "");
        return rawServiceId === service.id
            || rawServiceId.toLowerCase() === service.name.toLowerCase()
            || rawName.toLowerCase() === service.name.toLowerCase();
    });
}

export function buildNormalizedProjectServiceConfigs(
    services: ProjectServiceSnapshot[],
    configs: ProjectServiceConfigSnapshot[] | undefined
): ProjectServiceConfigSnapshot[] {
    return services.map((service) => {
        const existingConfig = findMatchingProjectServiceConfig(configs, service);
        return {
            serviceId: service.id,
            name: service.name,
            paymentConfig: existingConfig?.paymentConfig || createDefaultProjectPaymentConfig(),
        };
    });
}

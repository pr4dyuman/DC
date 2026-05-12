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

export async function hydrateProjectsWithCurrentClients<T extends { clientId?: string; clientIds?: string[]; client?: string }>(
    projects: T[],
    agencyId: string
): Promise<T[]> {
    if (!Array.isArray(projects) || projects.length === 0) return projects;

    // Collect IDs from both legacy clientId and the new clientIds array
    const allClientIds = Array.from(new Set(
        projects.flatMap((project) => {
            const ids: string[] = [];
            const singular = String(project?.clientId || "").trim();
            if (singular) ids.push(singular);
            if (Array.isArray(project?.clientIds)) {
                project.clientIds.forEach((id) => {
                    const normalized = String(id || "").trim();
                    if (normalized) ids.push(normalized);
                });
            }
            return ids;
        })
    ));

    if (allClientIds.length === 0) return projects;

    const clients = await ClientModel.find({ id: { $in: allClientIds }, agencyId })
        .select("id name")
        .lean() as Array<{ id: string; name: string }>;

    const clientNameById = new Map(clients.map((client) => [String(client.id), String(client.name)] as const));

    return projects.map((project) => {
        // Primary display name: use clientId first, then first entry of clientIds
        const primaryId = String(project?.clientId || "").trim()
            || (Array.isArray(project?.clientIds) && project.clientIds.length > 0 ? String(project.clientIds[0]).trim() : "");
        if (!primaryId) return project;
        const clientName = clientNameById.get(primaryId);
        if (!clientName || clientName === project.client) return project;
        return { ...project, client: clientName };
    });
}

export async function resolveProjectClientFields(
    clientIdValue: unknown,
    agencyId: string,
    clientIdsValue?: unknown
): Promise<{ clientId?: string; clientIds?: string[]; client?: string; unsetClient: boolean }> {
    // Build the canonical list from clientIds (array) first, fall back to singular clientId
    const rawIds: string[] = [];

    if (Array.isArray(clientIdsValue)) {
        clientIdsValue.forEach((id) => {
            const normalized = typeof id === "string" ? id.trim() : "";
            if (normalized) rawIds.push(normalized);
        });
    }

    // Also include a singular clientId if provided and not already in the list
    const singularId = typeof clientIdValue === "string" ? clientIdValue.trim() : "";
    if (singularId && !rawIds.includes(singularId)) {
        rawIds.unshift(singularId);
    }

    if (rawIds.length === 0) {
        return { unsetClient: true };
    }

    // Validate ALL client IDs exist in this agency
    const clientDocs = await ClientModel.find({ id: { $in: rawIds }, agencyId })
        .select("id name")
        .lean() as Array<{ id: string; name: string }>;

    const foundIds = new Set(clientDocs.map((c) => String(c.id)));
    const missingIds = rawIds.filter((id) => !foundIds.has(id));
    if (missingIds.length > 0) throw new Error(`Client(s) not found: ${missingIds.join(", ")}`);

    // Preserve ordering: primary = first in rawIds list
    const primaryDoc = clientDocs.find((c) => c.id === rawIds[0]) || clientDocs[0];

    return {
        clientId: String(primaryDoc.id),
        clientIds: rawIds,
        client: String(primaryDoc.name),
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
    const seenNames = new Set<string>();

    for (const rawRef of projectServiceRefs) {
        const ref = String(rawRef || "");
        const service = serviceById.get(ref) || serviceByName.get(ref.toLowerCase());
        if (!service || seen.has(service.id)) continue;
        // Deduplicate by name (case-insensitive) — prevents duplicate "web development" entries
        const nameKey = service.name.toLowerCase();
        if (seenNames.has(nameKey)) continue;
        seen.add(service.id);
        seenNames.add(nameKey);
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

function getProjectServiceConfigScore(config: ProjectServiceConfigSnapshot | undefined): number {
    const paymentConfig = config?.paymentConfig;
    if (!paymentConfig) return 0;

    let score = 1;
    if (!paymentConfig.paymentDetailsLater) score += 4;
    if ((paymentConfig.installmentAmount ?? 0) > 0) score += 4;
    if ((paymentConfig.monthlyAmount ?? 0) > 0) score += 4;
    if ((paymentConfig.installments ?? 0) > 1) score += 1;
    if (paymentConfig.firstPaymentDate || paymentConfig.billingStartDate) score += 2;
    if (Array.isArray(paymentConfig.installmentDates) && paymentConfig.installmentDates.some(Boolean)) score += 2;
    return score;
}

function findMatchingProjectServiceConfig(
    configs: ProjectServiceConfigSnapshot[] | undefined,
    service: ProjectServiceSnapshot
): ProjectServiceConfigSnapshot | undefined {
    const serviceIdKey = String(service.id || "").toLowerCase();
    const serviceNameKey = String(service.name || "").toLowerCase();
    let bestConfig: ProjectServiceConfigSnapshot | undefined;
    let bestScore = -1;

    for (const config of configs || []) {
        const rawServiceIdKey = String(config?.serviceId || "").toLowerCase();
        const rawNameKey = String(config?.name || "").toLowerCase();
        const matches = rawServiceIdKey === serviceIdKey
            || rawServiceIdKey === serviceNameKey
            || rawNameKey === serviceNameKey
            || rawNameKey === serviceIdKey;

        if (!matches) continue;

        const score = getProjectServiceConfigScore(config);
        if (score > bestScore) {
            bestConfig = config;
            bestScore = score;
        }
    }

    return bestConfig;
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

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

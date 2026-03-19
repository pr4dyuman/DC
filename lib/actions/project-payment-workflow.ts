import "server-only";

import { revalidatePath } from "next/cache";
import type { PaymentConfig } from "../db";
import { sanitizeMongoInput } from "../validation";
import { ProjectModel, ServiceModel, connectDB } from "../mongodb";

export async function updateProjectPaymentImpl(
    projectId: string,
    serviceId: string,
    paymentConfig: PaymentConfig,
    agencyId: string
) {
    await connectDB();

    paymentConfig = sanitizeMongoInput(paymentConfig);

    const projectServices = await ServiceModel.find({ agencyId, projectId }).select("id name").lean() as Array<{ id: string; name: string }>;
    const idMap = new Map(projectServices.map((svc) => [String(svc.id), svc] as const));
    const nameMap = new Map(projectServices.map((svc) => [String(svc.name).toLowerCase(), svc] as const));
    const canonicalService = idMap.get(String(serviceId)) || nameMap.get(String(serviceId).toLowerCase());
    if (!canonicalService) throw new Error("Service not found for this project");

    const projectDoc = await ProjectModel.findOne({ id: projectId, agencyId })
        .select("services serviceConfigs")
        .lean() as {
            services?: string[];
            serviceConfigs?: Array<{ serviceId?: string; name?: string; paymentConfig?: PaymentConfig }>;
        } | null;

    const normalizedServices = Array.isArray(projectDoc?.services)
        ? Array.from(new Set(projectDoc.services.map((rawSvc) => {
            const rawValue = String(rawSvc || "");
            if (idMap.has(rawValue)) return rawValue;
            const byName = nameMap.get(rawValue.toLowerCase());
            return byName ? String(byName.id) : rawValue;
        })))
        : [];

    const normalizedServiceConfigs = Array.isArray(projectDoc?.serviceConfigs)
        ? projectDoc.serviceConfigs.map((cfg) => {
            const rawServiceId = String(cfg?.serviceId || "");
            const rawName = String(cfg?.name || "");
            const fromId = idMap.get(rawServiceId);
            const fromName = nameMap.get(rawServiceId.toLowerCase()) || nameMap.get(rawName.toLowerCase());
            const resolved = fromId || fromName;
            if (!resolved) return cfg;
            return {
                ...cfg,
                serviceId: String(resolved.id),
                name: String(resolved.name),
            };
        })
        : [];

    if (projectDoc) {
        const servicesChanged = JSON.stringify(projectDoc.services || []) !== JSON.stringify(normalizedServices);
        const serviceConfigsChanged = JSON.stringify(projectDoc.serviceConfigs || []) !== JSON.stringify(normalizedServiceConfigs);
        if (servicesChanged || serviceConfigsChanged) {
            await ProjectModel.updateOne(
                { id: projectId, agencyId },
                {
                    $set: {
                        ...(servicesChanged ? { services: normalizedServices } : {}),
                        ...(serviceConfigsChanged ? { serviceConfigs: normalizedServiceConfigs } : {}),
                    },
                }
            );
        }
    }

    const setResult = await ProjectModel.updateOne(
        { id: projectId, agencyId, "serviceConfigs.serviceId": canonicalService.id },
        {
            $set: {
                "serviceConfigs.$.paymentConfig": paymentConfig,
                "serviceConfigs.$.name": canonicalService.name,
            },
        }
    );

    if (setResult.matchedCount === 0) {
        await ProjectModel.updateOne(
            { id: projectId, agencyId },
            {
                $push: {
                    serviceConfigs: {
                        serviceId: canonicalService.id,
                        name: canonicalService.name,
                        paymentConfig,
                    },
                },
            }
        );
    }

    revalidatePath("/dashboard/projects/[id]", "page");
    revalidatePath("/dashboard/projects");
}

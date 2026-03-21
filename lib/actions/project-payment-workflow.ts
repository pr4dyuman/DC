import "server-only";

import { revalidatePath } from "next/cache";
import type { Invoice, PaymentConfig } from "../db";
import { sanitizeMongoInput } from "../validation";
import { InvoiceModel, ProjectModel, ServiceModel, connectDB } from "../mongodb";
import { generateId } from "../utils-server";
import {
    buildProjectServiceLookupQuery,
    mapProjectServicesByProjectId,
    type ProjectServiceOwnerSnapshot,
    type ProjectServiceSnapshot,
} from "./projects-shared";

export async function updateProjectPaymentImpl(
    projectId: string,
    serviceId: string,
    paymentConfig: PaymentConfig,
    agencyId: string
) {
    await connectDB();

    paymentConfig = sanitizeMongoInput(paymentConfig);

    const projectDoc = await ProjectModel.findOne({ id: projectId, agencyId })
        .select("id services serviceConfigs")
        .lean() as ProjectServiceOwnerSnapshot | null;
    if (!projectDoc) throw new Error("Project not found");

    const serviceLookupQuery = buildProjectServiceLookupQuery([projectDoc]);
    const projectServices = serviceLookupQuery
        ? await ServiceModel.find({ agencyId, ...serviceLookupQuery })
            .select("id name projectId employees agencyId")
            .lean() as ProjectServiceSnapshot[]
        : [];
    const projectServiceMap = mapProjectServicesByProjectId([projectDoc], projectServices);
    const resolvedProjectServices = projectServiceMap.get(projectId) || [];
    const idMap = new Map(resolvedProjectServices.map((svc) => [String(svc.id), svc] as const));
    const nameMap = new Map(resolvedProjectServices.map((svc) => [String(svc.name).toLowerCase(), svc] as const));
    const canonicalService = idMap.get(String(serviceId)) || nameMap.get(String(serviceId).toLowerCase());
    if (!canonicalService) throw new Error("Service not found for this project");

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

    // ── Regenerate invoices when payment config is updated ──────────────────
    // Strategy: delete ALL Pending invoices for this project (old invoices may
    // not have serviceId so filtering by it is unreliable), then regenerate
    // from the updated serviceConfigs. Processing/Paid invoices are kept as-is.
    await InvoiceModel.deleteMany({ projectId, agencyId, status: "Pending" });

    // Re-read the project after the serviceConfig update so we get the latest configs
    const updatedProject = await ProjectModel.findOne({ id: projectId, agencyId })
        .select("serviceConfigs budget dueDate")
        .lean() as { serviceConfigs?: Array<{ serviceId: string; name?: string; paymentConfig?: PaymentConfig }>; budget?: number; dueDate?: string } | null;

    const allServiceConfigs = updatedProject?.serviceConfigs || [];
    const projectBudget = updatedProject?.budget ?? 0;
    const totalServiceCount = allServiceConfigs.length || 1;

    const newInvoices: Invoice[] = [];

    for (const svcCfg of allServiceConfigs) {
        const cfg = svcCfg.paymentConfig;
        if (!cfg) continue;

        // Derive installmentDates from firstPaymentDate+count if not set (legacy data)
        const baseInstallmentDates = Array.isArray(cfg.installmentDates) && cfg.installmentDates.length > 0
            ? cfg.installmentDates
            : [];
        const installmentDates = baseInstallmentDates.length === 0 && cfg.type === "installment" && cfg.firstPaymentDate
            ? (() => {
                const count = cfg.installments || 1;
                return Array.from({ length: count }, (_, i) => {
                    const d = new Date(cfg.firstPaymentDate!);
                    d.setMonth(d.getMonth() + i);
                    return d.toISOString().split("T")[0];
                });
            })()
            : baseInstallmentDates;

        if (cfg.type === "installment" && installmentDates.length > 0) {
            const amountPerInstallment = cfg.installmentAmount
                || Math.round(projectBudget / totalServiceCount / installmentDates.length);
            for (const installmentDate of installmentDates) {
                newInvoices.push({
                    id: generateId(),
                    projectId,
                    agencyId,
                    serviceId: svcCfg.serviceId,
                    amount: Math.round(amountPerInstallment),
                    status: "Pending",
                    date: installmentDate,
                });
            }
        } else if (cfg.type === "monthly" && cfg.monthlyAmount && cfg.billingStartDate && updatedProject?.dueDate) {
            const startDate = new Date(cfg.billingStartDate);
            const projectDueDate = new Date(updatedProject.dueDate);
            if (!isNaN(startDate.getTime()) && !isNaN(projectDueDate.getTime()) && startDate < projectDueDate) {
                const monthsDiff = Math.ceil(
                    (projectDueDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24 * 30)
                );
                const numberOfInvoices = Math.min(monthsDiff, 120); // cap at 10 years
                for (let i = 0; i < numberOfInvoices; i++) {
                    const invoiceDate = new Date(startDate);
                    invoiceDate.setMonth(invoiceDate.getMonth() + i);
                    newInvoices.push({
                        id: generateId(),
                        projectId,
                        agencyId,
                        serviceId: svcCfg.serviceId,
                        amount: cfg.monthlyAmount,
                        status: "Pending",
                        date: invoiceDate.toISOString().split("T")[0],
                    });
                }
            }
        }
    }

    if (newInvoices.length > 0) {
        await InvoiceModel.insertMany(newInvoices);
    }

    // ── Sync project.budget ← sum of service payment configs ─────────────────
    // The project card reads project.budget; payment configs are the source of truth.
    // After any payment update we write the recalculated total back so both stay in sync.
    const recalculatedBudget = allServiceConfigs.reduce((sum, cfg) => {
        const pc = cfg.paymentConfig;
        if (!pc || pc.paymentDetailsLater) return sum;
        if (pc.type === "installment") {
            return sum + (pc.installmentAmount || 0) * (pc.installments || 1);
        }
        // Monthly: count monthlyAmount as part of the deal value for display purposes
        return sum + (pc.monthlyAmount || 0);
    }, 0);

    if (recalculatedBudget > 0) {
        await ProjectModel.updateOne(
            { id: projectId, agencyId },
            { $set: { budget: recalculatedBudget } }
        );
    }
    // ─────────────────────────────────────────────────────────────────────────

    console.log(`[payment-workflow] project=${projectId} regenerated ${newInvoices.length} invoices from ${allServiceConfigs.length} service configs, synced budget=${recalculatedBudget}`);

    revalidatePath("/dashboard/projects/[slug]", "page"); // Fixed: was incorrectly [id]
    revalidatePath("/dashboard/projects");
    revalidatePath("/dashboard/finance");
}


/**
 * Internal: redistributes a new budget equally across all service payment configs.
 * Used by the Singularity AI `update_project` tool when budget changes.
 * NOT exposed as a public user action — users edit payment via Service Payments tab.
 */
export async function syncProjectBudgetImpl(
    projectId: string,
    newBudget: number,
    agencyId: string
) {
    await connectDB();

    const projectDoc = await ProjectModel.findOne({ id: projectId, agencyId })
        .select("id serviceConfigs dueDate")
        .lean() as { id: string; serviceConfigs?: Array<{ serviceId: string; name: string; paymentConfig?: PaymentConfig }>; dueDate?: string } | null;
    if (!projectDoc) throw new Error("Project not found");

    const serviceConfigs = projectDoc.serviceConfigs || [];
    if (serviceConfigs.length === 0) return; // Nothing to distribute — silently skip

    const perServiceAmount = newBudget > 0 ? Math.round(newBudget / serviceConfigs.length) : 0;
    const fallbackDate = projectDoc.dueDate || undefined;

    const updatedConfigs = serviceConfigs.map((cfg) => {
        const existing: Partial<PaymentConfig> = cfg.paymentConfig || {};
        const keepDates = Array.isArray(existing.installmentDates) && existing.installmentDates.length > 0;
        return {
            ...cfg,
            paymentConfig: {
                ...existing,
                type: existing.type || "installment",
                paymentDetailsLater: newBudget === 0,
                installments: existing.installments || 1,
                installmentAmount: perServiceAmount,
                firstPaymentDate: existing.firstPaymentDate || fallbackDate,
                installmentDates: keepDates ? existing.installmentDates : (fallbackDate ? [fallbackDate] : []),
                monthlyAmount: existing.type === "monthly" ? perServiceAmount : (existing.monthlyAmount || 0),
            } as PaymentConfig,
        };
    });

    await ProjectModel.updateOne(
        { id: projectId, agencyId },
        { $set: { budget: newBudget, serviceConfigs: updatedConfigs } }
    );

    revalidatePath("/dashboard/projects/[slug]", "page");
    revalidatePath("/dashboard/projects");
    revalidatePath("/dashboard/finance");
}

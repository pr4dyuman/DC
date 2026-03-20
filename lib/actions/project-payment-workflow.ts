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
    // Delete existing Pending invoices for this service so we don't duplicate
    // (only remove Pending — Processing/Paid invoices represent real money, keep them)
    const existingPendingInvoiceIds = (await InvoiceModel.find({
        projectId,
        agencyId,
        serviceId: canonicalService.id,
        status: "Pending",
    }).select("id").lean() as Array<{ id: string }>).map((inv) => inv.id);

    // Fall back: if no serviceId field exists, match any Pending invoice for this project
    // created from this service by matching amount (best effort for legacy data)
    if (existingPendingInvoiceIds.length === 0 && paymentConfig.installmentDates?.length) {
        // Just delete all Pending invoices for this project regardless of serviceId
        // if there's only one service — safe heuristic
        const totalServices = (projectDoc?.serviceConfigs || []).length;
        if (totalServices <= 1) {
            await InvoiceModel.deleteMany({ projectId, agencyId, status: "Pending" });
        }
    } else if (existingPendingInvoiceIds.length > 0) {
        await InvoiceModel.deleteMany({ id: { $in: existingPendingInvoiceIds }, agencyId });
    }

    // Create fresh invoices from the updated payment config
    const newInvoices: Invoice[] = [];
    const projectBudget = (await ProjectModel.findOne({ id: projectId, agencyId }).select("budget").lean() as { budget?: number } | null)?.budget ?? 0;
    const totalServices = (projectDoc?.serviceConfigs || []).length || 1;

    if (paymentConfig.type === "installment" && paymentConfig.installmentDates && paymentConfig.installmentDates.length > 0) {
        const amountPerInstallment = paymentConfig.installmentAmount
            || (projectBudget / totalServices / paymentConfig.installmentDates.length);
        for (const installmentDate of paymentConfig.installmentDates) {
            newInvoices.push({
                id: generateId(),
                projectId,
                agencyId,
                serviceId: canonicalService.id,
                amount: Math.round(amountPerInstallment),
                status: "Pending",
                date: installmentDate,
            });
        }
    } else if (paymentConfig.type === "monthly" && paymentConfig.monthlyAmount && paymentConfig.billingStartDate) {
        const startDate = new Date(paymentConfig.billingStartDate);
        const project = await ProjectModel.findOne({ id: projectId, agencyId }).select("dueDate").lean() as { dueDate?: string } | null;
        if (project?.dueDate) {
            const projectDueDate = new Date(project.dueDate);
            if (!isNaN(startDate.getTime()) && !isNaN(projectDueDate.getTime()) && startDate < projectDueDate) {
                const monthsDiff = Math.ceil((projectDueDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24 * 30));
                const numberOfInvoices = Math.min(monthsDiff, 12);
                for (let i = 0; i < numberOfInvoices; i++) {
                    const invoiceDate = new Date(startDate);
                    invoiceDate.setMonth(invoiceDate.getMonth() + i);
                    newInvoices.push({
                        id: generateId(),
                        projectId,
                        agencyId,
                        serviceId: canonicalService.id,
                        amount: paymentConfig.monthlyAmount,
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
    // ────────────────────────────────────────────────────────────────────────

    revalidatePath("/dashboard/projects/[id]", "page");
    revalidatePath("/dashboard/projects");
    revalidatePath("/dashboard/finance");
}

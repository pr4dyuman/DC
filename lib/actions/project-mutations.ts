import "server-only";

import { revalidatePath } from "next/cache";
import type { Invoice, Project } from "../db";
import { checkAgencyLimit, decrementAgencyUsage, incrementAgencyUsage, reserveAgencyUsage } from "../agency-context";
import { sendProjectCreatedEmail } from "../brevo-mail";
import { generateId } from "../utils-server";
import { sanitizeMongoInput, sanitizeName, sanitizeString } from "../validation";
import {
    ActivityModel,
    ClientModel,
    InvoiceModel,
    NotificationModel,
    ProjectModel,
    ServiceModel,
} from "../mongodb";
import { isNotifEnabled, sanitizeDoc } from "./shared";
import {
    resolveProjectClientFields,
    type ProjectLike,
} from "./projects-shared";
export { updateProjectPaymentImpl, syncProjectBudgetImpl } from "./project-payment-workflow";
export { updateProjectImpl } from "./project-update-workflow";

type ProjectMutationActor = {
    id: string;
    name: string;
};

export async function createProjectImpl(
    project: Omit<ProjectLike, "id" | "status" | "createdAt" | "agencyId">,
    currentUser: ProjectMutationActor,
    agencyId: string
) {
    project = sanitizeMongoInput(project);
    project.name = sanitizeName(project.name, 300);
    if (!project.name) throw new Error("Project name is required");
    if (project.description) project.description = sanitizeString(project.description, 10000);

    const normalizedServices = Array.isArray(project.services)
        ? project.services
            .map((svc) => sanitizeName(String(svc || ""), 200))
            .filter(Boolean)
        : [];
    const dedupedServices = Array.from(new Map(normalizedServices.map((svcName) => [svcName.toLowerCase(), svcName])).values());
    project.services = dedupedServices;

    if (Array.isArray(project.serviceConfigs)) {
        project.serviceConfigs = project.serviceConfigs
            .map((config) => {
                // Use name only — NEVER fall back to serviceId (which is a UUID)
                const normalizedName = sanitizeName(String(config?.name || ""), 200);
                if (!normalizedName) return null;
                return {
                    ...config,
                    name: normalizedName,
                };
            })
            .filter((config): config is NonNullable<typeof config> => Boolean(config));

        for (const config of project.serviceConfigs) {
            if (!project.services.some((serviceName) => serviceName.toLowerCase() === config.name.toLowerCase())) {
                project.services.push(config.name);
            }
        }
    }

    let slug = project.slug;
    if (!slug) {
        slug = project.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
    }

    const projLimit = await checkAgencyLimit(agencyId, "projects");
    if (!projLimit.allowed) {
        throw new Error(`Plan limit reached: your plan allows ${projLimit.limit} projects (currently ${projLimit.current}).`);
    }

    const normalizedClientId = typeof project.clientId === "string" ? project.clientId.trim() : "";
    const rawClientIds = Array.isArray((project as { clientIds?: unknown }).clientIds)
        ? (project as { clientIds?: unknown[] }).clientIds as unknown[]
        : [];
    if (normalizedClientId || rawClientIds.length > 0) {
        const clientFields = await resolveProjectClientFields(normalizedClientId, agencyId, rawClientIds);
        project.clientId = clientFields.clientId;
        (project as { clientIds?: string[] }).clientIds = clientFields.clientIds;
        project.client = clientFields.client;
    } else {
        project.clientId = undefined;
        (project as { clientIds?: string[] }).clientIds = [];
        project.client = project.client ? sanitizeName(project.client, 200) || undefined : undefined;
    }

    let uniqueSlug = slug;
    let slugCounter = 1;
    while (await ProjectModel.exists({ slug: uniqueSlug, agencyId })) {
        uniqueSlug = `${slug}-${slugCounter}`;
        slugCounter++;
    }

    const newProject: Project = {
        ...project,
        id: generateId(),
        slug: uniqueSlug,
        status: "Active",
        createdAt: new Date().toISOString(),
        agencyId,
    };

    const configByName = new Map(
        (project.serviceConfigs || [])
            .filter((cfg) => !!cfg.name)
            .map((cfg) => [String(cfg.name).toLowerCase(), cfg] as const)
    );
    const allServiceNames = Array.from(new Map([
        ...project.services.map((svcName) => [svcName.toLowerCase(), svcName] as const),
        ...(project.serviceConfigs || []).map((cfg) => [String(cfg.name).toLowerCase(), cfg.name] as const),
    ]).values());
    const serviceDocs = allServiceNames.map((svcName) => ({
        id: generateId(),
        agencyId,
        name: svcName,
        projectId: newProject.id,
        employees: [],
    }));
    newProject.services = serviceDocs.map((doc) => doc.id);

    // Auto-distribute budget across services when no explicit payment config is provided.
    // This ensures the deal value always lives under a service, not as a floating field.
    const totalServiceCount = serviceDocs.length || 1;
    const perServiceBudget = project.budget > 0
        ? Math.round(project.budget / totalServiceCount)
        : 0;

    newProject.serviceConfigs = serviceDocs.map((doc) => {
        const existingConfig = configByName.get(doc.name.toLowerCase());
        const existingPayment = existingConfig?.paymentConfig;

        // Only use the existing payment config if it has a real amount set.
        // If it's a "pay later" placeholder with no amount, replace with auto-filled config.
        const hasRealAmount = existingPayment
            && !existingPayment.paymentDetailsLater
            && ((existingPayment.installmentAmount ?? 0) > 0 || (existingPayment.monthlyAmount ?? 0) > 0);

        if (hasRealAmount) {
            return {
                serviceId: doc.id,
                name: doc.name,
                paymentConfig: existingPayment!,
            };
        }

        // Auto-fill: distribute budget equally. Use "pay later" only if budget is 0.
        return {
            serviceId: doc.id,
            name: doc.name,
            paymentConfig: {
                type: "installment",
                paymentDetailsLater: perServiceBudget === 0,
                installments: 1,
                installmentAmount: perServiceBudget,
                monthlyAmount: 0,
            },
        };
    });

    const newInvoices: Invoice[] = [];
    if (newProject.serviceConfigs && newProject.serviceConfigs.length > 0) {
        const totalServices = newProject.serviceConfigs.length;
        for (const serviceConfig of newProject.serviceConfigs) {
            const paymentConfig = serviceConfig.paymentConfig;
            if (!paymentConfig) continue;

            if (paymentConfig.type === "installment") {
                // Resolve installment dates — three-level fallback (mirrors updateProjectPaymentImpl):
                // 1) explicit installmentDates[]  2) firstPaymentDate + count  3) project.dueDate
                let installmentDates: string[] =
                    Array.isArray(paymentConfig.installmentDates) && paymentConfig.installmentDates.length > 0
                        ? paymentConfig.installmentDates
                        : [];
                if (installmentDates.length === 0 && paymentConfig.firstPaymentDate) {
                    const count = paymentConfig.installments || 1;
                    installmentDates = Array.from({ length: count }, (_, i) => {
                        const d = new Date(paymentConfig.firstPaymentDate!);
                        d.setMonth(d.getMonth() + i);
                        return d.toISOString().split("T")[0];
                    });
                }
                if (installmentDates.length === 0 && project.dueDate) {
                    // Final fallback: schedule as a single payment on the project due date
                    installmentDates = [project.dueDate];
                }
                if (installmentDates.length > 0) {
                    const amountPerInstallment = paymentConfig.installmentAmount
                        || Math.round(project.budget / totalServices / installmentDates.length);
                    for (const installmentDate of installmentDates) {
                        newInvoices.push({
                            id: generateId(),
                            projectId: newProject.id,
                            agencyId,
                            amount: Math.round(amountPerInstallment),
                            status: "Pending",
                            date: installmentDate,
                        });
                    }
                }
            } else if (paymentConfig.type === "monthly") {
                if (paymentConfig.monthlyAmount && paymentConfig.billingStartDate) {
                    const monthlyAmount = paymentConfig.monthlyAmount;
                    const startDate = new Date(paymentConfig.billingStartDate);
                    const projectDueDate = new Date(project.dueDate);
                    if (isNaN(startDate.getTime())) throw new Error("Validation Error: Invalid billing start date.");
                    if (isNaN(projectDueDate.getTime())) throw new Error("Validation Error: Invalid project due date.");
                    if (startDate >= projectDueDate) throw new Error("Validation Error: Billing start date must be before project due date.");
                    const monthsDiff = Math.ceil((projectDueDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24 * 30));
                    const numberOfInvoices = Math.min(monthsDiff, 12);
                    for (let i = 0; i < numberOfInvoices; i++) {
                        const invoiceDate = new Date(startDate);
                        invoiceDate.setMonth(invoiceDate.getMonth() + i);
                        newInvoices.push({
                            id: generateId(),
                            projectId: newProject.id,
                            agencyId,
                            amount: monthlyAmount,
                            status: "Pending",
                            date: invoiceDate.toISOString().split("T")[0],
                        });
                    }
                }
            }
        }
    }

    let reservedInvoiceCount = 0;
    const releaseReservedInvoices = async () => {
        if (reservedInvoiceCount > 0) {
            await decrementAgencyUsage(agencyId, "monthlyInvoices", reservedInvoiceCount);
            reservedInvoiceCount = 0;
        }
    };

    if (newInvoices.length > 0) {
        const invoiceLimit = await reserveAgencyUsage(agencyId, "monthlyInvoices", newInvoices.length);
        if (!invoiceLimit.allowed) {
            throw new Error(`Plan limit reached: your plan allows ${invoiceLimit.limit} monthly invoices (currently ${invoiceLimit.current}).`);
        }
        reservedInvoiceCount = newInvoices.length;
    }

    if (serviceDocs.length > 0) {
        try {
            await ServiceModel.insertMany(serviceDocs, { ordered: true });
        } catch (serviceSyncError) {
            console.error("[createProject] Service sync failed before project creation:", serviceSyncError);
            await releaseReservedInvoices();
            throw new Error("Project creation failed while creating services. No changes were saved.");
        }
    }

    try {
        await ProjectModel.create(newProject);
    } catch (projectCreationError) {
        if (serviceDocs.length > 0) {
            try {
                await ServiceModel.deleteMany({ agencyId, projectId: newProject.id });
            } catch (serviceRollbackError) {
                console.error("[createProject] Failed to roll back services after project creation error:", serviceRollbackError);
            }
        }
        await releaseReservedInvoices();
        throw projectCreationError;
    }

    await incrementAgencyUsage(agencyId, "projects");

    if (newInvoices.length > 0) {
        try {
            await InvoiceModel.insertMany(newInvoices);
            reservedInvoiceCount = 0;
        } catch (invoiceCreationError) {
            await releaseReservedInvoices();
            throw invoiceCreationError;
        }
    }

    // Notify ALL linked clients about new invoices
    const linkedClientIds: string[] = [
        ...((newProject as { clientIds?: string[] }).clientIds || []),
        ...(newProject.clientId && !((newProject as { clientIds?: string[] }).clientIds || []).includes(newProject.clientId) ? [newProject.clientId] : []),
    ];
    if (linkedClientIds.length > 0 && newInvoices.length > 0 && await isNotifEnabled("invoice")) {
        await NotificationModel.insertMany(
            linkedClientIds.map((cid) => ({
                id: generateId(),
                agencyId,
                userId: cid,
                message: `${newInvoices.length} pending invoice(s) for project: ${project.name}`,
                read: false,
                timestamp: new Date().toISOString(),
                link: "/dashboard/finance",
            }))
        );
    }

    await ActivityModel.create({
        id: generateId(),
        agencyId,
        user: currentUser.name,
        userId: currentUser.id,
        action: "created project",
        target: project.name,
        timestamp: new Date().toISOString(),
        entityId: newProject.id,
        entityType: "project",
    });

    // Send project-created email to ALL linked clients
    const allLinkedClientIds: string[] = [
        ...((newProject as { clientIds?: string[] }).clientIds || []),
        ...(newProject.clientId && !((newProject as { clientIds?: string[] }).clientIds || []).includes(newProject.clientId) ? [newProject.clientId] : []),
    ];
    if (allLinkedClientIds.length > 0) {
        try {
            const allClients = await ClientModel.find({ id: { $in: allLinkedClientIds }, agencyId })
                .select("email name")
                .lean() as Array<{ email?: string; name?: string }>;
            for (const client of allClients) {
                if (client?.email && client.name) {
                    const paymentPlan = project.serviceConfigs && project.serviceConfigs.length > 0
                        ? project.serviceConfigs[0].paymentConfig?.type || "one-time"
                        : "one-time";
                    await sendProjectCreatedEmail({
                        clientEmail: client.email,
                        clientName: client.name,
                        projectName: project.name,
                        budget: project.budget,
                        paymentPlan,
                        invoiceCount: newInvoices.length,
                        projectLink: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/dashboard/projects/${newProject.slug || newProject.id}`,
                    });
                }
            }
        } catch (emailError) {
            console.error("[Email] Failed to send project creation email:", emailError);
        }
    }

    revalidatePath("/dashboard/projects");
    revalidatePath("/dashboard/finance");
    return sanitizeDoc(newProject);
}

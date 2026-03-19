import "server-only";

import { revalidatePath } from "next/cache";
import type { Invoice, Project } from "../db";
import { checkAgencyLimit, incrementAgencyUsage } from "../agency-context";
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
    createDefaultProjectPaymentConfig,
    resolveProjectClientFields,
    type ProjectLike,
} from "./projects-shared";
export { updateProjectPaymentImpl } from "./project-payment-workflow";
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
                const normalizedName = sanitizeName(String(config?.name || config?.serviceId || ""), 200);
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
    if (normalizedClientId) {
        const clientFields = await resolveProjectClientFields(normalizedClientId, agencyId);
        project.clientId = clientFields.clientId;
        project.client = clientFields.client;
    } else {
        project.clientId = undefined;
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

    const defaultPaymentConfig = createDefaultProjectPaymentConfig();
    const configByName = new Map(
        (project.serviceConfigs || [])
            .map((cfg) => [String(cfg.name || cfg.serviceId).toLowerCase(), cfg] as const)
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
    newProject.serviceConfigs = serviceDocs.map((doc) => {
        const existingConfig = configByName.get(doc.name.toLowerCase());
        return {
            serviceId: doc.id,
            name: doc.name,
            paymentConfig: existingConfig?.paymentConfig || defaultPaymentConfig,
        };
    });

    const newInvoices: Invoice[] = [];
    if (newProject.serviceConfigs && newProject.serviceConfigs.length > 0) {
        const totalServices = newProject.serviceConfigs.length;
        for (const serviceConfig of newProject.serviceConfigs) {
            const paymentConfig = serviceConfig.paymentConfig;
            if (!paymentConfig) continue;

            if (paymentConfig.type === "installment") {
                if (paymentConfig.installmentDates && paymentConfig.installmentDates.length > 0) {
                    const amountPerInstallment = paymentConfig.installmentAmount
                        || (project.budget / totalServices / paymentConfig.installmentDates.length);
                    for (const installmentDate of paymentConfig.installmentDates) {
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

    if (serviceDocs.length > 0) {
        try {
            await ServiceModel.insertMany(serviceDocs, { ordered: true });
        } catch (serviceSyncError) {
            console.error("[createProject] Service sync failed before project creation:", serviceSyncError);
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
        throw projectCreationError;
    }

    await incrementAgencyUsage(agencyId, "projects");

    if (newInvoices.length > 0) {
        await InvoiceModel.insertMany(newInvoices);
    }

    if (project.clientId && newInvoices.length > 0 && await isNotifEnabled("invoice")) {
        await NotificationModel.create({
            id: generateId(),
            agencyId,
            userId: project.clientId,
            message: `${newInvoices.length} pending invoice(s) for project: ${project.name}`,
            read: false,
            timestamp: new Date().toISOString(),
            link: "/dashboard/finance",
        });
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

    if (project.clientId) {
        try {
            const client = await ClientModel.findOne({ id: project.clientId, agencyId })
                .select("email name")
                .lean() as { email?: string; name?: string } | null;
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
        } catch (emailError) {
            console.error("[Email] Failed to send project creation email:", emailError);
        }
    }

    revalidatePath("/dashboard/projects");
    revalidatePath("/dashboard/finance");
    return sanitizeDoc(newProject);
}

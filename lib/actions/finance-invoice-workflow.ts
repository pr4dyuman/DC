import "server-only";

import { revalidatePath } from "next/cache";
import type { Invoice, User } from "../db";
import { checkAgencyLimit } from "../agency-context";
import { sendInvoiceCreatedEmail, sendPaymentApprovedEmail, sendPaymentPendingApprovalEmail, sendPaymentRejectedEmail } from "../brevo-mail";
import { formatCurrency } from "../currency";
import { generateId } from "../utils-server";
import { sanitizeMongoInput, sanitizeString } from "../validation";
import {
    InvoiceModel,
    NotificationModel,
    TransactionModel,
    UserModel,
    connectDB,
} from "../mongodb";
import { getDefaultCurrency } from "./super-admin";
import { type AgencyContext, type FinanceActor, getClientDoc, getProjectDoc } from "./finance-mutation-shared";
import { isNotifEnabled, sanitizeDoc } from "./shared";

export async function clientMarkInvoiceAsPaidImpl(invoiceId: string, currentUser: FinanceActor, agencyId: string) {
    await connectDB();

    const invoice = await InvoiceModel.findOne({ id: invoiceId, agencyId }).lean() as Invoice | null;
    if (!invoice) throw new Error("Invoice not found");

    const project = await getProjectDoc(agencyId, invoice.projectId);
    if (!project || project.clientId !== currentUser.id) {
        throw new Error("Unauthorized: This invoice doesn't belong to you");
    }
    if (!["Pending", "Overdue"].includes(invoice.status)) {
        throw new Error(`Cannot mark ${invoice.status} invoice as paid`);
    }

    await InvoiceModel.updateOne({ id: invoiceId, agencyId }, { $set: { status: "Processing" } });

    const admins = await UserModel.find({ agencyId, role: "admin" }).select("-password").lean() as Array<Pick<User, "id" | "email">>;
    const currency = await getDefaultCurrency();
    if (await isNotifEnabled("invoice")) {
        await NotificationModel.insertMany(admins.map((admin) => ({
            id: generateId(),
            agencyId,
            userId: admin.id,
            message: `${currentUser.name} marked invoice ${formatCurrency(invoice.amount, currency)} as paid - Awaiting approval`,
            read: false,
            timestamp: new Date().toISOString(),
            link: "/dashboard/finance",
        })));
    }

    try {
        const adminEmails = admins.map((admin) => admin.email).filter(Boolean) as string[];
        if (adminEmails.length > 0) {
            await sendPaymentPendingApprovalEmail({
                adminEmails,
                clientName: currentUser.name,
                amount: invoice.amount,
                projectName: project.name,
                financeLink: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/dashboard/finance`,
            });
        }
    } catch (emailError) {
        console.error("[Email] Failed to send payment pending approval email:", emailError);
    }

    revalidatePath("/dashboard/finance");
}

export async function adminApproveInvoicePaymentImpl(invoiceId: string, agencyId: string) {
    await connectDB();

    const invoice = await InvoiceModel.findOne({ id: invoiceId, agencyId }).lean() as Invoice | null;
    if (!invoice) throw new Error("Invoice not found");
    if (invoice.status !== "Processing") {
        throw new Error(`Can only approve Processing invoices, this is ${invoice.status} `);
    }

    const projectInvoices = await InvoiceModel.find({ projectId: invoice.projectId, agencyId })
        .sort({ date: 1 }).lean() as Invoice[];
    const installmentIndex = projectInvoices.findIndex((item) => item.id === invoiceId);
    const installmentNumber = installmentIndex !== -1 ? installmentIndex + 1 : "?";
    const totalInstallments = projectInvoices.length;

    const project = await getProjectDoc(agencyId, invoice.projectId);
    const description = `Installment ${installmentNumber}/${totalInstallments} for ${project?.name || "Project"} - ${invoice.date}`;

    await InvoiceModel.updateOne({ id: invoiceId, agencyId }, { $set: { status: "Paid" } });
    const newTransaction = {
        id: generateId(),
        agencyId,
        date: new Date().toISOString().split("T")[0],
        amount: invoice.amount,
        type: "income" as const,
        category: "Project" as const,
        description,
        status: "completed" as const,
        projectId: invoice.projectId,
        invoiceId: invoice.id,
    };
    await TransactionModel.create(newTransaction);

    if (project?.clientId && await isNotifEnabled("invoice")) {
        await NotificationModel.create({
            id: generateId(),
            agencyId,
            userId: project.clientId,
            message: `Payment approved! ${formatCurrency(invoice.amount, await getDefaultCurrency())} received for ${project.name}`,
            read: false,
            timestamp: new Date().toISOString(),
            link: "/dashboard/finance",
        });
    }

    try {
        if (project?.clientId) {
            const client = await getClientDoc(agencyId, project.clientId);
            if (client?.email) {
                await sendPaymentApprovedEmail({
                    clientEmail: client.email,
                    clientName: client.name,
                    amount: invoice.amount,
                    projectName: project.name,
                    financeLink: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/dashboard/finance`,
                });
            }
        }
    } catch (emailError) {
        console.error("[Email] Failed to send payment approved email:", emailError);
    }

    revalidatePath("/dashboard/finance");
}

export async function adminRejectInvoicePaymentImpl(invoiceId: string, agencyId: string, reason?: string) {
    await connectDB();
    if (reason) reason = sanitizeString(reason, 1000);

    const invoice = await InvoiceModel.findOne({ id: invoiceId, agencyId }).lean() as Invoice | null;
    if (!invoice) throw new Error("Invoice not found");
    if (invoice.status !== "Processing") throw new Error(`Can only reject Processing invoices, this is ${invoice.status}`);

    await InvoiceModel.updateOne({ id: invoiceId, agencyId }, { $set: { status: "Pending" } });

    const project = await getProjectDoc(agencyId, invoice.projectId);
    if (project?.clientId && await isNotifEnabled("invoice")) {
        const message = reason
            ? `Payment rejected: ${reason}. Please mark as paid again.`
            : `Payment rejected for ${formatCurrency(invoice.amount, await getDefaultCurrency())}. Please mark as paid again.`;
        await NotificationModel.create({
            id: generateId(),
            agencyId,
            userId: project.clientId,
            message,
            read: false,
            timestamp: new Date().toISOString(),
            link: "/dashboard/finance",
        });
    }

    try {
        if (project?.clientId) {
            const client = await getClientDoc(agencyId, project.clientId);
            if (client?.email) {
                await sendPaymentRejectedEmail({
                    clientEmail: client.email,
                    clientName: client.name,
                    amount: invoice.amount,
                    projectName: project.name,
                    rejectionReason: reason,
                    financeLink: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/dashboard/finance`,
                });
            }
        }
    } catch (emailError) {
        console.error("[Email] Failed to send payment rejected email:", emailError);
    }

    revalidatePath("/dashboard/finance");
}

export async function updateInvoiceStatusImpl(
    invoiceId: string,
    agencyId: string,
    status: "Paid" | "Pending" | "Overdue" | "Processing"
) {
    await connectDB();
    const invoice = await InvoiceModel.findOne({ id: invoiceId, agencyId }).lean() as Invoice | null;
    if (!invoice) throw new Error("Invoice not found");

    const currentStatus = invoice.status;
    const invalidTransitions: Record<string, string[]> = {
        Paid: ["Pending"],
    };
    if (invalidTransitions[currentStatus]?.includes(status)) {
        throw new Error(`Cannot change invoice status from ${currentStatus} to ${status}.`);
    }

    await InvoiceModel.updateOne(
        { id: invoiceId, agencyId },
        { $set: { status } }
    );
    revalidatePath("/dashboard/finance");
}

export async function createInvoiceImpl(
    invoice: Omit<Invoice, "id" | "status" | "agencyId">,
    agency: AgencyContext,
    currentUser: FinanceActor | null
) {
    await connectDB();
    invoice = sanitizeMongoInput(invoice);
    if (!invoice.amount || !Number.isFinite(invoice.amount) || invoice.amount <= 0) {
        throw new Error("Validation Error: Invoice amount must be a valid positive number.");
    }
    if (invoice.amount > 100_000_000) {
        throw new Error("Validation Error: Invoice amount exceeds maximum allowed value.");
    }
    if (!invoice.projectId) throw new Error("Validation Error: Invoice must be linked to a project.");

    const invoiceLimit = await checkAgencyLimit(agency.id, "monthlyInvoices");
    if (!invoiceLimit.allowed) {
        throw new Error(`Plan limit reached: your plan allows ${invoiceLimit.limit} monthly invoices (currently ${invoiceLimit.current}).`);
    }

    const project = await getProjectDoc(agency.id, invoice.projectId);
    if (!project) throw new Error(`Project with ID ${invoice.projectId} not found`);

    const newInvoice: Invoice = {
        ...invoice,
        id: generateId(),
        status: "Pending",
        agencyId: agency.id,
        ...(currentUser ? { performedBy: currentUser.id } : {}),
    };
    await InvoiceModel.create(newInvoice);

    if (project.clientId && await isNotifEnabled("invoice")) {
        await NotificationModel.create({
            id: generateId(),
            agencyId: agency.id,
            userId: project.clientId,
            message: `New Invoice Generated: ${formatCurrency(invoice.amount, await getDefaultCurrency())}`,
            read: false,
            timestamp: new Date().toISOString(),
            link: "/dashboard/finance",
        });
    }

    try {
        if (project.clientId) {
            const client = await getClientDoc(agency.id, project.clientId);
            if (client?.email) {
                await sendInvoiceCreatedEmail({
                    clientEmail: client.email,
                    clientName: client.name,
                    amount: invoice.amount,
                    projectName: project.name,
                    dueDate: invoice.date,
                    financeLink: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/dashboard/finance`,
                });
            }
        }
    } catch (emailError) {
        console.error("[Email] Failed to send invoice creation email:", emailError);
    }

    revalidatePath("/dashboard/finance");
    return sanitizeDoc(newInvoice);
}

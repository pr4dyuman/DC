import "server-only";

import { revalidatePath } from "next/cache";
import type { Invoice, User } from "../db";
import { decrementAgencyUsage, reserveAgencyUsage } from "../agency-context";
import { sendInvoiceCreatedEmail, sendPaymentApprovedEmail, sendPaymentPendingApprovalEmail, sendPaymentRejectedEmail } from "../brevo-mail";
import { formatCurrency } from "../currency";
import { generateId } from "../utils-server";
import { sanitizeMongoInput, sanitizeString } from "../validation";
import {
    InvoiceModel,
    TransactionModel,
    UserModel,
    connectDB,
} from "../mongodb";
import { getDefaultCurrency } from "./super-admin";
import { type AgencyContext, type FinanceActor, getClientDoc, getProjectDoc } from "./finance-mutation-shared";
import { isNotifEnabled, sanitizeDoc } from "./shared";
import { createNotifications } from "./notification-service";

function getProjectClientIds(project: { clientId?: string; clientIds?: string[] } | null | undefined) {
    const ids = new Set<string>();
    if (project?.clientId) ids.add(project.clientId);
    for (const clientId of project?.clientIds || []) {
        if (clientId) ids.add(clientId);
    }
    return [...ids];
}

type PaidInvoiceResult = {
    invoice: Invoice;
    projectName: string;
    clientIds: string[];
    transactionId?: string;
    transactionCreated: boolean;
};

async function markInvoicePaidWithIncomeTransaction(
    invoiceId: string,
    agencyId: string,
    allowedCurrentStatuses: Invoice["status"][],
    alreadyPaidIsOk: boolean
): Promise<PaidInvoiceResult> {
    const invoice = await InvoiceModel.findOneAndUpdate(
        {
            id: invoiceId,
            agencyId,
            status: { $in: allowedCurrentStatuses },
        },
        { $set: { status: "Paid" } },
        { new: false, lean: true }
    ) as Invoice | null;

    if (!invoice) {
        const currentInvoice = await InvoiceModel.findOne({ id: invoiceId, agencyId }).lean() as Invoice | null;
        if (!currentInvoice) throw new Error("Invoice not found");
        if (alreadyPaidIsOk && currentInvoice.status === "Paid") {
            return {
                invoice: currentInvoice,
                projectName: "Project",
                clientIds: [],
                transactionCreated: false,
            };
        }
        throw new Error(`Can only mark ${allowedCurrentStatuses.join(", ")} invoices as Paid, this is ${currentInvoice.status}`);
    }

    try {
        const projectInvoices = await InvoiceModel.find({ projectId: invoice.projectId, agencyId })
            .sort({ date: 1 }).lean() as Invoice[];
        const installmentIndex = projectInvoices.findIndex((item) => item.id === invoiceId);
        const installmentNumber = installmentIndex !== -1 ? installmentIndex + 1 : "?";
        const totalInstallments = projectInvoices.length;

        const project = await getProjectDoc(agencyId, invoice.projectId);
        const projectName = project?.name || "Project";
        const description = `Installment ${installmentNumber}/${totalInstallments} for ${projectName} - ${invoice.date}`;
        const clientIds = getProjectClientIds(project);
        const existingTransaction = await TransactionModel.findOne({ agencyId, invoiceId: invoice.id })
            .select("id")
            .lean() as { id?: string } | null;

        if (existingTransaction?.id) {
            return {
                invoice,
                projectName,
                clientIds,
                transactionId: existingTransaction.id,
                transactionCreated: false,
            };
        }

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

        return {
            invoice,
            projectName,
            clientIds,
            transactionId: newTransaction.id,
            transactionCreated: true,
        };
    } catch (error) {
        await InvoiceModel.updateOne(
            { id: invoiceId, agencyId, status: "Paid" },
            { $set: { status: invoice.status } }
        );
        throw error;
    }
}

export async function clientMarkInvoiceAsPaidImpl(
    invoiceId: string,
    currentUser: FinanceActor,
    agencyId: string,
    paymentDate?: string,
    paymentNote?: string,
) {
    await connectDB();

    const invoice = await InvoiceModel.findOne({ id: invoiceId, agencyId }).lean() as Invoice | null;
    if (!invoice) throw new Error("Invoice not found");

    const project = await getProjectDoc(agencyId, invoice.projectId);
    const projectClientIds = getProjectClientIds(project);
    if (!project || !projectClientIds.includes(currentUser.id)) {
        throw new Error("Unauthorized: This invoice doesn't belong to you");
    }
    if (!["Pending", "Overdue"].includes(invoice.status)) {
        throw new Error(`Cannot mark ${invoice.status} invoice as paid`);
    }

    const updateFields: Record<string, unknown> = { status: "Processing" };
    if (paymentDate) updateFields.paymentDate = paymentDate;
    if (paymentNote) updateFields.paymentNote = paymentNote;

    await InvoiceModel.updateOne({ id: invoiceId, agencyId }, { $set: updateFields });

    const admins = await UserModel.find({ agencyId, role: { $in: ["admin", "manager"] } }).select("-password").lean() as Array<Pick<User, "id" | "email">>;
    const currency = await getDefaultCurrency();
    if (await isNotifEnabled("invoice")) {
        await createNotifications(admins.map((admin) => ({
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

    const paymentResult = await markInvoicePaidWithIncomeTransaction(
        invoiceId,
        agencyId,
        ["Processing"],
        false
    );
    const { invoice, projectName, clientIds } = paymentResult;

    if (clientIds.length > 0 && await isNotifEnabled("invoice")) {
        const currency = await getDefaultCurrency();
        await createNotifications(clientIds.map((clientId) => ({
            agencyId,
            userId: clientId,
            message: `Payment approved! ${formatCurrency(invoice.amount, currency)} received for ${projectName}`,
            read: false,
            timestamp: new Date().toISOString(),
            link: "/dashboard/finance",
            eventKey: `invoice-payment-approved:${invoice.id}:${clientId}`,
        })));
    }

    try {
        for (const clientId of clientIds) {
            const client = await getClientDoc(agencyId, clientId);
            if (client?.email) {
                await sendPaymentApprovedEmail({
                    clientEmail: client.email,
                    clientName: client.name,
                    amount: invoice.amount,
                    projectName,
                    financeLink: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/dashboard/finance`,
                });
            }
        }
    } catch (emailError) {
        console.error("[Email] Failed to send payment approved email:", emailError);
    }

    revalidatePath("/dashboard/finance");
    return paymentResult;
}

export async function adminRejectInvoicePaymentImpl(invoiceId: string, agencyId: string, reason?: string) {
    await connectDB();
    if (reason) reason = sanitizeString(reason, 1000);

    const invoice = await InvoiceModel.findOne({ id: invoiceId, agencyId }).lean() as Invoice | null;
    if (!invoice) throw new Error("Invoice not found");
    if (invoice.status !== "Processing") throw new Error(`Can only reject Processing invoices, this is ${invoice.status}`);

    await InvoiceModel.updateOne({ id: invoiceId, agencyId }, { $set: { status: "Pending" } });

    const project = await getProjectDoc(agencyId, invoice.projectId);
    const projectName = project?.name || "Project";
    const clientIds = getProjectClientIds(project);
    if (clientIds.length > 0 && await isNotifEnabled("invoice")) {
        const message = reason
            ? `Payment rejected: ${reason}. Please mark as paid again.`
            : `Payment rejected for ${formatCurrency(invoice.amount, await getDefaultCurrency())}. Please mark as paid again.`;
        await createNotifications(clientIds.map((clientId) => ({
            agencyId,
            userId: clientId,
            message,
            read: false,
            timestamp: new Date().toISOString(),
            link: "/dashboard/finance",
        })));
    }

    try {
        for (const clientId of clientIds) {
            const client = await getClientDoc(agencyId, clientId);
            if (client?.email) {
                await sendPaymentRejectedEmail({
                    clientEmail: client.email,
                    clientName: client.name,
                    amount: invoice.amount,
                    projectName,
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

    if (status === "Paid") {
        const result = await markInvoicePaidWithIncomeTransaction(
            invoiceId,
            agencyId,
            ["Pending", "Overdue", "Processing"],
            true
        );
        revalidatePath("/dashboard/finance");
        return result;
    }

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
    return { transactionCreated: false };
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

    const project = await getProjectDoc(agency.id, invoice.projectId);
    if (!project) throw new Error(`Project with ID ${invoice.projectId} not found`);
    const clientIds = getProjectClientIds(project);

    const invoiceLimit = await reserveAgencyUsage(agency.id, "monthlyInvoices");
    if (!invoiceLimit.allowed) {
        throw new Error(`Plan limit reached: your plan allows ${invoiceLimit.limit} monthly invoices (currently ${invoiceLimit.current}).`);
    }

    const newInvoice: Invoice = {
        ...invoice,
        id: generateId(),
        status: "Pending",
        agencyId: agency.id,
        ...(currentUser ? { performedBy: currentUser.id } : {}),
    };
    try {
        await InvoiceModel.create(newInvoice);
    } catch (error) {
        await decrementAgencyUsage(agency.id, "monthlyInvoices");
        throw error;
    }

    if (clientIds.length > 0 && await isNotifEnabled("invoice")) {
        const currency = await getDefaultCurrency();
        await createNotifications(clientIds.map((clientId) => ({
            agencyId: agency.id,
            userId: clientId,
            message: `New Invoice Generated: ${formatCurrency(invoice.amount, currency)}`,
            read: false,
            timestamp: new Date().toISOString(),
            link: "/dashboard/finance",
            eventKey: `invoice-created:${newInvoice.id}:${clientId}`,
        })));
    }

    try {
        for (const clientId of clientIds) {
            const client = await getClientDoc(agency.id, clientId);
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

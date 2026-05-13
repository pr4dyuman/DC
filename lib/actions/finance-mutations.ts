import "server-only";

import { revalidatePath } from "next/cache";
import type { Transaction, User } from "../db";
import { comparePassword } from "../auth";
import { formatCurrency } from "../currency";
import { getDefaultCurrency } from "./super-admin";
import {
    sendRefundIssuedEmail,
    sendSalaryPaidEmail,
} from "../brevo-mail";
import { generateId } from "../utils-server";
import { sanitizeMongoInput, sanitizeName, sanitizeString } from "../validation";
import {
    ActivityModel,
    ProjectModel,
    TransactionModel,
    UserModel,
    connectDB,
} from "../mongodb";
import {
    type AgencyContext,
    type FinanceActor,
    type RefundInput,
    getClientDoc,
    getProjectDoc,
} from "./finance-mutation-shared";
import { isNotifEnabled } from "./shared";
import { createNotification, createNotifications } from "./notification-service";
export {
    adminApproveInvoicePaymentImpl,
    adminRejectInvoicePaymentImpl,
    clientMarkInvoiceAsPaidImpl,
    createInvoiceImpl,
    updateInvoiceStatusImpl,
} from "./finance-invoice-workflow";

function getProjectClientIds(project: { clientId?: string; clientIds?: string[] } | null | undefined): string[] {
    return [
        ...(project?.clientIds || []),
        ...(project?.clientId && !(project.clientIds || []).includes(project.clientId) ? [project.clientId] : []),
    ].filter(Boolean);
}

export async function createTransactionImpl(
    transaction: Omit<Transaction, "id" | "status" | "agencyId"> & { status?: Transaction["status"] },
    agency: AgencyContext,
    currentUser: FinanceActor | null
) {
    transaction = sanitizeMongoInput(transaction);
    if (transaction.description) transaction.description = sanitizeString(transaction.description, 2000);

    if (!transaction.amount || !Number.isFinite(transaction.amount) || transaction.amount <= 0) {
        throw new Error("Validation Error: Amount must be a valid positive number.");
    }
    if (transaction.amount > 100_000_000) {
        throw new Error("Validation Error: Amount exceeds maximum allowed value.");
    }
    if (transaction.category === "Project" && !transaction.projectId) {
        throw new Error("Validation Error: Projects must have a Project ID.");
    }
    if (transaction.category === "Salary" && transaction.type !== "expense") {
        throw new Error("Validation Error: Salary must be an Expense.");
    }
    if (transaction.category === "Refund" && transaction.type !== "expense") {
        throw new Error("Validation Error: Refund must be an Expense.");
    }
    if (transaction.category === "Refund" && !transaction.projectId) {
        throw new Error("Validation Error: Refunds must have a Project ID.");
    }
    if (transaction.category === "Freelancer" && transaction.type !== "expense") {
        throw new Error("Validation Error: Freelancer payments must be an Expense.");
    }
    if (transaction.category === "Tax" && transaction.type !== "expense") {
        throw new Error("Validation Error: Tax payments must be an Expense.");
    }
    if (transaction.category === "Reimbursement" && transaction.type !== "expense") {
        throw new Error("Validation Error: Reimbursements must be an Expense.");
    }
    if (transaction.category === "Retainer") {
        if (transaction.type !== "income") throw new Error("Validation Error: Retainer must be Income.");
        if (!transaction.projectId) throw new Error("Validation Error: Retainer must be linked to a Project.");
    }
    if (transaction.category === "Investor" && !String(transaction.description || "").trim()) {
        throw new Error("Validation Error: Investor transactions require an investor name in description.");
    }

    await connectDB();

    if (transaction.projectId) {
        const projectExists = await ProjectModel.exists({ id: transaction.projectId, agencyId: agency.id });
        if (!projectExists) throw new Error(`Project with ID ${transaction.projectId} not found`);
    }
    if (transaction.userId) {
        const userExists = await UserModel.exists({ id: transaction.userId, agencyId: agency.id });
        if (!userExists) throw new Error(`User with ID ${transaction.userId} not found`);
    }

    const newTransaction: Transaction = {
        ...transaction,
        id: generateId(),
        status: transaction.status || "completed",
        agencyId: agency.id,
        ...(currentUser ? { performedBy: currentUser.id } : {}),
    } as Transaction;
    await TransactionModel.create(newTransaction);

    if (newTransaction.category === "Salary" && newTransaction.userId && newTransaction.type === "expense") {
        if (await isNotifEnabled("salary")) {
            await createNotification({
                agencyId: agency.id,
                userId: newTransaction.userId,
                message: `Salary Payment Received: ${formatCurrency(newTransaction.amount, await getDefaultCurrency())} `,
                read: false,
                timestamp: new Date().toISOString(),
                link: "/dashboard/finance",
                eventKey: `salary-paid:${newTransaction.id}:${newTransaction.userId}`,
            });
        }
        try {
            const employee = await UserModel.findOne({ id: newTransaction.userId, agencyId: agency.id }).select("-password").lean() as Pick<User, "email" | "name"> | null;
            if (employee?.email) {
                await sendSalaryPaidEmail({
                    employeeEmail: employee.email,
                    employeeName: employee.name,
                    amount: newTransaction.amount,
                    month: new Date().toLocaleString("default", { month: "long", year: "numeric" }),
                    paymentDate: newTransaction.date,
                    financeLink: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/dashboard/finance`,
                });
            }
        } catch (emailError) {
            console.error("[Email] Failed to send salary payment email:", emailError);
        }
    }

    revalidatePath("/dashboard/finance");
    if (transaction.projectId) {
        revalidatePath(`/dashboard/projects/${transaction.projectId}`);
    }

    return newTransaction;
}

export async function markTransactionAsPaidImpl(transactionId: string, agencyId: string) {
    await connectDB();
    const transaction = await TransactionModel.findOne({ id: transactionId, agencyId }).lean() as Transaction | null;
    if (!transaction) throw new Error("Transaction not found");
    if (transaction.status === "completed") throw new Error("Transaction is already active/completed");
    await TransactionModel.updateOne({ id: transactionId, agencyId }, { $set: { status: "completed" } });
    revalidatePath("/dashboard/finance");
}

export async function deleteTransactionImpl(transactionId: string, agencyId: string) {
    await TransactionModel.deleteOne({ id: transactionId, agencyId });
    revalidatePath("/dashboard/finance");
    return { success: true };
}

export async function payEmployeeImpl(
    userId: string,
    amount: number,
    month: string,
    userName: string,
    agency: AgencyContext,
    currentUser: FinanceActor | null
) {
    userName = sanitizeName(userName, 200);
    month = sanitizeString(month, 50);

    await connectDB();
    const existingPayment = await TransactionModel.findOne({
        userId,
        category: "Salary",
        agencyId: agency.id,
        description: { $regex: new RegExp(`^Salary Payment - ${month.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`, "i") },
        status: "completed",
    }).lean();
    if (existingPayment) {
        throw new Error(`Salary for ${userName} has already been paid for ${month}.`);
    }

    const description = `Salary Payment - ${month} - ${userName}`;
    const txn = await createTransactionImpl({
        amount,
        type: "expense",
        category: "Salary",
        description,
        date: new Date().toISOString().split("T")[0],
        userId,
    }, agency, currentUser);

    revalidatePath("/dashboard/finance");
    return { success: true, transactionId: txn.id };
}

export async function createRefundImpl(refund: RefundInput, agency: AgencyContext, currentUser: FinanceActor) {
    refund.description = sanitizeString(refund.description, 2000);
    refund.refundReason = sanitizeString(refund.refundReason, 2000);
    if (!refund.amount || !Number.isFinite(refund.amount) || refund.amount <= 0) {
        throw new Error("Refund amount must be a valid positive number");
    }
    if (refund.amount > 100_000_000) {
        throw new Error("Refund amount exceeds maximum allowed value");
    }

    await connectDB();
    const project = await getProjectDoc(agency.id, refund.projectId);
    if (!project) throw new Error("Project not found");

    const [incomeAgg, refundAgg] = await Promise.all([
        TransactionModel.aggregate([
            { $match: { projectId: refund.projectId, agencyId: agency.id, type: "income", status: "completed" } },
            { $group: { _id: null, total: { $sum: "$amount" } } },
        ]),
        TransactionModel.aggregate([
            { $match: { projectId: refund.projectId, agencyId: agency.id, category: "Refund", status: "completed" } },
            { $group: { _id: null, total: { $sum: "$amount" } } },
        ]),
    ]);
    const projectIncome = incomeAgg[0]?.total || 0;
    const existingRefunds = refundAgg[0]?.total || 0;
    if (existingRefunds + refund.amount > projectIncome) {
        const currency = await getDefaultCurrency();
        throw new Error(`Refund amount exceeds project income. Project income: ${formatCurrency(projectIncome, currency)}, Existing refunds: ${formatCurrency(existingRefunds, currency)}, Attempted refund: ${formatCurrency(refund.amount, currency)}`);
    }

    const newRefund = {
        id: generateId(),
        agencyId: agency.id,
        date: refund.date,
        amount: refund.amount,
        type: "expense" as const,
        category: "Refund" as const,
        description: refund.description,
        status: "completed" as const,
        projectId: refund.projectId,
        performedBy: currentUser.id,
    };
    await TransactionModel.create(newRefund);

    await ActivityModel.create({
        id: generateId(),
        agencyId: agency.id,
        user: currentUser.name,
        userId: currentUser.id,
        action: "issued refund",
        target: project.name,
        timestamp: new Date().toISOString(),
    });

    const linkedClientIds = getProjectClientIds(project);
    if (linkedClientIds.length > 0 && await isNotifEnabled("refund")) {
        const currency = await getDefaultCurrency();
        await createNotifications(linkedClientIds.map((clientId) => ({
            agencyId: agency.id,
            userId: clientId,
            message: `Refund of ${formatCurrency(refund.amount, currency)} has been issued for ${project.name}`,
            read: false,
            timestamp: new Date().toISOString(),
            link: `/dashboard/projects/${project.slug || project.id}`,
            eventKey: `refund-issued:${newRefund.id}:${clientId}`,
        })));
    }

    try {
        for (const clientId of linkedClientIds) {
            const client = await getClientDoc(agency.id, clientId);
            if (!client?.email) continue;
            await sendRefundIssuedEmail({
                clientEmail: client.email,
                clientName: client.name,
                amount: refund.amount,
                projectName: project.name,
                refundReason: refund.refundReason,
                projectLink: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/dashboard/projects/${project.slug || project.id}`,
            });
        }
    } catch (emailError) {
        console.error("[Email] Failed to send refund issued email:", emailError);
    }

    revalidatePath("/dashboard/finance");
    revalidatePath("/dashboard/clients");
    revalidatePath(`/dashboard/projects/${project.slug || project.id}`);

    return newRefund;
}

export async function verifyAdminPasswordForDeletionImpl(currentUserId: string, password: string) {
    await connectDB();
    const userDoc = await UserModel.findOne({ id: currentUserId }).lean();
    if (!userDoc?.password || !(await comparePassword(password, userDoc.password))) {
        throw new Error("Invalid Password");
    }
}

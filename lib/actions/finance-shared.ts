import "server-only";

import type { Invoice, Transaction } from "../db";
import type { ProjectLike } from "./projects-shared";

const CLIENT_OUTSTANDING_INVOICE_STATUSES: Invoice["status"][] = ["Pending", "Overdue"];

function sumAmounts(items: Array<{ amount?: number | null }> = []): number {
    return items.reduce((sum, item) => sum + (Number(item?.amount) || 0), 0);
}

function isCompletedIncomeTransaction(transaction: Partial<Transaction> | null | undefined): boolean {
    return transaction?.status === "completed" && transaction?.type === "income";
}

function isCompletedExpenseTransaction(transaction: Partial<Transaction> | null | undefined): boolean {
    return transaction?.status === "completed" && transaction?.type === "expense";
}

function isCompletedRefundTransaction(transaction: Partial<Transaction> | null | undefined): boolean {
    return isCompletedExpenseTransaction(transaction) && transaction?.category === "Refund";
}

function isClientOutstandingInvoice(invoice: Partial<Invoice> | null | undefined): boolean {
    return !!invoice?.status && CLIENT_OUTSTANDING_INVOICE_STATUSES.includes(invoice.status);
}

export function buildClientFinanceSummary(
    projects: Array<Partial<ProjectLike>>,
    invoices: Array<Partial<Invoice>>,
    transactions: Array<Partial<Transaction>>
) {
    const completedIncomeTransactions = transactions.filter(isCompletedIncomeTransaction);
    const completedRefundTransactions = transactions.filter(isCompletedRefundTransaction);
    const outstandingInvoices = invoices.filter(isClientOutstandingInvoice);
    const processingInvoices = invoices.filter((invoice) => invoice?.status === "Processing");

    const totalPaid = sumAmounts(completedIncomeTransactions);
    const totalRefunds = sumAmounts(completedRefundTransactions);
    const totalSpent = totalPaid - totalRefunds;

    return {
        totalInvoiced: sumAmounts(invoices),
        totalPaid,
        totalRefunds,
        totalSpent,
        ltv: totalSpent,
        pendingAmount: sumAmounts(outstandingInvoices),
        pendingInvoicesCount: outstandingInvoices.length,
        processingAmount: sumAmounts(processingInvoices),
        processingInvoicesCount: processingInvoices.length,
        totalBudget: projects.reduce((sum: number, project) => sum + (Number(project?.budget) || 0), 0),
        projectCount: projects.length,
        activeProjectCount: projects.filter((project) => project?.status === "Active").length,
        completedProjectCount: projects.filter((project) => project?.status === "Completed").length,
    };
}

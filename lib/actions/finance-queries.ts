import "server-only";

import type { Activity, Invoice, Transaction, User } from "../db";
import {
    ActivityModel,
    InvoiceModel,
    ProjectModel,
    TransactionModel,
    UserModel,
    connectDB,
} from "../mongodb";
import { buildClientFinanceSummary } from "./finance-shared";
import { type ProjectLike } from "./projects-shared";
import { sanitizeDoc, sortByDateDesc } from "./shared";

type FinanceQueryActor = {
    id: string;
    role: string;
};

type FinanceFilters = {
    projectId?: string;
    userId?: string;
    category?: string;
};

export async function getTransactionsImpl(
    agencyId: string,
    actor: FinanceQueryActor,
    { projectId, userId, category }: FinanceFilters = {}
) {
    await connectDB();

    if (actor.role === "employee") {
        throw new Error("Unauthorized: Employees cannot access transaction data.");
    }

    const query: Record<string, unknown> = { agencyId };
    if (projectId) query.projectId = projectId;
    if (category) query.category = category;
    if (userId) query.userId = userId;

    if (actor.role === "client") {
        const clientProjectIds = await ProjectModel.distinct("id", {
            $or: [{ clientId: actor.id }, { clientIds: actor.id }],
            agencyId,
        });
        if (projectId) {
            if (!clientProjectIds.includes(projectId)) return [];
            query.projectId = projectId;
        } else {
            query.projectId = { $in: clientProjectIds };
        }
    }

    const transactions = await TransactionModel.find(query).lean() as Transaction[];
    return transactions.map((transaction) => sanitizeDoc(transaction) as Transaction).sort(sortByDateDesc);
}

export async function getClientFinanceDataImpl(agencyId: string, clientId: string) {
    await connectDB();

    const clientProjectIds = await ProjectModel.distinct("id", {
        $or: [{ clientId }, { clientIds: clientId }],
        agencyId,
    });
    const [projects, invoices, transactions] = await Promise.all([
        ProjectModel.find({
            $or: [{ clientId }, { clientIds: clientId }],
            agencyId,
        }).lean() as Promise<ProjectLike[]>,
        InvoiceModel.find({ projectId: { $in: clientProjectIds }, agencyId }).lean() as Promise<Invoice[]>,
        TransactionModel.find({ projectId: { $in: clientProjectIds }, agencyId }).lean() as Promise<Transaction[]>,
    ]);

    const summary = buildClientFinanceSummary(projects, invoices, transactions);

    return {
        invoices: invoices.map((invoice) => sanitizeDoc(invoice) as Invoice).sort(sortByDateDesc),
        transactions: transactions.map((transaction) => sanitizeDoc(transaction) as Transaction).sort(sortByDateDesc),
        stats: {
            totalInvoiced: summary.totalInvoiced,
            totalPaid: summary.totalPaid,
            pendingAmount: summary.pendingAmount,
            ltv: summary.ltv,
        },
    };
}

export async function getClientActivityLogsImpl(agencyId: string, clientId: string, limit = 20) {
    await connectDB();
    const activities = await ActivityModel.find({ userId: clientId, agencyId })
        .sort({ timestamp: -1 })
        .limit(limit)
        .lean();
    return activities.map((activity) => sanitizeDoc(activity) as Activity);
}

export async function getCategoryMemberSummaryImpl(agencyId: string, category: string) {
    await connectDB();
    const transactions = await TransactionModel.find({ category, agencyId }).lean() as Transaction[];
    const summaryMap = new Map<string, { id: string; name: string; total: number; count: number; avatar?: string }>();

    if (category === "Internal Transfer") {
        const users = await UserModel.find({ agencyId }).select("-password").lean() as User[];
        const userById = new Map(users.map((user) => [user.id, user] as const));
        transactions.forEach((transaction) => {
            const user = transaction.userId ? userById.get(transaction.userId) : null;
            if (user) {
                const existing = summaryMap.get(user.id) || { id: user.id, name: user.name, total: 0, count: 0, avatar: user.avatar };
                existing.total += transaction.amount;
                existing.count += 1;
                summaryMap.set(user.id, existing);
            } else {
                const existing = summaryMap.get("unknown") || { id: "unknown", name: "Unknown", total: 0, count: 0 };
                existing.total += transaction.amount;
                existing.count += 1;
                summaryMap.set("unknown", existing);
            }
        });
    } else if (category === "Investor") {
        transactions.forEach((transaction) => {
            const name = String(transaction.description || "").trim() || "Unknown Investor";
            const existing = summaryMap.get(name) || { id: name, name, total: 0, count: 0 };
            existing.total += transaction.amount;
            existing.count += 1;
            summaryMap.set(name, existing);
        });
    }

    return Array.from(summaryMap.values()).sort((a, b) => b.total - a.total);
}

export async function getInvoicesImpl(agencyId: string, actor: FinanceQueryActor, projectId?: string) {
    await connectDB();

    if (actor.role === "employee") {
        throw new Error("Unauthorized: Employees cannot access invoice data.");
    }

    const query: Record<string, unknown> = { agencyId };
    if (projectId) query.projectId = projectId;

    if (actor.role === "client") {
        const clientProjectIds = await ProjectModel.distinct("id", {
            $or: [{ clientId: actor.id }, { clientIds: actor.id }],
            agencyId,
        });
        if (projectId) {
            if (!clientProjectIds.includes(projectId)) return [];
            query.projectId = projectId;
        } else {
            query.projectId = { $in: clientProjectIds };
        }
    }

    const invoices = await InvoiceModel.find(query).lean() as Invoice[];
    return invoices.map((invoice) => sanitizeDoc(invoice) as Invoice).sort(sortByDateDesc);
}

export async function getFinanceStatsImpl(agencyId: string, { projectId, userId, category }: FinanceFilters = {}) {
    await connectDB();

    const transactionQuery: Record<string, unknown> = { agencyId };
    const invoiceQuery: Record<string, unknown> = { agencyId };
    if (projectId) {
        transactionQuery.projectId = projectId;
        invoiceQuery.projectId = projectId;
    }
    if (category) {
        transactionQuery.category = category;
    }

    const [loadedTransactions, invoices] = await Promise.all([
        TransactionModel.find(transactionQuery).lean(),
        InvoiceModel.find(invoiceQuery).lean(),
    ]);

    let transactions = loadedTransactions as Transaction[];
    const typedInvoices = invoices as Invoice[];

    if (userId) {
        transactions = transactions.filter((transaction) => transaction.userId === userId);
    }

    const totalRevenue = transactions
        .filter((transaction) => transaction.type === "income" && transaction.status === "completed")
        .reduce((sum, transaction) => sum + transaction.amount, 0);
    const totalExpenses = transactions
        .filter((transaction) => transaction.type === "expense" && transaction.status === "completed")
        .reduce((sum, transaction) => sum + transaction.amount, 0);
    const netProfit = totalRevenue - totalExpenses;
    const pendingInvoices = typedInvoices.filter((invoice) => ["Pending", "Processing", "Overdue"].includes(invoice.status));

    return {
        totalRevenue,
        totalExpenses,
        netProfit,
        pendingInvoicesAmount: pendingInvoices.reduce((sum, invoice) => sum + invoice.amount, 0),
        pendingInvoicesCount: pendingInvoices.length,
    };
}

export async function getFinanceChartDataImpl(agencyId: string, { projectId, userId, category }: FinanceFilters = {}) {
    await connectDB();

    const query: Record<string, unknown> = { agencyId };
    if (projectId) query.projectId = projectId;
    if (category) query.category = category;

    let transactions = await TransactionModel.find(query).lean() as Transaction[];
    if (userId) {
        transactions = transactions.filter((transaction) => transaction.userId === userId);
    }

    const monthKeys: string[] = [];
    const monthLabels: string[] = [];
    for (let i = 5; i >= 0; i--) {
        const date = new Date();
        date.setMonth(date.getMonth() - i);
        monthKeys.push(`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`);
        monthLabels.push(date.toLocaleString("default", { month: "short" }));
    }

    const chartData = monthKeys.map((key, index) => ({
        name: monthLabels[index],
        key,
        income: 0,
        expense: 0,
    }));

    transactions.forEach((transaction) => {
        const transactionDate = new Date(transaction.date);
        const transactionKey = `${transactionDate.getFullYear()}-${String(transactionDate.getMonth() + 1).padStart(2, "0")}`;
        const monthData = chartData.find((entry) => entry.key === transactionKey);
        if (monthData && transaction.status === "completed") {
            if (transaction.type === "income") monthData.income += transaction.amount;
            if (transaction.type === "expense") monthData.expense += transaction.amount;
        }
    });

    return chartData.map(({ name, income, expense }) => ({ name, income, expense }));
}

export async function getPayrollStatusImpl(agencyId: string, userId?: string) {
    await connectDB();

    const userQuery: Record<string, unknown> = { role: { $ne: "admin" }, agencyId };
    if (userId && userId !== "all") userQuery.id = userId;

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0];
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split("T")[0];
    const currentMonth = now.toLocaleString("default", { month: "long", year: "numeric" });

    const [users, transactions] = await Promise.all([
        UserModel.find(userQuery).select("-password").lean() as Promise<User[]>,
        TransactionModel.find({
            category: "Salary",
            type: "expense",
            status: "completed",
            date: { $gte: startOfMonth, $lte: endOfMonth },
            agencyId,
        }).lean() as Promise<Transaction[]>,
    ]);

    return users.map((user) => {
        const salary = user.salary || 5000;
        const isPaid = transactions.some((transaction) => transaction.userId === user.id);
        return { user: sanitizeDoc(user) as User, salary, status: isPaid ? "Paid" : "Pending", month: currentMonth };
    });
}

export async function getClientFinancialSummaryImpl(agencyId: string, clientId: string) {
    await connectDB();

    const clientProjects = await ProjectModel.find({
        $or: [{ clientId }, { clientIds: clientId }],
        agencyId,
    }).lean() as ProjectLike[];
    const projectIds = clientProjects.map((project) => project.id);

    const [invoices, transactions] = await Promise.all([
        InvoiceModel.find({ projectId: { $in: projectIds }, agencyId }).lean() as Promise<Invoice[]>,
        TransactionModel.find({ projectId: { $in: projectIds }, agencyId }).lean() as Promise<Transaction[]>,
    ]);

    const summary = buildClientFinanceSummary(clientProjects, invoices, transactions);

    return {
        totalPaid: summary.totalPaid,
        totalRefunds: summary.totalRefunds,
        lifetimeValue: summary.ltv,
        projectCount: summary.projectCount,
        activeProjectCount: summary.activeProjectCount,
    };
}

export async function getProjectRefundsImpl(agencyId: string, projectId: string) {
    await connectDB();

    const refunds = await TransactionModel.find({
        projectId,
        category: "Refund",
        agencyId,
    }).lean() as Transaction[];

    return refunds.map((refund) => sanitizeDoc(refund) as Transaction).sort(sortByDateDesc);
}

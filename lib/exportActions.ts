"use server";

import { connectDB, TransactionModel, InvoiceModel, TaskModel, ProjectModel } from "@/lib/mongodb";
import { getCurrentAgency } from "@/lib/agency-context";
import { getSessionUser } from "@/lib/auth";

export async function getExportData(startDate: string, endDate: string) {
    // Auth check — only admin/manager can export financial data
    const session = await getSessionUser();
    if (!session) throw new Error('Unauthorized: You must be logged in.');
    if (!['admin', 'manager'].includes(session.role)) {
        throw new Error('Unauthorized: Only admins and managers can export data.');
    }

    // Validate date format
    if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate) || !/^\d{4}-\d{2}-\d{2}$/.test(endDate)) {
        throw new Error('Invalid date format. Expected YYYY-MM-DD.');
    }
    if (isNaN(Date.parse(startDate)) || isNaN(Date.parse(endDate))) {
        throw new Error('Invalid date values.');
    }

    await connectDB();
    const agency = await getCurrentAgency();
    if (!agency?.id) throw new Error('Agency context required');
    const agencyFilter = { agencyId: agency.id };

    const startStr = startDate; // "YYYY-MM-DD"
    const endStr = endDate;     // "YYYY-MM-DD"
    // For createdAt (Date fields), use Date objects
    const startDt = new Date(`${startDate}T00:00:00.000Z`);
    const endDt = new Date(`${endDate}T23:59:59.999Z`);

    const [transactions, invoices, tasks, projects] = await Promise.all([
        TransactionModel.find({ ...agencyFilter, date: { $gte: startStr, $lte: endStr } } as any).lean(),
        InvoiceModel.find({ ...agencyFilter, date: { $gte: startStr, $lte: endStr } } as any).lean(),
        TaskModel.find({ ...agencyFilter, createdAt: { $gte: startDt, $lte: endDt } } as any).lean(),
        ProjectModel.find({ ...agencyFilter, createdAt: { $gte: startDt, $lte: endDt } } as any).lean(),
    ]);

    const txns = transactions as any[];
    const invs = invoices as any[];
    const tsks = tasks as any[];
    const projs = projects as any[];
    const invoiceProjectIds = Array.from(new Set(invs.map((invoice) => invoice.projectId).filter(Boolean)));
    const invoiceProjects = invoiceProjectIds.length > 0
        ? await ProjectModel.find({ ...agencyFilter, id: { $in: invoiceProjectIds } }).select('id name').lean()
        : [];
    const projectNameById = new Map((invoiceProjects as any[]).map((project) => [project.id, project.name] as const));
    const totalIncome = txns.filter(t => t.type === "income" && t.status === "completed").reduce((s, t) => s + (t.amount || 0), 0);
    const totalExpense = txns.filter(t => t.type === "expense" && t.status === "completed").reduce((s, t) => s + (t.amount || 0), 0);
    const invoicesPaid = invs.filter(i => i.status === "Paid").length;
    const invoicesPending = invs.filter(i => i.status === "Pending").length;
    const invoicesUnsettled = invs.filter(i => ["Pending", "Processing", "Overdue"].includes(i.status)).length;
    const invoicesProcessing = invs.filter(i => i.status === "Processing").length;
    const invoicesOverdue = invs.filter(i => i.status === "Overdue").length;
    const totalInvoiced = invs.reduce((s, i) => s + (i.amount || 0), 0);
    const totalPaid = invs.filter(i => i.status === "Paid").reduce((s, i) => s + (i.amount || 0), 0);

    return {
        summary: {
            totalIncome,
            totalExpense,
            netProfit: totalIncome - totalExpense,
            totalInvoiced,
            totalPaid,
            invoicesPaid,
            invoicesUnsettled,
            invoicesPending,
            invoicesProcessing,
            invoicesOverdue,
            tasksDone: tsks.filter(t => t.status === "Done").length,
            tasksInProgress: tsks.filter(t => t.status === "In Progress").length,
            tasksReview: tsks.filter(t => t.status === "Review").length,
            tasksTodo: tsks.filter(t => t.status === "Todo").length,
            newProjects: projs.length,
        },
        transactions: txns.map(t => ({
            date: t.date ?? "",
            description: t.description ?? "",
            type: t.type ?? "",
            category: t.category ?? "",
            amount: t.amount ?? 0,
            status: t.status ?? "",
        })),
        invoices: invs.map(i => ({
            date: i.date ?? "",
            projectId: i.projectId ?? "",
            projectName: projectNameById.get(i.projectId ?? "") ?? "",
            amount: i.amount ?? 0,
            status: i.status ?? "",
        })),
    };
}

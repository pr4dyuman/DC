"use server";

import { connectDB, TransactionModel, InvoiceModel, TaskModel, ProjectModel } from "@/lib/mongodb";
import { getCurrentAgency } from "@/lib/agency-context";

export async function getExportData(startDate: string, endDate: string) {
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

    const totalIncome = txns.filter(t => t.type === "income" && t.status === "completed").reduce((s, t) => s + (t.amount || 0), 0);
    const totalExpense = txns.filter(t => t.type === "expense" && t.status === "completed").reduce((s, t) => s + (t.amount || 0), 0);
    const invoicesPaid = invs.filter(i => i.status === "Paid").length;
    const invoicesPending = invs.filter(i => i.status === "Pending").length;
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
            invoicesPending,
            invoicesOverdue,
            tasksDone: tsks.filter(t => t.status === "Done").length,
            tasksInProgress: tsks.filter(t => t.status === "In Progress").length,
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
            clientId: i.clientId ?? "",
            description: i.description ?? "",
            amount: i.amount ?? 0,
            status: i.status ?? "",
        })),
    };
}

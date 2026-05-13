import "server-only";

import type { Activity, Asset, Invoice, Notification, Project, Task, Transaction, User } from "../db";
import { revalidatePath } from "next/cache";
import {
    ActivityModel,
    AssetModel,
    InvoiceModel,
    LeaveRequestModel,
    NotificationModel,
    ProjectModel,
    SettingsModel,
    ServiceModel,
    TaskModel,
    TransactionModel,
    UserModel,
    connectDB,
} from "../mongodb";
import { dateKeyTz, isDateOnlyString, toLocalCalendarDay } from "@/lib/date-utils";
import { getTaskAssigneeIds } from "../task-assignees";
import { sanitizeName, sanitizeUrl } from "../validation";
import { sanitizeDoc, sortByDateDesc, withAgencyIdFallback } from "./shared";
import { buildClientFinanceSummary } from "./finance-shared";
import {
    buildProjectServiceLookupQuery,
    hydrateProjectsWithCurrentServiceNames,
    type ProjectServiceSnapshot,
} from "./projects-shared";

type DashboardActor = {
    id: string;
    role: string;
    timezone?: string;
};

const NOTIFICATION_RETENTION_DAYS = 30;

async function cleanupExpiredNotifications(agencyId: string, userId: string) {
    const cutoff = new Date(Date.now() - NOTIFICATION_RETENTION_DAYS * 24 * 60 * 60 * 1000).toISOString();
    await NotificationModel.deleteMany({
        agencyId,
        userId,
        timestamp: { $lt: cutoff },
    });
}

type DashboardSettingsSnapshot = {
    systemName?: string;
    logo?: string;
    userPermissions?: Record<string, unknown>;
};

type RevenueHistoryPoint = {
    name: string;
    revenue: number;
    expenses: number;
    monthIndex: number;
    year: number;
};



function isInvoiceOverdueForMetrics(invoice: Partial<Invoice> | null | undefined, now = new Date(), timezone?: string): boolean {
    if (!invoice?.status) return false;
    if (invoice.status === "Overdue") return true;
    if (invoice.status !== "Pending" || !invoice.date) return false;

    if (timezone) {
        const todayKey = dateKeyTz(now, timezone);
        const dueKey = dateKeyTz(invoice.date, timezone);
        if (!isDateOnlyString(todayKey) || !isDateOnlyString(dueKey)) return false;
        return dueKey < todayKey;
    }

    const today = toLocalCalendarDay(now);
    const dueDate = toLocalCalendarDay(invoice.date);
    return !!today && !!dueDate && dueDate < today;
}

export async function getDashboardMetricsImpl(agencyId: string, timezone?: string) {
    await connectDB();

    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth();
    const prevMonthDate = new Date();
    prevMonthDate.setMonth(currentMonth - 1);
    const prevMonth = prevMonthDate.getMonth();
    const prevMonthYear = prevMonthDate.getFullYear();

    const [revenuePipeline, pendingInvoicesList, activeProjectsCount, allProjects, tasks, allUsers, pendingLeaves] = await Promise.all([
        TransactionModel.aggregate([
            { $match: { agencyId, status: "completed" } },
            {
                $group: {
                    _id: null,
                    totalIncome: { $sum: { $cond: [{ $eq: ["$type", "income"] }, "$amount", 0] } },
                    currentMonthRevenue: {
                        $sum: {
                            $cond: [
                                {
                                    $and: [
                                        { $eq: ["$type", "income"] },
                                        { $eq: [{ $year: { $toDate: "$date" } }, currentYear] },
                                        { $eq: [{ $month: { $toDate: "$date" } }, currentMonth + 1] },
                                    ],
                                },
                                "$amount",
                                0,
                            ],
                        },
                    },
                    prevMonthRevenue: {
                        $sum: {
                            $cond: [
                                {
                                    $and: [
                                        { $eq: ["$type", "income"] },
                                        { $eq: [{ $year: { $toDate: "$date" } }, prevMonthYear] },
                                        { $eq: [{ $month: { $toDate: "$date" } }, prevMonth + 1] },
                                    ],
                                },
                                "$amount",
                                0,
                            ],
                        },
                    },
                },
            },
        ]),
        InvoiceModel.find({ agencyId, status: { $in: ["Pending", "Overdue", "Processing"] } }).lean() as Promise<Invoice[]>,
        ProjectModel.countDocuments({ agencyId, status: "Active" }),
        ProjectModel.find({ agencyId }).select("id").lean() as Promise<Array<Pick<Project, "id">>>,
        TaskModel.find({ agencyId }).select("status priority projectId assigneeId assigneeIds").lean() as Promise<Array<Pick<Task, "status" | "priority" | "projectId" | "assigneeId" | "assigneeIds">>>,
        UserModel.find({ agencyId }).select("id role").lean() as Promise<Array<Pick<User, "id" | "role">>>,
        LeaveRequestModel.countDocuments({ agencyId, status: "Pending" }),
    ]);

    const agg = revenuePipeline[0] || { totalIncome: 0, currentMonthRevenue: 0, prevMonthRevenue: 0 };
    const totalRevenue = agg.totalIncome;

    let growthPercentage = 0;
    if (agg.prevMonthRevenue > 0) {
        growthPercentage = Math.round(((agg.currentMonthRevenue - agg.prevMonthRevenue) / agg.prevMonthRevenue) * 100);
    } else if (agg.currentMonthRevenue > 0) {
        growthPercentage = 100;
    }

    const pendingInvoicesAmount = pendingInvoicesList.reduce((sum, invoice) => sum + invoice.amount, 0);
    const overdueCount = pendingInvoicesList.filter((invoice) => isInvoiceOverdueForMetrics(invoice, new Date(), timezone || "UTC")).length;

    const knownProjectIds = new Set(allProjects.map((project) => project.id));
    const highPriorityTaskProjects = new Set(
        tasks
            .filter((task) => task.status !== "Done" && task.priority === "High" && knownProjectIds.has(task.projectId))
            .map((task) => task.projectId)
    );

    const activeTasks = tasks.filter((task) => task.status === "In Progress");
    const totalTasks = tasks.length;
    const utilization = totalTasks > 0 ? Math.round((activeTasks.length / totalTasks) * 100) : 0;
    const teamMembersList = allUsers.filter((user) => user.role !== "client");
    const totalMembers = teamMembersList.length;
    const assignedMemberIds = new Set(activeTasks.flatMap((task) => getTaskAssigneeIds(task)));
    const assignedMembers = [...assignedMemberIds].filter((id) => teamMembersList.some((user) => user.id === id)).length;

    return {
        revenue: totalRevenue,
        growth: growthPercentage,
        pending: pendingInvoicesAmount,
        overdueCount,
        activeProjects: activeProjectsCount,
        highPriorityCount: highPriorityTaskProjects.size,
        utilization,
        activeTasksCount: activeTasks.length,
        assignedMembers,
        totalMembers,
        pendingLeaveCount: pendingLeaves,
    };
}

export async function getRevenueDataImpl(agencyId: string) {
    await connectDB();

    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
    sixMonthsAgo.setDate(1);
    const sixMonthsAgoStr = sixMonthsAgo.toISOString().split("T")[0];

    const transactions = await TransactionModel.find({
        agencyId,
        date: { $gte: sixMonthsAgoStr },
        status: "completed",
    }).select("date type amount").lean() as Array<Pick<import("../db").Transaction, "date" | "type" | "amount">>;

    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const result: RevenueHistoryPoint[] = [];

    for (let i = 5; i >= 0; i--) {
        const date = new Date();
        date.setMonth(date.getMonth() - i);
        const monthIndex = date.getMonth();
        const year = date.getFullYear();
        result.push({ name: months[monthIndex], revenue: 0, expenses: 0, monthIndex, year });
    }

    transactions.forEach((transaction) => {
        const transactionDate = new Date(transaction.date);
        const monthData = result.find(
            (entry) => entry.monthIndex === transactionDate.getMonth() && entry.year === transactionDate.getFullYear()
        );
        if (!monthData) return;
        if (transaction.type === "income") monthData.revenue += transaction.amount;
        if (transaction.type === "expense") monthData.expenses += transaction.amount;
    });

    return result.map(({ name, revenue, expenses }) => ({ name, revenue, expenses }));
}

export async function getProjectDistributionImpl(agencyId: string) {
    await connectDB();

    // Group by status (controlled enum) — reliable across all agency types regardless of
    // how services are named. Excludes Archived projects to match dashboard intent.
    const projects = await ProjectModel.find({ agencyId })
        .select("status")
        .lean() as Array<Pick<Project, "status">>;

    const distribution: Record<string, number> = {};

    projects.forEach((project) => {
        const status = project.status || "Unknown";
        distribution[status] = (distribution[status] || 0) + 1;
    });

    // Enforce a stable display order
    const ORDER = ["Active", "Completed", "On Hold", "Paused", "Archived", "Unknown"];
    return ORDER
        .filter((status) => distribution[status] !== undefined)
        .map((status) => ({ name: status, value: distribution[status] }));
}

export async function getRecentActivityImpl(actor: DashboardActor, agencyId: string, offset = 0, limit = 5): Promise<Activity[]> {
    await connectDB();

    const activityQuery =
        actor.role === "admin" || actor.role === "manager"
            ? { agencyId }
            : { userId: actor.id, agencyId };

    const activities = await ActivityModel.find(activityQuery)
        .sort({ timestamp: -1 })
        .skip(offset)
        .limit(limit)
        .lean();

    return activities.map((activity) => sanitizeDoc(activity) as Activity);
}

export async function getUrgentTasksImpl(agencyId: string, limit = 5) {
    await connectDB();

    const tasks = await TaskModel.find({ agencyId, status: { $ne: "Done" }, priority: "High" })
        .sort({ dueDate: 1 })
        .limit(limit)
        .lean() as Task[];

    const sanitized = tasks.map((task) => withAgencyIdFallback(sanitizeDoc(task) as Task & { agencyId?: string }, agencyId));
    const projectIds = [...new Set(sanitized.map((task) => task.projectId))];
    const projects = await ProjectModel.find({ agencyId, id: { $in: projectIds } })
        .select("id name slug")
        .lean() as Array<Pick<Project, "id" | "name" | "slug">>;

    const projectMap = new Map(projects.map((project) => [project.id, { name: project.name, slug: project.slug || project.id }] as const));

    return sanitized.map((task) => ({
        ...task,
        projectName: projectMap.get(task.projectId)?.name ?? "Unknown Project",
        projectSlug: projectMap.get(task.projectId)?.slug ?? task.projectId,
    }));
}

export async function getClientDashboardDataImpl(actor: DashboardActor, clientId: string, agencyId: string) {
    if (actor.role === "client" && actor.id !== clientId) {
        throw new Error("Unauthorized: You can only view your own dashboard.");
    }

    await connectDB();
    await cleanupExpiredNotifications(agencyId, clientId);

    const clientProjects = await ProjectModel.find({
        agencyId,
        $or: [{ clientId }, { clientIds: clientId }],
    }).lean() as Project[];
    const projectIds = clientProjects.map((project) => project.id);
    const serviceLookupQuery = buildProjectServiceLookupQuery(clientProjects);

    const [invoices, transactions, tasks, assets, notifications, projectServices] = await Promise.all([
        InvoiceModel.find({ projectId: { $in: projectIds }, agencyId }).lean() as Promise<Invoice[]>,
        TransactionModel.find({ projectId: { $in: projectIds }, agencyId }).lean() as Promise<Transaction[]>,
        TaskModel.find({ projectId: { $in: projectIds }, agencyId }).lean() as Promise<Task[]>,
        AssetModel.find({ projectId: { $in: projectIds }, agencyId }).lean() as Promise<Asset[]>,
        NotificationModel.find({ userId: clientId, agencyId }).sort({ timestamp: -1, _id: -1 }).limit(5).lean() as Promise<Notification[]>,
        serviceLookupQuery
            ? ServiceModel.find({ agencyId, ...serviceLookupQuery })
                .select("id name projectId employees agencyId")
                .lean() as Promise<ProjectServiceSnapshot[]>
            : Promise.resolve([] as ProjectServiceSnapshot[]),
    ]);

    const financeSummary = buildClientFinanceSummary(clientProjects, invoices, transactions);
    const unreadCountReal = await NotificationModel.countDocuments({ userId: clientId, read: false, agencyId });
    const normalizedClientProjects = hydrateProjectsWithCurrentServiceNames(clientProjects, projectServices);

    return {
        projects: normalizedClientProjects.map((project) => withAgencyIdFallback(sanitizeDoc(project) as Project & { agencyId?: string }, agencyId)),
        invoices: [...invoices].sort(sortByDateDesc).map((invoice) => sanitizeDoc(invoice)),
        transactions: [...transactions].sort(sortByDateDesc).map((transaction) => sanitizeDoc(transaction)),
        tasks: tasks.map((task) => withAgencyIdFallback(sanitizeDoc(task) as Task & { agencyId?: string }, agencyId)),
        assets: assets.map((asset) => sanitizeDoc(asset)),
        notifications: notifications.map((notification) => sanitizeDoc(notification)),
        metrics: {
            activeProjects: financeSummary.activeProjectCount,
            completedProjects: financeSummary.completedProjectCount,
            pendingInvoicesCount: financeSummary.pendingInvoicesCount,
            totalDue: financeSummary.pendingAmount,
            unreadNotificationsCount: unreadCountReal,
            totalSpent: financeSummary.totalSpent,
            totalBudget: financeSummary.totalBudget,
            totalTasks: tasks.length,
            completedTasks: tasks.filter((task) => task.status === "Done").length,
        },
    };
}

export async function getEmployeeDashboardDataImpl(actor: DashboardActor, userId: string, agencyId: string) {
    const isPrivileged = actor.role === "admin" || actor.role === "manager";
    if (!isPrivileged && (actor.role !== "employee" || actor.id !== userId)) {
        throw new Error("Unauthorized: You can only view your own dashboard.");
    }

    await connectDB();

    const [tasks, user, leaveRequests] = await Promise.all([
        TaskModel.find({
            agencyId,
            $or: [{ assigneeId: userId }, { assigneeIds: userId }],
        }).lean() as Promise<Task[]>,
        UserModel.findOne({ id: userId, agencyId }).select("-password").lean(),
        LeaveRequestModel.find({ userId, agencyId }).sort({ createdAt: -1 }).limit(5).lean(),
    ]);

    const activities = await ActivityModel.find({ userId, agencyId }).sort({ timestamp: -1 }).limit(5).lean();
    const projectIds = [...new Set(tasks.map((task) => task.projectId))];
    const projects = await ProjectModel.find({ id: { $in: projectIds }, agencyId }).lean() as Project[];

    return {
        tasks: tasks.map((task) => withAgencyIdFallback(sanitizeDoc(task) as Task & { agencyId?: string }, agencyId)),
        activities: activities.map((activity) => sanitizeDoc(activity) as Activity),
        projects: projects.map((project) => withAgencyIdFallback(sanitizeDoc(project) as Project & { agencyId?: string }, agencyId)),
        user: user ? sanitizeDoc(user) : null,
        leaveRequests: leaveRequests.map((leaveRequest) => sanitizeDoc(leaveRequest)),
    };
}

export async function getNotificationsImpl(
    actor: DashboardActor,
    agencyId: string,
    userId: string,
    offset = 0,
    limit = 50
): Promise<Notification[]> {
    if (actor.id !== userId && actor.role !== "admin" && actor.role !== "manager") {
        throw new Error("Unauthorized: You can only view your own notifications.");
    }

    await connectDB();
    await cleanupExpiredNotifications(agencyId, userId);

    const notifications = await NotificationModel.find({ userId, agencyId })
        .sort({ timestamp: -1, _id: -1 })
        .skip(offset)
        .limit(limit)
        .lean();

    return notifications.map((notification) => sanitizeDoc(notification) as Notification);
}

export async function getUnreadNotificationCountImpl(actor: DashboardActor, agencyId: string, userId: string): Promise<number> {
    if (actor.id !== userId && actor.role !== "admin" && actor.role !== "manager") {
        throw new Error("Unauthorized: You can only view your own notifications.");
    }

    await connectDB();
    await cleanupExpiredNotifications(agencyId, userId);
    return NotificationModel.countDocuments({ userId, read: false, agencyId });
}

export async function getAgencyDashboardSettingsImpl(agencyId: string) {
    await connectDB();
    const settingsDoc = await SettingsModel.findOne({ agencyId }).lean() as DashboardSettingsSnapshot | null;
    if (!settingsDoc) {
        return { systemName: "AgencyOS", logo: "", userPermissions: {} };
    }
    return sanitizeDoc(settingsDoc);
}

export async function updateAgencyDashboardSettingsImpl(
    agencyId: string,
    settings: { systemName: string; logo: string }
) {
    const nextSettings = {
        systemName: sanitizeName(settings.systemName, 200),
        logo: sanitizeUrl(settings.logo),
    };

    await connectDB();
    await SettingsModel.updateOne(
        { agencyId },
        { $set: nextSettings },
        { upsert: true }
    );

    revalidatePath("/dashboard");
    return nextSettings;
}

export async function markNotificationAsReadImpl(actor: DashboardActor, agencyId: string, notificationId: string) {
    await connectDB();

    const notification = await NotificationModel.findOne({ id: notificationId, agencyId }).lean() as Notification | null;
    if (!notification) return;

    const isPrivileged = actor.role === "admin" || actor.role === "manager";
    if (notification.userId !== actor.id && !isPrivileged) return;

    await NotificationModel.updateOne({ id: notificationId, agencyId }, { $set: { read: true } });
}

"use server";

import { User, Project, Invoice, Task, Notification, Activity, Client, Asset, PaymentConfig, LeaveRequest, LeaveType, LeaveStatus, UserPermissions, Transaction, TransactionType, TransactionCategory } from "./db";
import { revalidatePath } from "next/cache";
import { generateContent, generateContentWithParts, generateContentWithChat } from "./ai-provider";
import type { TokenUsage } from "./ai-provider";
import { logAIUsage } from "./ai-usage";
import type { AIFeature } from "./ai-usage";
import { createSession, sendMessage, closeSession, isSessionActive } from "./live-session";
import type { AIConfig, AIPermissions } from "./types";
import { DEFAULT_AI_PERMISSIONS } from "./types";
import { withAgencyId, getCurrentAgency, checkAgencyLimit, incrementAgencyUsage, decrementAgencyUsage } from "./agency-context";
import { generateId, resolveUserOrClient } from "./utils-server";
import { sanitizeName, sanitizeString, sanitizeUsername, validateEmail, validatePassword, validateStrongPassword, sanitizePhone, sanitizeUrl, sanitizeColor, sanitizeMongoInput, sanitizeUpdates, validateId, validateAmount } from "./validation";
import { formatCurrency, getCurrencySymbol } from "./currency";
import { getDefaultCurrency, getNotificationDefaults } from "./actions/super-admin";

// Authentication
import { connectDB, AgencyModel, UserModel, ClientModel, SuperAdminModel, ProjectModel, TaskModel, InvoiceModel, TransactionModel, ServiceModel, NotificationModel, ActivityModel, AssetModel, MessageModel, LeaveRequestModel, SettingsModel, decryptApiKey, SystemSettingsModel } from "./mongodb";
import { getSessionUser } from "@/lib/auth";
import { fmtDate } from "@/lib/date-utils";
import { getSessionId as authGetSessionId, login as authLogin, logout as authLogout } from "@/lib/auth";
import { hashPassword, comparePassword } from "@/lib/auth";

// Brevo Email Service
import {
    sendProjectCreatedEmail,
    sendProjectStatusChangedEmail,
    sendProjectCompletedEmail,
    sendTaskAssignedEmail,
    sendTaskStatusChangedEmail,
    sendTaskCommentEmail,
    sendInvoiceCreatedEmail,
    sendPaymentPendingApprovalEmail,
    sendPaymentApprovedEmail,
    sendPaymentRejectedEmail,
    sendLeaveRequestedEmail,
    sendLeaveApprovedEmail,
    sendLeaveRejectedEmail,
    sendLeaveCancelledEmail,
    sendSalaryPaidEmail,
    sendRefundIssuedEmail,
    sendDocumentUpdateRequestedEmail,
    sendDocumentUpdateResponseEmail,
    sendClientAccountCreatedEmail,
    sendEmployeeAccountCreatedEmail,
} from "./brevo-mail";
import { DEFAULT_TASK_EMAIL_EVENTS } from "./email-constants";
import { extractMentionedUserIds } from "./mention-utils";

/** Check password against system-level enforceStrongPasswords setting */
async function validatePasswordWithPolicy(password: string) {
    const sys = await SystemSettingsModel.findOne(
        { key: 'global' },
        { 'security.enforceStrongPasswords': 1 }
    ).lean() as any;
    const enforceStrong = sys?.security?.enforceStrongPasswords ?? true;
    if (enforceStrong) {
        validateStrongPassword(password);
    } else {
        validatePassword(password);
    }
}

type NotifType = 'welcome' | 'project' | 'task' | 'invoice' | 'salary' | 'leave' | 'refund' | 'document' | 'security';

/** Check if a notification type is enabled globally. Defaults to true if not set. */
async function isNotifEnabled(type: NotifType): Promise<boolean> {
    try {
        const defaults = await getNotificationDefaults();
        return defaults[type] ?? true;
    } catch {
        return true; // Fail-open: send notifications if settings can't be read
    }
}

export async function getAgencySettings() {
    await requireAuth();
    const agency = await getCurrentAgency();
    if (!agency) return null;

    // Read the system-level default currency
    let systemCurrency = "USD";
    try {
        const sys = await SystemSettingsModel.findOne({ key: 'global' }, { 'platform.defaultCurrency': 1 }).lean() as any;
        if (sys?.platform?.defaultCurrency) systemCurrency = sys.platform.defaultCurrency;
    } catch { /* use fallback */ }

    return {
        name: agency.name,
        logo: agency.logo || "",

        primaryColor: agency.primaryColor,
        secondaryColor: agency.secondaryColor,
        currency: systemCurrency,
        emailNotificationsEnabled: agency.settings?.emailNotificationsEnabled ?? true,
        emailCategories: agency.settings?.emailCategories || {}
    };
}

// Internal -- returns full config with decrypted API key for server-side AI calls only
async function getAgencyAIConfigInternal(): Promise<AIConfig | null> {
    const { getAgencyAIConfigServer } = await import("./utils-server");
    return getAgencyAIConfigServer();
}

// Get the AI config for the current user's agency -- API key is masked (safe for client)
export async function getAgencyAIConfig(): Promise<AIConfig | null> {
    await requireAuth();
    const config = await getAgencyAIConfigInternal();
    if (!config) return null;
    return {
        ...config,
        apiKey: config.apiKey
            ? (config.apiKey.length >= 4 ? '****' + config.apiKey.slice(-4) : '****')
            : config.apiKey,
    };
}

// Get AI permissions for the current agency (what Singularity is allowed to do)
export async function getAIPermissions(): Promise<AIPermissions> {
    await requireAuth();
    await connectDB();
    const agency = await getCurrentAgency();
    if (!agency) return DEFAULT_AI_PERMISSIONS;
    return { ...DEFAULT_AI_PERMISSIONS, ...(agency as any).aiPermissions };
}

// Update AI permissions -- admin only
export async function updateAIPermissions(permissions: AIPermissions) {
    await requireRole('admin');
    const agency = await getCurrentAgency();
    if (!agency) throw new Error("Unauthorized");

    await AgencyModel.updateOne(
        { id: agency.id },
        { $set: { aiPermissions: permissions } }
    );

    revalidatePath("/dashboard/settings");
    return { success: true };
}

// Verify password before allowing AI agent tool calls
export async function verifyAgentPassword(password: string): Promise<{ success: boolean; error?: string }> {
    const currentUser = await requireAuth();
    if (!password || typeof password !== 'string') return { success: false, error: 'Password required' };
    await connectDB();

    const user = await UserModel.findOne({ id: currentUser.id }).select('password').lean();
    if (!user?.password) {
        // Check ClientModel as fallback
        const client = await ClientModel.findOne({ id: currentUser.id }).select('password').lean();
        if (!client?.password) return { success: false, error: 'User not found' };
        const valid = await comparePassword(password, client.password);
        return valid ? { success: true } : { success: false, error: 'Incorrect password' };
    }

    const valid = await comparePassword(password, user.password);
    return valid ? { success: true } : { success: false, error: 'Incorrect password' };
}

export async function updateEmailSettings(enabled: boolean) {
    await requireRole('admin', 'manager');
    const agency = await getCurrentAgency();
    if (!agency) throw new Error("Unauthorized");

    await AgencyModel.updateOne(
        { id: agency.id },
        {
            $set: {
                "settings.emailNotificationsEnabled": enabled
            }
        }
    );

    revalidatePath("/dashboard");
    return { success: true };
}

export async function updateEmailCategorySettings(categories: Record<string, boolean>) {
    await requireRole('admin', 'manager');
    const agency = await getCurrentAgency();
    if (!agency) throw new Error("Unauthorized");

    const updates: Record<string, boolean> = {};
    const validCategories = ['accountCreation', 'invoicePayment', 'salaryPayroll', 'refund', 'projectUpdates', 'taskUpdates', 'leaveManagement', 'documentApproval'];
    for (const [key, value] of Object.entries(categories)) {
        if (validCategories.includes(key) && typeof value === 'boolean') {
            updates[`settings.emailCategories.${key}`] = value;
        }
    }

    if (Object.keys(updates).length === 0) throw new Error("No valid categories provided");

    await AgencyModel.updateOne(
        { id: agency.id },
        { $set: updates }
    );

    revalidatePath("/dashboard/settings");
    return { success: true };
}

export async function updateTaskEmailEvents(events: Record<string, Record<string, boolean>>) {
    await requireRole('admin', 'manager');
    const agency = await getCurrentAgency();
    if (!agency) throw new Error("Unauthorized");

    const validEvents = ['taskCreated', 'taskInProgress', 'taskDone'];
    const validFields = ['enabled', 'notifyAssignee', 'notifyClient'];
    const updates: Record<string, boolean> = {};

    for (const [eventKey, fields] of Object.entries(events)) {
        if (!validEvents.includes(eventKey) || typeof fields !== 'object') continue;
        for (const [field, value] of Object.entries(fields)) {
            if (validFields.includes(field) && typeof value === 'boolean') {
                updates[`settings.emailCategories.taskEmailEvents.${eventKey}.${field}`] = value;
            }
        }
    }

    if (Object.keys(updates).length === 0) throw new Error("No valid event settings provided");

    await AgencyModel.updateOne(
        { id: agency.id },
        { $set: updates }
    );

    revalidatePath("/dashboard/settings");
    return { success: true };
}

export async function updateAgencyDetails(name: string, logo: string, primaryColor?: string, secondaryColor?: string) {
    await requireRole('admin');
    const agency = await getCurrentAgency();
    if (!agency) throw new Error("Unauthorized");
    // Input sanitization
    name = sanitizeName(name, 200);
    logo = sanitizeUrl(logo);

    if (primaryColor) primaryColor = sanitizeColor(primaryColor);
    if (secondaryColor) secondaryColor = sanitizeColor(secondaryColor);
    if (!name) throw new Error('Agency name is required');

    await AgencyModel.updateOne(
        { id: agency.id },
        {
            $set: {
                name,
                logo,

                ...(primaryColor && { primaryColor }),
                ...(secondaryColor && { secondaryColor })
            }
        }
    );

    revalidatePath("/dashboard");
    return { success: true };
}

// Re-export auth functions for backward compatibility
export const getSessionId = authGetSessionId;
export const login = authLogin;
export const logout = authLogout;

// =============================================================================
// AUTH GUARD HELPERS -- reusable role-based permission checks for server actions
// =============================================================================

type AllowedRole = 'admin' | 'manager' | 'employee' | 'client' | 'superadmin';

/** Ensure user is logged in. Returns the current user or throws. */
async function requireAuth() {
    const user = await getCurrentUser();
    if (!user) throw new Error("Unauthorized: You must be logged in.");
    return user;
}

/**
 * Ensure user has one of the allowed roles. Returns the current user or throws.
 * Usage: `const user = await requireRole('admin', 'manager');`
 */
async function requireRole(...roles: AllowedRole[]) {
    const user = await requireAuth();
    if (!roles.includes(user.role as AllowedRole)) {
        const allowed = roles.map(r => r.charAt(0).toUpperCase() + r.slice(1)).join(' / ');
        throw new Error(`Unauthorized: This action requires ${allowed} access.`);
    }
    return user;
}

/** Require agency context for data isolation. Throws if no agency found. */
function requireAgencyFilter(agency: any): { agencyId: string } {
    if (!agency?.id) throw new Error('Agency context required');
    return { agencyId: agency.id };
}

export async function getAllUsers() {
    await requireRole('admin', 'manager');
    await connectDB();
    // Scope to current agency unless super-admin (who needs cross-agency view)
    const agency = await getCurrentAgency();
    const agencyFilter = requireAgencyFilter(agency);
    const users = await UserModel.find(agencyFilter).select('-password').lean();
    return users.map(u => ({ ...sanitizeDoc(u), agencyId: u.agencyId || 'default-agency' }));
}

export async function getAllClients() {
    await requireRole('admin', 'manager');
    await connectDB();
    // Scope to current agency unless super-admin (who needs cross-agency view)
    const agency = await getCurrentAgency();
    const agencyFilter = requireAgencyFilter(agency);
    const clients = await ClientModel.find(agencyFilter).select('-password').lean();
    return clients.map(c => ({ ...sanitizeDoc(c), agencyId: c.agencyId || 'default-agency' }));
}

export async function getSuperAdmins() {
    await requireRole('admin');
    await connectDB();
    const admins = await SuperAdminModel.find({}).select('-password').lean();
    return admins.map(a => sanitizeDoc(a));
}

export type SearchResult = {
    id: string;
    type: 'project' | 'client' | 'task' | 'user';
    title: string;
    subtitle?: string;
    url: string;
};

export async function getDashboardMetrics() {
    await requireRole('admin', 'manager');
    await connectDB();
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth(); // 0-11

    // Get current agency for filtering
    const agency = await getCurrentAgency();
    const agencyFilter = requireAgencyFilter(agency);

    // Previous month calculation
    const prevMonthDate = new Date();
    prevMonthDate.setMonth(currentMonth - 1);
    const prevMonth = prevMonthDate.getMonth();
    const prevMonthYear = prevMonthDate.getFullYear();

    // Use aggregation pipelines for financial metrics instead of fetching all transactions
    const [revenuePipeline, pendingInvoicesList, activeProjectsCount, projects, tasks, allUsers, pendingLeaves] = await Promise.all([
        TransactionModel.aggregate([
            { $match: { ...agencyFilter, status: 'completed' } },
            {
                $group: {
                    _id: null,
                    totalIncome: { $sum: { $cond: [{ $eq: ['$type', 'income'] }, '$amount', 0] } },
                    totalRefunds: { $sum: { $cond: [{ $eq: ['$category', 'Refund'] }, '$amount', 0] } },
                    currentMonthRevenue: {
                        $sum: {
                            $cond: [
                                {
                                    $and: [
                                        { $eq: ['$type', 'income'] },
                                        { $eq: [{ $year: { $toDate: '$date' } }, currentYear] },
                                        { $eq: [{ $month: { $toDate: '$date' } }, currentMonth + 1] }
                                    ]
                                },
                                '$amount', 0
                            ]
                        }
                    },
                    prevMonthRevenue: {
                        $sum: {
                            $cond: [
                                {
                                    $and: [
                                        { $eq: ['$type', 'income'] },
                                        { $eq: [{ $year: { $toDate: '$date' } }, prevMonthYear] },
                                        { $eq: [{ $month: { $toDate: '$date' } }, prevMonth + 1] }
                                    ]
                                },
                                '$amount', 0
                            ]
                        }
                    },
                }
            }
        ]),
        InvoiceModel.find({ ...agencyFilter, status: { $in: ['Pending', 'Overdue', 'Processing'] } }).lean(),
        ProjectModel.countDocuments({ ...agencyFilter, status: 'Active' }),
        ProjectModel.find({ ...agencyFilter, status: 'Active' }).select('id').lean(),
        TaskModel.find(agencyFilter).select('status priority projectId assigneeId').lean(),
        UserModel.find(agencyFilter).select('id role').lean(),
        LeaveRequestModel.countDocuments({ ...agencyFilter, status: 'Pending' })
    ]);

    // Extract aggregation results (default to 0 if no transactions)
    const agg = revenuePipeline[0] || { totalIncome: 0, totalRefunds: 0, currentMonthRevenue: 0, prevMonthRevenue: 0 };
    const totalRevenue = agg.totalIncome - agg.totalRefunds;

    let growthPercentage = 0;
    if (agg.prevMonthRevenue > 0) {
        growthPercentage = Math.round(((agg.currentMonthRevenue - agg.prevMonthRevenue) / agg.prevMonthRevenue) * 100);
    } else if (agg.currentMonthRevenue > 0) {
        growthPercentage = 100;
    }

    // 2. Pending Invoices & Overdue
    const pendingInvoicesAmount = pendingInvoicesList.reduce((acc, curr) => acc + curr.amount, 0);

    const todayStr = new Date().toISOString().split('T')[0];
    const overdueCount = pendingInvoicesList.filter(i => (i.date < todayStr && i.status !== 'Paid') || i.status === 'Overdue').length;

    // 3. Active Projects & High Priority
    // Deduce "High Priority" projects as those with "High" priority active tasks.
    const activeProjectIds = new Set(projects.map(p => p.id));
    const highPriorityTaskProjects = new Set(
        tasks
            .filter(t => t.status !== 'Done' && t.priority === 'High' && activeProjectIds.has(t.projectId))
            .map(t => t.projectId)
    );
    const highPriorityCount = highPriorityTaskProjects.size;

    // 4. Team Members Assigned (replaces abstract utilization %)
    const activeTasks = tasks.filter(t => t.status === 'In Progress');
    const totalTasks = tasks.length;
    const utilization = totalTasks > 0 ? Math.round((activeTasks.length / totalTasks) * 100) : 0;
    const teamMembersList = allUsers.filter((u: any) => u.role !== 'client');
    const totalMembers = teamMembersList.length;
    const assignedMemberIds = new Set(activeTasks.map((t: any) => t.assigneeId).filter(Boolean));
    const assignedMembers = [...assignedMemberIds].filter(id => teamMembersList.some((u: any) => u.id === id)).length;

    return {
        revenue: totalRevenue,
        growth: growthPercentage,
        pending: pendingInvoicesAmount,
        overdueCount: overdueCount,
        activeProjects: activeProjectsCount,
        highPriorityCount,
        utilization,
        activeTasksCount: activeTasks.length,
        assignedMembers,
        totalMembers,
        pendingLeaveCount: pendingLeaves
    };
}

export async function getRevenueData() {
    await requireRole('admin', 'manager');
    await connectDB();
    const agency = await getCurrentAgency();
    const agencyFilter = requireAgencyFilter(agency);

    // Only fetch transactions from the last 6 months instead of ALL transactions
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
    sixMonthsAgo.setDate(1);
    const sixMonthsAgoStr = sixMonthsAgo.toISOString().split('T')[0];
    const transactions = await TransactionModel.find({
        ...agencyFilter,
        date: { $gte: sixMonthsAgoStr },
    }).select('date type amount').lean();

    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const currentYear = new Date().getFullYear();

    // Initialize last 6 months
    const result: any[] = [];
    for (let i = 5; i >= 0; i--) {
        const d = new Date();
        d.setMonth(d.getMonth() - i);
        const monthIndex = d.getMonth();
        const year = d.getFullYear();
        result.push({
            name: months[monthIndex],
            revenue: 0,
            expenses: 0,
            monthIndex,
            year
        });
    }

    // Aggregate Transactions
    transactions.forEach(t => {
        const tDate = new Date(t.date);
        const tMonth = tDate.getMonth();
        const tYear = tDate.getFullYear();

        const monthData = result.find(r => r.monthIndex === tMonth && r.year === tYear);
        if (monthData) {
            if (t.type === 'income') monthData.revenue += t.amount;
            if (t.type === 'expense') monthData.expenses += t.amount;
        }
    });

    // Cleanup helper props
    return result.map(({ name, revenue, expenses }) => ({ name, revenue, expenses }));
}

export async function getProjectDistribution() {
    await requireRole('admin', 'manager');
    await connectDB();
    const agency = await getCurrentAgency();
    const agencyFilter = requireAgencyFilter(agency);
    const [projects, services] = await Promise.all([
        ProjectModel.find(agencyFilter).lean(),
        ServiceModel.find(agencyFilter).lean()
    ]);

    const distribution: Record<string, number> = {};

    projects.forEach(p => {
        p.services.forEach(svc => {
            // Resolve ID to Name for display
            const serviceObj = services.find(s => s.id === svc || s.name === svc);
            const name = serviceObj ? serviceObj.name : svc;
            distribution[name] = (distribution[name] || 0) + 1;
        });
    });

    return Object.entries(distribution).map(([name, value]) => ({ name, value }));
}

export async function getRecentActivity(offset = 0, limit = 5): Promise<Activity[]> {
    await requireRole('admin', 'manager');
    await connectDB();
    const agency = await getCurrentAgency();
    const agencyFilter = requireAgencyFilter(agency);
    const activities = await ActivityModel.find(agencyFilter).sort({ timestamp: -1 }).skip(offset).limit(limit).lean();
    return activities.map(a => sanitizeDoc(a));
}

export async function getUrgentTasks(limit = 5) {
    await requireRole('admin', 'manager');
    await connectDB();
    const agency = await getCurrentAgency();
    const agencyFilter = requireAgencyFilter(agency);
    const tasks = await TaskModel.find({ agencyId: agency?.id, status: { $ne: 'Done' } })
        .sort({ dueDate: 1 })
        .limit(limit)
        .lean();
    const sanitized = tasks.map(t => ({ ...sanitizeDoc(t), agencyId: t.agencyId || 'default-agency' }));
    const projectIds = [...new Set(sanitized.map((t: any) => t.projectId))];
    const projs = await ProjectModel.find({ id: { $in: projectIds } }).select('id name slug').lean();
    const projMap = new Map(projs.map((p: any) => [p.id, { name: p.name, slug: p.slug || p.id }]));
    return sanitized.map((t: any) => ({
        ...t,
        projectName: projMap.get(t.projectId)?.name ?? 'Unknown Project',
        projectSlug: projMap.get(t.projectId)?.slug ?? t.projectId,
    }));
}

export async function getClientDashboardData(clientId: string) {
    const caller = await requireAuth();
    // IDOR prevention: clients can only view their own dashboard
    if (caller.role === 'client' && caller.id !== clientId) {
        throw new Error('Unauthorized: You can only view your own dashboard.');
    }
    await connectDB();

    const agency = await getCurrentAgency();
    const agencyFilter = requireAgencyFilter(agency);

    // Parallel Fetch -- scope invoices/tasks/assets to client's project IDs, not all data
    const clientProjects = await ProjectModel.find({ clientId, ...agencyFilter }).lean();
    const projectIds = clientProjects.map((p: any) => p.id);

    const [invoices, transactions, tasks, assets, notifications] = await Promise.all([
        InvoiceModel.find({ projectId: { $in: projectIds }, ...agencyFilter }).lean(),
        TransactionModel.find({ projectId: { $in: projectIds }, ...agencyFilter }).lean(),
        TaskModel.find({ projectId: { $in: projectIds }, ...agencyFilter }).lean(),
        AssetModel.find({ projectId: { $in: projectIds }, ...agencyFilter }).lean(),
        NotificationModel.find({ userId: clientId, ...agencyFilter }).sort({ timestamp: -1 }).limit(5).lean()
    ]);

    const projects = clientProjects;

    const clientInvoices = invoices;
    const clientTransactions = transactions;
    const clientTasks = tasks;
    const clientAssets = assets;

    // Metrics
    const activeProjectsCount = projects.filter((p: any) => p.status === 'Active').length;
    const completedProjectsCount = projects.filter((p: any) => p.status === 'Completed').length;
    const pendingInvoices = clientInvoices.filter((i: any) => i.status === 'Pending' || i.status === 'Overdue');
    const totalDue = pendingInvoices.reduce((acc: number, inv: any) => acc + inv.amount, 0);
    const unreadNotificationsCount = notifications.filter((n: any) => !n.read).length; // Note: this is only from the latest 5. Ideally query count.
    const unreadCountReal = await NotificationModel.countDocuments({ userId: clientId, read: false, ...agencyFilter });


    // Financials
    const totalPaid = clientTransactions
        .filter((t: any) => t.type === 'income' && t.status === 'completed')
        .reduce((sum: number, t: any) => sum + t.amount, 0);
    const totalRefunded = clientTransactions
        .filter((t: any) => t.category === 'Refund' && t.status === 'completed')
        .reduce((sum: number, t: any) => sum + t.amount, 0);

    const totalSpent = totalPaid - totalRefunded;
    const totalBudget = projects.reduce((sum: number, p: any) => sum + (p.budget || 0), 0);

    const clientMetrics = {
        activeProjects: activeProjectsCount,
        completedProjects: completedProjectsCount,
        pendingInvoicesCount: pendingInvoices.length,
        totalDue: totalDue,
        unreadNotificationsCount: unreadCountReal,
        totalSpent,
        totalBudget,
        totalTasks: clientTasks.length,
        completedTasks: clientTasks.filter((t: any) => t.status === 'Done').length
    };

    return {
        projects: projects.map(p => ({ ...sanitizeDoc(p), agencyId: p.agencyId || 'default-agency' })),
        invoices: clientInvoices.map(i => sanitizeDoc(i)),
        transactions: clientTransactions.map(t => sanitizeDoc(t)),
        tasks: clientTasks.map(t => ({ ...sanitizeDoc(t), agencyId: t.agencyId || 'default-agency' })),
        assets: clientAssets.map(a => sanitizeDoc(a)),
        notifications: notifications.map(n => sanitizeDoc(n)),
        metrics: clientMetrics
    };
}

export async function getEmployeeDashboardData(userId: string) {
    const caller = await requireAuth();
    // IDOR prevention: employees can only view their own dashboard
    if (caller.role === 'employee' && caller.id !== userId) {
        throw new Error('Unauthorized: You can only view your own dashboard.');
    }
    await connectDB();
    const agency = await getCurrentAgency();
    const agencyFilter = requireAgencyFilter(agency);
    const [tasks, user, leaveRequests] = await Promise.all([
        TaskModel.find({ assigneeId: userId, ...agencyFilter }).lean(),
        UserModel.findOne({ id: userId, ...agencyFilter }).select('-password').lean(),
        LeaveRequestModel.find({ userId, ...agencyFilter }).sort({ createdAt: -1 }).limit(5).lean()
    ]);

    const activities = user
        ? await ActivityModel.find({ $or: [{ userId }, { user: (user as any).name }], ...agencyFilter }).sort({ timestamp: -1 }).limit(5).lean()
        : [];

    const projectIds = [...new Set(tasks.map((t: any) => t.projectId))];
    const projects = await ProjectModel.find({ id: { $in: projectIds }, ...agencyFilter }).lean();

    return {
        tasks: tasks.map(t => ({ ...sanitizeDoc(t), agencyId: t.agencyId || 'default-agency' })),
        activities: activities.map(a => sanitizeDoc(a)),
        projects: projects.map(p => ({ ...sanitizeDoc(p), agencyId: p.agencyId || 'default-agency' })),
        user: user ? sanitizeDoc(user) : null,
        leaveRequests: leaveRequests.map(l => sanitizeDoc(l))
    };
}

// Auto-clear notifications older than 30 days
export async function getNotifications(userId: string, offset = 0, limit = 50): Promise<Notification[]> {
    const caller = await requireAuth();
    // IDOR prevention: users can only view their own notifications
    if (caller.id !== userId && caller.role !== 'admin' && caller.role !== 'manager') {
        throw new Error('Unauthorized: You can only view your own notifications.');
    }
    await connectDB();
    const agency = await getCurrentAgency();
    const agencyFilter = requireAgencyFilter(agency);
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

    // Clean up old notifications -- scoped to THIS USER only to avoid deleting other users' notifications
    await NotificationModel.deleteMany({ userId, ...agencyFilter, timestamp: { $lt: thirtyDaysAgo } });

    const notifications = await NotificationModel.find({ userId, ...agencyFilter })
        .sort({ timestamp: -1 })
        .skip(offset)
        .limit(limit)
        .lean();

    return notifications.map(n => sanitizeDoc(n));
}


export async function getProjects(offset = 0, limit = 1000) {
    await connectDB();
    const currentUserId = await getSessionId();
    if (!currentUserId) return []; // Require auth

    const currentUser = await getUser(currentUserId);
    if (!currentUser) return [];

    // Always scope to current agency
    const agency = await getCurrentAgency();
    const agencyFilter = requireAgencyFilter(agency);

    let query: any = { ...agencyFilter };
    if (currentUser.role === 'client') {
        // STRICT: Only return projects owned by this client
        query.clientId = currentUserId;
    }

    const projects = await ProjectModel.find(query).skip(offset).limit(limit).lean();
    return projects.map(p => ({ ...sanitizeDoc(p), agencyId: p.agencyId || 'default-agency' }));
}

export async function getUserProjects(userId: string) {
    await requireAuth();
    await connectDB();
    const agency = await getCurrentAgency();
    const agencyFilter = requireAgencyFilter(agency);

    // Check if user is a client
    const isClient = await ClientModel.exists({ id: userId, ...agencyFilter });
    if (isClient) {
        return ProjectModel.find({ clientId: userId, ...agencyFilter }).lean().then(docs => docs.map(sanitizeDoc));
    }
    // For employees: find projects where they have assigned tasks
    const taskProjectIds = await TaskModel.distinct('projectId', { assigneeId: userId, ...agencyFilter });
    return ProjectModel.find({ id: { $in: taskProjectIds }, ...agencyFilter }).lean().then(docs => docs.map(sanitizeDoc));
}

export async function getProject(id: string) {
    await requireAuth();
    await connectDB();
    const agency = await getCurrentAgency();
    const agencyFilter = requireAgencyFilter(agency);
    const project = await ProjectModel.findOne({ id, ...agencyFilter }).lean();
    if (!project) return undefined;
    return { ...sanitizeDoc(project), agencyId: project.agencyId || 'default-agency' };
}

export async function getProjectBySlug(slug: string) {
    await requireAuth();
    await connectDB();
    const agency = await getCurrentAgency();
    const agencyFilter = requireAgencyFilter(agency);
    const project = await ProjectModel.findOne({ $or: [{ slug }, { id: slug }], ...agencyFilter }).lean();
    if (!project) return undefined;
    return { ...sanitizeDoc(project), agencyId: project.agencyId || 'default-agency' };
}

export async function getUsers() {
    await connectDB();
    const currentUserId = await getSessionId();
    const currentUser = await getUser(currentUserId!);
    const isAdmin = currentUser && (currentUser.role === 'admin' || currentUser.role === 'manager');

    // Fetch users scoped to current agency
    const agency = await getCurrentAgency();
    const agencyFilter = requireAgencyFilter(agency);
    const usersRaw = await UserModel.find({ ...agencyFilter, archived: { $ne: true } }).select('-password').lean();
    const users = usersRaw.map(u => ({ ...sanitizeDoc(u), agencyId: u.agencyId || 'default-agency' }));

    if (currentUser?.role === 'client') {
        return users.map(user => {
            const { salary, password, adharCardImage, panCardImage, pendingAdharCardImage, pendingPanCardImage, contracts, otherDocuments, ...redacted } = user as any;
            return redacted as User;
        });
    }

    return users.map(user => {
        if (isAdmin || user.id === currentUserId) {
            return user as User;
        }
        const { salary, adharCardImage, panCardImage, pendingAdharCardImage, pendingPanCardImage, contracts, otherDocuments, ...redacted } = user as any;
        return redacted as User;
    });
}

export async function getUser(id: string) {
    // 1. Resolve User -- scoped to current agency
    const agency = await getCurrentAgency();
    const agencyId = agency?.id;
    const targetUser = await resolveUserOrClient(id, agencyId);
    if (!targetUser) return undefined;

    // 2. Access Control
    const currentUserId = await getSessionId();
    if (!currentUserId) return undefined; // Require auth

    const currentUser = await resolveUserOrClient(currentUserId, agencyId);
    const isAdmin = currentUser && (currentUser.role === 'admin' || currentUser.role === 'manager');

    if (isAdmin || currentUserId === id) {
        return sanitizeDoc(targetUser);
    }

    // 3. Redact
    const { salary, adharCardImage, panCardImage, pendingAdharCardImage, pendingPanCardImage, contracts, otherDocuments, ...redacted } = targetUser;
    return sanitizeDoc(redacted as User);
}


export async function getUserByUsername(username: string) {
    // 1. Resolve -- scoped to current agency
    const agency = await getCurrentAgency();
    const agencyId = agency?.id;
    const user = await resolveUserOrClient(username, agencyId);
    if (!user) return undefined;

    // 2. Access Control
    const currentUserId = await getSessionId();
    if (!currentUserId) return undefined; // Require auth

    const currentUser = await getUser(currentUserId);
    if (currentUser?.role === 'admin' || currentUser?.role === 'manager' || currentUser?.id === user.id) {
        return sanitizeDoc(user);
    }

    // 3. Redact
    const { salary, password, adharCardImage, panCardImage, pendingAdharCardImage, pendingPanCardImage, contracts, otherDocuments, ...redacted } = user;
    return sanitizeDoc(redacted as User);
}

export async function getUserTasks(userId: string, offset = 0, limit = 1000) {
    const caller = await requireAuth();
    // S3 fix: IDOR protection — non-admin users can only access their own tasks
    const isPrivileged = caller.role === 'admin' || caller.role === 'manager';
    if (!isPrivileged && caller.id !== userId) {
        throw new Error('Unauthorized: You can only view your own tasks.');
    }
    await connectDB();
    const agency = await getCurrentAgency();
    const agencyFilter = requireAgencyFilter(agency);

    // Fetch tasks for user -- scoped to agency
    const tasksRaw = await TaskModel.find({ assigneeId: userId, ...agencyFilter }).lean();

    // Verify projects exist (equivalent to validProjectIds logic but faster)
    const projectIds = [...new Set(tasksRaw.map(t => t.projectId))];
    const validProjects = await ProjectModel.find({ id: { $in: projectIds }, ...agencyFilter }).select('id').lean();
    const validProjectIdSet = new Set(validProjects.map(p => p.id));

    // Filter and slice
    const validTasks = tasksRaw.filter(t => validProjectIdSet.has(t.projectId));

    return validTasks.slice(offset, offset + limit).map(t => ({ ...sanitizeDoc(t), agencyId: t.agencyId || 'default-agency' }));
}

// For Client Profile: Get projects they OWN
export async function getClientProjects(clientId: string) {
    const caller = await requireAuth();
    // S3 fix: IDOR protection — clients can only access their own projects
    const isPrivileged = caller.role === 'admin' || caller.role === 'manager';
    if (caller.role === 'client' && caller.id !== clientId && !isPrivileged) {
        throw new Error('Unauthorized: You can only view your own projects.');
    }
    await connectDB();
    const agency = await getCurrentAgency();
    const agencyFilter = requireAgencyFilter(agency);

    const client = await resolveUserOrClient(clientId, agency?.id);
    const clientName = client ? client.name : null;

    let query: any = { clientId: clientId, ...agencyFilter };
    if (clientName) {
        query = {
            $or: [
                { clientId: clientId },
                { client: clientName }
            ],
            ...agencyFilter
        };
    }

    const projects = await ProjectModel.find(query).lean();
    return projects.map(p => ({ ...sanitizeDoc(p), agencyId: p.agencyId || 'default-agency' }));
}

export async function getProjectTasks(projectIds: string[]) {
    await requireAuth();
    await connectDB();
    const agency = await getCurrentAgency();
    const agencyFilter = requireAgencyFilter(agency);
    const tasks = await TaskModel.find({ projectId: { $in: projectIds }, ...agencyFilter }).lean();
    return tasks.map(t => ({ ...sanitizeDoc(t), agencyId: t.agencyId || 'default-agency' }));
}

// For Client Profile: Get tasks they CREATED (Assigned to others)
export async function getClientCreatedTasks(userId: string) {
    await requireAuth();
    await connectDB();
    const agency = await getCurrentAgency();
    const agencyFilter = requireAgencyFilter(agency);
    const tasks = await TaskModel.find({ createdBy: userId, ...agencyFilter }).sort({ createdAt: -1 }).lean();
    return tasks.map(t => ({ ...sanitizeDoc(t), agencyId: t.agencyId || 'default-agency' }));
}

export async function getUserActivity(userId: string) {
    const caller = await requireAuth();
    // S3 fix: IDOR protection — non-admin users can only access their own activity
    const isPrivileged = caller.role === 'admin' || caller.role === 'manager';
    if (!isPrivileged && caller.id !== userId) {
        throw new Error('Unauthorized: You can only view your own activity.');
    }
    await connectDB();
    const agency = await getCurrentAgency();
    const agencyFilter = requireAgencyFilter(agency);
    const user = await getUser(userId);
    if (!user) return [];

    // Limit to last 20 for dashboard -- scoped to agency
    const activities = await ActivityModel.find({ $or: [{ userId }, { user: user.name }], ...agencyFilter })
        .sort({ timestamp: -1 })
        .limit(20)
        .lean();

    return activities.map(a => sanitizeDoc(a));
}

export async function getUserContributionHistory(userId: string) {
    const caller = await requireAuth();
    // S3 fix: IDOR protection — non-admin users can only access their own contributions
    const isPrivileged = caller.role === 'admin' || caller.role === 'manager';
    if (!isPrivileged && caller.id !== userId) {
        throw new Error('Unauthorized: You can only view your own contribution history.');
    }
    await connectDB();
    const agency = await getCurrentAgency();
    const agencyFilter = requireAgencyFilter(agency);
    const user = await getUser(userId);
    if (!user) return [];

    const activities = await ActivityModel.find({
        $or: [{ userId }, { user: user.name }],
        ...agencyFilter
    }).lean();

    return activities.map(a => sanitizeDoc(a));
}

export async function createUser(user: Omit<User, "id" | "agencyId">) {
    await requireRole('admin', 'manager');
    // Input sanitization
    user = sanitizeMongoInput(user);
    user.name = sanitizeName(user.name);
    if (!user.name) throw new Error('Name is required');
    if (user.email) user.email = validateEmail(user.email);
    if (user.contactNumber) user.contactNumber = sanitizePhone(user.contactNumber);
    if (user.password) await validatePasswordWithPolicy(user.password);
    if (user.jobTitle) user.jobTitle = sanitizeName(user.jobTitle, 100);
    const validGenders = ['Male', 'Female', 'Other'];
    if (user.gender && !validGenders.includes(user.gender)) user.gender = 'Male';
    // Generate/Validate username
    let username = user.username ? sanitizeUsername(user.username) : '';
    if (!username) {
        username = user.name.toLowerCase().replace(/\s+/g, '');
    }

    // Ensure username uniqueness via DB query
    await connectDB();
    const agency = await getCurrentAgency();

    // Plan limit check
    if (agency) {
        const limit = await checkAgencyLimit(agency.id, 'users');
        if (!limit.allowed) throw new Error(`Plan limit reached: your plan allows ${limit.limit} users (currently ${limit.current}).`);
    }

    const agencyFilter = requireAgencyFilter(agency);
    let uniqueUsername = username;
    let counter = 1;
    while (
        await UserModel.exists({ username: uniqueUsername, ...agencyFilter }) ||
        await ClientModel.exists({ username: uniqueUsername, ...agencyFilter })
    ) {
        uniqueUsername = `${username}${counter}`;
        counter++;
    }

    const newUser = await withAgencyId({ ...user, id: generateId(), username: uniqueUsername });
    if (!newUser.avatar) {
        newUser.avatar = `https://api.dicebear.com/7.x/avataaars/svg?seed=${newUser.name}`;
    }
    // Hash password before storing
    if (newUser.password) {
        newUser.password = await hashPassword(newUser.password);
    }
    // Support backdate: admin can set a custom createdAt (join date)
    if ((newUser as any).createdAt && !isNaN(new Date((newUser as any).createdAt).getTime())) {
        (newUser as any).createdAt = new Date((newUser as any).createdAt).toISOString();
    } else {
        (newUser as any).createdAt = new Date().toISOString();
    }
    await connectDB();
    try {
        await UserModel.create(newUser);
        // Increment agency usage counter for users
        if (agency) await incrementAgencyUsage(agency.id, 'users');
    } catch (err: any) {
        // Handle duplicate username race condition
        if (err?.code === 11000 && err?.keyPattern?.username) {
            let retryUsername = uniqueUsername;
            let retryCounter = counter;
            for (let i = 0; i < 5; i++) {
                retryUsername = `${username}${retryCounter}`;
                retryCounter++;
                newUser.username = retryUsername;
                try {
                    await UserModel.create(newUser);
                    break;
                } catch (retryErr: any) {
                    if (retryErr?.code !== 11000 || i === 4) throw retryErr;
                }
            }
        } else {
            throw err;
        }
    }

    // Send welcome email to employee
    try {
        const agency = await getCurrentAgency();

        if (newUser.email) {
            await sendEmployeeAccountCreatedEmail({
                employeeEmail: newUser.email,
                employeeName: newUser.name,
                username: newUser.username,
                role: newUser.role,
                dashboardLink: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard`,
                agencyName: agency?.name || 'Agency',
            });
        }
    } catch (emailError) {
        console.error('[Email] Failed to send employee account creation email:', emailError);
    }

    // Welcome in-app notification
    try {
        if (await isNotifEnabled('welcome')) {
            const agency = await getCurrentAgency();
            await NotificationModel.create({
                id: generateId(), agencyId: agency?.id, userId: newUser.id,
                message: `Welcome to the team, ${newUser.name}! Your account has been set up. Explore your dashboard to get started.`,
                read: false, timestamp: new Date().toISOString(),
                link: '/dashboard'
            });
        }
    } catch (notifError) {
        console.error('[Notification] Failed to create welcome notification:', notifError);
    }

    revalidatePath('/dashboard/team');
    return newUser;
}

// Helper to sanitize Mongoose docs for Client Components
function sanitizeDoc(doc: any) {
    if (!doc) return null;
    return JSON.parse(JSON.stringify(doc));
}

export async function getCurrentUser() {
    await connectDB();

    // 1. Try new Auth System (JWT)
    const session = await getSessionUser();

    if (session) {
        const now = new Date().toISOString();
        if (session.role === 'superadmin') {
            const admin = await SuperAdminModel.findOne({ id: session.userId }).select('-password').lean();
            if (admin) return sanitizeDoc(admin) as any;
        } else if (session.role === 'client') {
            const client = await ClientModel.findOne({ id: session.userId }).select('-password').lean();
            if (client) {
                // Throttled presence update (max once per 5 min)
                const lastActive = (client as any).lastActiveAt ? new Date((client as any).lastActiveAt).getTime() : 0;
                if (Date.now() - lastActive > 5 * 60 * 1000) {
                    ClientModel.updateOne({ id: session.userId }, { $set: { lastActiveAt: now } }).catch(() => { });
                }
                return sanitizeDoc({ ...client, role: 'client' }) as any;
            }
        } else {
            const user = await UserModel.findOne({ id: session.userId }).select('-password').lean();
            if (user) {
                // Throttled presence update (max once per 5 min)
                const lastActive = (user as any).lastActiveAt ? new Date((user as any).lastActiveAt).getTime() : 0;
                if (Date.now() - lastActive > 5 * 60 * 1000) {
                    UserModel.updateOne({ id: session.userId }, { $set: { lastActiveAt: now } }).catch(() => { });
                }
                return sanitizeDoc(user) as User;
            }
        }
    }

    // 2. Legacy Fallback (Cookie based) - Kept for safety during transition
    const userId = await getSessionId();
    if (!userId) return null;

    // Check for Super Admin
    const superAdmin = await SuperAdminModel.findOne({ id: userId }).select('-password').lean();
    if (superAdmin) return sanitizeDoc(superAdmin) as any;

    const user = await UserModel.findOne({ id: userId }).select('-password').lean();
    if (user) return sanitizeDoc(user) as User;

    const client = await ClientModel.findOne({ id: userId }).select('-password').lean();
    if (client) {
        return sanitizeDoc({
            id: client.id,
            name: client.name,
            email: client.email,
            role: 'client',
            agencyId: client.agencyId,
            avatar: (client as any).logo,
            username: (client as any).username || client.id.substring(0, 8)
        }) as any;
    }

    return null;

}

export async function updateUserTimezone(timezone: string) {
    "use server";
    await connectDB();
    const session = await getSessionUser();
    if (!session || !timezone) return;
    // Validate timezone string with Intl
    try { Intl.DateTimeFormat(undefined, { timeZone: timezone }); } catch { return; }
    if (session.role === 'client') {
        await ClientModel.updateOne({ id: session.userId }, { $set: { timezone } });
    } else if (session.role === 'superadmin') {
        await SuperAdminModel.updateOne({ id: session.userId }, { $set: { timezone } });
    } else {
        await UserModel.updateOne({ id: session.userId }, { $set: { timezone } });
    }
}

export async function updateUser(id: string, updates: Partial<User>, oldPassword?: string) {
    // Permission Check
    const currentUser = await getCurrentUser();
    if (!currentUser) throw new Error("Unauthorized");
    const isAdmin = currentUser.role === 'admin' || currentUser.role === 'manager';
    const isSelf = currentUser.id === id;

    if (!isAdmin && !isSelf) {
        throw new Error("Unauthorized: You can only edit your own profile.");
    }

    // Prevent privilege escalation — only admin can change role, salary, employmentType
    if (!isAdmin) {
        delete updates.role;
        delete updates.salary;
        delete updates.employmentType;
    }

    // Input sanitization
    updates = sanitizeUpdates(updates) as Partial<User>;
    if (updates.name) updates.name = sanitizeName(updates.name);
    if (updates.email) updates.email = validateEmail(updates.email);
    if (updates.contactNumber) updates.contactNumber = sanitizePhone(updates.contactNumber);
    if (updates.username) updates.username = sanitizeUsername(updates.username);
    if (updates.jobTitle) updates.jobTitle = sanitizeName(updates.jobTitle, 100);
    const validGenders = ['Male', 'Female', 'Other'];
    if (updates.gender && !validGenders.includes(updates.gender)) updates.gender = 'Male';

    // Verify password if changing it
    if (updates.password) {
        if (!oldPassword) {
            throw new Error("Old password is required to change password");
        }

        await connectDB();

        // Find user in MongoDB — scoped by agencyId to prevent cross-tenant password changes (BUG-173)
        const agency = await getCurrentAgency();
        const agencyScope = agency ? { agencyId: agency.id } : {};

        let user: any = await UserModel.findOne({ id: id, ...agencyScope });
        let model: any = UserModel;

        if (!user) {
            user = await ClientModel.findOne({ id: id, ...agencyScope });
            model = ClientModel;
        }
        if (!user) {
            // SuperAdmin is not scoped by agency — only allow if user is changing their own password
            if (isSelf) {
                user = await SuperAdminModel.findOne({ id: id });
                model = SuperAdminModel;
            }
        }

        if (!user) {
            throw new Error("User not found");
        }

        if (user.password) {
            // Use secure comparison
            const isMatch = await comparePassword(oldPassword, user.password);
            if (!isMatch) {
                throw new Error("Incorrect old password");
            }
        }

        // Hash the NEW password
        updates.password = await hashPassword(updates.password);

        // Perform Update — also scoped by id to prevent cross-tenant writes
        await model.findOneAndUpdate({ id: id, ...(model !== SuperAdminModel ? agencyScope : {}) }, { $set: updates });
        return;
    }

    // For non-password updates, continuing with MongoDB update logic
    await connectDB();

    // Check username uniqueness if updating username -- scoped to current agency
    if (updates.username) {
        const agency = await getCurrentAgency();
        const agencyFilter = requireAgencyFilter(agency);
        const existingUser = await UserModel.findOne({ username: updates.username, id: { $ne: id }, ...agencyFilter });
        const existingClient = await ClientModel.findOne({ username: updates.username, id: { $ne: id }, ...agencyFilter });

        if (existingUser || existingClient) {
            throw new Error(`Username "${updates.username}" is already taken.`);
        }
    }

    // Approval Logic for Documents
    let finalUpdates = { ...updates };
    let notifyAdmin = false;


    if (!isAdmin && (updates.adharCardImage || updates.panCardImage || updates.contracts || updates.otherDocuments)) {
        // Move doc updates to pending fields
        if (updates.adharCardImage) {
            finalUpdates.pendingAdharCardImage = updates.adharCardImage;
            delete finalUpdates.adharCardImage;
        }
        if (updates.panCardImage) {
            finalUpdates.pendingPanCardImage = updates.panCardImage;
            delete finalUpdates.panCardImage;
        }
        if (updates.contracts) {
            finalUpdates.pendingContracts = updates.contracts;
            delete finalUpdates.contracts;
        }
        if (updates.otherDocuments) {
            finalUpdates.pendingOtherDocuments = updates.otherDocuments;
        }
        notifyAdmin = true;
    }

    // Try User first, then Client
    const agency = await getCurrentAgency();
    const agencyFilter = requireAgencyFilter(agency);

    const userExists = await UserModel.exists({ id, ...agencyFilter });
    if (userExists) {
        await UserModel.updateOne({ id, ...agencyFilter }, { $set: finalUpdates });
    } else {
        const clientExists = await ClientModel.exists({ id, ...agencyFilter });
        if (!clientExists) { revalidatePath('/dashboard/settings'); return; }
        await ClientModel.updateOne({ id, ...agencyFilter }, { $set: finalUpdates });
    }

    // Notify Admins if document request
    if (notifyAdmin && await isNotifEnabled('document')) {
        const admins = await UserModel.find({ ...agencyFilter, $or: [{ role: 'admin' }, { role: 'manager' }] }).select('-password').lean();
        const currentUserDoc = await UserModel.findOne({ id, ...agencyFilter }).select('-password').lean() ||
            await ClientModel.findOne({ id, ...agencyFilter }).select('-password').lean();
        await NotificationModel.insertMany(admins.map(admin => ({
            id: generateId(), agencyId: agency?.id, userId: admin.id,
            message: `${(currentUserDoc as any)?.name || 'User'} has requested to update their identity documents.`,
            read: false, timestamp: new Date().toISOString(),
            link: `/dashboard/team?edit=${id}`
        })));
    }
    revalidatePath('/dashboard/team');
}

export async function deleteClient(id: string) {
    await connectDB();
    const currentUser = await getCurrentUser();
    if (!currentUser || (currentUser.role !== 'admin' && currentUser.role !== 'manager')) {
        throw new Error('Unauthorized');
    }
    const agency = await getCurrentAgency();
    const client = await ClientModel.findOne({ id, agencyId: agency?.id }).select('-password').lean();
    if (!client) throw new Error('Client not found');

    // Soft-delete: mark as archived to preserve financial history
    await ClientModel.updateOne(
        { id, agencyId: agency?.id },
        { $set: { archived: true, archivedAt: new Date().toISOString() } }
    );
    // Clean up notifications for archived client
    await NotificationModel.deleteMany({ userId: id, agencyId: agency?.id });
    // Decrement agency usage counter
    if (agency) await decrementAgencyUsage(agency.id, 'clients');
    revalidatePath('/dashboard/clients');
}

export async function getArchivedClients() {
    const currentUser = await getCurrentUser();
    if (!currentUser || currentUser.role !== 'admin') throw new Error('Unauthorized');
    await connectDB();
    const agency = await getCurrentAgency();
    const clients = await ClientModel.find({ agencyId: agency?.id, archived: true }).select('-password').lean();
    return clients.map(sanitizeDoc);
}

export async function unarchiveClient(id: string) {
    const currentUser = await getCurrentUser();
    if (!currentUser || currentUser.role !== 'admin') {
        throw new Error("Unauthorized");
    }

    await connectDB();
    const agency = await getCurrentAgency();
    const client = await ClientModel.findOne({ id, agencyId: agency?.id }).select('-password').lean();
    if (!client) throw new Error('Client not found');
    if (!client.archived) throw new Error('Client is not archived');

    await ClientModel.updateOne(
        { id, agencyId: agency?.id },
        { $set: { archived: false }, $unset: { archivedAt: '' } }
    );
    // Re-increment agency usage counter after unarchive
    if (agency) await incrementAgencyUsage(agency.id, 'clients');

    revalidatePath('/dashboard/clients');
}

export async function permanentlyDeleteClient(id: string, password: string) {
    await requireRole('admin');
    await connectDB();
    const isValid = await verifyAdminPassword(password);
    if (!isValid) throw new Error('Invalid password');
    const agency = await getCurrentAgency();

    const client = await ClientModel.findOne({ id, agencyId: agency?.id }).select('-password').lean();
    if (!client) throw new Error('Client not found');

    // Find all projects owned by this client to cascade-delete their data
    const clientProjects = await ProjectModel.find({ clientId: id, agencyId: agency?.id }).select('id').lean();
    const projectIds = clientProjects.map((p: any) => p.id);

    // Clean up uploaded files from blob storage (Vercel Blob + Azure) before removing DB records
    if (projectIds.length > 0) {
        try {
            const assets = await AssetModel.find({ projectId: { $in: projectIds }, agencyId: agency?.id }).select('url size').lean();
            if (assets.length > 0) {
                const { deleteFile } = await import('@/lib/storage');
                const BATCH_SIZE = 10;
                let totalBytesFreed = 0;
                for (let i = 0; i < assets.length; i += BATCH_SIZE) {
                    const batch = assets.slice(i, i + BATCH_SIZE);
                    await Promise.allSettled(
                        batch.map((asset: any) => asset.url ? deleteFile(asset.url) : Promise.resolve())
                    );
                }
                // Calculate total storage to decrement
                for (const asset of assets) {
                    const sizeStr = String((asset as any).size || '');
                    const sizeMatch = sizeStr.match(/([\d.]+)\s*(KB|MB|GB|B)/i);
                    if (sizeMatch) {
                        const num = parseFloat(sizeMatch[1]);
                        const unit = sizeMatch[2].toUpperCase();
                        totalBytesFreed += unit === 'GB' ? num * 1073741824 : unit === 'MB' ? num * 1048576 : unit === 'KB' ? num * 1024 : num;
                    }
                }
                if (totalBytesFreed > 0 && agency) {
                    await AgencyModel.updateOne({ id: agency.id }, { $inc: { 'usage.storage': -Math.round(totalBytesFreed) } });
                }
                console.log(`[permanentDeleteClient] Cleaned up ${assets.length} files from storage`);
            }
        } catch (storageErr) {
            console.error('[permanentDeleteClient] Storage cleanup error (proceeding with DB deletion):', storageErr);
        }
    }

    // Hard-delete: permanently remove client and all related data
    await Promise.all([
        ClientModel.deleteOne({ id, agencyId: agency?.id }),
        NotificationModel.deleteMany({ userId: id, agencyId: agency?.id }),
        // Clean up messages sent/received by this client
        MessageModel.deleteMany({
            agencyId: agency?.id,
            $or: [{ senderId: id }, { receiverId: id }]
        }),
        // Delete all projects and their child data
        ...(projectIds.length > 0 ? [
            ProjectModel.deleteMany({ id: { $in: projectIds }, agencyId: agency?.id }),
            TaskModel.deleteMany({ projectId: { $in: projectIds }, agencyId: agency?.id }),
            InvoiceModel.deleteMany({ projectId: { $in: projectIds }, agencyId: agency?.id }),
            TransactionModel.deleteMany({ projectId: { $in: projectIds }, agencyId: agency?.id }),
            AssetModel.deleteMany({ projectId: { $in: projectIds }, agencyId: agency?.id }),
            ActivityModel.deleteMany({ target: { $in: projectIds }, agencyId: agency?.id }),
        ] : []),
    ]);
    // Decrement agency usage counters for client and cascaded projects
    if (agency) {
        await decrementAgencyUsage(agency.id, 'clients');
        if (projectIds.length > 0) await decrementAgencyUsage(agency.id, 'projects', projectIds.length);
    }
    revalidatePath('/dashboard/clients');
}

export async function approveDocumentUpdate(userId: string, type: 'adhar' | 'pan' | 'contracts' | 'other' | 'both', approve: boolean) {
    const currentUser = await getCurrentUser();
    if (!currentUser || (currentUser.role !== 'admin' && currentUser.role !== 'manager')) {
        throw new Error("Unauthorized");
    }

    await connectDB();
    const agency = await getCurrentAgency();
    const user = await UserModel.findOne({ id: userId, agencyId: agency?.id }).select('-password').lean();
    if (!user) { revalidatePath('/dashboard/team'); return; }

    let updates: any = {};
    if (approve) {
        if ((type === 'adhar' || type === 'both') && user.pendingAdharCardImage) {
            updates.adharCardImage = user.pendingAdharCardImage;
            updates.pendingAdharCardImage = null;
        }
        if ((type === 'pan' || type === 'both') && user.pendingPanCardImage) {
            updates.panCardImage = user.pendingPanCardImage;
            updates.pendingPanCardImage = null;
        }
        if (type === 'contracts' && user.pendingContracts) {
            updates.contracts = user.pendingContracts;
            updates.pendingContracts = null;
        }
        if (type === 'other' && user.pendingOtherDocuments) {
            updates.otherDocuments = user.pendingOtherDocuments;
            updates.pendingOtherDocuments = null;
        }
    } else {
        if (type === 'adhar' || type === 'both') updates.pendingAdharCardImage = null;
        if (type === 'pan' || type === 'both') updates.pendingPanCardImage = null;
        if (type === 'contracts') updates.pendingContracts = null;
        if (type === 'other') updates.pendingOtherDocuments = null;
    }

    await UserModel.updateOne({ id: userId, agencyId: agency?.id }, { $set: updates });

    const message = approve
        ? `Your document update request for ${type === 'both' ? 'documents' : type.toUpperCase()} has been APPROVED.`
        : `Your document update request for ${type === 'both' ? 'documents' : type.toUpperCase()} has been REJECTED.`;

    if (await isNotifEnabled('document')) {
        await NotificationModel.create({
            id: generateId(), agencyId: agency?.id, userId,
            message, read: false, timestamp: new Date().toISOString()
        });
    }
    revalidatePath('/dashboard/team');
}

export async function adminResetPassword(id: string, newPassword: string) {
    const currentUser = await getCurrentUser();
    if (!currentUser || (currentUser.role !== 'admin' && currentUser.role !== 'manager')) {
        throw new Error("Unauthorized: Only Admins can reset passwords.");
    }
    // Input validation
    await validatePasswordWithPolicy(newPassword);
    await connectDB();
    const hashedPassword = await hashPassword(newPassword);
    const agency = await getCurrentAgency();
    await UserModel.updateOne({ id, agencyId: agency?.id }, { $set: { password: hashedPassword } });

    // Security notification -- password was reset by admin
    if (await isNotifEnabled('security')) {
        await NotificationModel.create({
            id: generateId(), agencyId: agency?.id, userId: id,
            message: `Your password was reset by ${currentUser.name}. If you did not request this, please contact your admin immediately.`,
            read: false, timestamp: new Date().toISOString(),
            link: '/dashboard/settings'
        });
    }

    revalidatePath('/dashboard/team');
}

export async function deleteUser(id: string, password: string) {
    await requireRole('admin');
    await connectDB();
    const isValid = await verifyAdminPassword(password);
    if (!isValid) throw new Error('Invalid password');
    const agency = await getCurrentAgency();

    const user = await UserModel.findOne({ id, agencyId: agency?.id }).select('-password').lean();
    if (!user) throw new Error('User not found');

    // Soft-delete: mark as archived to preserve transaction/task history
    await UserModel.updateOne(
        { id, agencyId: agency?.id },
        { $set: { archived: true, archivedAt: new Date().toISOString() } }
    );
    // Clean up notifications for archived user
    await NotificationModel.deleteMany({ userId: id, agencyId: agency?.id });
    // Decrement agency usage counter
    if (agency) await decrementAgencyUsage(agency.id, 'users');
    revalidatePath('/dashboard/team');
}

export async function getArchivedUsers() {
    const currentUser = await getCurrentUser();
    if (!currentUser || currentUser.role !== 'admin') throw new Error('Unauthorized');
    await connectDB();
    const agency = await getCurrentAgency();
    const users = await UserModel.find({ agencyId: agency?.id, archived: true }).select('-password').lean();
    return users.map(sanitizeDoc);
}

export async function unarchiveUser(id: string) {
    const currentUser = await getCurrentUser();
    if (!currentUser || currentUser.role !== 'admin') {
        throw new Error('Unauthorized');
    }
    await connectDB();
    const agency = await getCurrentAgency();
    const user = await UserModel.findOne({ id, agencyId: agency?.id }).select('-password').lean();
    if (!user) throw new Error('User not found');
    if (!(user as any).archived) throw new Error('User is not archived');

    await UserModel.updateOne(
        { id, agencyId: agency?.id },
        { $set: { archived: false }, $unset: { archivedAt: '' } }
    );
    // Re-increment agency usage counter after unarchive
    if (agency) await incrementAgencyUsage(agency.id, 'users');
    revalidatePath('/dashboard/team');
}

export async function permanentlyDeleteUser(id: string, password: string) {
    await requireRole('admin');
    await connectDB();
    const isValid = await verifyAdminPassword(password);
    if (!isValid) throw new Error('Invalid password');
    const agency = await getCurrentAgency();

    const user = await UserModel.findOne({ id, agencyId: agency?.id }).select('-password').lean();
    if (!user) throw new Error('User not found');

    // Hard-delete: permanently remove user and all related data
    await Promise.all([
        UserModel.deleteOne({ id, agencyId: agency?.id }),
        NotificationModel.deleteMany({ userId: id, agencyId: agency?.id }),
        LeaveRequestModel.deleteMany({ userId: id, agencyId: agency?.id }),
        // Unassign tasks — set assignee to empty rather than deleting tasks
        TaskModel.updateMany(
            { assigneeId: id, agencyId: agency?.id },
            { $set: { assigneeId: '' } }
        ),
        // Delete transactions linked to this user (salary payments etc)
        TransactionModel.deleteMany({ userId: id, agencyId: agency?.id }),
        // Clean up messages sent/received by this user
        MessageModel.deleteMany({
            agencyId: agency?.id,
            $or: [{ senderId: id }, { receiverId: id }]
        }),
        // Clean up activity log entries by this user
        ActivityModel.deleteMany({ userId: id, agencyId: agency?.id }),
    ]);
    // Decrement agency usage counter
    if (agency) await decrementAgencyUsage(agency.id, 'users');
    revalidatePath('/dashboard/team');
}

export async function getServices() {
    await requireAuth();
    await connectDB();
    const agency = await getCurrentAgency();
    const services = await ServiceModel.find(requireAgencyFilter(agency)).lean();
    return services.map(sanitizeDoc);
}

export async function addService(name: string, projectId: string, employees: string[]) {
    await requireRole('admin', 'manager');
    // Input sanitization
    name = sanitizeName(name, 200);
    if (!name) throw new Error('Service name is required');
    if (!projectId) throw new Error('Project is required');
    employees = (employees || []).filter(e => typeof e === 'string' && e.trim());
    await connectDB();
    const agency = await getCurrentAgency();
    const newService = { id: generateId(), agencyId: agency?.id, name, projectId, employees };
    await ServiceModel.create(newService);
    // Auto-add service name to project's services array for Kanban filter & project cards
    await ProjectModel.updateOne(
        { id: projectId, agencyId: agency?.id },
        { $addToSet: { services: newService.name } }
    );
    revalidatePath('/dashboard/projects');
    revalidatePath('/dashboard/settings');
    return newService;
}

export async function deleteService(id: string) {
    await requireRole('admin', 'manager');
    await connectDB();
    const agency = await getCurrentAgency();
    const serviceToDelete = await ServiceModel.findOne({ id, agencyId: agency?.id }).lean();
    if (!serviceToDelete) throw new Error('Service not found');
    const serviceName = (serviceToDelete as any)?.name;

    // Safety check: block deletion if any tasks reference this service as their category
    const tasksUsingService = await TaskModel.countDocuments({
        agencyId: agency?.id,
        category: serviceName,
    });
    if (tasksUsingService > 0) {
        throw new Error(
            `Cannot delete "${serviceName}": ${tasksUsingService} task(s) are still using this service as their category. Please reassign or delete those tasks first.`
        );
    }

    await ServiceModel.deleteOne({ id, agencyId: agency?.id });
    // Remove this service from all projects that reference it
    await ProjectModel.updateMany(
        { agencyId: agency?.id, services: { $in: [id, serviceName] } },
        { $pull: { services: { $in: [id, serviceName] } } }
    );
    revalidatePath('/dashboard/settings');
    revalidatePath('/dashboard/projects');
}

export async function updateService(id: string, name: string, projectId: string, employees: string[]) {
    await requireRole('admin', 'manager');
    // Input sanitization
    name = sanitizeName(name, 200);
    if (!name) throw new Error('Service name is required');
    if (!projectId) throw new Error('Project is required');
    employees = (employees || []).filter(e => typeof e === 'string' && e.trim());
    await connectDB();
    const agency = await getCurrentAgency();

    // Get old name before updating — needed to propagate rename
    const oldService = await ServiceModel.findOne({ id, agencyId: agency?.id }).lean();
    const oldName = (oldService as any)?.name;

    await ServiceModel.updateOne(
        { id, agencyId: agency?.id },
        { $set: { name, projectId, employees } });

    // Propagate service rename to tasks and projects that reference the old name
    if (oldName && oldName !== name) {
        await Promise.all([
            // Update task categories that use the old service name
            TaskModel.updateMany(
                { agencyId: agency?.id, category: oldName },
                { $set: { category: name } }
            ),
            // Update project services arrays (replace old name with new name)
            ProjectModel.updateMany(
                { agencyId: agency?.id, services: oldName },
                { $set: { 'services.$': name } }
            ),
        ]);
    }

    // Ensure service name is in the project's services array
    await ProjectModel.updateOne(
        { id: projectId, agencyId: agency?.id },
        { $addToSet: { services: name } }
    );

    revalidatePath('/dashboard/settings');
    revalidatePath('/dashboard/projects');
}

export async function getProjectServices(projectId: string) {
    await requireAuth();
    await connectDB();
    const agency = await getCurrentAgency();
    const services = await ServiceModel.find({ ...requireAgencyFilter(agency), projectId }).lean();
    return services.map(sanitizeDoc);
}

export async function getServiceTaskCount(serviceName: string) {
    await requireAuth();
    await connectDB();
    const agency = await getCurrentAgency();
    const count = await TaskModel.countDocuments({ agencyId: agency?.id, category: serviceName });
    return count;
}

export async function createProject(project: Omit<Project, "id" | "status" | "createdAt" | "agencyId">) {
    const currentUser = await getCurrentUser();
    if (!currentUser || (currentUser.role !== 'admin' && currentUser.role !== 'manager')) {
        throw new Error("Unauthorized: Only Admins and Managers can create projects.");
    }
    // Input sanitization
    project = sanitizeMongoInput(project);
    project.name = sanitizeName(project.name, 300);
    if (!project.name) throw new Error('Project name is required');
    if ((project as any).description) (project as any).description = sanitizeString((project as any).description, 10000);

    // Slug Generation
    let slug = project.slug;
    if (!slug) {
        slug = project.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    }

    // Unique Slug Check
    const agency = await getCurrentAgency();
    if (!agency) throw new Error('No agency context');

    // Plan limit check
    const projLimit = await checkAgencyLimit(agency.id, 'projects');
    if (!projLimit.allowed) throw new Error(`Plan limit reached: your plan allows ${projLimit.limit} projects (currently ${projLimit.current}).`);

    // Unique slug check against DB
    let uniqueSlug = slug;
    let slugCounter = 1;
    while (await ProjectModel.exists({ slug: uniqueSlug, agencyId: agency.id })) {
        uniqueSlug = `${slug}-${slugCounter}`;
        slugCounter++;
    }

    const newProject: Project = {
        ...project, id: generateId(), slug: uniqueSlug,
        status: 'Active', createdAt: new Date().toISOString(), agencyId: agency.id
    };

    // Validate client exists if specified
    if (project.clientId) {
        const clientExists = await ClientModel.exists({ id: project.clientId, agencyId: agency.id });
        if (!clientExists) throw new Error(`Client with ID ${project.clientId} not found`);
    }

    // Generate invoices from serviceConfigs BEFORE saving
    const newInvoices: Invoice[] = [];
    if (project.serviceConfigs && project.serviceConfigs.length > 0) {
        const totalServices = project.serviceConfigs.length;
        for (const serviceConfig of project.serviceConfigs) {
            const paymentConfig = serviceConfig.paymentConfig;
            if (!paymentConfig) continue;

            if (paymentConfig.type === 'installment') {
                if (paymentConfig.installmentDates && paymentConfig.installmentDates.length > 0) {
                    const amountPerInstallment = paymentConfig.installmentAmount ||
                        (project.budget / totalServices / paymentConfig.installmentDates.length);
                    for (const installmentDate of paymentConfig.installmentDates) {
                        newInvoices.push(await withAgencyId({
                            id: generateId(), projectId: newProject.id,
                            amount: Math.round(amountPerInstallment), status: 'Pending', date: installmentDate
                        }));
                    }
                }
            } else if (paymentConfig.type === 'monthly') {
                if (paymentConfig.monthlyAmount && paymentConfig.billingStartDate) {
                    const monthlyAmount = paymentConfig.monthlyAmount;
                    const startDate = new Date(paymentConfig.billingStartDate);
                    const projectDueDate = new Date(project.dueDate);
                    // BUG-047: Validate billing dates
                    if (isNaN(startDate.getTime())) throw new Error('Validation Error: Invalid billing start date.');
                    if (isNaN(projectDueDate.getTime())) throw new Error('Validation Error: Invalid project due date.');
                    if (startDate >= projectDueDate) throw new Error('Validation Error: Billing start date must be before project due date.');
                    const monthsDiff = Math.ceil((projectDueDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24 * 30));
                    const numberOfInvoices = Math.min(monthsDiff, 12);
                    for (let i = 0; i < numberOfInvoices; i++) {
                        const invoiceDate = new Date(startDate);
                        invoiceDate.setMonth(invoiceDate.getMonth() + i);
                        newInvoices.push(await withAgencyId({
                            id: generateId(), projectId: newProject.id,
                            amount: monthlyAmount, status: 'Pending',
                            date: invoiceDate.toISOString().split('T')[0]
                        }));
                    }
                }
            }
        }
    }

    // Save project + invoices
    await ProjectModel.create(newProject);
    // Increment agency usage counter for projects
    await incrementAgencyUsage(agency.id, 'projects');
    if (newInvoices.length > 0) {
        await InvoiceModel.insertMany(newInvoices.map(inv => ({ ...inv, agencyId: agency.id })));
    }

    // Notify client about invoices
    if (project.clientId && newInvoices.length > 0 && await isNotifEnabled('invoice')) {
        await NotificationModel.create({
            id: generateId(), agencyId: agency.id, userId: project.clientId,
            message: `${newInvoices.length} pending invoice(s) for project: ${project.name}`,
            read: false, timestamp: new Date().toISOString(), link: '/dashboard/finance'
        });
    }

    // Activity log
    await ActivityModel.create({
        id: generateId(), agencyId: agency.id, user: currentUser.name, userId: currentUser.id,
        action: 'created project', target: project.name,
        timestamp: new Date().toISOString()
    });

    // Send email notification to client
    if (project.clientId) {
        try {
            const client = await getClientById(project.clientId);
            if (client?.email) {
                const paymentPlan = project.serviceConfigs && project.serviceConfigs.length > 0
                    ? project.serviceConfigs[0].paymentConfig?.type || 'one-time'
                    : 'one-time';
                await sendProjectCreatedEmail({
                    clientEmail: client.email, clientName: client.name,
                    projectName: project.name, budget: project.budget,
                    paymentPlan, invoiceCount: newInvoices.length,
                    projectLink: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard/projects/${newProject.slug || newProject.id}`,
                });
            }
        } catch (emailError) {
            console.error('[Email] Failed to send project creation email:', emailError);
        }
    }

    revalidatePath('/dashboard/projects');
    revalidatePath('/dashboard/finance');
    return sanitizeDoc(newProject);
}

export async function updateProjectPayment(projectId: string, serviceId: string, paymentConfig: PaymentConfig) {
    await requireRole('admin', 'manager');
    await connectDB();
    const agency = await getCurrentAgency();
    // Sanitize paymentConfig to prevent NoSQL injection
    paymentConfig = sanitizeMongoInput(paymentConfig);
    await ProjectModel.updateOne(
        { id: projectId, agencyId: agency?.id, 'serviceConfigs.serviceId': serviceId },
        { $set: { 'serviceConfigs.$.paymentConfig': paymentConfig } }
    );
    revalidatePath('/dashboard/projects/[id]', 'page');
    revalidatePath('/dashboard/projects');
}

export async function getTasks(projectId: string) {
    await requireAuth();
    await connectDB();
    const agency = await getCurrentAgency();
    const tasks = await TaskModel.find({ projectId, agencyId: agency?.id }).lean();
    return tasks.map(sanitizeDoc);
}

export async function getTaskById(taskId: string) {
    await requireAuth();
    await connectDB();
    const agency = await getCurrentAgency();
    const agencyFilter = requireAgencyFilter(agency);
    const task = await TaskModel.findOne({ id: taskId, ...agencyFilter }).lean();
    return task ? sanitizeDoc(task) : null;
}

/** Lightweight: fetch all tasks for every project in the agency (for list-page progress bars) */
export async function getAllProjectTasks() {
    await requireAuth();
    await connectDB();
    const agency = await getCurrentAgency();
    const agencyFilter = requireAgencyFilter(agency);
    const tasks = await TaskModel.find(agencyFilter)
        .select('projectId status assigneeId')
        .lean();
    return tasks.map(sanitizeDoc);
}


export async function getUserPermissions(userId: string): Promise<UserPermissions> {
    await requireAuth();
    await connectDB();
    const agency = await getCurrentAgency();
    const settingsDoc = await SettingsModel.findOne(requireAgencyFilter(agency)).lean();
    const settings = settingsDoc as any;

    const defaultPermissions: UserPermissions = {
        canManageTasks: true,
        canMarkDone: true,
        deleteAccess: 'any',
        canCreateProject: false,
        canUseAI: false
    };

    if (!settings?.userPermissions) return defaultPermissions;
    return settings.userPermissions[userId] || defaultPermissions;
}

export async function updateUserPermissions(targetUserId: string, permissions: UserPermissions) {
    const currentUser = await getCurrentUser();
    if (!currentUser || (currentUser.role !== 'admin' && currentUser.role !== 'manager')) {
        throw new Error("Unauthorized: Only Admins can manage permissions.");
    }
    // Prevent NoSQL injection via key path manipulation
    if (!/^[a-zA-Z0-9_-]+$/.test(targetUserId)) {
        throw new Error('Invalid user ID format');
    }
    // Sanitize permissions object
    permissions = sanitizeMongoInput(permissions);

    await connectDB();
    const agency = await getCurrentAgency();
    await SettingsModel.updateOne(
        { agencyId: agency?.id },
        { $set: { [`userPermissions.${targetUserId}`]: permissions } },
        { upsert: true }
    );
    revalidatePath('/dashboard/settings');
}

export async function deleteTask(taskId: string) {
    await requireAuth();
    await connectDB();
    const currentUser = await getCurrentUser();
    const agency = await getCurrentAgency();
    if (!agency) throw new Error('No agency context');

    const userName = currentUser ? currentUser.name : 'System';
    const userId = currentUser ? currentUser.id : 'system';
    const permissions = await getUserPermissions(userId);

    const task = await TaskModel.findOne({ id: taskId, agencyId: agency.id }).lean();
    if (!task) throw new Error('Task not found');

    if (permissions.deleteAccess === 'none') throw new Error('Unauthorized: You do not have permission to delete tasks.');
    if (permissions.deleteAccess === 'own' && task.createdBy !== userId) throw new Error('Unauthorized: You can only delete your own tasks.');

    await TaskModel.deleteOne({ id: taskId, agencyId: agency.id });

    // Clean up notifications that link to this task
    await NotificationModel.deleteMany({
        agencyId: agency.id,
        link: { $regex: taskId }
    });

    await ActivityModel.create({
        id: generateId(),
        agencyId: agency.id,
        user: userName, userId,
        action: 'deleted task',
        target: task.title,
        timestamp: new Date().toISOString()
    });

    revalidatePath('/dashboard/projects/[id]', 'page');
    revalidatePath('/dashboard/projects');
}

export async function updateTaskStatus(taskId: string, status: Task['status'], completedAt?: string) {
    // Validate status against allowed values
    const VALID_STATUSES = ['Todo', 'In Progress', 'Review', 'Done'];
    if (!VALID_STATUSES.includes(status)) {
        throw new Error(`Invalid task status: ${status}`);
    }
    await connectDB();
    const currentUser = await getCurrentUser();
    const agency = await getCurrentAgency();
    if (!agency) throw new Error('No agency context');

    const userName = currentUser ? currentUser.name : 'System';
    const userId = currentUser ? currentUser.id : 'system';
    const permissions = await getUserPermissions(userId);

    if (status === 'Done') {
        if (!permissions.canMarkDone) throw new Error('Unauthorized: You do not have permission to mark tasks as Done.');
    } else {
        if (!permissions.canManageTasks) throw new Error('Unauthorized: You do not have permission to manage tasks.');
    }

    const updateFields: Record<string, any> = { status };
    // If backdating, also set updatedAt so the heatmap shows the correct completion date
    if (completedAt) {
        updateFields.updatedAt = new Date(completedAt).toISOString();
    }

    const task = await TaskModel.findOneAndUpdate(
        { id: taskId, agencyId: agency.id },
        { $set: updateFields },
        { returnDocument: 'before', lean: true, timestamps: completedAt ? false : true }
    );
    if (!task) throw new Error('Task not found');

    // Activity log — use backdated timestamp if provided
    const activityTimestamp = completedAt ? new Date(completedAt).toISOString() : new Date().toISOString();
    await ActivityModel.create({
        id: generateId(),
        agencyId: agency.id,
        user: userName, userId,
        action: 'moved task to ' + status,
        target: task.title,
        timestamp: activityTimestamp
    });

    // Collect unique notification recipients to avoid duplicates
    const projectForNotif = await ProjectModel.findOne({ id: task.projectId, agencyId: agency.id }).lean();
    if (await isNotifEnabled('task')) {
        const notifiedUserIds = new Set<string>();

        // In-app notification for task status change - notify assignee if someone else changed it
        if (task.assigneeId && task.assigneeId !== userId) {
            await NotificationModel.create({
                id: generateId(), agencyId: agency.id, userId: task.assigneeId,
                message: `${userName} moved your task "${task.title}" to ${status}`,
                read: false, timestamp: new Date().toISOString(),
                link: `/dashboard/projects/${task.projectId}?task=${taskId}`
            });
            notifiedUserIds.add(task.assigneeId);
        }

        // Notify admins about task status change (exclude already-notified users)
        const adminsForTask = await UserModel.find({ agencyId: agency.id, role: { $in: ['admin', 'manager'] } }).select('-password').lean();
        const adminNotifs = adminsForTask
            .filter((a: any) => a.id !== userId && !notifiedUserIds.has(a.id))
            .map((admin: any) => {
                notifiedUserIds.add(admin.id);
                return {
                    id: generateId(), agencyId: agency.id, userId: admin.id,
                    message: `${userName} moved task "${task.title}" to ${status}`,
                    read: false, timestamp: new Date().toISOString(),
                    link: `/dashboard/projects/${task.projectId}?task=${taskId}`
                };
            });
        if (adminNotifs.length > 0) await NotificationModel.insertMany(adminNotifs);

        // Notify project client about task progress (skip if already notified)
        if (projectForNotif?.clientId && !notifiedUserIds.has(projectForNotif.clientId)) {
            await NotificationModel.create({
                id: generateId(), agencyId: agency.id, userId: projectForNotif.clientId,
                message: `Task "${task.title}" has been moved to ${status}`,
                read: false, timestamp: new Date().toISOString(),
                link: `/dashboard/projects/${task.projectId}`
            });
        }
    }

    // Email notifications for task status change (gated by event settings)
    const emailCats = agency.settings?.emailCategories || {} as any;
    const taskEmailEvents = emailCats.taskEmailEvents || {};
    const eventKey = status === 'Done' ? 'taskDone' : (status === 'In Progress' ? 'taskInProgress' : null);
    const eventConfig = eventKey ? { ...DEFAULT_TASK_EMAIL_EVENTS[eventKey], ...taskEmailEvents[eventKey] } : null;
    const shouldSendTaskEmail = emailCats.taskUpdates !== false && eventConfig?.enabled;

    if (shouldSendTaskEmail) {
        try {
            // Email to assignee about status change
            if (eventConfig!.notifyAssignee && task.assigneeId && task.assigneeId !== userId) {
                const assignee = await getUser(task.assigneeId);
                if (assignee?.email) {
                    await sendTaskStatusChangedEmail({
                        recipientEmail: assignee.email,
                        recipientName: assignee.name,
                        taskTitle: task.title,
                        oldStatus: task.status,
                        newStatus: status,
                        updatedBy: userName,
                        taskLink: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard/projects/${task.projectId}?task=${taskId}`,
                    });
                }
            }

            // Email to project client about task progress
            if (eventConfig!.notifyClient && projectForNotif?.clientId) {
                const clientDoc = await ClientModel.findOne({ id: projectForNotif.clientId, agencyId: agency.id }).select('-password').lean();
                if (clientDoc?.email) {
                    await sendTaskStatusChangedEmail({
                        recipientEmail: clientDoc.email,
                        recipientName: clientDoc.name,
                        taskTitle: task.title,
                        oldStatus: task.status,
                        newStatus: status,
                        updatedBy: userName,
                        taskLink: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard/projects/${task.projectId}`,
                    });
                }
            }
        } catch (emailError) {
            console.error('[Email] Failed to send task status change email:', emailError);
        }
    }

    // Auto-complete project if all tasks are done
    if (status === 'Done') {
        const projectTasks = await TaskModel.find({ projectId: task.projectId, agencyId: agency.id }).lean();
        // Count tasks after the update (task.status is now Done)
        const remainingOpen = projectTasks.filter(t => t.id !== taskId && t.status !== 'Done');
        const allDone = remainingOpen.length === 0 && projectTasks.length > 0;

        if (allDone) {
            const project = await ProjectModel.findOne({ id: task.projectId, agencyId: agency.id }).lean();
            if (project && project.status === 'Active') {
                await ProjectModel.updateOne({ id: task.projectId, agencyId: agency.id }, { $set: { status: 'Completed' } });

                // Notify client
                if (project.clientId && await isNotifEnabled('project')) {
                    await NotificationModel.create({
                        id: generateId(), agencyId: agency.id, userId: project.clientId,
                        message: `Project "${project.name}" has been completed! All tasks are done.`,
                        read: false, timestamp: new Date().toISOString(),
                        link: `/dashboard/projects/${project.id}`
                    });
                }

                // Notify admins
                const admins = await UserModel.find({ agencyId: agency.id, role: 'admin' }).select('-password').lean();
                if (await isNotifEnabled('project')) {
                    await NotificationModel.insertMany(admins.map(admin => ({
                        id: generateId(), agencyId: agency.id, userId: admin.id,
                        message: `Project "${project.name}" auto-completed - all tasks done`,
                        read: false, timestamp: new Date().toISOString(),
                        link: `/dashboard/projects/${project.id}`
                    })));
                }

                // Email notification
                try {
                    const client = project.clientId ? await getClientById(project.clientId) : null;
                    const adminEmails = admins.map(u => u.email).filter(Boolean) as string[];
                    if (client?.email || adminEmails.length > 0) {
                        await sendProjectCompletedEmail({
                            clientEmail: client?.email || '',
                            adminEmails,
                            clientName: client?.name || '',
                            projectName: project.name,
                            projectLink: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard/projects/${project.id}`,
                        });
                    }
                } catch (emailError) {
                    console.error('[Email] Failed to send project completion email:', emailError);
                }
            }
        }
    }

    revalidatePath('/dashboard/projects/[id]', 'page');
    revalidatePath('/dashboard/projects');
}

export async function updateTask(taskId: string, updates: Partial<Task>) {
    await requireAuth();
    await connectDB();
    // Input sanitization
    updates = sanitizeUpdates(updates) as Partial<Task>;
    if (updates.title) updates.title = sanitizeName(updates.title, 500);
    if (updates.description) updates.description = sanitizeString(updates.description, 10000);
    const currentUser = await getCurrentUser();
    const agency = await getCurrentAgency();
    if (!agency) throw new Error('No agency context');

    const userName = currentUser ? currentUser.name : 'System';
    const userId = currentUser ? currentUser.id : 'system';
    const permissions = await getUserPermissions(userId);

    if (updates.status === 'Done' && !permissions.canMarkDone) {
        throw new Error('Unauthorized: You do not have permission to mark tasks as Done.');
    }
    const isStatusOnly = Object.keys(updates).length === 1 && updates.status;
    if (!isStatusOnly || (updates.status && updates.status !== 'Done')) {
        if (!permissions.canManageTasks) throw new Error('Unauthorized: You do not have permission to edit tasks.');
    }

    // Validation
    if (updates.projectId) {
        const projExists = await ProjectModel.exists({ id: updates.projectId, agencyId: agency.id });
        if (!projExists) throw new Error(`Project with ID ${updates.projectId} not found`);
    }
    if (updates.assigneeId) {
        const userExists = await UserModel.exists({ id: updates.assigneeId, agencyId: agency.id });
        if (!userExists) throw new Error(`User with ID ${updates.assigneeId} not found`);
    }

    const task = await TaskModel.findOne({ id: taskId, agencyId: agency.id }).lean();
    if (!task) throw new Error('Task not found');

    await TaskModel.updateOne({ id: taskId, agencyId: agency.id }, { $set: updates });

    // Auto-assign department to project if task category changes
    if (updates.category && task.projectId) {
        const service = await ServiceModel.findOne({
            agencyId: agency.id,
            $or: [{ name: updates.category }, { id: updates.category }]
        }).lean();
        const categoryIdOrName = service ? service.id : updates.category;
        await ProjectModel.updateOne(
            { id: task.projectId, agencyId: agency.id, services: { $ne: categoryIdOrName } },
            { $push: { services: categoryIdOrName } }
        );
    }

    // Activity log
    await ActivityModel.create({
        id: generateId(), agencyId: agency.id, user: userName, userId,
        action: 'updated task',
        target: updates.title || task.title,
        timestamp: new Date().toISOString()
    });

    revalidatePath('/dashboard/projects/[id]', 'page');
    revalidatePath('/dashboard/projects');
}

export async function addComment(taskId: string, userId: string, text: string, timestamp?: string) {
    const currentUser = await requireAuth();
    // Verify userId matches the authenticated user to prevent spoofing
    if (userId !== currentUser.id) {
        throw new Error('Unauthorized: You can only post comments as yourself.');
    }
    await connectDB();
    const agency = await getCurrentAgency();
    if (!agency) throw new Error('No agency context');
    // Input sanitization -- prevent XSS in comments
    text = sanitizeString(text, 5000);
    if (!text) throw new Error('Comment text is required');

    const newComment = {
        id: generateId(),
        userId,
        text,
        timestamp: timestamp || new Date().toISOString()
    };

    const task = await TaskModel.findOne({ id: taskId, agencyId: agency.id }).lean();
    if (!task) throw new Error('Task not found');

    // Append comment directly with $push -- no full read required
    await TaskModel.updateOne(
        { id: taskId, agencyId: agency.id },
        { $push: { comments: newComment } }
    );

    const commenter = await resolveUserOrClient(userId, agency.id);
    await ActivityModel.create({
        id: generateId(), agencyId: agency.id,
        user: commenter?.name || 'Unknown User', userId,
        action: 'commented on task',
        target: task.title,
        timestamp: new Date().toISOString()
    });

    // Send email notification to task participants (gated by task updates category)
    const emailCats = agency.settings?.emailCategories || {} as any;
    const shouldSendTaskEmail = emailCats.taskUpdates !== false;

    if (shouldSendTaskEmail) {
        try {
            const commenterUser = await getUser(userId);
            if (task && commenterUser) {
                const participantIds = new Set<string>();
                if (task.assigneeId) participantIds.add(task.assigneeId);
                if (task.createdBy) participantIds.add(task.createdBy);
                task.comments?.forEach(c => participantIds.add(c.userId));
                participantIds.delete(userId);

                const participantEmails: string[] = [];
                for (const pid of participantIds) {
                    const user = await getUser(pid);
                    if (user?.email) participantEmails.push(user.email);
                }

                if (participantEmails.length > 0) {
                    await sendTaskCommentEmail({
                        recipientEmails: participantEmails,
                        taskTitle: task.title,
                        commenterName: commenterUser.name,
                        commentText: text,
                        taskLink: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard/projects/${task.projectId}?task=${taskId}`,
                    });
                }
            }
        } catch (emailError) {
            console.error('[Email] Failed to send task comment email:', emailError);
        }
    }

    // In-app notifications for task comment -- notify all participants except commenter
    try {
        if (await isNotifEnabled('task')) {
            const participantIds = new Set<string>();
            if (task.assigneeId) participantIds.add(task.assigneeId);
            if (task.createdBy) participantIds.add(task.createdBy);
            task.comments?.forEach(c => participantIds.add(c.userId));
            participantIds.delete(userId);

            if (participantIds.size > 0) {
                const commenterDoc = await getUser(userId);
                const commenterName = commenterDoc?.name || 'Someone';
                await NotificationModel.insertMany([...participantIds].map(pid => ({
                    id: generateId(), agencyId: agency.id, userId: pid,
                    message: `${commenterName} commented on "${task.title}": ${text.substring(0, 80)}${text.length > 80 ? '...' : ''}`,
                    read: false, timestamp: new Date().toISOString(),
                    link: `/dashboard/projects/${task.projectId}?task=${taskId}`
                })));
            }
        }
    } catch (notifError) {
        console.error('[Notification] Failed to create comment notifications:', notifError);
    }

    // Mention-specific notifications — notify mentioned users who are NOT already task participants
    try {
        const mentionedIds = extractMentionedUserIds(text);
        const filteredMentionIds = mentionedIds.filter(id => id !== userId);
        if (filteredMentionIds.length > 0 && await isNotifEnabled('task')) {
            // Build set of already-notified participants
            const alreadyNotified = new Set<string>();
            if (task.assigneeId) alreadyNotified.add(task.assigneeId);
            if (task.createdBy) alreadyNotified.add(task.createdBy);
            task.comments?.forEach(c => alreadyNotified.add(c.userId));
            alreadyNotified.delete(userId);

            const newMentionIds = filteredMentionIds.filter(id => !alreadyNotified.has(id));
            if (newMentionIds.length > 0) {
                // Validate mentioned users belong to this agency
                const validUsers = await UserModel.find({ id: { $in: newMentionIds }, agencyId: agency.id }).select('id').lean();
                const validIds = new Set(validUsers.map((u: any) => u.id));
                const verifiedIds = newMentionIds.filter(id => validIds.has(id));

                if (verifiedIds.length > 0) {
                    const commenterDoc = await getUser(userId);
                    const commenterName = commenterDoc?.name || 'Someone';
                    await NotificationModel.insertMany(verifiedIds.map(mid => ({
                        id: generateId(), agencyId: agency.id, userId: mid,
                        message: `${commenterName} mentioned you in a comment on "${task.title}"`,
                        read: false, timestamp: new Date().toISOString(),
                        link: `/dashboard/projects/${task.projectId}?task=${taskId}`
                    })));
                }
            }
        }
    } catch (mentionError) {
        console.error('[Notification] Failed to create mention notifications:', mentionError);
    }

    revalidatePath('/dashboard/projects/[id]', 'page');
    revalidatePath('/dashboard/projects');
    return newComment;
}


export async function createTask(task: Omit<Task, "id" | "agencyId">) {
    await requireRole('admin', 'manager');
    await connectDB();
    const currentUser = await getCurrentUser();
    const agency = await getCurrentAgency();
    if (!agency) throw new Error('No agency context');
    // Input sanitization
    task = sanitizeMongoInput(task);
    task.title = sanitizeName(task.title, 500);
    if (!task.title) throw new Error('Task title is required');
    if (task.description) task.description = sanitizeString(task.description, 10000);

    const newTask = {
        ...task,
        id: generateId(),
        agencyId: agency.id,
        createdAt: new Date().toISOString(),
        createdBy: currentUser ? currentUser.id : 'system',
        comments: []
    } as unknown as Task;

    await TaskModel.create(newTask);

    // Activity log
    await ActivityModel.create({
        id: generateId(),
        agencyId: agency.id,
        user: currentUser ? currentUser.name : 'System',
        userId: currentUser ? currentUser.id : 'system',
        action: 'created task',
        target: task.title,
        timestamp: new Date().toISOString()
    });

    // Send email notification for task creation (gated by event settings)
    const emailCats = agency.settings?.emailCategories || {} as any;
    const taskEmailEvents = emailCats.taskEmailEvents || {};
    const createdEventConfig = { ...DEFAULT_TASK_EMAIL_EVENTS.taskCreated, ...taskEmailEvents.taskCreated };
    const shouldSendTaskEmail = emailCats.taskUpdates !== false && createdEventConfig.enabled;

    if (shouldSendTaskEmail) {
        try {
            const assignee = task.assigneeId ? await getUser(task.assigneeId) : null;
            const project = await getProject(task.projectId);

            // Email to assignee
            if (createdEventConfig.notifyAssignee && task.assigneeId && assignee?.email && project) {
                await sendTaskAssignedEmail({
                    assigneeEmail: assignee.email,
                    assigneeName: assignee.name,
                    taskTitle: task.title,
                    taskDescription: task.description || '',
                    projectName: project.name,
                    dueDate: task.dueDate || '',
                    priority: task.priority || 'Medium',
                    taskLink: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard/projects/${task.projectId}?task=${newTask.id}`,
                });
            }

            // Email to project client
            if (createdEventConfig.notifyClient && project?.clientId) {
                const clientDoc = await ClientModel.findOne({ id: project.clientId, agencyId: agency.id }).select('-password').lean() as any;
                if (clientDoc?.email) {
                    await sendTaskAssignedEmail({
                        assigneeEmail: clientDoc.email,
                        assigneeName: clientDoc.name,
                        taskTitle: task.title,
                        taskDescription: task.description || '',
                        projectName: project.name,
                        dueDate: task.dueDate || '',
                        priority: task.priority || 'Medium',
                        taskLink: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard/projects/${task.projectId}?task=${newTask.id}`,
                    });
                }
            }
        } catch (emailError) {
            console.error('[Email] Failed to send task creation email:', emailError);
        }
    }

    // In-app notification for task assignment
    if (task.assigneeId && await isNotifEnabled('task')) {
        await NotificationModel.create({
            id: generateId(), agencyId: agency.id, userId: task.assigneeId,
            message: `You've been assigned a new task: "${task.title}"`,
            read: false, timestamp: new Date().toISOString(),
            link: `/dashboard/projects/${task.projectId}?task=${newTask.id}`
        });
    }

    // Notify admins about new task creation (exclude the creator)
    const adminsForNewTask = await UserModel.find({ agencyId: agency.id, role: { $in: ['admin', 'manager'] } }).select('-password').lean();
    const creatorId = currentUser ? currentUser.id : 'system';
    const creatorName = currentUser ? currentUser.name : 'System';
    const adminNewTaskNotifs = adminsForNewTask
        .filter((a: any) => a.id !== creatorId)
        .map((admin: any) => ({
            id: generateId(), agencyId: agency.id, userId: admin.id,
            message: `${creatorName} created a new task: "${task.title}"`,
            read: false, timestamp: new Date().toISOString(),
            link: `/dashboard/projects/${task.projectId}?task=${newTask.id}`
        }));
    if (adminNewTaskNotifs.length > 0 && await isNotifEnabled('task')) await NotificationModel.insertMany(adminNewTaskNotifs);

    revalidatePath('/dashboard/projects/[id]', 'page');
    revalidatePath('/dashboard/projects');
    return sanitizeDoc(newTask);
}


// --- Client Actions ---

export async function getClients() {
    await requireAuth();
    await connectDB();
    const agency = await getCurrentAgency();
    const clients = await ClientModel.find({ agencyId: agency?.id, archived: { $ne: true } }).select('-password').lean();
    return clients.map(sanitizeDoc);
}

export async function getClientByUsername(username: string) {
    await requireAuth();
    await connectDB();
    const agency = await getCurrentAgency();
    const client = await ClientModel.findOne({
        agencyId: agency?.id,
        $or: [{ username }, { id: username }]
    }).select('-password').lean();
    return client ? sanitizeDoc(client) : null;
}

export async function getClientById(id: string) {
    await requireAuth();
    await connectDB();
    const agency = await getCurrentAgency();
    const client = await ClientModel.findOne({ id, agencyId: agency?.id }).select('-password').lean();
    return client ? sanitizeDoc(client) : null;
}

export async function createClient(client: Omit<Client, "id" | "agencyId">) {
    const currentUser = await getCurrentUser();
    if (!currentUser || (currentUser.role !== 'admin' && currentUser.role !== 'manager')) {
        throw new Error("Unauthorized: Only Admins can create clients.");
    }
    // Input sanitization
    client = sanitizeMongoInput(client);
    client.name = sanitizeName(client.name);
    if (!client.name) throw new Error('Client name is required');
    client.companyName = sanitizeName(client.companyName);
    if (!client.companyName) throw new Error('Company name is required');
    if (client.email) client.email = validateEmail(client.email);
    if (client.phone) client.phone = sanitizePhone(client.phone);
    if (client.password) await validatePasswordWithPolicy(client.password);

    // Generate username if not provided
    let username = client.username ? sanitizeUsername(client.username) : '';
    if (!username) {
        username = client.companyName.toLowerCase().replace(/[^a-z0-9]+/g, '');
    }

    // Ensure username uniqueness via DB
    await connectDB();
    const agencyCtx = await getCurrentAgency();

    // Plan limit check
    if (agencyCtx) {
        const clientLimit = await checkAgencyLimit(agencyCtx.id, 'clients');
        if (!clientLimit.allowed) throw new Error(`Plan limit reached: your plan allows ${clientLimit.limit} clients (currently ${clientLimit.current}).`);
    }

    const agencyFilter2 = agencyCtx ? { agencyId: agencyCtx.id } : {};
    let uniqueUsername = username;
    let counter = 1;
    while (
        await UserModel.exists({ username: uniqueUsername, ...agencyFilter2 }) ||
        await ClientModel.exists({ username: uniqueUsername, ...agencyFilter2 })
    ) {
        uniqueUsername = `${username}${counter}`;
        counter++;
    }

    const newClient: Client = await withAgencyId({
        ...client,
        id: generateId(),
        username: uniqueUsername,
        lastActiveAt: new Date().toISOString()
    });

    if (!newClient.logo) {
        newClient.logo = `https://api.dicebear.com/7.x/initials/svg?seed=${newClient.companyName}`;
    }
    // Hash password before storing
    if (newClient.password) {
        newClient.password = await hashPassword(newClient.password);
    }

    try {
        await ClientModel.create(newClient);
    } catch (err: any) {
        // Handle duplicate username race condition
        if (err?.code === 11000 && err?.keyPattern?.username) {
            let retryUsername = uniqueUsername;
            let retryCounter = counter;
            for (let i = 0; i < 5; i++) {
                retryUsername = `${username}${retryCounter}`;
                retryCounter++;
                newClient.username = retryUsername;
                try {
                    await ClientModel.create(newClient);
                    break;
                } catch (retryErr: any) {
                    if (retryErr?.code !== 11000 || i === 4) throw retryErr;
                }
            }
        } else {
            throw err;
        }
    }

    // Increment agency usage counter for clients
    if (agencyCtx) await incrementAgencyUsage(agencyCtx.id, 'clients');

    // Send welcome email to client
    try {
        const agency = await getCurrentAgency();

        if (newClient.email) {
            await sendClientAccountCreatedEmail({
                clientEmail: newClient.email,
                clientName: newClient.name,
                companyName: newClient.companyName,
                username: newClient.username || '',
                dashboardLink: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard`,
                agencyName: agency?.name || 'Agency',
            });
        }
    } catch (emailError) {
        console.error('[Email] Failed to send client account creation email:', emailError);
    }

    // Welcome in-app notification for client
    try {
        if (await isNotifEnabled('welcome')) {
            const agency = await getCurrentAgency();
            await NotificationModel.create({
                id: generateId(), agencyId: agency?.id, userId: newClient.id,
                message: `Welcome, ${newClient.name}! Your client portal is ready. Check your projects and invoices here.`,
                read: false, timestamp: new Date().toISOString(),
                link: '/dashboard'
            });
        }
    } catch (notifError) {
        console.error('[Notification] Failed to create client welcome notification:', notifError);
    }

    revalidatePath('/dashboard/clients');
    revalidatePath('/dashboard/team'); // In case they appear there too
    return newClient;
}

export async function updateClient(id: string, updates: Partial<Client>) {
    await connectDB();
    const currentUser = await getCurrentUser();
    if (!currentUser || (currentUser.role !== 'admin' && currentUser.role !== 'manager')) {
        throw new Error('Unauthorized');
    }
    // Input sanitization
    updates = sanitizeUpdates(updates) as Partial<Client>;
    if (updates.name) updates.name = sanitizeName(updates.name);
    if (updates.companyName) updates.companyName = sanitizeName(updates.companyName);
    if (updates.email) updates.email = validateEmail(updates.email);
    if (updates.phone) updates.phone = sanitizePhone(updates.phone);
    if (updates.username) updates.username = sanitizeUsername(updates.username);
    const agency = await getCurrentAgency();

    // Propagate client name change to projects that display this client's name
    if (updates.name) {
        const oldClient = await ClientModel.findOne({ id, agencyId: agency?.id }).select('name').lean();
        const oldName = (oldClient as any)?.name;
        if (oldName && oldName !== updates.name) {
            await ProjectModel.updateMany(
                { clientId: id, agencyId: agency?.id },
                { $set: { client: updates.name } }
            );
        }
    }

    await ClientModel.updateOne(
        { id, agencyId: agency?.id },
        { $set: { ...updates, updatedAt: new Date().toISOString() } }
    );
    revalidatePath('/dashboard/clients');
    revalidatePath(`/dashboard/clients/${id}`);
    revalidatePath('/dashboard/projects');
}




// Project Actions
export async function updateProject(id: string, updates: Partial<Project>) {
    await requireRole('admin', 'manager');
    await connectDB();
    // Input sanitization
    updates = sanitizeUpdates(updates) as Partial<Project>;
    if (updates.name) updates.name = sanitizeName(updates.name, 300);
    if ((updates as any).description) (updates as any).description = sanitizeString((updates as any).description, 10000);
    const agency = await getCurrentAgency();
    const oldProject = await ProjectModel.findOne({ id, agencyId: agency?.id }).lean();

    // Validation: warn if completing with open tasks
    if (updates.status === 'Completed') {
        const openCount = await TaskModel.countDocuments({ projectId: id, agencyId: agency?.id, status: { $ne: 'Done' } });
        if (openCount > 0) console.warn(`Warning: Marking project as Completed with ${openCount} unfinished tasks.`);
    }

    await ProjectModel.updateOne({ id, agencyId: agency?.id }, { $set: updates });

    // Notify client on status change
    if (updates.status && oldProject && (oldProject as any).status !== updates.status && (oldProject as any).clientId && await isNotifEnabled('project')) {
        const statusMessages: Record<string, string> = {
            'Active': 'is now active and in progress',
            'Completed': 'has been completed',
            'On Hold': 'has been put on hold',
            'Cancelled': 'has been cancelled'
        };
        await NotificationModel.create({
            id: generateId(), agencyId: agency?.id, userId: (oldProject as any).clientId,
            message: `Project "${(oldProject as any).name}" ${statusMessages[updates.status] || `status updated to ${updates.status}`}`,
            read: false, timestamp: new Date().toISOString(),
            link: `/dashboard/projects/${id}`
        });
    }

    // Send email notification for status change
    if (updates.status && oldProject && oldProject.status !== updates.status && oldProject.clientId) {
        try {
            const client = await getClientById(oldProject.clientId);
            if (client?.email) {
                const statusMessages: Record<string, string> = {
                    'Active': 'is now active and in progress',
                    'Completed': 'has been completed',
                    'On Hold': 'has been put on hold',
                    'Cancelled': 'has been cancelled'
                };

                await sendProjectStatusChangedEmail({
                    clientEmail: client.email,
                    clientName: client.name,
                    projectName: oldProject.name,
                    oldStatus: oldProject.status,
                    newStatus: updates.status,
                    statusMessage: statusMessages[updates.status] || `status updated to ${updates.status}`,
                    projectLink: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard/projects/${id}`,
                });
            }
        } catch (emailError) {
            console.error('[Email] Failed to send project status change email:', emailError);
        }
    }

    revalidatePath('/dashboard/projects');
    revalidatePath(`/dashboard/projects/${id}`);
}

export async function verifyAdminPassword(password: string): Promise<boolean> {
    const currentUser = await getCurrentUser();
    if (!currentUser) return false;
    if (currentUser.role !== 'admin' && currentUser.role !== 'manager') return false;

    await connectDB();
    const user = await UserModel.findOne({ id: currentUser.id }).lean();
    if (!user?.password) return false;

    return comparePassword(password, user.password);
}

export async function deleteProject(id: string, password: string) {
    await requireRole('admin');
    await connectDB();
    const isValid = await verifyAdminPassword(password);
    if (!isValid) throw new Error('Invalid password');
    const agency = await getCurrentAgency();

    // Clean up uploaded files from blob storage (Vercel Blob + Azure) before removing DB records
    try {
        const assets = await AssetModel.find({ projectId: id, agencyId: agency?.id }).select('url size').lean();
        if (assets.length > 0) {
            const { deleteFile } = await import('@/lib/storage');
            const BATCH_SIZE = 10;
            let totalBytesFreed = 0;
            for (let i = 0; i < assets.length; i += BATCH_SIZE) {
                const batch = assets.slice(i, i + BATCH_SIZE);
                await Promise.allSettled(
                    batch.map((asset: any) => asset.url ? deleteFile(asset.url) : Promise.resolve())
                );
            }
            // Calculate total storage to decrement
            for (const asset of assets) {
                const sizeStr = String((asset as any).size || '');
                const sizeMatch = sizeStr.match(/([\d.]+)\s*(KB|MB|GB|B)/i);
                if (sizeMatch) {
                    const num = parseFloat(sizeMatch[1]);
                    const unit = sizeMatch[2].toUpperCase();
                    totalBytesFreed += unit === 'GB' ? num * 1073741824 : unit === 'MB' ? num * 1048576 : unit === 'KB' ? num * 1024 : num;
                }
            }
            if (totalBytesFreed > 0 && agency) {
                await AgencyModel.updateOne({ id: agency.id }, { $inc: { 'usage.storage': -Math.round(totalBytesFreed) } });
            }
            console.log(`[deleteProject] Cleaned up ${assets.length} files from storage`);
        }
    } catch (storageErr) {
        console.error('[deleteProject] Storage cleanup error (proceeding with DB deletion):', storageErr);
    }

    // Delete project and ALL related data atomically
    await Promise.all([
        ProjectModel.deleteOne({ id, agencyId: agency?.id }),
        TaskModel.deleteMany({ projectId: id, agencyId: agency?.id }),
        AssetModel.deleteMany({ projectId: id, agencyId: agency?.id }),
        InvoiceModel.deleteMany({ projectId: id, agencyId: agency?.id }),
        TransactionModel.deleteMany({ projectId: id, agencyId: agency?.id }),
        ActivityModel.deleteMany({ target: id, agencyId: agency?.id }),
        NotificationModel.deleteMany({ agencyId: agency?.id, link: { $regex: id } }),
    ]);
    // Decrement agency usage counter
    if (agency) await decrementAgencyUsage(agency.id, 'projects');

    revalidatePath('/dashboard/projects');
    return true;
}

// ----------------------------------------------------------------------
// Finance Actions
// ----------------------------------------------------------------------


export async function getTransactions(projectId?: string, userId?: string, category?: string) {
    await requireAuth();
    await connectDB();
    const agency = await getCurrentAgency();
    const agencyFilter = requireAgencyFilter(agency);
    const query: any = { ...agencyFilter };
    if (projectId) query.projectId = projectId;
    if (category) query.category = category;

    // Client scoping: only show transactions for their projects
    const currentUserId = await getSessionId();
    if (currentUserId) {
        const currentUser = await getCurrentUser();
        if (currentUser?.role === 'client') {
            const clientProjectIds = await ProjectModel.distinct('id', { clientId: currentUserId, ...agencyFilter });
            query.projectId = { $in: clientProjectIds };
        }
    }

    // userId filter: use the userId DB field directly for reliable matching
    if (userId) {
        const user = await UserModel.findOne({ id: userId, ...agencyFilter }).select('-password').lean() as any;
        if (user) {
            const lower = user.name.toLowerCase();
            // Primary: filter by userId field (set for Salary, Freelancer, Reimbursement, Internal Transfer)
            // Fallback: also include description matches for legacy/Investor transactions
            const withUserId = await TransactionModel.find({ ...query, userId }).lean();
            const withoutUserId = await TransactionModel.find({ ...query, $or: [{ userId: { $exists: false } }, { userId: null }, { userId: '' }] }).lean();
            const descMatches = withoutUserId.filter((t: any) => t.description?.toLowerCase().includes(lower));
            const seen = new Set(withUserId.map((t: any) => t.id));
            const merged = [...withUserId, ...descMatches.filter((t: any) => !seen.has(t.id))];
            return merged
                .map(sanitizeDoc)
                .sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());
        }
    }

    const transactions = await TransactionModel.find(query).lean();
    return transactions
        .map(sanitizeDoc)
        .sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

export async function getClientFinanceData(clientId: string) {
    await requireAuth();
    await connectDB();
    const agency = await getCurrentAgency();
    const agencyFilter = requireAgencyFilter(agency);
    const clientProjectIds = await ProjectModel.distinct('id', { clientId, ...agencyFilter });

    const [invoices, transactions] = await Promise.all([
        InvoiceModel.find({ projectId: { $in: clientProjectIds }, ...agencyFilter }).lean(),
        TransactionModel.find({ projectId: { $in: clientProjectIds }, ...agencyFilter }).lean()
    ]);

    const totalInvoiced = invoices.reduce((acc: number, i: any) => acc + i.amount, 0);
    const totalPaid = transactions.filter((t: any) => t.type === 'income' && t.status === 'completed').reduce((acc: number, t: any) => acc + t.amount, 0);
    const pendingAmount = invoices.filter((i: any) => ['Pending', 'Processing', 'Overdue'].includes(i.status)).reduce((acc: number, i: any) => acc + i.amount, 0);
    const totalRefunds = transactions.filter((t: any) => t.type === 'expense' && t.category === 'Refund' && t.status === 'completed').reduce((acc: number, t: any) => acc + t.amount, 0);
    const netPaid = totalPaid - totalRefunds;

    return {
        invoices: invoices.map(sanitizeDoc).sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime()),
        transactions: transactions.map(sanitizeDoc).sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime()),
        stats: { totalInvoiced, totalPaid, pendingAmount, ltv: netPaid }
    };
}

export async function getClientActivityLogs(clientId: string, limit = 20) {
    await requireAuth();
    await connectDB();
    const agency = await getCurrentAgency();
    const acts = await ActivityModel.find({ userId: clientId, agencyId: agency?.id })
        .sort({ timestamp: -1 }).limit(limit).lean();
    return acts.map(sanitizeDoc);
}

export async function getCategoryMemberSummary(category: string) {
    await requireRole('admin', 'manager');
    await connectDB();
    const agency = await getCurrentAgency();
    const agencyFilter = requireAgencyFilter(agency);
    const transactions = await TransactionModel.find({ category, ...agencyFilter }).lean() as any[];

    const summaryMap = new Map<string, { id: string; name: string; total: number; count: number; avatar?: string }>();

    if (category === 'Internal Transfer') {
        const users = await UserModel.find(agencyFilter).select('-password').lean() as any[];
        transactions.forEach((t: any) => {
            const user = users.find((u: any) => t.description?.toLowerCase().includes(u.name.toLowerCase()));
            if (user) {
                const existing = summaryMap.get(user.id) || { id: user.id, name: user.name, total: 0, count: 0, avatar: user.avatar };
                existing.total += t.amount; existing.count += 1;
                summaryMap.set(user.id, existing);
            } else {
                const existing = summaryMap.get('unknown') || { id: 'unknown', name: 'Unknown', total: 0, count: 0 };
                existing.total += t.amount; existing.count += 1;
                summaryMap.set('unknown', existing);
            }
        });
    } else if (category === 'Investor') {
        transactions.forEach((t: any) => {
            const name = t.description;
            const existing = summaryMap.get(name) || { id: name, name, total: 0, count: 0 };
            existing.total += t.amount; existing.count += 1;
            summaryMap.set(name, existing);
        });
    }

    return Array.from(summaryMap.values()).sort((a, b) => b.total - a.total);
}


export async function createTransaction(transaction: Omit<Transaction, "id" | "status" | "agencyId"> & { status?: Transaction['status'] }) {
    await requireRole('admin', 'manager');
    // Input sanitization
    transaction = sanitizeMongoInput(transaction);
    if (transaction.description) transaction.description = sanitizeString(transaction.description, 2000);
    // STRICT SERVER-SIDE VALIDATION
    // BUG-046/265: Strict amount validation (NaN, negative, max)
    if (!transaction.amount || !Number.isFinite(transaction.amount) || transaction.amount <= 0) {
        throw new Error("Validation Error: Amount must be a valid positive number.");
    }
    if (transaction.amount > 100_000_000) {
        throw new Error("Validation Error: Amount exceeds maximum allowed value.");
    }
    if (transaction.category === 'Project' && !transaction.projectId) {
        throw new Error("Validation Error: Projects must have a Project ID.");
    }
    if (transaction.category === 'Salary' && transaction.type !== 'expense') {
        // Auto-correct or Throw? Throwing is safer for strictness, but let's correct it to be helpful or throw if ambiguous.
        // Let's force it to expense to be safe, or throw if logic is broken.
        // User requested strict "depended on", so let's enforce.
        throw new Error("Validation Error: Salary must be an Expense.");
    }
    if (transaction.category === 'Refund' && transaction.type !== 'expense') {
        throw new Error("Validation Error: Refund must be an Expense.");
    }
    if (transaction.category === 'Refund' && !transaction.projectId) {
        throw new Error("Validation Error: Refunds must have a Project ID.");
    }
    // Note: 'Other' can be either income or expense
    if (transaction.category === 'Freelancer' && transaction.type !== 'expense') {
        throw new Error("Validation Error: Freelancer payments must be an Expense.");
    }
    if (transaction.category === 'Tax' && transaction.type !== 'expense') {
        throw new Error("Validation Error: Tax payments must be an Expense.");
    }
    if (transaction.category === 'Reimbursement' && transaction.type !== 'expense') {
        throw new Error("Validation Error: Reimbursements must be an Expense.");
    }
    if (transaction.category === 'Retainer') {
        if (transaction.type !== 'income') throw new Error("Validation Error: Retainer must be Income.");
        if (!transaction.projectId) throw new Error("Validation Error: Retainer must be linked to a Project.");
    }

    // Note: Internal Transfer checks are harder without memberId in transaction object,
    // but the modal handles the description/type logic. We assume if category is Internal Transfer,
    // dependencies were met by client. Ideally we'd add memberId to schema for strict server check.


    await connectDB();
    const agency = await getCurrentAgency();
    const currentUser = await getCurrentUser();

    // Validate project exists if provided
    if (transaction.projectId) {
        const projectExists = await ProjectModel.exists({ id: transaction.projectId, agencyId: agency?.id });
        if (!projectExists) throw new Error(`Project with ID ${transaction.projectId} not found`);
    }

    // BUG-291: Add performedBy audit trail
    if (!agency?.id) throw new Error('Agency context required');
    const newTransaction: Transaction = {
        ...transaction, id: generateId(),
        status: transaction.status || 'completed', agencyId: agency.id,
        ...(currentUser ? { performedBy: currentUser.id } : {}),
    } as Transaction;
    await TransactionModel.create(newTransaction);


    // Salary notification + email
    if (newTransaction.category === 'Salary' && newTransaction.userId && newTransaction.type === 'expense') {
        if (await isNotifEnabled('salary')) {
            await NotificationModel.create({
                id: generateId(), agencyId: agency?.id, userId: newTransaction.userId,
                message: `Salary Payment Received: ${formatCurrency(newTransaction.amount, await getDefaultCurrency())} `,
                read: false, timestamp: new Date().toISOString(), link: '/dashboard/finance'
            });
        }
        try {
            const employee = await UserModel.findOne({ id: newTransaction.userId, agencyId: agency?.id }).select('-password').lean();
            if ((employee as any)?.email) {
                await sendSalaryPaidEmail({
                    employeeEmail: (employee as any).email, employeeName: (employee as any).name,
                    amount: newTransaction.amount,
                    month: new Date().toLocaleString('default', { month: 'long', year: 'numeric' }),
                    paymentDate: newTransaction.date,
                    financeLink: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard/finance`,
                });
            }
        } catch (emailError) {
            console.error('[Email] Failed to send salary payment email:', emailError);
        }
    }

    revalidatePath('/dashboard/finance');
    if (transaction.projectId) {
        revalidatePath(`/dashboard/projects/${transaction.projectId}`);
    }
    return newTransaction;
}

export async function markTransactionAsPaid(transactionId: string) {
    const currentUser = await getCurrentUser();
    if (!currentUser || (currentUser.role !== 'admin' && currentUser.role !== 'manager')) {
        throw new Error("Unauthorized: Only Admins can mark transactions as paid.");
    }

    await connectDB();
    const agency = await getCurrentAgency();
    const transaction = await TransactionModel.findOne({ id: transactionId, agencyId: agency?.id }).lean();
    if (!transaction) throw new Error('Transaction not found');
    if ((transaction as any).status === 'completed') throw new Error('Transaction is already active/completed');
    await TransactionModel.updateOne({ id: transactionId, agencyId: agency?.id }, { $set: { status: 'completed' } });
    revalidatePath('/dashboard/finance');
}


export async function getInvoices(projectId?: string) {
    await requireAuth();
    await connectDB();
    const agency = await getCurrentAgency();
    const agencyFilter = requireAgencyFilter(agency);
    const query: any = { ...agencyFilter };
    if (projectId) query.projectId = projectId;

    const currentUserId = await getSessionId();
    if (currentUserId) {
        const currentUser = await getCurrentUser();
        if (currentUser?.role === 'client') {
            const clientProjectIds = await ProjectModel.distinct('id', { clientId: currentUserId, ...agencyFilter });
            query.projectId = { $in: clientProjectIds };
        }
    }

    const invoices = await InvoiceModel.find(query).lean();
    return invoices.map(sanitizeDoc).sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

// Client marks invoice as paid (moves to Processing status)
export async function clientMarkInvoiceAsPaid(invoiceId: string) {
    await connectDB();
    const currentUser = await getCurrentUser();
    if (!currentUser || currentUser.role !== 'client') throw new Error('Unauthorized: Only clients can mark invoices as paid');
    const agency = await getCurrentAgency();
    if (!agency) throw new Error('No agency context');

    const invoice = await InvoiceModel.findOne({ id: invoiceId, agencyId: agency.id }).lean();
    if (!invoice) throw new Error('Invoice not found');

    const project = await ProjectModel.findOne({ id: invoice.projectId, agencyId: agency.id }).lean();
    if (!project || (project as any).clientId !== currentUser.id) throw new Error("Unauthorized: This invoice doesn't belong to you");
    if (invoice.status !== 'Pending') throw new Error(`Cannot mark ${invoice.status} invoice as paid`);

    await InvoiceModel.updateOne({ id: invoiceId, agencyId: agency.id }, { $set: { status: 'Processing' } });

    // Notify admins
    const admins = await UserModel.find({ agencyId: agency.id, role: 'admin' }).select('-password').lean();
    const _cur = await getDefaultCurrency();
    if (await isNotifEnabled('invoice')) {
        await NotificationModel.insertMany(admins.map(admin => ({
            id: generateId(), agencyId: agency.id, userId: admin.id,
            message: `${currentUser.name} marked invoice ${formatCurrency(invoice.amount, _cur)} as paid - Awaiting approval`,
            read: false, timestamp: new Date().toISOString(), link: '/dashboard/finance'
        })));
    }

    // Email admins (use already-fetched admins list)
    try {
        const adminEmails = admins.map((u: any) => u.email).filter(Boolean) as string[];
        const project = await getProject(invoice.projectId);

        if (adminEmails.length > 0 && project) {
            await sendPaymentPendingApprovalEmail({
                adminEmails,
                clientName: currentUser.name,
                amount: invoice.amount,
                projectName: project.name,
                financeLink: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard/finance`,
            });
        }
    } catch (emailError) {
        console.error('[Email] Failed to send payment pending approval email:', emailError);
    }

    revalidatePath('/dashboard/finance');
}

// Admin approves payment (moves to Paid status and creates transaction)
export async function adminApproveInvoicePayment(invoiceId: string) {
    await connectDB();
    const currentUser = await getCurrentUser();
    if (!currentUser || currentUser.role !== 'admin') throw new Error('Unauthorized: Only admins can approve payments');
    const agency = await getCurrentAgency();
    if (!agency) throw new Error('No agency context');

    const invoice = await InvoiceModel.findOne({ id: invoiceId, agencyId: agency.id }).lean();
    if (!invoice) throw new Error('Invoice not found');
    if (invoice.status !== 'Processing') throw new Error(`Can only approve Processing invoices, this is ${invoice.status} `);

    // Calculate installment number for description
    const projectInvoices = await InvoiceModel.find({ projectId: invoice.projectId, agencyId: agency.id })
        .sort({ date: 1 }).lean();
    const installmentIndex = projectInvoices.findIndex(i => i.id === invoiceId);
    const installmentNumber = installmentIndex !== -1 ? installmentIndex + 1 : '?';
    const totalInstallments = projectInvoices.length;

    const project = await ProjectModel.findOne({ id: invoice.projectId, agencyId: agency.id }).lean();
    const description = `Installment ${installmentNumber}/${totalInstallments} for ${(project as any)?.name || 'Project'} - ${invoice.date}`;

    // Update invoice to Paid and create income transaction
    await InvoiceModel.updateOne({ id: invoiceId, agencyId: agency.id }, { $set: { status: 'Paid' } });
    const newTransaction = {
        id: generateId(), agencyId: agency.id,
        date: new Date().toISOString().split('T')[0],
        amount: invoice.amount, type: 'income' as const, category: 'Project' as const,
        description, status: 'completed' as const,
        projectId: invoice.projectId, invoiceId: invoice.id
    };
    await TransactionModel.create(newTransaction);

    // Notify client
    if ((project as any)?.clientId && await isNotifEnabled('invoice')) {
        await NotificationModel.create({
            id: generateId(), agencyId: agency.id, userId: (project as any).clientId,
            message: `Payment approved! ${formatCurrency(invoice.amount, await getDefaultCurrency())} received for ${(project as any).name}`,
            read: false, timestamp: new Date().toISOString(), link: '/dashboard/finance'
        });
    }

    // Email client
    try {
        if ((project as any)?.clientId) {
            const client = await getClientById((project as any).clientId);
            if (client?.email) {
                await sendPaymentApprovedEmail({
                    clientEmail: client.email, clientName: client.name, amount: invoice.amount,
                    projectName: (project as any).name,
                    financeLink: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard/finance`,
                });
            }
        }
    } catch (emailError) {
        console.error('[Email] Failed to send payment approved email:', emailError);
    }

    revalidatePath('/dashboard/finance');
}

// Admin rejects payment (moves back to Pending status)
export async function adminRejectInvoicePayment(invoiceId: string, reason?: string) {
    await connectDB();
    const currentUser = await getCurrentUser();
    if (!currentUser || currentUser.role !== 'admin') throw new Error('Unauthorized: Only admins can reject payments');
    // Input sanitization
    if (reason) reason = sanitizeString(reason, 1000);
    const agency = await getCurrentAgency();
    if (!agency) throw new Error('No agency context');

    const invoice = await InvoiceModel.findOne({ id: invoiceId, agencyId: agency.id }).lean();
    if (!invoice) throw new Error('Invoice not found');
    if (invoice.status !== 'Processing') throw new Error(`Can only reject Processing invoices, this is ${invoice.status}`);

    await InvoiceModel.updateOne({ id: invoiceId, agencyId: agency.id }, { $set: { status: 'Pending' } });

    const project = await ProjectModel.findOne({ id: invoice.projectId, agencyId: agency.id }).lean();
    if ((project as any)?.clientId && await isNotifEnabled('invoice')) {
        const message = reason
            ? `Payment rejected: ${reason}. Please mark as paid again.`
            : `Payment rejected for ${formatCurrency(invoice.amount, await getDefaultCurrency())}. Please mark as paid again.`;
        await NotificationModel.create({
            id: generateId(), agencyId: agency.id, userId: (project as any).clientId,
            message, read: false, timestamp: new Date().toISOString(), link: '/dashboard/finance'
        });
    }

    // Email client
    try {
        if ((project as any)?.clientId) {
            const client = await getClientById((project as any).clientId);
            if (client?.email) {
                await sendPaymentRejectedEmail({
                    clientEmail: client.email, clientName: client.name, amount: invoice.amount,
                    projectName: (project as any).name, rejectionReason: reason,
                    financeLink: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard/finance`,
                });
            }
        }
    } catch (emailError) {
        console.error('[Email] Failed to send payment rejected email:', emailError);
    }

    revalidatePath('/dashboard/finance');
}

// Legacy function - kept for backward compatibility
export async function updateInvoiceStatus(invoiceId: string, status: 'Paid' | 'Pending' | 'Overdue' | 'Processing') {
    await requireRole('admin', 'manager');
    await connectDB();
    const agency = await getCurrentAgency();

    // BUG-044: Invoice state machine — prevent invalid transitions
    const invoice = await InvoiceModel.findOne({ id: invoiceId, agencyId: agency?.id }).lean();
    if (!invoice) throw new Error('Invoice not found');
    const currentStatus = (invoice as any).status;
    const invalidTransitions: Record<string, string[]> = {
        'Paid': ['Pending'], // Cannot revert paid invoice to pending
    };
    if (invalidTransitions[currentStatus]?.includes(status)) {
        throw new Error(`Cannot change invoice status from ${currentStatus} to ${status}.`);
    }

    await InvoiceModel.updateOne(
        { id: invoiceId, agencyId: agency?.id },
        { $set: { status } }
    );
    revalidatePath('/dashboard/finance');
}

export async function deleteTransaction(transactionId: string, password: string) {
    await connectDB();
    const currentUserId = await getSessionId();
    if (!currentUserId) throw new Error('Unauthorized');
    const user = await getUser(currentUserId);
    if (!user) throw new Error('User not found');
    if (user.role !== 'admin') throw new Error('Unauthorized: Only admins can delete transactions.');

    const userDoc = await UserModel.findOne({ id: currentUserId }).lean();
    if (!userDoc?.password || !(await comparePassword(password, userDoc.password))) {
        throw new Error('Invalid Password');
    }

    const agency = await getCurrentAgency();
    await TransactionModel.deleteOne({ id: transactionId, agencyId: agency?.id });
    revalidatePath('/dashboard/finance');
    return { success: true };
}

export async function getHighPriorityTasks(offset = 0, limit = 5) {
    await requireAuth();
    await connectDB();
    const agency = await getCurrentAgency();
    const tasks = await TaskModel.find({ agencyId: agency?.id, status: { $ne: 'Done' } })
        .sort({ dueDate: 1 }).skip(offset).limit(limit).lean();
    const sanitized = tasks.map(sanitizeDoc);
    const projectIds = [...new Set(sanitized.map((t: any) => t.projectId))];
    const projs = await ProjectModel.find({ id: { $in: projectIds } }).select('id name slug').lean();
    const projMap = new Map(projs.map((p: any) => [p.id, { name: p.name, slug: p.slug || p.id }]));
    return sanitized.map((t: any) => ({
        ...t,
        projectName: projMap.get(t.projectId)?.name ?? 'Unknown Project',
        projectSlug: projMap.get(t.projectId)?.slug ?? t.projectId,
    }));
}

export async function createInvoice(invoice: Omit<Invoice, "id" | "status" | "agencyId">) {
    await requireRole('admin', 'manager');
    await connectDB();
    // Input sanitization
    invoice = sanitizeMongoInput(invoice);
    // BUG-265: Strict amount validation (NaN, negative, max)
    if (!invoice.amount || !Number.isFinite(invoice.amount) || invoice.amount <= 0) throw new Error('Validation Error: Invoice amount must be a valid positive number.');
    if (invoice.amount > 100_000_000) throw new Error('Validation Error: Invoice amount exceeds maximum allowed value.');
    if (!invoice.projectId) throw new Error('Validation Error: Invoice must be linked to a project.');

    const agency = await getCurrentAgency();
    if (!agency) throw new Error('No agency context');

    // Plan limit check
    const invoiceLimit = await checkAgencyLimit(agency.id, 'monthlyInvoices');
    if (!invoiceLimit.allowed) throw new Error(`Plan limit reached: your plan allows ${invoiceLimit.limit} monthly invoices (currently ${invoiceLimit.current}).`);

    const project = await ProjectModel.findOne({ id: invoice.projectId, agencyId: agency.id }).lean();
    if (!project) throw new Error(`Project with ID ${invoice.projectId} not found`);

    const newInvoice: Invoice = { ...invoice, id: generateId(), status: 'Pending', agencyId: agency.id };
    await InvoiceModel.create(newInvoice);

    // Notify client
    if (project.clientId && await isNotifEnabled('invoice')) {
        await NotificationModel.create({
            id: generateId(), agencyId: agency.id, userId: project.clientId,
            message: `New Invoice Generated: ${formatCurrency(invoice.amount, await getDefaultCurrency())}`,
            read: false, timestamp: new Date().toISOString(), link: '/dashboard/finance'
        });
    }

    // Email client
    try {
        if (project.clientId) {
            const client = await getClientById(project.clientId);
            if (client?.email) {
                await sendInvoiceCreatedEmail({
                    clientEmail: client.email, clientName: client.name, amount: invoice.amount,
                    projectName: (project as any).name, dueDate: invoice.date,
                    financeLink: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard/finance`,
                });
            }
        }
    } catch (emailError) {
        console.error('[Email] Failed to send invoice creation email:', emailError);
    }

    revalidatePath('/dashboard/finance');
    return sanitizeDoc(newInvoice);
}

export async function getFinanceStats(projectId?: string, userId?: string, category?: string) {
    await requireRole('admin', 'manager');
    await connectDB();
    const agency = await getCurrentAgency();
    const agencyFilter = requireAgencyFilter(agency);
    const txQuery: any = { ...agencyFilter };
    const invQuery: any = { ...agencyFilter };
    if (projectId) { txQuery.projectId = projectId; invQuery.projectId = projectId; }
    if (category) txQuery.category = category;

    let [transactions, invoices, userForFilter] = await Promise.all([
        TransactionModel.find(txQuery).lean(),
        InvoiceModel.find(invQuery).lean(),
        userId ? UserModel.findOne({ id: userId, ...agencyFilter }).select('-password').lean() : Promise.resolve(null)
    ]);

    if (userId && userForFilter) {
        const name = (userForFilter as any).name.toLowerCase();
        // Primary: match by userId DB field; fallback: description match for legacy transactions
        transactions = transactions.filter((t: any) =>
            t.userId === userId ||
            (!t.userId && t.description?.toLowerCase().includes(name))
        );
    }

    const totalRevenue = transactions.filter((t: any) => t.type === 'income' && t.status === 'completed').reduce((a: number, t: any) => a + t.amount, 0);
    const totalExpenses = transactions.filter((t: any) => t.type === 'expense' && t.status === 'completed').reduce((a: number, t: any) => a + t.amount, 0);
    const netProfit = totalRevenue - totalExpenses;
    const pendingInvoices = invoices.filter((i: any) => ['Pending', 'Processing', 'Overdue'].includes(i.status));

    return {
        totalRevenue, totalExpenses, netProfit,
        pendingInvoicesAmount: pendingInvoices.reduce((a: number, i: any) => a + i.amount, 0),
        pendingInvoicesCount: pendingInvoices.length
    };
}

export async function getFinanceChartData(projectId?: string, userId?: string, category?: string) {
    await requireRole('admin', 'manager');
    await connectDB();
    const agency = await getCurrentAgency();
    const agencyFilter = requireAgencyFilter(agency);
    const query: any = { ...agencyFilter };
    if (projectId) query.projectId = projectId;
    if (category) query.category = category;

    let transactions = await TransactionModel.find(query).lean();

    if (userId) {
        const user = await UserModel.findOne({ id: userId, ...agencyFilter }).select('-password').lean() as any;
        if (user) {
            const lower = user.name.toLowerCase();
            // Primary: match by userId DB field; fallback: description match for legacy transactions
            transactions = transactions.filter((t: any) =>
                t.userId === userId ||
                (!t.userId && t.description?.toLowerCase().includes(lower))
            );
        }
    }

    // Group by month (last 6 months) -- include year to prevent cross-year matching
    const monthKeys: string[] = [];
    const monthLabels: string[] = [];
    for (let i = 5; i >= 0; i--) {
        const d = new Date();
        d.setMonth(d.getMonth() - i);
        // Key includes year for accurate matching
        monthKeys.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
        monthLabels.push(d.toLocaleString('default', { month: 'short' }));
    }

    const chartData = monthKeys.map((key, idx) => ({
        name: monthLabels[idx],
        key,
        income: 0,
        expense: 0
    }));

    transactions.forEach(t => {
        const tDate = new Date(t.date);
        const tKey = `${tDate.getFullYear()}-${String(tDate.getMonth() + 1).padStart(2, '0')}`;
        const monthData = chartData.find(d => d.key === tKey);
        if (monthData && t.status === 'completed') {
            if (t.type === 'income') monthData.income += t.amount;
            if (t.type === 'expense') monthData.expense += t.amount;
        }
    });

    // Strip the internal key before returning
    return chartData.map(({ key, ...rest }) => rest);
}

export async function getPayrollStatus(userId?: string) {
    await requireRole('admin', 'manager');
    await connectDB();
    const agency = await getCurrentAgency();
    const agencyFilter = requireAgencyFilter(agency);
    const userQuery: any = { role: { $ne: 'admin' }, ...agencyFilter };
    if (userId && userId !== 'all') userQuery.id = userId;

    // Get current month boundaries for date-range matching
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
    const currentMonth = now.toLocaleString('default', { month: 'long', year: 'numeric' });

    const [users, transactions] = await Promise.all([
        UserModel.find(userQuery).select('-password').lean(),
        TransactionModel.find({
            category: 'Salary',
            type: 'expense',
            date: { $gte: startOfMonth, $lte: endOfMonth },
            ...agencyFilter
        }).lean()
    ]);

    return users.map((user: any) => {
        const salary = user.salary || 5000;
        // Primary: match by userId DB field (set when salary transaction is created)
        // Fallback: description match for legacy transactions without userId
        const isPaid = transactions.some((t: any) =>
            t.userId === user.id ||
            (!t.userId && t.description?.includes(user.name) && t.description?.includes(currentMonth))
        );
        return { user: sanitizeDoc(user), salary, status: isPaid ? 'Paid' : 'Pending', month: currentMonth };
    });
}

export async function payEmployee(userId: string, amount: number, month: string, userName: string) {
    await requireRole('admin', 'manager');
    // Input sanitization
    userName = sanitizeName(userName, 200);
    month = sanitizeString(month, 50);

    // BUG-043: Prevent duplicate salary payment for same user+month
    await connectDB();
    const agency = await getCurrentAgency();
    const existingPayment = await TransactionModel.findOne({
        userId, category: 'Salary', agencyId: agency?.id,
        description: { $regex: new RegExp(`^Salary Payment - ${month.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'i') },
        status: 'completed'
    }).lean();
    if (existingPayment) {
        throw new Error(`Salary for ${userName} has already been paid for ${month}.`);
    }

    const description = `Salary Payment - ${month} - ${userName}`;

    const txn = await createTransaction({
        amount,
        type: 'expense',
        category: 'Salary',
        description,
        date: new Date().toISOString().split('T')[0],
        userId
    });

    revalidatePath('/dashboard/finance');
    return { success: true, transactionId: txn.id };
}

export async function getAgencyDashboardSettings() {
    await requireAuth();
    await connectDB();
    const agency = await getCurrentAgency();
    const settingsDoc = await SettingsModel.findOne(requireAgencyFilter(agency)).lean() as any;
    if (!settingsDoc) return { systemName: 'AgencyOS', logo: '', userPermissions: {} };
    return sanitizeDoc(settingsDoc);
}

export async function updateAgencyDashboardSettings(settings: { systemName: string; logo: string }) {
    await requireRole('admin');
    // Input sanitization
    settings.systemName = sanitizeName(settings.systemName, 200);
    settings.logo = sanitizeUrl(settings.logo);
    await connectDB();
    const agency = await getCurrentAgency();
    await SettingsModel.updateOne(
        { agencyId: agency?.id },
        { $set: settings },
        { upsert: true }
    );
    revalidatePath('/dashboard');
    return settings;
}

export async function globalSearch(query: string): Promise<SearchResult[]> {
    if (!query || query.length < 2) return [];

    await requireAuth();
    await connectDB();
    const agency = await getCurrentAgency();
    const agencyFilter = requireAgencyFilter(agency);
    const results: SearchResult[] = [];

    // -- Keyword detection: generic category queries --
    const q = query.toLowerCase().trim();
    const isProjectQuery = /^(all\s+)?projects?$|^list\s+projects?$/i.test(q);
    const isClientQuery = /^(all\s+)?clients?$|^list\s+clients?$/i.test(q);
    const isTaskQuery = /^(all\s+)?tasks?$|^list\s+tasks?$/i.test(q);
    const isTeamQuery = /^(all\s+)?(team|employees?|members?|staff|people)$|^list\s+(team|employees?)$/i.test(q);

    if (isProjectQuery) {
        const allProjects = await ProjectModel.find(agencyFilter).sort({ createdAt: -1 }).limit(15).lean();
        for (const p of allProjects) {
            const proj = sanitizeDoc(p) as any;
            results.push({ id: proj.id, type: 'project', title: proj.name, subtitle: `Status: ${proj.status || 'Active'}`, url: `/dashboard/projects/${proj.slug || proj.id}` });
        }
        return results;
    }
    if (isClientQuery) {
        const allClients = await ClientModel.find(agencyFilter).sort({ createdAt: -1 }).limit(15).select('-password').lean();
        for (const c of allClients) {
            const client = sanitizeDoc(c) as any;
            results.push({ id: client.id, type: 'client', title: client.name, subtitle: client.companyName, url: `/dashboard/clients/${client.slug || client.id}` });
        }
        return results;
    }
    if (isTaskQuery) {
        const allTasks = await TaskModel.find(agencyFilter).sort({ createdAt: -1 }).limit(15).lean();
        for (const t of allTasks) {
            const task = sanitizeDoc(t) as any;
            results.push({ id: task.id, type: 'task', title: task.title, subtitle: task.status, url: `/dashboard/projects/${task.projectId}?task=${task.id}` });
        }
        return results;
    }
    if (isTeamQuery) {
        const allUsers = await UserModel.find(agencyFilter).sort({ createdAt: -1 }).limit(15).select('-password').lean();
        for (const u of allUsers) {
            const user = sanitizeDoc(u) as any;
            results.push({ id: user.id, type: 'user', title: user.name, subtitle: user.role, url: `/dashboard/team/${user.username || user.id}` });
        }
        return results;
    }

    // -- Normal regex search --
    const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(escapedQuery, 'i');

    // Search Projects
    const projects = await ProjectModel.find({
        ...agencyFilter,
        $or: [{ name: regex }, { client: regex }]
    }).limit(5).lean();

    for (const p of projects) {
        const proj = sanitizeDoc(p) as any;
        const clientDoc = proj.clientId ? await ClientModel.findOne({ id: proj.clientId, ...agencyFilter }).select('-password').lean() : null;
        const clientName = clientDoc ? (clientDoc as any).name : (proj.client || '');
        results.push({
            id: proj.id,
            type: 'project',
            title: proj.name,
            subtitle: clientName ? `Client: ${clientName}` : '',
            url: `/dashboard/projects/${proj.slug || proj.id}`
        });
    }

    // Search Clients
    const clients = await ClientModel.find({
        ...agencyFilter,
        $or: [{ name: regex }, { companyName: regex }]
    }).limit(5).select('-password').lean();

    for (const c of clients) {
        const client = sanitizeDoc(c) as any;
        results.push({
            id: client.id,
            type: 'client',
            title: client.name,
            subtitle: client.companyName,
            url: `/dashboard/clients/${client.slug || client.id}`
        });
    }

    // Search Tasks
    const tasks = await TaskModel.find({
        ...agencyFilter,
        $or: [{ title: regex }, { description: regex }]
    }).limit(5).lean();

    for (const t of tasks) {
        const task = sanitizeDoc(t) as any;
        const taskProject = await ProjectModel.findOne({ id: task.projectId, ...agencyFilter }).select('slug id').lean();
        const projectSlug = taskProject ? ((taskProject as any).slug || (taskProject as any).id) : task.projectId;
        results.push({
            id: task.id,
            type: 'task',
            title: task.title,
            subtitle: task.status,
            url: `/dashboard/projects/${projectSlug}?task=${task.id}`
        });
    }

    // Search Users
    const users = await UserModel.find({
        ...agencyFilter,
        $or: [{ name: regex }, { email: regex }]
    }).limit(5).select('-password').lean();

    for (const u of users) {
        const user = sanitizeDoc(u) as any;
        results.push({
            id: user.id,
            type: 'user',
            title: user.name,
            subtitle: user.role,
            url: `/dashboard/team/${user.username || user.id}`
        });
    }

    return results.slice(0, 10);
}


export async function markNotificationAsRead(id: string) {
    const caller = await requireAuth();
    await connectDB();
    const agency = await getCurrentAgency();
    // S5 fix: IDOR protection — only allow marking own notifications (or admin/manager)
    const notification = await NotificationModel.findOne({ id, agencyId: agency?.id }).lean();
    if (!notification) return;
    const isPrivileged = caller.role === 'admin' || caller.role === 'manager';
    if ((notification as any).userId !== caller.id && !isPrivileged) return;
    await NotificationModel.updateOne({ id, agencyId: agency?.id }, { $set: { read: true } });
}

// ----------------------------------------------------------------------
// Asset Actions
// ----------------------------------------------------------------------

export async function getProjectAssets(projectId: string) {
    await requireAuth();
    await connectDB();
    const agency = await getCurrentAgency();
    const assets = await AssetModel.find({ projectId, agencyId: agency?.id }).lean();
    return assets.map(sanitizeDoc).sort((a: any, b: any) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime());
}

export async function addProjectAsset(asset: Omit<Asset, "id" | "uploadedAt" | "agencyId">) {
    const caller = await requireRole('admin', 'manager', 'employee');
    // Input sanitization
    asset = sanitizeMongoInput(asset);
    asset.name = sanitizeName(asset.name, 500);
    if (!asset.name) throw new Error('Asset name is required');
    if (asset.description) asset.description = sanitizeString(asset.description, 2000);
    if (asset.url) asset.url = sanitizeUrl(asset.url);
    // Server-Side Safety Check
    const FORBIDDEN_EXTENSIONS = ['.exe', '.bat', '.cmd', '.sh', '.vbs', '.msi', '.jar', '.com', '.scr', '.pif'];
    const fileName = asset.name.toLowerCase();
    if (FORBIDDEN_EXTENSIONS.some(ext => fileName.endsWith(ext))) {
        throw new Error("Security Alert: Malicious file type rejected by server.");
    }

    await connectDB();
    const agency = await getCurrentAgency();
    if (!agency?.id) throw new Error('Agency context required');
    const newAsset: Asset = {
        ...asset, id: generateId(), uploadedAt: new Date().toISOString(), agencyId: agency.id
    };
    await AssetModel.create(newAsset);
    await ActivityModel.create({
        id: generateId(), agencyId: agency?.id, user: asset.uploadedBy, userId: caller.id,
        action: 'uploaded asset', target: asset.name, timestamp: new Date().toISOString()
    });

    revalidatePath(`/dashboard/projects/${asset.projectId}`);
    return newAsset;
}

export async function deleteProjectAsset(assetId: string) {
    await requireRole('admin', 'manager');
    const currentUser = await getCurrentUser();
    const userName = currentUser ? currentUser.name : "System";

    await connectDB();
    const agency = await getCurrentAgency();
    const asset = await AssetModel.findOne({ id: assetId, agencyId: agency?.id }).lean();
    if (!asset) throw new Error('Asset not found');
    await AssetModel.deleteOne({ id: assetId, agencyId: agency?.id });

    // Clean up uploaded file from storage (Vercel Blob or Azure)
    const assetUrl = (asset as any).url;
    if (assetUrl) {
        try {
            const { deleteFile } = await import('@/lib/storage');
            await deleteFile(assetUrl);
        } catch (e) {
            console.error('Failed to delete file from storage:', e);
        }

        // Decrement storage usage
        try {
            const assetSize = (asset as any).size;
            if (assetSize) {
                const sizeMatch = String(assetSize).match(/([\d.]+)\s*(KB|MB|GB|B)/i);
                if (sizeMatch) {
                    const num = parseFloat(sizeMatch[1]);
                    const unit = sizeMatch[2].toUpperCase();
                    const bytes = unit === 'GB' ? num * 1073741824 : unit === 'MB' ? num * 1048576 : unit === 'KB' ? num * 1024 : num;
                    await AgencyModel.updateOne(
                        { id: agency?.id },
                        { $inc: { 'usage.storage': -Math.round(bytes) } }
                    );
                }
            }
        } catch (e) {
            console.error('Failed to update storage usage:', e);
        }
    }

    await ActivityModel.create({
        id: generateId(), agencyId: agency?.id, user: userName, userId: currentUser?.id || 'system',
        action: 'deleted asset', target: (asset as any).name, timestamp: new Date().toISOString()
    });
    revalidatePath('/dashboard/projects/[id]', 'page');
}

export async function updateProjectAsset(assetId: string, updates: Partial<Asset>) {
    await requireRole('admin', 'manager');
    const currentUser = await getCurrentUser();
    const userName = currentUser ? currentUser.name : "System";
    // Input sanitization
    updates = sanitizeUpdates(updates) as Partial<Asset>;
    if (updates.name) updates.name = sanitizeName(updates.name, 500);
    if (updates.description) updates.description = sanitizeString(updates.description, 2000);
    if (updates.url) updates.url = sanitizeUrl(updates.url);

    await connectDB();
    const agency = await getCurrentAgency();
    const asset = await AssetModel.findOne({ id: assetId, agencyId: agency?.id }).lean();
    if (!asset) throw new Error('Asset not found');
    await AssetModel.updateOne({ id: assetId, agencyId: agency?.id }, { $set: updates });
    await ActivityModel.create({
        id: generateId(), agencyId: agency?.id, user: userName, userId: currentUser?.id || 'system',
        action: 'updated asset', target: (asset as any)?.name || 'Asset',
        timestamp: new Date().toISOString()
    });
    revalidatePath('/dashboard/projects/[id]', 'page');
}

export async function toggleAssetAI(assetId: string, enabled: boolean) {
    await requireRole('admin', 'manager');
    await connectDB();
    const agency = await getCurrentAgency();
    await AssetModel.updateOne({ id: assetId, agencyId: agency?.id }, { $set: { aiEnabled: enabled } });
    revalidatePath('/dashboard/projects/[id]', 'page');
}





export interface ExtractedTaskFields {
    title?: string;
    description?: string;
    category?: string;
    priority?: 'Low' | 'Medium' | 'High';
    estimatedHours?: number;
}

/**
 * Extract structured task fields from an AI response text.
 * The AI parses the message and returns best-fit values for title, description, category, priority.
 */
export async function extractTaskFields(
    aiResponseText: string,
    availableCategories: string[],
): Promise<ExtractedTaskFields> {
    await requireAuth();
    const aiConfig = await getAgencyAIConfigInternal();
    if (!aiConfig) throw new Error('Singularity is not configured.');

    const systemInstruction = `You are a task field extractor. Given an AI-generated task description or discussion, extract structured fields for creating a project task.

RULES:
- "title": A short, actionable task title (max 10 words). If the text is a conversation, extract the core task.
- "description": The full task description with details, acceptance criteria, steps, etc. Preserve formatting.
- "category": Pick the BEST matching category from this list: [${availableCategories.join(', ')}]. If none match well, return empty string.
- "priority": One of "Low", "Medium", "High". Infer from urgency/importance cues. Default to "Medium" if unclear.
- "estimatedHours": Estimate the number of hours this task will take based on complexity and scope. Use increments of 0.5. Simple tasks: 0.5-2h, medium: 2-8h, complex: 8-40h. Return a number.

Return ONLY valid JSON. No markdown fences, no extra text. Example:
{"title":"Implement user login","description":"Create a login page with...","category":"Web Development","priority":"High","estimatedHours":4}`;

    const prompt = `Extract task fields from this AI response:\n\n${aiResponseText}`;

    try {
        const { text, tokens } = await generateContent(aiConfig, prompt, systemInstruction);
        // Strip any markdown fences the model might add
        const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        const parsed = JSON.parse(cleaned) as ExtractedTaskFields;
        // Validate category against available list
        if (parsed.category && !availableCategories.includes(parsed.category)) {
            parsed.category = '';
        }
        // Validate priority
        if (parsed.priority && !['Low', 'Medium', 'High'].includes(parsed.priority)) {
            parsed.priority = 'Medium';
        }
        return parsed;
    } catch (error: any) {
        console.error('[extractTaskFields] Error:', error.message);
        // Fallback: just use the full text as description
        return { description: aiResponseText };
    }
}

export async function explainTask(taskId: string, userId: string) {
    await requireAuth();
    await connectDB();
    const agency = await getCurrentAgency();
    const agencyFilter = requireAgencyFilter(agency);

    const task = await TaskModel.findOne({ id: taskId, ...agencyFilter }).lean() as any;
    if (!task) throw new Error('Task not found');

    const [project, assignee, allProjectTasks, projectAssetsRaw] = await Promise.all([
        ProjectModel.findOne({ id: task.projectId, ...agencyFilter }).lean(),
        task.assigneeId ? UserModel.findOne({ id: task.assigneeId, ...agencyFilter }).select('-password').lean() : Promise.resolve(null),
        TaskModel.find({ projectId: task.projectId, ...agencyFilter }).lean(),
        AssetModel.find({ projectId: task.projectId, aiEnabled: true, ...agencyFilter }).lean()
    ]);

    // Build user name map for board summary
    const userIds = [...new Set(allProjectTasks.map((t: any) => t.assigneeId).filter(Boolean))];
    const users = await UserModel.find({ id: { $in: userIds }, ...agencyFilter }).select('-password').lean();
    const userMap = Object.fromEntries(users.map((u: any) => [u.id, u.name]));

    const tasksByStatus = {
        'Todo': allProjectTasks.filter((t: any) => t.status === 'Todo').map((t: any) => `- ${t.title} (${userMap[t.assigneeId] || 'Unassigned'})`),
        'In Progress': allProjectTasks.filter((t: any) => t.status === 'In Progress').map((t: any) => `- ${t.title} (${userMap[t.assigneeId] || 'Unassigned'})`),
        'Review': allProjectTasks.filter((t: any) => t.status === 'Review').map((t: any) => `- ${t.title} (${userMap[t.assigneeId] || 'Unassigned'})`),
        'Done': allProjectTasks.filter((t: any) => t.status === 'Done').map((t: any) => `- ${t.title} (${userMap[t.assigneeId] || 'Unassigned'})`)
    };

    const boardSummary = `
    Current Board State:
    TO DO:
    ${tasksByStatus['Todo'].join('\n') || '(None)'}
    
    IN PROGRESS:
    ${tasksByStatus['In Progress'].join('\n') || '(None)'}
    
    IN REVIEW:
    ${tasksByStatus['Review'].join('\n') || '(None)'}
    
    DONE:
    ${tasksByStatus['Done'].join('\n') || '(None)'}
    `;

    const projectAssets = projectAssetsRaw as any[];

    // 3. Construct System Prompt
    const context = {
        task: {
            title: task.title,
            description: task.description,
            status: task.status,
            priority: task.priority,
            assignee: assignee ? assignee.name : "Unassigned",
            dueDate: task.dueDate
        },
        project: project ? {
            name: (project as any).client || "Unknown Client", // Schema uses 'client' string
            departments: project.services?.join(", ") || "General"
        } : null,
        comments: task.comments || []
    };

    let promptText = `You are a Senior Technical Project Manager & Solution Architect.
Provide a comprehensive, actionable analysis of this task.

### PROJECT
**Project**: ${context.project?.name}
**Departments**: ${context.project?.departments}

${boardSummary}

### TARGET TASK
**Title**: ${context.task.title}
**Status**: ${context.task.status} | **Priority**: ${context.task.priority}
**Assignee**: ${context.task.assignee}
**Due Date**: ${context.task.dueDate}

**Description**:
${context.task.description || "No description provided."}

**Recent Comments**:
${context.comments.length > 0 ? context.comments.map((c: any) => `- ${c.text}`).join('\n') : "No comments yet."}


### INSTRUCTIONS
- Analyze any provided assets (code, docs, images) and reference them specifically.
- Check the board state for duplicates, blockers, or bottlenecks.
- Provide: a task summary, strategic advice (pitfalls, dependencies, tips), and recommended next steps as a checklist.
- Use Markdown with headings and bullet points.
`;

    // Process Text/Code Assets directly into prompt
    const textAssets = projectAssets.filter(a => ['file', 'code', 'link'].includes(a.type) && a.content);
    if (textAssets.length > 0) {
        promptText += `\n\n### PROJECT ASSETS (KNOWLEDGE BASE)\n`;
        textAssets.forEach(a => {
            promptText += `\n#### FILE: ${a.name} (${a.type})\n\`\`\`\n${a.content?.substring(0, 5000) || "(Empty)"}\n\`\`\`\n`; // Truncate to avoid token limits if massive
        });
    } else {
        promptText += `\n\n(No text-based assets enabled for AI context. Advice will be general.)\n`;
    }

    // Get AI config from agency (set by super-admin)
    const aiConfig = await getAgencyAIConfigInternal();
    if (!aiConfig) {
        return "Singularity is not configured. Please contact your administrator to set up AI.";
    }

    // Prepare content parts (Text + Images)
    const parts: any[] = [{ text: promptText }];

    // Process Image Assets
    const imageAssets = projectAssets.filter(a => a.type === 'image' && a.url);
    if (imageAssets.length > 0) {
        console.log(`[explainTask] Attaching ${imageAssets.length} images`);

        imageAssets.forEach(img => {
            if (img.url.startsWith('data:image/')) {
                try {
                    const base64Data = img.url.split(',')[1];
                    const mimeType = img.url.split(';')[0].split(':')[1];
                    parts.push({
                        inlineData: {
                            data: base64Data,
                            mimeType: mimeType
                        }
                    });
                } catch (e) {
                    console.error("Failed to process image data URL", e);
                }
            }
        });
    }

    try {
        const { text, tokens } = await generateContentWithParts(aiConfig, parts);
        logAIUsage({ agencyId: agency!.id, userId, feature: 'ai-explain', model: aiConfig.model || 'unknown', provider: aiConfig.provider, ...tokens });
        return text;
    } catch (error: any) {
        console.error("[explainTask] Singularity error:", error.message);
        return `Singularity Error: ${error.message || "Unknown error"}`;
    }
}

export async function enhanceTaskDescription(projectId: string, title: string, content: string, userId: string) {
    await requireAuth();
    await connectDB();
    const agency = await getCurrentAgency();
    const agencyFilter = requireAgencyFilter(agency);

    const [project, allProjectTasks, projectAssets] = await Promise.all([
        ProjectModel.findOne({ id: projectId, ...agencyFilter }).lean(),
        TaskModel.find({ projectId, ...agencyFilter }).lean(),
        AssetModel.find({ projectId, aiEnabled: true, ...agencyFilter }).lean()
    ]);

    const tasksSummary = allProjectTasks.slice(0, 10).map((t: any) => `- ${t.title} (${t.status})`).join('\n');
    let assetContext = '';
    (projectAssets as any[]).filter((a: any) => ['file', 'code', 'link'].includes(a.type) && a.content).forEach((a: any) => {
        assetContext += `\n--- Asset: ${a.name} ---\n${a.content?.substring(0, 2000) || '(Empty)'}\n`;
    });


    const aiConfig = await getAgencyAIConfigInternal();
    if (!aiConfig) throw new Error("Singularity is not configured. Contact your administrator.");

    const isEnhancement = content.length > 20;
    const actionType = isEnhancement ? "Refine and Format" : "Generate from scratch";

    const prompt = `You are a Senior Technical Project Manager.
${actionType} a task description for: "${title}"

### PROJECT CONTEXT
**Project**: ${project?.client || "General"}
**Board**: ${tasksSummary || '(Empty)'}
**Knowledge Base**: ${assetContext || '(None)'}

### DRAFT
${content || '(No draft provided)'}

### INSTRUCTIONS
${isEnhancement ?
            `Polish this draft into a professional task specification:
- Use Markdown structure (## Headers, - Bullets)
- Add an Acceptance Criteria section with verifiable requirements
- Cross-reference the Knowledge Base for correct terminology
- Remove ambiguity, keep it actionable` :

            `Generate a complete task specification from the title:
- Include: Objective, Implementation Steps, Technical Considerations, Acceptance Criteria (3-5 items)
- Infer details from the Knowledge Base and Board context
- Use Markdown with clear structure`
        }

Return ONLY the Markdown content.`;


    try {
        const { text, tokens } = await generateContent(aiConfig, prompt);
        logAIUsage({ agencyId: agency!.id, userId, feature: 'ai-enhance', model: aiConfig.model || 'unknown', provider: aiConfig.provider, ...tokens });
        return text;
    } catch (error: any) {
        console.error("Enhance Task Error", error);
        return content; // Fallback to original
    }
}

export type ChatMessage = {
    role: 'user' | 'model';
    content: string;
};

// ============================================================================
// AI CHAT SESSION MANAGEMENT (Persistent Live API Sessions)
// ============================================================================

/**
 * Build the system instruction for the AI chat session.
 * Contains project context, board summary, assets, and current task state.
 */
function buildChatSystemInstruction(
    projectId: string,
    currentTitle: string,
    currentDescription: string,
    data: any
): string {
    const allProjectTasks = data.tasks.filter((t: any) => t.projectId === projectId);
    const tasksSummary = allProjectTasks.slice(0, 15)
        .map((t: any) => {
            const assignee = data.users.find((u: any) => u.id === t.assigneeId);
            return `- ${t.title} (${t.status}) [${assignee?.name || 'Unassigned'}]`;
        }).join('\n');

    const projectAssets = (data.assets || []).filter((a: any) => a.projectId === projectId && a.aiEnabled);
    let assetContext = "";
    projectAssets.filter((a: any) => ['file', 'code', 'link'].includes(a.type) && a.content).forEach((a: any) => {
        assetContext += `\n--- Asset: ${a.name} ---\n${a.content?.substring(0, 2000) || "(Empty)"}\n`;
    });

    return `You are Singularity, a Senior Technical Project Manager & Agile Coach.
You are helping a user create and refine a task.

### PROJECT BOARD
${tasksSummary || '(No tasks yet)'}

### KNOWLEDGE BASE
${assetContext || '(No assets available)'}

### CURRENT TASK
**Title**: ${currentTitle}
**Draft**: ${currentDescription || '(Empty)'}

### YOUR ROLE
- Help clarify, refine, and structure the task
- If asked to generate/write the task, provide a full Markdown description
- If asked about project assets, answer using the knowledge base
- Be professional, concise, and actionable
- Use Markdown formatting (bold, lists, headings)`;
}

/**
 * Create a persistent AI chat session.
 * Returns a sessionId that can be used for subsequent messages.
 */
export async function createAISession(
    projectId: string,
    currentTitle: string,
    currentDescription: string,
    userId: string
): Promise<string> {
    await requireAuth();
    const aiConfig = await getAgencyAIConfigInternal();
    if (!aiConfig) throw new Error("Singularity is not configured.");

    // Only use persistent sessions for Live API models
    const modelId = aiConfig.model || 'gemini-2.5-flash-lite';
    if (!modelId.includes('native-audio')) {
        // For non-Live models, return a marker so the client knows to use legacy flow
        return 'legacy';
    }

    await connectDB();
    const agency = await getCurrentAgency();
    const agencyFilter = requireAgencyFilter(agency);
    const [tasks, users, assets] = await Promise.all([
        TaskModel.find({ projectId, ...agencyFilter }).lean(),
        UserModel.find(agencyFilter).select('-password').lean(),
        AssetModel.find({ projectId, aiEnabled: true, ...agencyFilter }).lean()
    ]);
    const data = { tasks, users, assets };
    const systemInstruction = buildChatSystemInstruction(projectId, currentTitle, currentDescription, data);

    const sessionId = await createSession(aiConfig.apiKey, modelId, systemInstruction);
    console.log(`[AI Session] Created ${sessionId} for project ${projectId}`);
    return sessionId;
}

/**
 * Send a message to an existing AI chat session.
 * For Live API models, uses persistent session (fast, no reconnect).
 * For legacy models, falls back to full context + history send.
 */
export async function sendAIMessage(
    sessionId: string,
    userMessage: string,
    // Legacy fallback params
    projectId?: string,
    currentTitle?: string,
    currentDescription?: string,
    history?: ChatMessage[],
    userId?: string
): Promise<string> {
    await requireAuth();
    // Legacy flow for non-Live models
    if (sessionId === 'legacy') {
        return chatWithTaskAI(
            projectId!, currentTitle!, currentDescription!,
            history || [], userMessage, userId!
        );
    }

    try {
        const result = await sendMessage(sessionId, userMessage);
        return result;
    } catch (error: any) {
        console.error('[AI Session] Send error:', error.message);
        return "I encountered an error. Please try again.";
    }
}

/**
 * Close an AI chat session when the chat box is closed.
 */
export async function closeAISession(sessionId: string): Promise<void> {
    await requireAuth();
    if (sessionId === 'legacy') return;
    closeSession(sessionId);
    console.log(`[AI Session] Closed ${sessionId}`);
}

/**
 * Legacy chat function -- used as fallback for non-Live models.
 * Sends full context + history each time.
 */
export async function chatWithTaskAI(
    projectId: string,
    currentTitle: string,
    currentDescription: string,
    history: ChatMessage[],
    userMessage: string,
    userId: string
) {
    await requireAuth();
    await connectDB();
    const agency = await getCurrentAgency();
    const agencyFilter = requireAgencyFilter(agency);
    const [tasks, users, assets] = await Promise.all([
        projectId ? TaskModel.find({ projectId, ...agencyFilter }).lean() : Promise.resolve([]),
        UserModel.find(agencyFilter).select('-password').lean(),
        projectId ? AssetModel.find({ projectId, aiEnabled: true, ...agencyFilter }).lean() : Promise.resolve([])
    ]);
    const data = { tasks, users, assets };
    const aiConfig = await getAgencyAIConfigInternal();
    if (!aiConfig) throw new Error('Singularity is not configured.');
    const systemInstruction = buildChatSystemInstruction(projectId || '', currentTitle || '', currentDescription || '', data);

    try {
        const { text, tokens } = await generateContentWithChat(aiConfig, history, systemInstruction, userMessage);
        logAIUsage({ agencyId: agency!.id, userId, feature: 'ai-task-chat', model: aiConfig.model || 'unknown', provider: aiConfig.provider, ...tokens });
        return text;
    } catch (error: any) {
        console.error("Singularity Chat Error:", error);
        return "I encountered an error. Please try again.";
    }
}

// ============================================================================
// SINGULARITY -- Standalone AI Chatbot (No system prompt)
// ============================================================================

export async function singularityChat(
    history: Array<{ role: 'user' | 'model'; content: string }>,
    userMessage: string
): Promise<{ response: string; thinking: string }> {
    const user = await requireAuth();
    const agency = await getCurrentAgency();
    const aiConfig = await getAgencyAIConfigInternal();
    if (!aiConfig) throw new Error("Singularity is not configured.");

    // Build a simple prompt with history (no system instruction)
    let fullPrompt = '';
    if (history.length > 0) {
        fullPrompt += history
            .map(m => `${m.role === 'user' ? 'User' : 'Singularity'}: ${m.content}`)
            .join('\n\n');
        fullPrompt += '\n\n';
    }
    fullPrompt += `User: ${userMessage}`;

    const modelId = aiConfig.model || 'gemini-2.5-flash-lite';
    const isLive = modelId.includes('native-audio');

    if (isLive) {
        // Use the Live API directly -- same approach as liveGenerateContent
        const { GoogleGenAI, Modality } = await import("@google/genai");
        const ai = new GoogleGenAI({ apiKey: aiConfig.apiKey });
        const messageQueue: any[] = [];

        const waitMsg = (): Promise<any> => new Promise((resolve) => {
            const check = () => {
                const msg = messageQueue.shift();
                if (msg) resolve(msg);
                else setTimeout(check, 100);
            };
            check();
        });

        const session = await ai.live.connect({
            model: `models/${modelId}`,
            config: {
                responseModalities: [Modality.AUDIO],
                speechConfig: {
                    voiceConfig: {
                        prebuiltVoiceConfig: { voiceName: 'Zephyr' }
                    }
                },
                outputAudioTranscription: {},
            } as any,
            callbacks: {
                onopen: () => { },
                onmessage: (message: any) => messageQueue.push(message),
                onerror: (e: any) => console.error('[Singularity] Error:', e?.message || e),
                onclose: () => { },
            },
        });

        session.sendClientContent({ turns: [fullPrompt] });

        let transcriptText = '';
        let thoughtText = '';
        let done = false;
        const timeout = setTimeout(() => { done = true; }, 60000);

        while (!done) {
            const message = await waitMsg();
            if ((message.serverContent as any)?.outputTranscription?.text) {
                transcriptText += (message.serverContent as any).outputTranscription.text;
            }
            if (message.serverContent?.modelTurn?.parts) {
                for (const part of message.serverContent.modelTurn.parts) {
                    if (part.text) thoughtText += part.text;
                }
            }
            if (message.serverContent?.turnComplete) done = true;
        }

        clearTimeout(timeout);
        session.close();

        const response = transcriptText.trim() ||
            thoughtText.replace(/\*\*[A-Z][^*]*\*\*\s*\n\n/g, '').trim() ||
            thoughtText.trim();

        const botInputTokens = Math.ceil((fullPrompt || '').length / 4);
        const botOutputTokens = Math.ceil((response || '').length / 4);
        logAIUsage({ agencyId: agency?.id || 'unknown', userId: (user as any).id, feature: 'ai-chatbot', model: modelId, provider: aiConfig.provider, inputTokens: botInputTokens, outputTokens: botOutputTokens, totalTokens: botInputTokens + botOutputTokens });
        return {
            response,
            thinking: thoughtText.trim(),
        };
    } else {
        // Non-live model fallback
        const { text, tokens } = await generateContent(aiConfig, fullPrompt);
        logAIUsage({ agencyId: agency?.id || 'unknown', userId: (user as any).id, feature: 'ai-chatbot', model: modelId, provider: aiConfig.provider, ...tokens });
        return { response: text, thinking: '' };
    }
}

// ----------------------------------------------------------------------
// Leave Management Actions
// ----------------------------------------------------------------------



export async function getLeaveRequests(userId?: string) {
    const caller = await requireAuth();
    await connectDB();
    const agency = await getCurrentAgency();
    const query: any = requireAgencyFilter(agency);
    // S4 fix: IDOR protection — non-admin users can only see their own leave requests
    const isPrivileged = caller.role === 'admin' || caller.role === 'manager';
    if (userId) {
        if (!isPrivileged && caller.id !== userId) {
            throw new Error('Unauthorized: You can only view your own leave requests.');
        }
        query.userId = userId;
    } else if (!isPrivileged) {
        // Default to own leave requests for non-privileged users
        query.userId = caller.id;
    }
    const requests = await LeaveRequestModel.find(query).lean();
    return requests
        .map(sanitizeDoc)
        .sort((a: any, b: any) => {
            if (a.status === 'Pending' && b.status !== 'Pending') return -1;
            if (a.status !== 'Pending' && b.status === 'Pending') return 1;
            return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        });
}

// Employee submits a leave request
export async function requestLeave(leaveData: Omit<LeaveRequest, 'id' | 'status' | 'createdAt' | 'agencyId'>) {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
        throw new Error("Unauthorized: You must be logged in to submit leave requests");
    }
    // Input sanitization
    leaveData = sanitizeMongoInput(leaveData);
    if (leaveData.reason) leaveData.reason = sanitizeString(leaveData.reason, 2000);

    // Validate dates
    const startDate = new Date(leaveData.startDate);
    const endDate = new Date(leaveData.endDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (startDate < today) {
        throw new Error("Leave start date cannot be in the past");
    }

    if (endDate < startDate) {
        throw new Error("Leave end date must be after start date");
    }

    // Calculate number of days
    const daysDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;

    // Validate leave type limits (standard office rules)
    if (leaveData.type === 'Casual' && daysDiff > 15) {
        throw new Error("Casual leave cannot exceed 15 days. Please split into multiple requests or use Emergency leave.");
    }

    if (leaveData.type === 'Emergency' && daysDiff > 7) {
        throw new Error("Emergency leave cannot exceed 7 days. For longer periods, please use Casual leave.");
    }

    const newLeaveRequest: LeaveRequest = await withAgencyId({
        ...leaveData,
        id: generateId(),
        userId: currentUser.id,
        status: 'Pending',
        createdAt: new Date().toISOString()
    } as LeaveRequest);

    await connectDB();
    const agency = await getCurrentAgency();
    await LeaveRequestModel.create({ ...newLeaveRequest, agencyId: agency?.id });

    // Notify admins
    const adminUsers = await UserModel.find({ agencyId: agency?.id, role: 'admin' }).select('-password').lean();
    if (await isNotifEnabled('leave')) {
        await NotificationModel.insertMany(adminUsers.map((admin: any) => ({
            id: generateId(), agencyId: agency?.id, userId: admin.id,
            message: `${currentUser.name} requested ${leaveData.type} leave (${daysDiff} day${daysDiff > 1 ? 's' : ''})`,
            read: false, timestamp: new Date().toISOString(), link: '/dashboard/team'
        })));
    }
    await ActivityModel.create({
        id: generateId(), agencyId: agency?.id, user: currentUser.name, userId: currentUser.id,
        action: 'submitted leave request', target: `${leaveData.type} leave for ${daysDiff} days`,
        timestamp: new Date().toISOString()
    });

    // Email admins
    try {
        const adminEmails = adminUsers.map((u: any) => u.email).filter(Boolean) as string[];
        if (adminEmails.length > 0) {
            await sendLeaveRequestedEmail({
                adminEmails, employeeName: currentUser.name,
                leaveType: leaveData.type, startDate: leaveData.startDate, endDate: leaveData.endDate,
                days: daysDiff, reason: leaveData.reason || 'No reason provided',
                teamLink: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard/team`,
            });
        }
    } catch (emailError) {
        console.error('[Email] Failed to send leave request email:', emailError);
    }

    revalidatePath('/dashboard/team');
    return newLeaveRequest;
}

// Admin approves a leave request
export async function approveLeaveRequest(leaveRequestId: string) {
    const currentUser = await getCurrentUser();
    if (!currentUser || currentUser.role !== 'admin') {
        throw new Error("Unauthorized: Only admins can approve leave requests");
    }

    await connectDB();
    const agency = await getCurrentAgency();
    const leaveRequest = await LeaveRequestModel.findOne({ id: leaveRequestId, agencyId: agency?.id }).lean();
    if (!leaveRequest) throw new Error('Leave request not found');
    if ((leaveRequest as any).status !== 'Pending') throw new Error(`Cannot approve ${(leaveRequest as any).status} leave request`);

    await LeaveRequestModel.updateOne(
        { id: leaveRequestId, agencyId: agency?.id },
        { $set: { status: 'Approved', reviewedBy: currentUser.id, reviewedAt: new Date().toISOString() } }
    );

    const startDate = new Date((leaveRequest as any).startDate);
    const endDate = new Date((leaveRequest as any).endDate);
    const daysDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;

    const employee = await UserModel.findOne({ id: (leaveRequest as any).userId, agencyId: agency?.id }).select('-password').lean();
    if (employee && await isNotifEnabled('leave')) {
        await NotificationModel.create({
            id: generateId(), agencyId: agency?.id, userId: (leaveRequest as any).userId,
            message: `Your ${(leaveRequest as any).type} leave request (${daysDiff} day${daysDiff > 1 ? 's' : ''}) has been approved by ${currentUser.name}`,
            read: false, timestamp: new Date().toISOString(), link: '/dashboard/team'
        });
    }
    await ActivityModel.create({
        id: generateId(), agencyId: agency?.id, user: currentUser.name, userId: currentUser.id,
        action: 'approved leave request',
        target: employee ? `${(employee as any).name}'s ${(leaveRequest as any).type} leave` : 'Leave request',
        timestamp: new Date().toISOString()
    });

    // Email employee
    try {
        if ((employee as any)?.email) {
            await sendLeaveApprovedEmail({
                employeeEmail: (employee as any).email,
                employeeName: (employee as any).name,
                leaveType: (leaveRequest as any).type,
                startDate: (leaveRequest as any).startDate,
                endDate: (leaveRequest as any).endDate,
                days: daysDiff, approvedBy: currentUser.name,
                teamLink: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard/team`,
            });
        }
    } catch (emailError) {
        console.error('[Email] Failed to send leave approved email:', emailError);
    }

    revalidatePath('/dashboard/team');
}

// Admin rejects a leave request
export async function rejectLeaveRequest(leaveRequestId: string, rejectionReason?: string) {
    const currentUser = await getCurrentUser();
    if (!currentUser || currentUser.role !== 'admin') {
        throw new Error("Unauthorized: Only admins can reject leave requests");
    }
    // Input sanitization
    if (rejectionReason) rejectionReason = sanitizeString(rejectionReason, 1000);

    await connectDB();
    const agency = await getCurrentAgency();
    const leaveRequest = await LeaveRequestModel.findOne({ id: leaveRequestId, agencyId: agency?.id }).lean();
    if (!leaveRequest) throw new Error('Leave request not found');
    if ((leaveRequest as any).status !== 'Pending') throw new Error(`Cannot reject ${(leaveRequest as any).status} leave request`);

    await LeaveRequestModel.updateOne(
        { id: leaveRequestId, agencyId: agency?.id },
        { $set: { status: 'Rejected', reviewedBy: currentUser.id, reviewedAt: new Date().toISOString() } }
    );

    const startDate2 = new Date((leaveRequest as any).startDate);
    const endDate2 = new Date((leaveRequest as any).endDate);
    const daysDiff2 = Math.ceil((endDate2.getTime() - startDate2.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    const employee2 = await UserModel.findOne({ id: (leaveRequest as any).userId, agencyId: agency?.id }).select('-password').lean();

    if (employee2 && await isNotifEnabled('leave')) {
        const message = rejectionReason
            ? `Your ${(leaveRequest as any).type} leave request (${daysDiff2} day${daysDiff2 > 1 ? 's' : ''}) was rejected by ${currentUser.name}. Reason: ${rejectionReason}`
            : `Your ${(leaveRequest as any).type} leave request (${daysDiff2} day${daysDiff2 > 1 ? 's' : ''}) was rejected by ${currentUser.name}`;
        await NotificationModel.create({
            id: generateId(), agencyId: agency?.id, userId: (leaveRequest as any).userId,
            message, read: false, timestamp: new Date().toISOString(), link: '/dashboard/team'
        });
    }
    await ActivityModel.create({
        id: generateId(), agencyId: agency?.id, user: currentUser.name, userId: currentUser.id, action: 'rejected leave request',
        target: employee2 ? `${(employee2 as any).name}'s ${(leaveRequest as any).type} leave` : 'Leave request',
        timestamp: new Date().toISOString()
    });

    // Email employee
    try {
        if ((employee2 as any)?.email) {
            await sendLeaveRejectedEmail({
                employeeEmail: (employee2 as any).email, employeeName: (employee2 as any).name,
                leaveType: (leaveRequest as any).type,
                startDate: (leaveRequest as any).startDate, endDate: (leaveRequest as any).endDate,
                days: daysDiff2, rejectedBy: currentUser.name, rejectionReason,
                teamLink: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard/team`,
            });
        }
    } catch (emailError) {
        console.error('[Email] Failed to send leave rejected email:', emailError);
    }

    revalidatePath('/dashboard/team');
}

// Employee cancels their own pending leave request
export async function cancelLeaveRequest(leaveRequestId: string) {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
        throw new Error("Unauthorized: You must be logged in");
    }

    // Store deleted request data for email before it's removed
    let deletedLeaveData: { type: string } | null = null;

    await connectDB();
    const agency = await getCurrentAgency();
    const leaveRequest = await LeaveRequestModel.findOne({ id: leaveRequestId, agencyId: agency?.id }).lean();
    if (!leaveRequest) throw new Error('Leave request not found');
    if ((leaveRequest as any).userId !== currentUser.id && currentUser.role !== 'admin') {
        throw new Error('Unauthorized: You can only cancel your own leave requests');
    }
    if ((leaveRequest as any).status !== 'Pending') {
        throw new Error(`Cannot cancel ${(leaveRequest as any).status} leave request. Please contact admin.`);
    }

    deletedLeaveData = { type: (leaveRequest as any).type };
    await LeaveRequestModel.deleteOne({ id: leaveRequestId, agencyId: agency?.id });
    await ActivityModel.create({
        id: generateId(), agencyId: agency?.id, user: currentUser.name, userId: currentUser.id,
        action: 'cancelled leave request', target: `${(leaveRequest as any).type} leave`,
        timestamp: new Date().toISOString()
    });

    if (currentUser.role !== 'admin') {
        const adminUsers2 = await UserModel.find({ agencyId: agency?.id, role: 'admin' }).select('-password').lean();
        if (await isNotifEnabled('leave')) {
            await NotificationModel.insertMany(adminUsers2.map((admin: any) => ({
                id: generateId(), agencyId: agency?.id, userId: admin.id,
                message: `${currentUser.name} cancelled their ${(leaveRequest as any).type} leave request`,
                read: false, timestamp: new Date().toISOString(), link: '/dashboard/team'
            })));
        }

        // Email admins
        try {
            const adminEmails2 = adminUsers2.map((u: any) => u.email).filter(Boolean) as string[];
            if (adminEmails2.length > 0 && deletedLeaveData) {
                await sendLeaveCancelledEmail({
                    adminEmails: adminEmails2, employeeName: currentUser.name,
                    leaveType: (deletedLeaveData as { type: string }).type,
                    teamLink: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard/team`,
                });
            }
        } catch (emailError) {
            console.error('[Email] Failed to send leave cancelled email:', emailError);
        }
    }

    revalidatePath('/dashboard/team');
}

// Get leave statistics for an employee
export async function getEmployeeLeaveStats(userId: string) {
    await requireAuth();
    await connectDB();
    const agency = await getCurrentAgency();
    const currentYear = new Date().getFullYear();
    const yearStart = new Date(`${currentYear}-01-01`).toISOString();
    const yearEnd = new Date(`${currentYear}-12-31T23:59:59`).toISOString();

    const leaveRequests = await LeaveRequestModel.find({
        userId, agencyId: agency?.id, createdAt: { $gte: yearStart, $lte: yearEnd }
    }).lean() as any[];

    const approvedLeaves = leaveRequests.filter((lr: any) => lr.status === 'Approved');

    // Calculate total days taken
    let casualDaysTaken = 0;
    let emergencyDaysTaken = 0;

    approvedLeaves.forEach(leave => {
        const startDate = new Date(leave.startDate);
        const endDate = new Date(leave.endDate);
        const days = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;

        if (leave.type === 'Casual') {
            casualDaysTaken += days;
        } else if (leave.type === 'Emergency') {
            emergencyDaysTaken += days;
        }
    });

    // Standard office leave allowances per year
    const casualLeaveAllowance = 15;
    const emergencyLeaveAllowance = 7;

    return {
        casualDaysTaken,
        casualDaysRemaining: Math.max(0, casualLeaveAllowance - casualDaysTaken),
        emergencyDaysTaken,
        emergencyDaysRemaining: Math.max(0, emergencyLeaveAllowance - emergencyDaysTaken),
        pendingRequests: leaveRequests.filter(lr => lr.status === 'Pending').length,
        approvedRequests: approvedLeaves.length,
        rejectedRequests: leaveRequests.filter((lr: any) => lr.status === 'Rejected').length

    };
}


export async function updateLeaveStatus(requestId: string, status: LeaveStatus) {
    const currentUser = await getCurrentUser();
    if (!currentUser || (currentUser.role !== 'admin' && currentUser.role !== 'manager')) {
        throw new Error("Unauthorized: Only admins can update leave status.");
    }
    await connectDB();
    const agency = await getCurrentAgency();
    const request = await LeaveRequestModel.findOne({ id: requestId, agencyId: agency?.id }).lean();
    if (!request) throw new Error('Request not found');
    if ((request as any).status !== 'Pending') throw new Error('Only pending requests can be updated');
    await LeaveRequestModel.updateOne(
        { id: requestId, agencyId: agency?.id },
        { $set: { status, reviewedBy: currentUser?.id, reviewedAt: new Date().toISOString() } }
    );
    const userDoc = await UserModel.findOne({ id: (request as any).userId, agencyId: agency?.id }).select('-password').lean();
    if (await isNotifEnabled('leave')) {
        await NotificationModel.create({
            id: generateId(), agencyId: agency?.id, userId: (request as any).userId,
            message: `Your leave request for ${fmtDate((request as any).startDate, 'UTC', 'en-US')} has been ${status}`,
            read: false, timestamp: new Date().toISOString(),
            link: `/dashboard/team/${(userDoc as any)?.username || (request as any).userId}?tab=leaves`
        });
    }

    revalidatePath('/dashboard/team');
}
// Refund Management Functions

export async function createRefund(refund: {
    projectId: string;
    amount: number;
    description: string;
    refundReason: string;
    originalTransactionId?: string;
    date: string;
}) {
    const currentUser = await getCurrentUser();
    if (!currentUser || (currentUser.role !== 'admin' && currentUser.role !== 'manager')) {
        throw new Error("Unauthorized: Only Admins and Managers can create refunds.");
    }
    // Input sanitization
    refund.description = sanitizeString(refund.description, 2000);
    refund.refundReason = sanitizeString(refund.refundReason, 2000);
    if (!refund.amount || !Number.isFinite(refund.amount) || refund.amount <= 0) throw new Error('Refund amount must be a valid positive number');
    if (refund.amount > 100_000_000) throw new Error('Refund amount exceeds maximum allowed value');

    await connectDB();
    const agency = await getCurrentAgency();
    const project = await ProjectModel.findOne({ id: refund.projectId, agencyId: agency?.id }).lean();
    if (!project) throw new Error('Project not found');

    // Validate refund amount
    const [incomeAgg, refundAgg] = await Promise.all([
        TransactionModel.aggregate([{ $match: { projectId: refund.projectId, agencyId: agency?.id, type: 'income', status: 'completed' } }, { $group: { _id: null, total: { $sum: '$amount' } } }]),
        TransactionModel.aggregate([{ $match: { projectId: refund.projectId, agencyId: agency?.id, category: 'Refund', status: 'completed' } }, { $group: { _id: null, total: { $sum: '$amount' } } }])
    ]);
    const projectIncome = incomeAgg[0]?.total || 0;
    const existingRefunds = refundAgg[0]?.total || 0;
    if (existingRefunds + refund.amount > projectIncome) {
        const _cur = await getDefaultCurrency();
        throw new Error(`Refund amount exceeds project income. Project income: ${formatCurrency(projectIncome, _cur)}, Existing refunds: ${formatCurrency(existingRefunds, _cur)}, Attempted refund: ${formatCurrency(refund.amount, _cur)}`);
    }

    const newRefund = {
        id: generateId(), agencyId: agency?.id,
        date: refund.date, amount: refund.amount, type: 'expense' as const, category: 'Refund' as const,
        description: refund.description, status: 'completed' as const, projectId: refund.projectId,
        performedBy: currentUser.id
    };
    await TransactionModel.create(newRefund);
    await ActivityModel.create({
        id: generateId(), agencyId: agency?.id, user: currentUser.name, userId: currentUser.id,
        action: 'issued refund', target: (project as any).name, timestamp: new Date().toISOString()
    });
    if ((project as any).clientId && await isNotifEnabled('refund')) {
        await NotificationModel.create({
            id: generateId(), agencyId: agency?.id, userId: (project as any).clientId,
            message: `Refund of ${formatCurrency(refund.amount, await getDefaultCurrency())} has been issued for ${(project as any).name}`,
            read: false, timestamp: new Date().toISOString(),
            link: `/dashboard/projects/${(project as any).slug || (project as any).id}`
        });
    }


    // Send email notification to client
    try {
        const client = project.clientId ? await getClientById(project.clientId) : null;

        if (client?.email) {
            await sendRefundIssuedEmail({
                clientEmail: client.email,
                clientName: client.name,
                amount: refund.amount,
                projectName: project.name,
                refundReason: refund.refundReason,
                projectLink: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard/projects/${project.slug || project.id}`,
            });
        }
    } catch (emailError) {
        console.error('[Email] Failed to send refund issued email:', emailError);
    }

    revalidatePath('/dashboard/finance');
    revalidatePath('/dashboard/clients');
    revalidatePath(`/dashboard/projects/${project.slug || project.id}`);

    return newRefund;
}

export async function getClientFinancialSummary(clientId: string) {
    await requireRole('admin', 'manager');
    await connectDB();
    const agency = await getCurrentAgency();
    const agencyFilter = requireAgencyFilter(agency);
    const projectIds = await ProjectModel.distinct('id', { clientId, ...agencyFilter });
    const projectIdSet = new Set(projectIds);
    const clientProjectsAll = await ProjectModel.find({ clientId, ...agencyFilter }).lean() as any[];

    const transactions = await TransactionModel.find({
        projectId: { $in: projectIds }, ...agencyFilter
    }).lean() as any[];

    const totalPaid = transactions
        .filter((t: any) => t.type === 'income' && t.status === 'completed')
        .reduce((sum: number, t: any) => sum + t.amount, 0);
    const totalRefunds = transactions
        .filter((t: any) => t.category === 'Refund' && t.status === 'completed')
        .reduce((sum: number, t: any) => sum + t.amount, 0);
    const lifetimeValue = totalPaid - totalRefunds;

    return {
        totalPaid, totalRefunds, lifetimeValue,
        projectCount: clientProjectsAll.length,
        activeProjectCount: clientProjectsAll.filter((p: any) => p.status === 'Active').length
    };
}

export async function getProjectRefunds(projectId: string) {
    await requireRole('admin', 'manager');
    await connectDB();
    const agency = await getCurrentAgency();
    const refunds = await TransactionModel.find({
        projectId, category: 'Refund', agencyId: agency?.id
    }).lean();
    return refunds.map(sanitizeDoc).sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

// ============================================
// BULK ESTIMATE TASK HOURS
// ============================================
export async function bulkEstimateTaskHours() {
    await connectDB();
    const currentUser = await getCurrentUser();
    if (!currentUser || (currentUser.role !== 'admin' && currentUser.role !== 'manager')) {
        throw new Error('Unauthorized: Only admins can bulk-estimate hours');
    }
    const agency = await getCurrentAgency();
    if (!agency) throw new Error('No agency context');

    // Find all tasks without estimatedHours
    const tasks = await TaskModel.find({
        agencyId: agency.id,
        $or: [{ estimatedHours: { $exists: false } }, { estimatedHours: null }, { estimatedHours: 0 }]
    }).lean();

    if (tasks.length === 0) return { updated: 0, message: 'All tasks already have estimated hours' };

    let updated = 0;
    for (const task of tasks) {
        const hours = estimateHoursFromTask(task as any);
        await TaskModel.updateOne(
            { id: (task as any).id, agencyId: agency.id },
            { $set: { estimatedHours: hours } }
        );
        updated++;
    }

    revalidatePath('/dashboard');
    return { updated, message: `Estimated hours for ${updated} tasks` };
}

// Smart heuristic for estimating hours from task metadata
function estimateHoursFromTask(task: { title?: string; description?: string; priority?: string; category?: string; subtasks?: any[] }): number {
    let hours = 2; // Base: 2 hours

    const title = (task.title || '').toLowerCase();
    const desc = (task.description || '').toLowerCase();
    const combined = title + ' ' + desc;

    // Keywords that suggest complexity
    const complexKeywords = ['integration', 'migrate', 'architecture', 'refactor', 'database', 'authentication', 'security', 'payment', 'deploy', 'infrastructure', 'api', 'redesign', 'overhaul'];
    const mediumKeywords = ['implement', 'create', 'build', 'develop', 'setup', 'configure', 'design', 'feature', 'page', 'component', 'module', 'dashboard'];
    const simpleKeywords = ['fix', 'update', 'change', 'rename', 'typo', 'color', 'text', 'label', 'padding', 'margin', 'spacing', 'icon', 'button', 'tooltip'];

    if (complexKeywords.some(k => combined.includes(k))) hours = 8;
    else if (mediumKeywords.some(k => combined.includes(k))) hours = 4;
    else if (simpleKeywords.some(k => combined.includes(k))) hours = 1;

    // Priority multiplier
    if (task.priority === 'High' || task.priority === 'Urgent') hours = Math.max(hours, 4);

    // Description length adds complexity
    if (desc.length > 500) hours = Math.ceil(hours * 1.5);
    else if (desc.length > 200) hours = Math.ceil(hours * 1.2);

    // Subtasks add time
    if (task.subtasks && Array.isArray(task.subtasks) && task.subtasks.length > 0) {
        hours += Math.ceil(task.subtasks.length * 0.5);
    }

    // Clamp to reasonable range
    return Math.max(0.5, Math.min(hours, 40));
}

// ============================================
// AI-POWERED TASK HOUR ESTIMATION
// ============================================
export async function aiEstimateTaskHours(
    projectId: string,
    title: string,
    description: string,
    priority: string
): Promise<number> {
    const user = await requireAuth();
    await connectDB();
    const agency = await getCurrentAgency();
    const agencyFilter = requireAgencyFilter(agency);

    const aiConfig = await getAgencyAIConfigInternal();
    if (!aiConfig) throw new Error('Singularity is not configured.');

    // Fetch completed tasks from this project for historical context
    const completedTasks = await TaskModel.find({
        projectId,
        status: 'Done',
        ...agencyFilter,
    }).lean();

    const historyLines = completedTasks
        .filter((t: any) => t.estimatedHours && t.estimatedHours > 0)
        .slice(0, 30) // cap at 30 for token efficiency
        .map((t: any) => `- "${t.title}" -> ${t.estimatedHours}h (Priority: ${t.priority || 'Medium'})`)
        .join('\n');

    const prompt = `You are a project estimation expert. Estimate the hours needed for this task.

### TASK TO ESTIMATE
**Title**: ${title}
**Description**: ${description || '(No description)'}
**Priority**: ${priority || 'Medium'}

### COMPLETED TASKS FROM THIS PROJECT (for reference)
${historyLines || '(No historical data available)'}

### RULES
- Compare with similar completed tasks above when available.
- If a similar task was completed before, use that as a baseline and adjust.
- Use 0.5h increments. Range: 0.5 - 40 hours.
- Simple tasks (typo, text, icon): 0.5-1h
- Small tasks (fix, button, tooltip): 1-2h
- Medium tasks (feature, form, component): 2-8h
- Complex tasks (integration, refactor, architecture): 8-24h
- Major tasks (migration, full redesign): 24-40h
- Return ONLY a single number. No text, no explanation, no units.`;

    try {
        const { text, tokens } = await generateContent(aiConfig, prompt);
        logAIUsage({ agencyId: agency!.id, userId: (user as any).id, feature: 'ai-hour-estimate', model: aiConfig.model || 'unknown', provider: aiConfig.provider, ...tokens });
        const cleaned = text.trim().replace(/[^0-9.]/g, '');
        const hours = parseFloat(cleaned);
        if (isNaN(hours) || hours <= 0) return estimateHoursFromTask({ title, description, priority });
        return Math.max(0.5, Math.min(Math.round(hours * 2) / 2, 40)); // round to 0.5 increments, clamp
    } catch (error: any) {
        console.error('[aiEstimateTaskHours] Error:', error.message);
        // Fallback to heuristic
        return estimateHoursFromTask({ title, description, priority });
    }
}

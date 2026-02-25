"use server";

import { db, User, Project, Invoice, Task, Notification, Activity, Client, Asset, PaymentConfig, LeaveRequest, LeaveType, LeaveStatus, UserPermissions } from "./db";
import { revalidatePath } from "next/cache";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { withAgencyId, getCurrentAgency } from "./agency-context";

import { cookies } from "next/headers";
import { generateId, resolveUserOrClient } from "./utils-server";

// Authentication
import { connectDB, AgencyModel, UserModel, ClientModel, SuperAdminModel, ProjectModel, TaskModel, InvoiceModel, TransactionModel, ServiceModel, NotificationModel, ActivityModel, AssetModel, MessageModel, LeaveRequestModel, SettingsModel } from "./mongodb";

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

export async function getAgencySettings() {
    const agency = await getCurrentAgency();
    if (!agency) return null;
    return {
        name: agency.name,
        logo: agency.logo || "",
        primaryColor: agency.primaryColor,
        secondaryColor: agency.secondaryColor,
        emailNotificationsEnabled: agency.settings?.emailNotificationsEnabled ?? true
    };
}

export async function updateEmailSettings(enabled: boolean) {
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

export async function updateAgencyDetails(name: string, logo: string, primaryColor?: string, secondaryColor?: string) {
    const agency = await getCurrentAgency();
    if (!agency) throw new Error("Unauthorized");

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

export async function getSessionId() {
    const cookieStore = await cookies();
    return cookieStore.get("userId")?.value;
}

export async function login(userId: string) {
    const cookieStore = await cookies();
    cookieStore.set("userId", userId);
}

// NEW: For Dev Mode - Bypass Login
export async function bypassLogin(userId: string, role: string) {
    const cookieStore = await cookies();
    cookieStore.set("userId", userId);
    cookieStore.set("userRole", role);
    return { success: true };
}

export async function logout() {
    const cookieStore = await cookies();
    cookieStore.delete("userId");
    cookieStore.delete("userRole");
}



export async function getAllUsers() {
    await connectDB();
    const users = await UserModel.find({}).lean();
    return users.map(u => ({ ...sanitizeDoc(u), agencyId: u.agencyId || 'default-agency' }));
}

export async function getAllClients() {
    await connectDB();
    const clients = await ClientModel.find({}).lean();
    return clients.map(c => ({ ...sanitizeDoc(c), agencyId: c.agencyId || 'default-agency' }));
}

export async function getSuperAdmins() {
    await connectDB();
    const admins = await SuperAdminModel.find({}).lean();
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
    await connectDB();
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth(); // 0-11

    // Parallel fetch for dashboard data
    const [transactions, pendingInvoicesList, activeProjectsCount, projects, tasks] = await Promise.all([
        TransactionModel.find({}).lean(),
        InvoiceModel.find({ status: { $in: ['Pending', 'Overdue', 'Processing'] } }).lean(),
        ProjectModel.countDocuments({ status: 'Active' }),
        ProjectModel.find({ status: 'Active' }).select('id').lean(), // For task priority check
        TaskModel.find({}).select('status priority projectId').lean() // Need all tasks for utilization
    ]);

    // 1. Revenue & Growth
    // Total Revenue = All completed income transactions (client payments) - Refunds
    const incomeTransactions = transactions.filter((t: any) => t.type === 'income' && t.status === 'completed');
    const totalIncome = incomeTransactions.reduce((acc: number, curr: any) => acc + curr.amount, 0);

    // Subtract refunds from revenue
    const refundTransactions = transactions.filter((t: any) => t.category === 'Refund' && t.status === 'completed');
    const totalRefunds = refundTransactions.reduce((acc: number, curr: any) => acc + curr.amount, 0);

    const totalRevenue = totalIncome - totalRefunds;

    // Calculate generic "Growth" (Current Month vs Previous Month)
    const currentMonthRevenue = incomeTransactions
        .filter(t => {
            const d = new Date(t.date);
            return d.getFullYear() === currentYear && d.getMonth() === currentMonth;
        })
        .reduce((acc, curr) => acc + curr.amount, 0);

    const prevMonthDate = new Date();
    prevMonthDate.setMonth(currentMonth - 1);
    const prevMonth = prevMonthDate.getMonth();
    const prevMonthYear = prevMonthDate.getFullYear();

    const prevMonthRevenue = incomeTransactions
        .filter(t => {
            const d = new Date(t.date);
            return d.getFullYear() === prevMonthYear && d.getMonth() === prevMonth;
        })
        .reduce((acc, curr) => acc + curr.amount, 0);

    let growthPercentage = 0;
    if (prevMonthRevenue > 0) {
        growthPercentage = Math.round(((currentMonthRevenue - prevMonthRevenue) / prevMonthRevenue) * 100);
    } else if (currentMonthRevenue > 0) {
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

    // 4. Team Utilization
    const totalTasks = tasks.length;
    const activeTasks = tasks.filter(t => t.status === 'In Progress').length;
    const utilization = totalTasks > 0 ? Math.round((activeTasks / totalTasks) * 100) : 0;

    return {
        revenue: totalRevenue,
        growth: growthPercentage,
        pending: pendingInvoicesAmount,
        overdueCount: overdueCount,
        activeProjects: activeProjectsCount,
        highPriorityCount,
        utilization,
        activeTasksCount: activeTasks
    };
}

export async function getRevenueData() {
    await connectDB();
    const transactions = await TransactionModel.find({}).lean();

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
    await connectDB();
    const [projects, services] = await Promise.all([
        ProjectModel.find({}).lean(),
        ServiceModel.find({}).lean()
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
    await connectDB();
    const activities = await ActivityModel.find({}).sort({ timestamp: -1 }).skip(offset).limit(limit).lean();
    return activities.map(a => sanitizeDoc(a));
}

export async function getUrgentTasks(limit = 5) {
    await connectDB();
    const tasks = await TaskModel.find({ status: { $ne: 'Done' }, priority: 'High' })
        .sort({ dueDate: 1 })
        .limit(limit)
        .lean();
    return tasks.map(t => ({ ...sanitizeDoc(t), agencyId: t.agencyId || 'default-agency' }));
}

export async function getClientDashboardData(clientId: string) {
    await connectDB();

    // Parallel Fetch
    const [projects, invoices, transactions, tasks, assets, notifications] = await Promise.all([
        ProjectModel.find({ clientId }).lean(),
        InvoiceModel.find({}).lean(), // Need to filter by projectIds in memory or 2-step
        TransactionModel.find({}).lean(), // Need to filter by projectIds
        TaskModel.find({}).lean(), // Need to filter by projectIds
        AssetModel.find({}).lean(), // Need to filter by projectIds
        NotificationModel.find({ userId: clientId }).sort({ timestamp: -1 }).limit(5).lean()
    ]);

    // Filter by project IDs owned by client
    const projectIds = new Set(projects.map((p: any) => p.id));

    const clientInvoices = invoices.filter((i: any) => projectIds.has(i.projectId));
    const clientTransactions = transactions.filter((t: any) => t.projectId && projectIds.has(t.projectId));
    const clientTasks = tasks.filter((t: any) => projectIds.has(t.projectId));
    const clientAssets = assets.filter((a: any) => projectIds.has(a.projectId));

    // Metrics
    const activeProjectsCount = projects.filter((p: any) => p.status === 'Active').length;
    const completedProjectsCount = projects.filter((p: any) => p.status === 'Completed').length;
    const pendingInvoices = clientInvoices.filter((i: any) => i.status === 'Pending' || i.status === 'Overdue');
    const totalDue = pendingInvoices.reduce((acc: number, inv: any) => acc + inv.amount, 0);
    const unreadNotificationsCount = notifications.filter((n: any) => !n.read).length; // Note: this is only from the latest 5. Ideally query count.
    const unreadCountReal = await NotificationModel.countDocuments({ userId: clientId, read: false });

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
    await connectDB();
    const tasks = await TaskModel.find({ assigneeId: userId }).lean();
    const user = await UserModel.findOne({ id: userId }).lean();

    // Recent Activity
    const activities = user
        ? await ActivityModel.find({ user: user.name }).sort({ timestamp: -1 }).limit(5).lean()
        : [];

    // Projects involved in
    const projectIds = [...new Set(tasks.map(t => t.projectId))];
    const projects = await ProjectModel.find({ id: { $in: projectIds } }).lean();

    return {
        tasks: tasks.map(t => ({ ...sanitizeDoc(t), agencyId: t.agencyId || 'default-agency' })),
        activities: activities.map(a => sanitizeDoc(a)),
        projects: projects.map(p => ({ ...sanitizeDoc(p), agencyId: p.agencyId || 'default-agency' })),
        user: user ? sanitizeDoc(user) : null
    };
}

// Auto-clear notifications older than 24 hours
// Auto-clear notifications older than 24 hours
export async function getNotifications(userId: string, offset = 0, limit = 1000): Promise<Notification[]> {
    await connectDB();
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    // Clean up old notifications efficiently
    await NotificationModel.deleteMany({ timestamp: { $lt: oneDayAgo } });

    const notifications = await NotificationModel.find({ userId }) // Filter by userId at DB level
        .sort({ timestamp: -1 }) // Sort by new
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

    let query: any = {};
    if (currentUser.role === 'client') {
        // STRICT: Only return projects owned by this client
        query.clientId = currentUserId;
    }

    const projects = await ProjectModel.find(query).skip(offset).limit(limit).lean();
    return projects.map(p => ({ ...sanitizeDoc(p), agencyId: p.agencyId || 'default-agency' }));
}

export async function getUserProjects(userId: string) {
    const data = await db.get();
    const user = data.users.find(u => u.id === userId) ||
        (data.clients && data.clients.find(c => c.id === userId) ? { role: 'client' } : null);

    if (!user) return [];

    if ((user as any).role === 'client') {
        return data.projects.filter(p => p.clientId === userId);
    } else {
        // For employees, find projects where they have assigned tasks
        // Or could be explicit members if we had that.
        // Let's use Task-based inferrence for now.
        const userTaskProjectIds = new Set(
            data.tasks.filter(t => t.assigneeId === userId).map(t => t.projectId)
        );
        return data.projects.filter(p => userTaskProjectIds.has(p.id));
    }
}

export async function getProject(id: string) {
    await connectDB();
    const project = await ProjectModel.findOne({ id }).lean();
    if (!project) return undefined;
    return { ...sanitizeDoc(project), agencyId: project.agencyId || 'default-agency' };
}

export async function getProjectBySlug(slug: string) {
    await connectDB();
    const project = await ProjectModel.findOne({ $or: [{ slug }, { id: slug }] }).lean();
    if (!project) return undefined;
    return { ...sanitizeDoc(project), agencyId: project.agencyId || 'default-agency' };
}

export async function getUsers() {
    await connectDB();
    const currentUserId = await getSessionId();
    const currentUser = await getUser(currentUserId!);
    const isAdmin = currentUser && (currentUser.role === 'admin' || currentUser.role === 'manager');

    // Fetch all users
    const usersRaw = await UserModel.find({}).lean();
    const users = usersRaw.map(u => ({ ...sanitizeDoc(u), agencyId: u.agencyId || 'default-agency' }));

    console.log('[getUsers Debug] Current User Role:', currentUser?.role);

    if (currentUser?.role === 'client') {
        return users.map(user => {
            const { salary, password, ...redacted } = user as any;
            return redacted as User;
        });
    }

    return users.map(user => {
        if (isAdmin || user.id === currentUserId) {
            // console.log(`[getUsers Debug] Not redacting for ${user.name} (Role: ${user.role}, Salary: ${user.salary})`);
            return user as User;
        }
        const { salary, ...redacted } = user as any;
        console.log(`[getUsers Debug] Redacting salary for ${user.name}`);
        return redacted as User;
    });
}

export async function getUser(id: string) {
    // 1. Resolve User
    const targetUser = await resolveUserOrClient(id);
    if (!targetUser) return undefined;

    // 2. Access Control
    const currentUserId = await getSessionId();
    if (!currentUserId) return undefined; // Require auth

    const currentUser = await resolveUserOrClient(currentUserId);
    const isAdmin = currentUser && (currentUser.role === 'admin' || currentUser.role === 'manager');

    if (isAdmin || currentUserId === id) {
        return sanitizeDoc(targetUser);
    }

    // 3. Redact
    const { salary, ...redacted } = targetUser;
    return sanitizeDoc(redacted as User);
}


export async function getUserByUsername(username: string) {
    // 1. Resolve
    const user = await resolveUserOrClient(username);
    if (!user) return undefined;

    // 2. Access Control
    const currentUserId = await getSessionId();
    if (!currentUserId) return undefined; // Require auth

    const currentUser = await getUser(currentUserId);
    if (currentUser?.role === 'admin' || currentUser?.role === 'manager' || currentUser?.id === user.id) {
        return sanitizeDoc(user);
    }

    // 3. Redact
    const { salary, password, ...redacted } = user;
    return sanitizeDoc(redacted as User);
}

export async function getUserTasks(userId: string, offset = 0, limit = 1000) {
    await connectDB();

    // Fetch tasks for user
    const tasksRaw = await TaskModel.find({ assigneeId: userId }).lean();

    // Verify projects exist (equivalent to validProjectIds logic but faster)
    const projectIds = [...new Set(tasksRaw.map(t => t.projectId))];
    const validProjects = await ProjectModel.find({ id: { $in: projectIds } }).select('id').lean();
    const validProjectIdSet = new Set(validProjects.map(p => p.id));

    // Filter and slice
    const validTasks = tasksRaw.filter(t => validProjectIdSet.has(t.projectId));

    return validTasks.slice(offset, offset + limit).map(t => ({ ...sanitizeDoc(t), agencyId: t.agencyId || 'default-agency' }));
}

// For Client Profile: Get projects they OWN
export async function getClientProjects(clientId: string) {
    await connectDB();

    const client = await resolveUserOrClient(clientId);
    const clientName = client ? client.name : null;

    let query: any = { clientId: clientId };
    if (clientName) {
        query = {
            $or: [
                { clientId: clientId },
                { client: clientName }
            ]
        };
    }

    const projects = await ProjectModel.find(query).lean();
    return projects.map(p => ({ ...sanitizeDoc(p), agencyId: p.agencyId || 'default-agency' }));
}

export async function getProjectTasks(projectIds: string[]) {
    await connectDB();
    const tasks = await TaskModel.find({ projectId: { $in: projectIds } }).lean();
    return tasks.map(t => ({ ...sanitizeDoc(t), agencyId: t.agencyId || 'default-agency' }));
}

// For Client Profile: Get tasks they CREATED (Assigned to others)
export async function getClientCreatedTasks(userId: string) {
    await connectDB();
    const tasks = await TaskModel.find({ createdBy: userId }).sort({ createdAt: -1 }).lean();
    return tasks.map(t => ({ ...sanitizeDoc(t), agencyId: t.agencyId || 'default-agency' }));
}

export async function getUserActivity(userId: string) {
    await connectDB();
    const user = await getUser(userId);
    if (!user) return [];

    // Limit to last 20 for dashboard
    const activities = await ActivityModel.find({ user: user.name })
        .sort({ timestamp: -1 })
        .limit(20)
        .lean();

    return activities.map(a => sanitizeDoc(a));
}

export async function getUserContributionHistory(userId: string) {
    await connectDB();
    const user = await getUser(userId);
    if (!user) return [];

    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
    const isoOneYearAgo = oneYearAgo.toISOString();

    const activities = await ActivityModel.find({
        user: user.name,
        timestamp: { $gte: isoOneYearAgo }
    }).lean();

    return activities.map(a => sanitizeDoc(a));
}

export async function createUser(user: Omit<User, "id" | "agencyId">) {
    // Generate/Validate username
    let username = user.username;
    if (!username) {
        // Auto-generate: lowercase, no spaces, random suffix if needed?
        // Let's try name-based.
        username = user.name.toLowerCase().replace(/\s+/g, '');
    }

    // Ensure uniqueness (simple check)
    const data = await db.get();
    let uniqueUsername = username;
    let counter = 1;
    while (data.users.find(u => u.username === uniqueUsername)) {
        uniqueUsername = `${username}${counter}`;
        counter++;
    }

    const newUser = await withAgencyId({ ...user, id: generateId(), username: uniqueUsername });
    if (!newUser.avatar) {
        newUser.avatar = `https://api.dicebear.com/7.x/avataaars/svg?seed=${newUser.name}`;
    }
    await db.update((data) => ({
        ...data,
        users: [...data.users, newUser]
    }));

    // Send welcome email to employee
    try {
        const agency = await getCurrentAgency();

        if (newUser.email) {
            await sendEmployeeAccountCreatedEmail({
                employeeEmail: newUser.email,
                employeeName: newUser.name,
                username: newUser.username,
                password: user.password || 'Please contact admin for password',
                role: newUser.role,
                dashboardLink: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard`,
                agencyName: agency?.name || 'Agency',
            });
        }
    } catch (emailError) {
        console.error('[Email] Failed to send employee account creation email:', emailError);
    }

    revalidatePath('/dashboard/team');
    return newUser;
}

// Import auth session
import { getSessionUser } from "@/lib/auth";

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
        if (session.role === 'superadmin') {
            const admin = await SuperAdminModel.findOne({ id: session.userId }).lean();
            if (admin) return sanitizeDoc(admin) as any;
        } else if (session.role === 'client') {
            const client = await ClientModel.findOne({ id: session.userId }).lean();
            if (client) {
                return sanitizeDoc({ ...client, role: 'client' }) as any;
            }
        } else {
            const user = await UserModel.findOne({ id: session.userId }).lean();
            if (user) return sanitizeDoc(user) as User;
        }
    }

    // 2. Legacy Fallback (Cookie based) - Kept for safety during transition
    const userId = await getSessionId();
    if (!userId) return null;

    // Check for Super Admin
    const allSuperAdmins = (await db.get()).superAdmins;
    const superAdmin = allSuperAdmins?.find(s => s.id === userId);
    if (superAdmin) return superAdmin;

    const data = await db.get();
    const user = data.users.find(u => u.id === userId);
    if (user) return user;

    const client = data.clients.find(c => c.id === userId);
    if (client) {
        // Return as User type for compatibility
        return {
            id: client.id,
            name: client.name,
            email: client.email,
            role: 'client' as any,
            agencyId: client.agencyId,
            avatar: client.logo,
            username: client.username || client.id.substring(0, 8)
        } as User;
    }

    return null;
}

import { hashPassword, comparePassword } from "@/lib/auth";

export async function updateUser(id: string, updates: Partial<User>, oldPassword?: string) {
    // Permission Check
    const currentUser = await getCurrentUser();
    if (!currentUser) throw new Error("Unauthorized");
    const isAdmin = currentUser.role === 'admin' || currentUser.role === 'manager';
    const isSelf = currentUser.id === id;

    if (!isAdmin && !isSelf) {
        throw new Error("Unauthorized: You can only edit your own profile.");
    }

    // Verify password if changing it
    if (updates.password) {
        if (!oldPassword) {
            throw new Error("Old password is required to change password");
        }

        await connectDB();

        // Find user in MongoDB (Check all collections since we don't strictly know type here easily without lookup)
        // But typically this action is for Users. Let's check User first.
        let user: any = await UserModel.findOne({ id: id });
        let model: any = UserModel;

        if (!user) {
            user = await ClientModel.findOne({ id: id });
            model = ClientModel;
        }
        if (!user) {
            user = await SuperAdminModel.findOne({ id: id });
            model = SuperAdminModel;
        }

        console.log(`[updateUser] Lookup ID: ${id}, Found: ${!!user}`); // DEBUG
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

        // Perform Update
        await model.findOneAndUpdate({ id: id }, { $set: updates });
        return; // Return void as original signature implies (or updated user)
    }

    // For non-password updates, continuing with MongoDB update logic
    await connectDB();

    // Check username uniqueness if updating username
    if (updates.username) {
        // ... (Reimplement MongoDB uniqueness check if needed, or rely on unique index)
        // For now, let's assume MongoDB unique index on username handles this, or skip strict check
        const existingUser = await UserModel.findOne({ username: updates.username, id: { $ne: id } });
        const existingClient = await ClientModel.findOne({ username: updates.username, id: { $ne: id } });
        const existingSuperAdmin = await SuperAdminModel.findOne({ username: updates.username, id: { $ne: id } });

        if (existingUser || existingClient || existingSuperAdmin) {
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

    await db.update(async (data) => {
        let newData = { ...data };

        // Try updating in Users
        const userExists = newData.users.some(u => u.id === id);
        if (userExists) {
            newData.users = newData.users.map(u => u.id === id ? { ...u, ...finalUpdates } : u);
        } else if (newData.clients && newData.clients.some(c => c.id === id)) {
            // Try updating in Clients
            newData.clients = newData.clients.map(c => c.id === id ? { ...c, ...finalUpdates as Partial<Client> } : c);
        } else {
            return data; // No user/client found
        }

        // Notify Admins
        if (notifyAdmin) {
            const adminUsers = newData.users.filter(u => u.role === 'admin' || u.role === 'manager');
            const newNotifications = await Promise.all(adminUsers.map(async admin => await withAgencyId({
                id: generateId(),
                userId: admin.id,
                message: `${currentUser.name} has requested to update their identity documents.`,
                read: false,
                timestamp: new Date().toISOString(),
                link: `/dashboard/team?edit=${id}` // Link to open edit dialog (needs implementation on page)
            })));
            newData.notifications = [...newData.notifications, ...newNotifications];
        }

        return newData;
    });
    revalidatePath('/dashboard/team');
}

export async function deleteClient(id: string) {
    const currentUser = await getCurrentUser();
    if (!currentUser || currentUser.role !== 'admin') {
        throw new Error("Unauthorized");
    }

    await db.update((data) => {
        // Find the client
        const client = data.clients.find(c => c.id === id);
        if (!client) {
            throw new Error("Client not found");
        }

        // IMPORTANT: Do NOT delete financial data (projects, invoices, transactions)
        // These must be preserved for:
        // 1. Accounting records
        // 2. Tax compliance
        // 3. Historical reporting
        // 4. Revenue calculations

        // Instead of deleting, mark client as "archived"
        // This preserves all financial data while hiding client from active lists

        return {
            ...data,
            clients: data.clients.map(c =>
                c.id === id
                    ? { ...c, archived: true, archivedAt: new Date().toISOString() }
                    : c
            ),
            // Keep ALL financial data intact:
            // - projects (with clientId reference)
            // - invoices (linked to projects)
            // - transactions (linked to projects)
            // - tasks (linked to projects)
            // - assets (linked to projects)
            // - notifications (user history)
            // - activities (audit trail)
        };
    });

    revalidatePath('/dashboard/clients');
}

export async function getArchivedClients() {
    const currentUser = await getCurrentUser();
    if (!currentUser || currentUser.role !== 'admin') {
        throw new Error("Unauthorized");
    }

    const data = await db.get();
    // Return only archived clients
    return data.clients.filter(c => c.archived === true);
}

export async function unarchiveClient(id: string) {
    const currentUser = await getCurrentUser();
    if (!currentUser || currentUser.role !== 'admin') {
        throw new Error("Unauthorized");
    }

    await db.update((data) => {
        // Find the archived client
        const client = data.clients.find(c => c.id === id);
        if (!client) {
            throw new Error("Client not found");
        }
        if (!client.archived) {
            throw new Error("Client is not archived");
        }

        return {
            ...data,
            clients: data.clients.map(c =>
                c.id === id
                    ? { ...c, archived: false, archivedAt: undefined }
                    : c
            )
        };
    });

    revalidatePath('/dashboard/clients');
}

export async function approveDocumentUpdate(userId: string, type: 'adhar' | 'pan' | 'contracts' | 'other' | 'both', approve: boolean) {
    const currentUser = await getCurrentUser();
    if (!currentUser || (currentUser.role !== 'admin' && currentUser.role !== 'manager')) {
        throw new Error("Unauthorized");
    }

    await db.update(async data => {
        const user = data.users.find(u => u.id === userId);
        if (!user) return data;

        let updates: any = {};
        if (approve) {
            if (type === 'adhar' || type === 'both') {
                if (user.pendingAdharCardImage) {
                    updates.adharCardImage = user.pendingAdharCardImage;
                    updates.pendingAdharCardImage = undefined;
                }
            }
            if (type === 'pan' || type === 'both') {
                if (user.pendingPanCardImage) {
                    updates.panCardImage = user.pendingPanCardImage;
                    updates.pendingPanCardImage = undefined;
                }
            }
            if (type === 'contracts') {
                if (user.pendingContracts) {
                    updates.contracts = user.pendingContracts;
                    updates.pendingContracts = undefined;
                }
            }
            if (type === 'other') {
                if (user.pendingOtherDocuments) {
                    updates.otherDocuments = user.pendingOtherDocuments;
                    updates.pendingOtherDocuments = undefined;
                }
            }
        } else {
            // Reject - just clear pending
            if (type === 'adhar' || type === 'both') updates.pendingAdharCardImage = undefined;
            if (type === 'pan' || type === 'both') updates.pendingPanCardImage = undefined;
            if (type === 'contracts') updates.pendingContracts = undefined;
            if (type === 'other') updates.pendingOtherDocuments = undefined;
        }

        // Notify User
        const message = approve
            ? `Your document update request for ${type === 'both' ? 'documents' : type.toUpperCase()} has been APPROVED.`
            : `Your document update request for ${type === 'both' ? 'documents' : type.toUpperCase()} has been REJECTED.`;

        const notification = await withAgencyId({
            id: generateId(),
            userId: userId,
            message: message,
            read: false,
            timestamp: new Date().toISOString()
        });

        return {
            ...data,
            users: data.users.map(u => u.id === userId ? { ...u, ...updates } : u),
            notifications: [...data.notifications, notification]
        };
    });
    revalidatePath('/dashboard/team');
}

export async function adminResetPassword(id: string, newPassword: string) {
    // Ideally verify admin privileges here via session/auth
    await db.update((data) => ({
        ...data,
        users: data.users.map(u => u.id === id ? { ...u, password: newPassword } : u)
    }));
    revalidatePath('/dashboard/team');
}

export async function deleteUser(id: string, password: string) {
    const isValid = await verifyAdminPassword(password);
    if (!isValid) throw new Error("Invalid password");

    await db.update((data) => ({
        ...data,
        users: data.users.filter(u => u.id !== id)
    }));
    revalidatePath('/dashboard/team');
}

export async function getServices() {
    const data = await db.get();
    return data.services;
}

export async function addService(name: string, jobs: { title: string; count: number }[]) {
    const newService = await withAgencyId({ id: generateId(), name, jobs });
    await db.update(async (data) => ({
        ...data,
        services: [...data.services, newService]
    }));
    revalidatePath('/dashboard/settings');
    revalidatePath('/dashboard/projects');
    return newService;
}

export async function deleteService(id: string) {
    const data = await db.get();
    const serviceToDelete = data.services.find(s => s.id === id);
    const serviceName = serviceToDelete?.name;

    await db.update((data) => {
        // Remove from services list
        const newServices = data.services.filter(c => c.id !== id);

        // Remove from all projects
        const newProjects = data.projects.map(p => {
            if (p.services) {
                // Filter out both ID and Name (for robustness during migration)
                const newProjectServices = p.services.filter(s => s !== id && s !== serviceName);
                if (newProjectServices.length !== p.services.length) {
                    return {
                        ...p,
                        services: newProjectServices
                    };
                }
            }
            return p;
        });

        return {
            ...data,
            services: newServices,
            projects: newProjects
        };
    });
    revalidatePath('/dashboard/settings');
    revalidatePath('/dashboard/projects');
}

export async function updateService(id: string, name: string, jobs: { title: string; count: number }[]) {
    await db.update((data) => ({
        ...data,
        services: data.services.map(c => c.id === id ? { ...c, name, jobs } : c)
    }));
    revalidatePath('/dashboard/settings');
    revalidatePath('/dashboard/projects');
}

export async function createProject(project: Omit<Project, "id" | "status" | "createdAt" | "agencyId">) {
    const currentUser = await getCurrentUser();
    if (!currentUser || (currentUser.role !== 'admin' && currentUser.role !== 'manager')) {
        throw new Error("Unauthorized: Only Admins and Managers can create projects.");
    }

    // Slug Generation
    let slug = project.slug;
    if (!slug) {
        slug = project.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    }

    // Unique Slug Check
    const data = await db.get();
    let uniqueSlug = slug;
    let counter = 1;
    while (data.projects.find(p => p.slug === uniqueSlug)) {
        uniqueSlug = `${slug}-${counter}`;
        counter++;
    }

    const newProject: Project = await withAgencyId({ ...project, id: generateId(), slug: uniqueSlug, status: "Active", createdAt: new Date().toISOString() });

    // Generate invoices for installment/monthly payments
    const newInvoices: Invoice[] = [];

    // Check if project has service configs with payment configuration
    if (project.serviceConfigs && project.serviceConfigs.length > 0) {
        const totalServices = project.serviceConfigs.length;

        for (const serviceConfig of project.serviceConfigs) {
            const paymentConfig = serviceConfig.paymentConfig;

            if (!paymentConfig) continue;

            if (paymentConfig.type === 'installment') {
                // For installment payments
                if (paymentConfig.installmentDates && paymentConfig.installmentDates.length > 0) {
                    const amountPerInstallment = paymentConfig.installmentAmount ||
                        (project.budget / totalServices / paymentConfig.installmentDates.length);

                    // Create an invoice for each installment date
                    for (const installmentDate of paymentConfig.installmentDates) {
                        newInvoices.push(await withAgencyId({
                            id: generateId(),
                            projectId: newProject.id,
                            amount: Math.round(amountPerInstallment),
                            status: "Pending",
                            date: installmentDate
                        }));
                    }
                }
            } else if (paymentConfig.type === 'monthly') {
                // For monthly payments - generate invoices for next 12 months or until project ends
                if (paymentConfig.monthlyAmount && paymentConfig.billingStartDate) {
                    const monthlyAmount = paymentConfig.monthlyAmount;
                    const startDate = new Date(paymentConfig.billingStartDate);
                    const projectDueDate = new Date(project.dueDate);

                    // Calculate number of months
                    const monthsDiff = Math.ceil((projectDueDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24 * 30));
                    const numberOfInvoices = Math.min(monthsDiff, 12); // Max 12 months

                    for (let i = 0; i < numberOfInvoices; i++) {
                        const invoiceDate = new Date(startDate);
                        invoiceDate.setMonth(invoiceDate.getMonth() + i);

                        newInvoices.push(await withAgencyId({
                            id: generateId(),
                            projectId: newProject.id,
                            amount: monthlyAmount,
                            status: "Pending",
                            date: invoiceDate.toISOString().split('T')[0]
                        }));
                    }
                }
            }
        }
    }

    await db.update(async (data) => {
        if (project.clientId && !data.clients?.find(c => c.id === project.clientId)) {
            throw new Error(`Client with ID ${project.clientId} not found`);
        }

        // Create notifications for client about new invoices
        let notifications = data.notifications || [];
        if (project.clientId && newInvoices.length > 0) {
            const newNotification = await withAgencyId({
                id: generateId(),
                userId: project.clientId,
                message: `${newInvoices.length} pending invoice(s) for project: ${project.name}`,
                read: false,
                timestamp: new Date().toISOString(),
                link: `/dashboard/finance`
            });
            notifications = [newNotification, ...notifications];
        }

        return {
            ...data,
            projects: [...data.projects, newProject],
            invoices: [...newInvoices, ...(data.invoices || [])],
            notifications,
            activities: [await withAgencyId({
                id: generateId(),
                user: currentUser.name,
                action: "created project",
                target: project.name,
                timestamp: new Date().toISOString()
            }), ...data.activities]
        }
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
                    clientEmail: client.email,
                    clientName: client.name,
                    projectName: project.name,
                    budget: project.budget,
                    paymentPlan: paymentPlan,
                    invoiceCount: newInvoices.length,
                    projectLink: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard/projects/${newProject.slug || newProject.id}`,
                });
            }
        } catch (emailError) {
            console.error('[Email] Failed to send project creation email:', emailError);
        }
    }

    revalidatePath('/dashboard/projects');
    revalidatePath('/dashboard/finance');
    return newProject;
}

export async function updateProjectPayment(projectId: string, serviceId: string, paymentConfig: PaymentConfig) {
    await db.update((data) => {
        return {
            ...data,
            projects: data.projects.map(p => {
                if (p.id === projectId && p.serviceConfigs) {
                    return {
                        ...p,
                        serviceConfigs: p.serviceConfigs.map(c =>
                            c.serviceId === serviceId ? { ...c, paymentConfig } : c
                        )
                    };
                }
                return p;
            })
        };
    });
    revalidatePath('/dashboard/projects/[id]', 'page');
    revalidatePath('/dashboard/projects');
}

export async function getTasks(projectId: string) {
    const data = await db.get();
    return data.tasks.filter(t => t.projectId === projectId);
}

export async function getUserPermissions(userId: string): Promise<UserPermissions> {
    const data = await db.get();
    const settings = data.settings;

    // Default to full permissions if not defined (Backward compatibility)
    const defaultPermissions: UserPermissions = {
        canManageTasks: true,
        canMarkDone: true,
        deleteAccess: 'any',
        canCreateProject: false,
        canUseAI: false
    };

    if (!settings.userPermissions) {
        return defaultPermissions;
    }

    return settings.userPermissions[userId] || defaultPermissions;
}

export async function updateUserPermissions(targetUserId: string, permissions: UserPermissions) {
    const currentUser = await getCurrentUser();
    if (!currentUser || (currentUser.role !== 'admin' && currentUser.role !== 'manager')) {
        throw new Error("Unauthorized: Only Admins can manage permissions.");
    }

    await db.update((data) => ({
        ...data,
        settings: {
            ...data.settings,
            userPermissions: {
                ...(data.settings.userPermissions || {}),
                [targetUserId]: permissions
            }
        }
    }));
    revalidatePath('/dashboard/settings');
}

export async function deleteTask(taskId: string) {
    const currentUser = await getCurrentUser();
    const userName = currentUser ? currentUser.name : "System";
    const userId = currentUser ? currentUser.id : "system";

    const permissions = await getUserPermissions(userId);

    const data = await db.get();
    const task = data.tasks.find(t => t.id === taskId);
    if (!task) throw new Error("Task not found");

    if (permissions.deleteAccess === 'none') {
        throw new Error("Unauthorized: You do not have permission to delete tasks.");
    }

    if (permissions.deleteAccess === 'own') {
        if (task.createdBy !== userId) {
            throw new Error("Unauthorized: You can only delete your own tasks.");
        }
    }

    // If 'any', proceed.

    await db.update(async (data) => ({
        ...data,
        tasks: data.tasks.filter(t => t.id !== taskId),
        activities: [await withAgencyId({
            id: generateId(),
            user: userName,
            action: "deleted task",
            target: task.title,
            timestamp: new Date().toISOString()
        }), ...data.activities]
    }));
    revalidatePath('/dashboard/projects/[id]', 'page');
    revalidatePath('/dashboard/projects');
}

export async function updateTaskStatus(taskId: string, status: Task['status']) {
    const currentUser = await getCurrentUser();
    const userName = currentUser ? currentUser.name : "System";
    const userId = currentUser ? currentUser.id : "system";

    const permissions = await getUserPermissions(userId);

    if (status === 'Done') {
        if (!permissions.canMarkDone) {
            throw new Error("Unauthorized: You do not have permission to mark tasks as Done.");
        }
    } else {
        if (!permissions.canManageTasks) {
            throw new Error("Unauthorized: You do not have permission to manage tasks.");
        }
    }

    await db.update(async (data) => {
        // Update task status
        const updatedTasks = data.tasks.map(t => t.id === taskId ? { ...t, status } : t);
        const task = updatedTasks.find(t => t.id === taskId);

        let notifications = data.notifications || [];
        let updatedProjects = data.projects;

        // Auto-complete project if all tasks are done
        if (task && status === 'Done') {
            const projectTasks = updatedTasks.filter(t => t.projectId === task.projectId);
            const allTasksDone = projectTasks.length > 0 && projectTasks.every(t => t.status === 'Done');

            if (allTasksDone) {
                const project = data.projects.find(p => p.id === task.projectId);

                // Only auto-complete if project is currently Active
                if (project && project.status === 'Active') {
                    updatedProjects = data.projects.map(p =>
                        p.id === task.projectId ? { ...p, status: 'Completed' as const } : p
                    );

                    // Notify client about project completion
                    if (project.clientId) {
                        const notif = await withAgencyId({
                            id: generateId(),
                            userId: project.clientId,
                            message: `Project "${project.name}" has been completed! All tasks are done.`,
                            read: false,
                            timestamp: new Date().toISOString(),
                            link: `/dashboard/projects/${project.id}`
                        });
                        notifications = [notif, ...notifications];
                    }

                    // Notify admin
                    const adminUsers = data.users.filter(u => u.role === 'admin');
                    const adminNotifs = await Promise.all(adminUsers.map(async admin => await withAgencyId({
                        id: generateId(),
                        userId: admin.id,
                        message: `Project "${project.name}" auto-completed - all tasks done`,
                        read: false,
                        timestamp: new Date().toISOString(),
                        link: `/dashboard/projects/${project.id}`
                    })));
                    notifications = [...adminNotifs, ...notifications];

                    // Send email notifications for project completion
                    try {
                        const client = project.clientId ? await getClientById(project.clientId) : null;
                        const adminEmails = adminUsers.map(u => u.email).filter(Boolean) as string[];

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

        return {
            ...data,
            tasks: updatedTasks,
            projects: updatedProjects,
            notifications,
            activities: [await withAgencyId({
                id: generateId(),
                user: userName,
                action: "moved task to " + status,
                target: data.tasks.find(t => t.id === taskId)?.title || "Task",
                timestamp: new Date().toISOString()
            }), ...data.activities]
        };
    });

    revalidatePath('/dashboard/projects/[id]', 'page');
    revalidatePath('/dashboard/projects');
}

export async function updateTask(taskId: string, updates: Partial<Task>) {
    const currentUser = await getCurrentUser();
    const userName = currentUser ? currentUser.name : "System";
    const userId = currentUser ? currentUser.id : "system";

    const permissions = await getUserPermissions(userId);

    // If updating status to Done
    if (updates.status === 'Done') {
        if (!permissions.canMarkDone) {
            throw new Error("Unauthorized: You do not have permission to mark tasks as Done.");
        }
    }

    // If updating anything else (including moving to other statuses)
    // Technically if ONLY moving to Done, we might allow it if canMarkDone is true?
    // But usually updateTask implies editing. 
    // Let's enforce canManageTasks for any update that isn't JUST status=Done check above.
    // If user has canMarkDone but !canManageTasks, they should use updateTaskStatus theoretically, 
    // or we check if OTHER fields are being updated.

    // For simplicity: If updating fields other than status, require canManageTasks.
    const isStatusOnly = Object.keys(updates).length === 1 && updates.status;
    if (!isStatusOnly || (updates.status && updates.status !== 'Done')) {
        if (!permissions.canManageTasks) {
            throw new Error("Unauthorized: You do not have permission to edit tasks.");
        }
    }

    await db.update(async (data) => {
        let updatedProjects = data.projects;

        // Validation
        if (updates.projectId && !data.projects.find(p => p.id === updates.projectId)) {
            throw new Error(`Project with ID ${updates.projectId} not found`);
        }
        if (updates.assigneeId && !data.users.find(u => u.id === updates.assigneeId)) {
            throw new Error(`User with ID ${updates.assigneeId} not found`);
        }

        // Auto-assign department to project if task category changes/added
        if (updates.category) {
            const task = data.tasks.find(t => t.id === taskId);
            if (task && task.projectId) {
                updatedProjects = data.projects.map(p => {
                    if (p.id === task.projectId) {
                        const currentServices = p.services || ((p as any).departments ? (p as any).departments : []);

                        // Resolve category to ID if possible
                        const service = data.services?.find(s => s.name === updates.category || s.id === updates.category);
                        const categoryIdOrName = service ? service.id : updates.category;

                        if (!currentServices.includes(categoryIdOrName!)) {
                            return { ...p, services: [...currentServices, categoryIdOrName!] };
                        }
                    }
                    return p;
                });
            }
        }

        return {
            ...data,
            projects: updatedProjects,
            tasks: data.tasks.map(t => t.id === taskId ? { ...t, ...updates } : t),
            activities: [await withAgencyId({
                id: generateId(),
                user: userName,
                action: "updated task",
                target: updates.title || data.tasks.find(t => t.id === taskId)?.title || "Task",
                timestamp: new Date().toISOString()
            }), ...data.activities]
        };
    });
    revalidatePath('/dashboard/projects/[id]', 'page');
    revalidatePath('/dashboard/projects'); // Also revalidate projects list as departments might change
}

export async function addComment(taskId: string, userId: string, text: string) {
    const newComment = {
        id: generateId(),
        userId,
        text,
        timestamp: new Date().toISOString()
    };

    await db.update(async (data) => {
        return {
            ...data,
            tasks: data.tasks.map(t =>
                t.id === taskId
                    ? { ...t, comments: [...(t.comments || []), newComment] }
                    : t
            ),
            activities: [await withAgencyId({
                id: generateId(),
                user: "User", // Ideally fetch user name
                action: "commented on task",
                target: data.tasks.find(t => t.id === taskId)?.title || "Task",
                timestamp: new Date().toISOString()
            }), ...data.activities]
        };
    });

    // Send email notification to task participants
    try {
        const data = await db.get();
        const task = data.tasks.find(t => t.id === taskId);
        const commenter = await getUser(userId);

        if (task && commenter) {
            // Gather all participants (assignee, creator, previous commenters)
            const participantIds = new Set<string>();
            if (task.assigneeId) participantIds.add(task.assigneeId);
            if (task.createdBy) participantIds.add(task.createdBy);
            task.comments?.forEach(c => participantIds.add(c.userId));

            // Remove the commenter from recipients
            participantIds.delete(userId);

            // Get emails
            const participantEmails: string[] = [];
            for (const id of participantIds) {
                const user = await getUser(id);
                if (user?.email) participantEmails.push(user.email);
            }

            if (participantEmails.length > 0) {
                await sendTaskCommentEmail({
                    recipientEmails: participantEmails,
                    taskTitle: task.title,
                    commenterName: commenter.name,
                    commentText: text,
                    taskLink: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard/projects/${task.projectId}?task=${taskId}`,
                });
            }
        }
    } catch (emailError) {
        console.error('[Email] Failed to send task comment email:', emailError);
    }

    revalidatePath('/dashboard/projects/[id]', 'page');
    revalidatePath('/dashboard/projects');
    return newComment;
}


export async function createTask(task: Omit<Task, "id" | "agencyId">) {
    const currentUser = await getCurrentUser();
    const createdBy = currentUser ? currentUser.id : "system";

    const newTask = await withAgencyId({
        ...task,
        id: generateId(),
        createdAt: new Date().toISOString(),
        createdBy,
        comments: []
    } as unknown as Task);

    await db.update(async (data) => {
        return {
            ...data,
            tasks: [...data.tasks, newTask],
            activities: [await withAgencyId({
                id: generateId(),
                user: currentUser ? currentUser.name : "System",
                action: "created task",
                target: task.title,
                timestamp: new Date().toISOString()
            }), ...data.activities]
        };
    });

    // Send email notification to assignee
    if (task.assigneeId) {
        try {
            const assignee = await getUser(task.assigneeId);
            const project = await getProject(task.projectId);

            if (assignee?.email && project) {
                await sendTaskAssignedEmail({
                    assigneeEmail: assignee.email,
                    assigneeName: assignee.name,
                    taskTitle: task.title,
                    taskDescription: task.description || '',
                    projectName: project.name,
                    dueDate: task.dueDate,
                    priority: task.priority || 'Medium',
                    taskLink: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard/projects/${task.projectId}?task=${newTask.id}`,
                });
            }
        } catch (emailError) {
            console.error('[Email] Failed to send task assignment email:', emailError);
        }
    }

    revalidatePath('/dashboard/projects/[id]', 'page');
    revalidatePath('/dashboard/projects');
    return newTask;
}


// --- Client Actions ---

export async function getClients() {
    const data = await db.get();
    // Only return active (non-archived) clients
    // Archived clients are hidden but their financial data is preserved
    return data.clients.filter(c => !c.archived);
}

export async function getClientByUsername(username: string) {
    const data = await db.get();
    // Return by username (preferred) or ID (fallback)
    return data.clients.find(c => c.username === username || c.id === username);
}

export async function getClientById(id: string) {
    const data = await db.get();
    return data.clients?.find(c => c.id === id);
}

export async function createClient(client: Omit<Client, "id" | "agencyId">) {
    const currentUser = await getCurrentUser();
    if (!currentUser || (currentUser.role !== 'admin' && currentUser.role !== 'manager')) {
        throw new Error("Unauthorized: Only Admins can create clients.");
    }

    // Generate username if not provided
    let username = client.username;
    if (!username) {
        username = client.companyName.toLowerCase().replace(/[^a-z0-9]+/g, '');
    }

    // Ensure uniqueness
    const data = await db.get();
    let uniqueUsername = username;
    let counter = 1;
    // Check collision with Users OR Clients
    while (
        data.users.find(u => u.username === uniqueUsername) ||
        data.clients.find(c => c.username === uniqueUsername)
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

    await db.update((data) => ({
        ...data,
        clients: [...(data.clients || []), newClient]
    }));

    // Send welcome email to client
    try {
        const agency = await getCurrentAgency();

        if (newClient.email) {
            await sendClientAccountCreatedEmail({
                clientEmail: newClient.email,
                clientName: newClient.name,
                companyName: newClient.companyName,
                username: newClient.username || '',
                password: client.password || 'Please contact admin for password',
                dashboardLink: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard`,
                agencyName: agency?.name || 'Agency',
            });
        }
    } catch (emailError) {
        console.error('[Email] Failed to send client account creation email:', emailError);
    }

    revalidatePath('/dashboard/clients');
    revalidatePath('/dashboard/team'); // In case they appear there too
    return newClient;
}

export async function updateClient(id: string, updates: Partial<Client>) {
    const currentUser = await getCurrentUser();
    if (!currentUser || (currentUser.role !== 'admin' && currentUser.role !== 'manager')) {
        throw new Error("Unauthorized");
    }

    await db.update((data) => ({
        ...data,
        clients: data.clients.map(c => c.id === id ? { ...c, ...updates } : c)
    }));
    revalidatePath('/dashboard/clients');
    revalidatePath(`/dashboard/clients/${id}`);
}




// Project Actions
export async function updateProject(id: string, updates: Partial<Project>) {
    const currentUser = await getCurrentUser();

    // Status Change Validation
    if (updates.status) {
        // 1. Permission Check - Only admins and managers can change status
        if (!currentUser || (currentUser.role !== 'admin' && currentUser.role !== 'manager')) {
            throw new Error("Unauthorized: Only Admins and Managers can change project status.");
        }

        const data = await db.get();

        // 2. Completion Logic - Warn if trying to complete with open tasks
        if (updates.status === 'Completed') {
            const projectTasks = data.tasks.filter(t => t.projectId === id);
            const hasOpenTasks = projectTasks.some(t => t.status !== 'Done');

            if (hasOpenTasks) {
                const openCount = projectTasks.filter(t => t.status !== 'Done').length;
                // Allow admin to override, but warn them
                console.warn(`Warning: Marking project as Completed with ${openCount} unfinished tasks.`);
            }
        }
    }

    const data = await db.get();
    const oldProject = data.projects.find(p => p.id === id);

    await db.update(async (data) => {
        let notifications = data.notifications || [];

        // Notify Client on Status Change
        if (updates.status && oldProject && oldProject.status !== updates.status && oldProject.clientId) {
            const statusMessages: Record<string, string> = {
                'Active': 'is now active and in progress',
                'Completed': 'has been completed',
                'On Hold': 'has been put on hold',
                'Cancelled': 'has been cancelled'
            };

            const message = statusMessages[updates.status] || `status updated to ${updates.status}`;

            notifications = [await withAgencyId({
                id: generateId(),
                userId: oldProject.clientId,
                message: `Project "${oldProject.name}" ${message}`,
                read: false,
                timestamp: new Date().toISOString(),
                link: `/dashboard/projects/${id}`
            }), ...notifications];
        }

        return {
            ...data,
            projects: data.projects.map(p => p.id === id ? { ...p, ...updates } : p),
            notifications
        };
    });

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
    // Mock check - in prod use env vars / auth system
    return password === "123";
}

export async function deleteProject(id: string, password: string) {
    const isValid = await verifyAdminPassword(password);
    if (!isValid) throw new Error("Invalid password");

    await db.update((data) => ({
        ...data,
        projects: data.projects.filter(p => p.id !== id),
        // Delete associated tasks
        tasks: data.tasks.filter(t => t.projectId !== id)
    }));

    revalidatePath('/dashboard/projects');
    return true;
}

// ----------------------------------------------------------------------
// Finance Actions
// ----------------------------------------------------------------------

import { Transaction, TransactionType, TransactionCategory } from "./db";

export async function getTransactions(projectId?: string, userId?: string, category?: string) {
    const data = await db.get();
    let transactions = data.transactions || [];

    if (projectId) {
        transactions = transactions.filter(t => t.projectId === projectId);
    }

    // Attempt to filter by user if possible.
    // Since transaction model doesn't explicitly have userId, we check description for now
    // or rely on other means. ideally we should add userId to transaction model.
    // For now, if userId is provided, we might filter 'Salary' type transactions by user name?
    // Or just skip strict user filtering for general transactions if not supported schema-wise.
    // Let's filter by description containing user name if we can match it, or if there's a related task?
    // Actually, let's keep it simple: filter by 'Salary' category and user name in description if available.
    // Category filter for "Others"
    const currentUserId = await getSessionId();
    if (currentUserId) {
        const currentUser = await getUser(currentUserId);
        if (currentUser?.role === 'client') {
            // STRICT: Clients can only see transactions related to THEIR projects
            // They cannot see "Salary" or internal expenses unless linked to their project (usually Income for us, Expense for them)
            // Ideally we only show them:
            // 1. Incomes (Payments they made) where projectId is theirs.
            // 2. Maybe Project expenses if Transparency is enabled? For now, let's stick to "Payments from Client".

            // Get all projects owned by this client
            const clientProjectIds = data.projects.filter(p => p.clientId === currentUserId).map(p => p.id);

            // Filter transactions: Must be in one of their projects AND usually type 'income' (Money from them)
            // Or 'expense' if we bill them for specific items?
            // Let's show ALL transactions linked to their projects for maximum transparency, 
            // BUT maybe filter out sensitive internal categories unless specifically "Project" category?
            transactions = transactions.filter(t =>
                t.projectId && clientProjectIds.includes(t.projectId)
            );
        }
    }

    if (category) {
        transactions = transactions.filter(t => t.category === category);
    }

    if (userId) {
        const user = data.users.find(u => u.id === userId);
        if (user) {
            transactions = transactions.filter(t =>
                t.description.toLowerCase().includes(user.name.toLowerCase()) ||
                (t.category === 'Salary' && t.description.includes(user.name))
            );
        }
    }

    // Sort by date desc
    return transactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

export async function getClientFinanceData(clientId: string) {
    const data = await db.get();
    const clientProjects = data.projects.filter(p => p.clientId === clientId).map(p => p.id);

    // Invoices for all client projects
    const invoices = (data.invoices || []).filter(i => clientProjects.includes(i.projectId));

    // Transactions for all client projects
    const transactions = (data.transactions || []).filter(t => t.projectId && clientProjects.includes(t.projectId));

    // Total Invoiced = Sum of ALL invoices (paid + pending)
    const totalInvoiced = invoices.reduce((acc, curr) => acc + curr.amount, 0);

    // Total Paid = Sum of COMPLETED INCOME transactions (actual payments received from client)
    const totalPaid = transactions
        .filter(t => t.type === 'income' && t.status === 'completed')
        .reduce((acc, curr) => acc + curr.amount, 0);

    // Pending Amount = Pending + Processing + Overdue invoices
    const pendingAmount = invoices
        .filter(i => i.status === 'Pending' || i.status === 'Processing' || i.status === 'Overdue')
        .reduce((acc, curr) => acc + curr.amount, 0);

    // Refunds (if any) - Money returned to client
    const totalRefunds = transactions
        .filter(t => t.type === 'expense' && t.status === 'completed')
        .reduce((acc, curr) => acc + curr.amount, 0);

    // Net Paid = Total Paid - Refunds
    const netPaid = totalPaid - totalRefunds;

    return {
        invoices: invoices.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
        transactions: transactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
        stats: {
            totalInvoiced,
            totalPaid: totalPaid, // Actual payments received
            pendingAmount,
            ltv: netPaid // Lifetime Value (Net after refunds)
        }
    };
}

export async function getClientActivityLogs(clientId: string, limit = 20) {
    const data = await db.get();
    const clientProjects = new Set(data.projects.filter(p => p.clientId === clientId).map(p => p.name));

    return data.activities.filter(a => {
        // Activity BY the client
        if (a.user === clientId) return true;
        // Activity ON client's project (Target matches Project Name)
        // Note: Target is usually a human readable string. This is a heuristic.
        // Ideally we'd store entityId and entityType. 
        // For now, if target includes project name?
        // Let's stick to actions BY the client or strictly matching target if we can.
        // Or just return actions BY the client for now to be safe.
        // Actually, let's include actions where the user is the client.
        return a.user === clientId;
    }).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).slice(0, limit);
}

export async function getCategoryMemberSummary(category: string) {
    const data = await db.get();
    const transactions = (data.transactions || []).filter(t => t.category === category);

    // Grouping Logic
    const summaryMap = new Map<string, { id: string; name: string; total: number; count: number; avatar?: string }>();

    if (category === 'Internal Transfer') {
        const users = data.users;
        transactions.forEach(t => {
            // Find user mentioned in description
            const user = users.find(u => t.description.toLowerCase().includes(u.name.toLowerCase()));
            if (user) {
                const existing = summaryMap.get(user.id) || { id: user.id, name: user.name, total: 0, count: 0, avatar: user.avatar };
                existing.total += t.amount;
                existing.count += 1;
                summaryMap.set(user.id, existing);
            } else {
                // Fallback for unknown users
                const name = "Unknown";
                const existing = summaryMap.get(name) || { id: "unknown", name, total: 0, count: 0 };
                existing.total += t.amount;
                existing.count += 1;
                summaryMap.set(name, existing);
            }
        });
    } else if (category === 'Investor') {
        // For investors, group by description (assuming description is investor Name)
        // Or try to parse name if possible. Let's group by description for now as simpler heuristic.
        transactions.forEach(t => {
            const name = t.description; // Assume description is "Investor Name" or similar
            const existing = summaryMap.get(name) || { id: name, name, total: 0, count: 0 };
            existing.total += t.amount;
            existing.count += 1;
            summaryMap.set(name, existing);
        });
    }

    return Array.from(summaryMap.values()).sort((a, b) => b.total - a.total);
}

export async function createTransaction(transaction: Omit<Transaction, "id" | "status" | "agencyId"> & { status?: Transaction['status'] }) {
    // STRICT SERVER-SIDE VALIDATION
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
    if (transaction.category === 'Other' && transaction.type !== 'expense') {
        throw new Error("Validation Error: 'Other' category is for expenses only.");
    }

    // Note: Internal Transfer checks are harder without memberId in transaction object,
    // but the modal handles the description/type logic. We assume if category is Internal Transfer,
    // dependencies were met by client. Ideally we'd add memberId to schema for strict server check.

    const newTransaction: Transaction = await withAgencyId({
        ...transaction,
        id: generateId(),
        status: transaction.status || "completed"
    });

    await db.update(async (data) => {
        if (transaction.projectId && !data.projects?.find(p => p.id === transaction.projectId)) {
            throw new Error(`Project with ID ${transaction.projectId} not found`);
        }

        // GENERATE NOTIFICATION FOR SALARY
        const notifications = [...(data.notifications || [])];
        if (newTransaction.category === 'Salary' && newTransaction.userId && newTransaction.type === 'expense') {
            notifications.unshift(await withAgencyId({
                id: generateId(),
                userId: newTransaction.userId,
                message: `Salary Payment Received: ₹${newTransaction.amount.toLocaleString()}`,
                read: false,
                timestamp: new Date().toISOString(),
                link: '/dashboard/finance' // Or profile link? Finance seems appropriate if they have access, or just informational.
            }));
        }

        // Send email for salary payment
        if (newTransaction.category === 'Salary' && newTransaction.userId && newTransaction.type === 'expense') {
            try {
                const employee = data.users.find(u => u.id === newTransaction.userId);
                if (employee?.email) {
                    await sendSalaryPaidEmail({
                        employeeEmail: employee.email,
                        employeeName: employee.name,
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

        return {
            ...data,
            transactions: [newTransaction, ...(data.transactions || [])],
            notifications
        };
    });

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

    await db.update(async (data) => {
        const transactionIndex = data.transactions.findIndex(t => t.id === transactionId);
        if (transactionIndex === -1) {
            throw new Error("Transaction not found");
        }

        const transaction = data.transactions[transactionIndex];
        if (transaction.status === 'completed') {
            throw new Error("Transaction is already active/completed");
        }

        // Update status
        const updatedTransaction = { ...transaction, status: 'completed' as const, date: new Date().toISOString().split('T')[0] }; // Update date to payment date? Or keep original due date? Usually payment date.

        const newTransactions = [...data.transactions];
        newTransactions[transactionIndex] = updatedTransaction;

        return {
            ...data,
            transactions: newTransactions
        };
    });

    revalidatePath('/dashboard/finance');
}

export async function getInvoices(projectId?: string) {
    const data = await db.get();
    let invoices = data.invoices || [];

    const currentUserId = await getSessionId();
    if (currentUserId) {
        const currentUser = await getUser(currentUserId);
        if (currentUser?.role === 'client') {
            // STRICT: Filter projects owned by client first, then invoices
            const clientProjectIds = data.projects.filter(p => p.clientId === currentUserId).map(p => p.id);
            invoices = invoices.filter(i => clientProjectIds.includes(i.projectId));
        }
    }

    if (projectId) {
        invoices = invoices.filter(i => i.projectId === projectId);
    }

    return invoices.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

// Client marks invoice as paid (moves to Processing status)
export async function clientMarkInvoiceAsPaid(invoiceId: string) {
    const currentUser = await getCurrentUser();
    if (!currentUser || currentUser.role !== 'client') {
        throw new Error("Unauthorized: Only clients can mark invoices as paid");
    }

    await db.update(async (data) => {
        const invoice = data.invoices.find(i => i.id === invoiceId);
        if (!invoice) {
            throw new Error("Invoice not found");
        }

        // Verify this invoice belongs to a project owned by this client
        const project = data.projects.find(p => p.id === invoice.projectId);
        if (!project || project.clientId !== currentUser.id) {
            throw new Error("Unauthorized: This invoice doesn't belong to you");
        }

        // Only allow marking Pending invoices as paid
        if (invoice.status !== 'Pending') {
            throw new Error(`Cannot mark ${invoice.status} invoice as paid`);
        }

        // Update status to Processing
        invoice.status = 'Processing';

        // Notify admin about payment claim
        const notifications = data.notifications || [];
        const adminUsers = data.users.filter(u => u.role === 'admin');

        for (const admin of adminUsers) {
            notifications.unshift(await withAgencyId({
                id: generateId(),
                userId: admin.id,
                message: `${currentUser.name} marked invoice ₹${invoice.amount.toLocaleString()} as paid - Awaiting approval`,
                read: false,
                timestamp: new Date().toISOString(),
                link: `/dashboard/finance`
            }));
        }

        return { ...data, notifications };
    });

    // Send email notification to admins
    try {
        const data = await db.get();
        const adminUsers = data.users.filter(u => u.role === 'admin');
        const adminEmails = adminUsers.map(u => u.email).filter(Boolean) as string[];
        const invoice = data.invoices.find(i => i.id === invoiceId);
        const project = invoice ? await getProject(invoice.projectId) : null;

        if (adminEmails.length > 0 && invoice && project) {
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
    const currentUser = await getCurrentUser();
    if (!currentUser || currentUser.role !== 'admin') {
        throw new Error("Unauthorized: Only admins can approve payments");
    }

    await db.update(async (data) => {
        const invoice = data.invoices.find(i => i.id === invoiceId);
        if (!invoice) {
            throw new Error("Invoice not found");
        }

        if (invoice.status !== 'Processing') {
            throw new Error(`Can only approve Processing invoices, this is ${invoice.status}`);
        }

        // Update invoice status to Paid
        invoice.status = 'Paid';

        // Create income transaction
        const project = data.projects.find(p => p.id === invoice.projectId);

        // Calculate Installment Number for better description
        const projectInvoices = data.invoices
            .filter(i => i.projectId === invoice.projectId)
            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

        const installmentIndex = projectInvoices.findIndex(i => i.id === invoice.id);
        const installmentNumber = installmentIndex !== -1 ? installmentIndex + 1 : '?';
        const totalInstallments = projectInvoices.length;

        const description = `Installment ${installmentNumber}/${totalInstallments} for ${project?.name || 'Project'} - ${invoice.date}`;

        const newTransaction: Transaction = await withAgencyId({
            id: generateId(),
            date: new Date().toISOString().split('T')[0],
            amount: invoice.amount,
            type: 'income',
            category: 'Project',
            description: description,
            status: 'completed',
            projectId: invoice.projectId
        });

        data.transactions = [newTransaction, ...(data.transactions || [])];

        // Notify client about approval
        const notifications = data.notifications || [];
        if (project?.clientId) {
            notifications.unshift(await withAgencyId({
                id: generateId(),
                userId: project.clientId,
                message: `Payment approved! ₹${invoice.amount.toLocaleString()} received for ${project.name}`,
                read: false,
                timestamp: new Date().toISOString(),
                link: `/dashboard/finance`
            }));
        }

        return { ...data, notifications };
    });

    // Send email notification to client
    try {
        const data = await db.get();
        const invoice = data.invoices.find(i => i.id === invoiceId);
        const project = invoice ? data.projects.find(p => p.id === invoice.projectId) : null;

        if (project?.clientId && invoice) {
            const client = await getClientById(project.clientId);
            if (client?.email) {
                await sendPaymentApprovedEmail({
                    clientEmail: client.email,
                    clientName: client.name,
                    amount: invoice.amount,
                    projectName: project.name,
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
    const currentUser = await getCurrentUser();
    if (!currentUser || currentUser.role !== 'admin') {
        throw new Error("Unauthorized: Only admins can reject payments");
    }

    await db.update(async (data) => {
        const invoice = data.invoices.find(i => i.id === invoiceId);
        if (!invoice) {
            throw new Error("Invoice not found");
        }

        if (invoice.status !== 'Processing') {
            throw new Error(`Can only reject Processing invoices, this is ${invoice.status}`);
        }

        // Update invoice status back to Pending
        invoice.status = 'Pending';

        // Notify client about rejection
        const notifications = data.notifications || [];
        const project = data.projects.find(p => p.id === invoice.projectId);

        if (project?.clientId) {
            const message = reason
                ? `Payment rejected: ${reason}. Please mark as paid again.`
                : `Payment rejected for ₹${invoice.amount.toLocaleString()}. Please mark as paid again.`;

            notifications.unshift(await withAgencyId({
                id: generateId(),
                userId: project.clientId,
                message,
                read: false,
                timestamp: new Date().toISOString(),
                link: `/dashboard/finance`
            }));
        }

        return { ...data, notifications };
    });

    // Send email notification to client
    try {
        const data = await db.get();
        const invoice = data.invoices.find(i => i.id === invoiceId);
        const project = invoice ? data.projects.find(p => p.id === invoice.projectId) : null;

        if (project?.clientId && invoice) {
            const client = await getClientById(project.clientId);
            if (client?.email) {
                await sendPaymentRejectedEmail({
                    clientEmail: client.email,
                    clientName: client.name,
                    amount: invoice.amount,
                    projectName: project.name,
                    rejectionReason: reason,
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
    await db.update((data) => {
        const invoice = data.invoices.find(i => i.id === invoiceId);
        if (invoice) {
            invoice.status = status;
        }
        return data;
    });
    revalidatePath('/dashboard/finance');
}

export async function deleteTransaction(transactionId: string, password: string) {
    const currentUserId = await getSessionId();
    if (!currentUserId) throw new Error("Unauthorized");

    const user = await getUser(currentUserId);
    if (!user) throw new Error("User not found");

    // Simple password check (In real app, hash check)
    // Assuming user.password is stored in plain text for this mock environment
    if (user.password !== password) {
        throw new Error("Invalid Password");
    }

    await db.update((data) => {
        data.transactions = data.transactions.filter(t => t.id !== transactionId);
        return data;
    });

    revalidatePath('/dashboard/finance');
    return { success: true };
}

export async function getHighPriorityTasks(offset = 0, limit = 5) {
    const data = await db.get();
    // Return In Progress or Todo tasks that are High priority or Due soon (mock due soon logic if priority not set)
    // For now, let's filter by Status != Done and sort by date. 
    // Ideally we would add 'priority' field to tasks properly, but let's assume 'In Progress' is urgent.
    return data.tasks
        .filter(t => t.status !== 'Done')
        .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
        .slice(offset, offset + limit);
}

export async function createInvoice(invoice: Omit<Invoice, "id" | "status" | "agencyId">) {
    const newInvoice: Invoice = await withAgencyId({
        ...invoice,
        id: generateId(),
        status: "Pending"
    });

    await db.update(async (data) => {
        const project = data.projects.find(p => p.id === invoice.projectId);
        let notifications = data.notifications || [];

        if (project && project.clientId) {
            notifications = [await withAgencyId({
                id: generateId(),
                userId: project.clientId,
                message: `New Invoice Generated: ₹${invoice.amount.toLocaleString()}`,
                read: false,
                timestamp: new Date().toISOString(),
                link: `/dashboard/finance`
            }), ...notifications];

        }

        if (!data.projects?.find(p => p.id === invoice.projectId)) {
            throw new Error(`Project with ID ${invoice.projectId} not found`);
        }

        return {
            ...data,
            invoices: [newInvoice, ...(data.invoices || [])],
            notifications
        };
    });

    // Send email notification to client
    try {
        const project = await getProject(invoice.projectId);
        if (project?.clientId) {
            const client = await getClientById(project.clientId);
            if (client?.email) {
                await sendInvoiceCreatedEmail({
                    clientEmail: client.email,
                    clientName: client.name,
                    amount: invoice.amount,
                    projectName: project.name,
                    dueDate: invoice.date,
                    financeLink: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard/finance`,
                });
            }
        }
    } catch (emailError) {
        console.error('[Email] Failed to send invoice creation email:', emailError);
    }

    revalidatePath('/dashboard/finance');
    return newInvoice;
}

export async function getFinanceStats(projectId?: string, userId?: string, category?: string) {
    const data = await db.get();
    let transactions = data.transactions || [];
    let invoices = data.invoices || [];

    if (projectId) {
        transactions = transactions.filter(t => t.projectId === projectId);
        invoices = invoices.filter(i => i.projectId === projectId);
    }

    if (userId) {
        const user = data.users.find(u => u.id === userId);
        if (user) {
            transactions = transactions.filter(t =>
                t.description.toLowerCase().includes(user.name.toLowerCase())
            );
        }
    }

    // Total Revenue = All completed income transactions (client payments, project income)
    const totalRevenue = transactions
        .filter(t => t.type === 'income' && t.status === 'completed')
        .reduce((acc, curr) => acc + curr.amount, 0);

    // Total Expenses = All completed expense transactions (salaries, software, hosting, etc.)
    const totalExpenses = transactions
        .filter(t => t.type === 'expense' && t.status === 'completed')
        .reduce((acc, curr) => acc + curr.amount, 0);

    const netProfit = totalRevenue - totalExpenses;

    // Pending Invoices = Pending + Processing + Overdue
    const pendingInvoicesAmount = invoices
        .filter(i => i.status === 'Pending' || i.status === 'Processing' || i.status === 'Overdue')
        .reduce((acc, curr) => acc + curr.amount, 0);

    return {
        totalRevenue,
        totalExpenses,
        netProfit,
        pendingInvoicesAmount
    };
}

export async function getFinanceChartData(projectId?: string, userId?: string, category?: string) {
    const data = await db.get();
    let transactions = data.transactions || [];

    if (projectId) {
        transactions = transactions.filter(t => t.projectId === projectId);
    }

    if (userId) {
        const user = data.users.find(u => u.id === userId);
        if (user) {
            transactions = transactions.filter(t =>
                t.description.toLowerCase().includes(user.name.toLowerCase()) ||
                (t.category === 'Salary' && t.description.includes(user.name))
            );
        }
    }

    // Group by month (last 6 months)
    const months = [];
    for (let i = 5; i >= 0; i--) {
        const d = new Date();
        d.setMonth(d.getMonth() - i);
        months.push(d.toLocaleString('default', { month: 'short' }));
    }

    // This is a simplified aggregation. In a real app we'd map dates properly.
    // For now returning the mock structure but ideally we'd compute it.
    // Let's implement a basic computation mapping transaction dates to these months.

    const chartData = months.map(month => {
        return {
            name: month,
            income: 0,
            expense: 0
        };
    });

    transactions.forEach(t => {
        const tDate = new Date(t.date);
        const tMonth = tDate.toLocaleString('default', { month: 'short' });
        const monthData = chartData.find(d => d.name === tMonth);
        if (monthData && t.status === 'completed') {
            if (t.type === 'income') monthData.income += t.amount;
            if (t.type === 'expense') monthData.expense += t.amount;
        }
    });

    return chartData;
}

export async function getPayrollStatus(userId?: string) {
    const data = await db.get();
    let users = data.users.filter(u => u.role !== 'admin');

    if (userId && userId !== 'all') {
        users = users.filter(u => u.id === userId);
    }

    const currentMonth = new Date().toLocaleString('default', { month: 'long', year: 'numeric' });

    const transactions = data.transactions || [];

    const payrollList = users.map(user => {
        const salary = user.salary || 5000; // Default mock salary if not set

        // Check if paid this month
        const isPaid = transactions.some(t =>
            t.category === 'Salary' &&
            t.description.includes(currentMonth) &&
            t.description.includes(user.name) &&
            t.type === 'expense'
        );

        return {
            user,
            salary,
            status: isPaid ? 'Paid' : 'Pending',
            month: currentMonth
        };
    });

    return payrollList;
}

export async function payEmployee(userId: string, amount: number, month: string, userName: string) {
    const description = `Salary Payment - ${month} - ${userName}`;

    await createTransaction({
        amount,
        type: 'expense',
        category: 'Salary',
        description,
        date: new Date().toISOString().split('T')[0],
        userId
    });

    revalidatePath('/dashboard/finance');
    return { success: true };
}

export async function getSystemSettings() {
    const data = await db.get();
    return data.settings;
}

export async function updateSystemSettings(settings: { systemName: string; logo: string }) {
    await db.update((data) => ({
        ...data,
        settings: { ...data.settings, ...settings }
    }));
    revalidatePath('/dashboard'); // Update all dashboard routes
    return settings;
}

export async function globalSearch(query: string): Promise<SearchResult[]> {
    if (!query || query.length < 2) return [];

    const data = await db.get();
    const results: SearchResult[] = [];
    const lowerQuery = query.toLowerCase();

    // Search Projects
    if (data.projects) {
        data.projects.forEach(p => {
            const clientName = data.clients?.find(c => c.id === p.clientId || c.name === p.client)?.name || p.client || "";
            // Resolve Service IDs to Names for search
            const serviceNames = p.services?.map(s => data.services?.find(dSvc => dSvc.id === s || dSvc.name === s)?.name || s) || [];

            if (clientName.toLowerCase().includes(lowerQuery) || serviceNames.some(d => d.toLowerCase().includes(lowerQuery))) {
                results.push({
                    id: p.id,
                    type: 'project',
                    title: `${clientName} Project`,
                    subtitle: serviceNames.join(', ') || '',
                    url: `/dashboard/projects/${p.id}`
                });
            }
        });
    }

    // Search Clients
    if (data.clients) {
        data.clients.forEach(c => {
            if (c.name.toLowerCase().includes(lowerQuery) || c.companyName.toLowerCase().includes(lowerQuery)) {
                results.push({
                    id: c.id,
                    type: 'client',
                    title: c.name,
                    subtitle: c.companyName,
                    url: `/dashboard/projects?client=${c.id}`
                });
            }
        });
    }

    // Search Tasks
    if (data.tasks) {
        data.tasks.forEach(t => {
            if (t.title.toLowerCase().includes(lowerQuery)) {
                results.push({
                    id: t.id,
                    type: 'task',
                    title: t.title,
                    subtitle: t.status,
                    url: `/dashboard/projects/${t.projectId}?task=${t.id}`
                });
            }
        });
    }

    // Search Users
    if (data.users) {
        data.users.forEach(u => {
            if (u.name.toLowerCase().includes(lowerQuery) || u.email.toLowerCase().includes(lowerQuery)) {
                results.push({
                    id: u.id,
                    type: 'user',
                    title: u.name,
                    subtitle: u.role,
                    url: `/dashboard/team/${u.username || u.id}`
                });
            }
        });
    }

    return results.slice(0, 10);
}

export async function markNotificationAsRead(id: string) {
    await db.update((data) => ({
        ...data,
        notifications: data.notifications?.map(n => n.id === id ? { ...n, read: true } : n) || []
    }));
}

// ----------------------------------------------------------------------
// Asset Actions
// ----------------------------------------------------------------------

export async function getProjectAssets(projectId: string) {
    const data = await db.get();
    return (data.assets || []).filter(a => a.projectId === projectId).sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime());
}

export async function addProjectAsset(asset: Omit<Asset, "id" | "uploadedAt" | "agencyId">) {
    // Server-Side Safety Check
    const FORBIDDEN_EXTENSIONS = ['.exe', '.bat', '.cmd', '.sh', '.vbs', '.msi', '.jar', '.com', '.scr', '.pif'];
    const fileName = asset.name.toLowerCase();
    if (FORBIDDEN_EXTENSIONS.some(ext => fileName.endsWith(ext))) {
        throw new Error("Security Alert: Malicious file type rejected by server.");
    }

    const newAsset: Asset = await withAgencyId({
        ...asset,
        id: generateId(),
        uploadedAt: new Date().toISOString()
    });

    await db.update(async (data) => ({
        ...data,
        assets: [newAsset, ...(data.assets || [])],
        activities: [await withAgencyId({
            id: generateId(),
            user: asset.uploadedBy,
            action: `uploaded asset`,
            target: asset.name,
            timestamp: new Date().toISOString()
        }), ...data.activities]
    }));

    revalidatePath(`/dashboard/projects/${asset.projectId}`);
    return newAsset;
}

export async function deleteProjectAsset(assetId: string) {
    const currentUser = await getCurrentUser();
    const userName = currentUser ? currentUser.name : "System";

    await db.update(async (data) => {
        const asset = data.assets.find(a => a.id === assetId);
        return {
            ...data,
            assets: data.assets.filter(a => a.id !== assetId),
            activities: asset ? [await withAgencyId({
                id: generateId(),
                user: userName,
                action: `deleted asset`,
                target: asset.name,
                timestamp: new Date().toISOString()
            }), ...data.activities] : data.activities
        };
    });

    const data = await db.get();
    // Revalidate paths - tricky without knowing project ID easily but we can fetch it first if strictly needed,
    // or just rely on client side update / or revalidate all projects
    revalidatePath('/dashboard/projects/[id]', 'page');
}

export async function updateProjectAsset(assetId: string, updates: Partial<Asset>) {
    const currentUser = await getCurrentUser();
    const userName = currentUser ? currentUser.name : "System";

    await db.update(async (data) => ({
        ...data,
        assets: data.assets.map(a => a.id === assetId ? { ...a, ...updates } : a),
        activities: [await withAgencyId({
            id: generateId(),
            user: userName,
            action: `updated asset`,
            target: data.assets.find(a => a.id === assetId)?.name || "Asset",
            timestamp: new Date().toISOString()
        }), ...data.activities]
    }));
    revalidatePath('/dashboard/projects/[id]', 'page');
}

export async function toggleAssetAI(assetId: string, enabled: boolean) {
    await db.update((data) => ({
        ...data,
        assets: data.assets.map(a => a.id === assetId ? { ...a, aiEnabled: enabled } : a)
    }));
    revalidatePath('/dashboard/projects/[id]', 'page');
}





export async function explainTask(taskId: string, userId: string) {
    const data = await db.get();
    const task = data.tasks.find(t => t.id === taskId);
    if (!task) throw new Error("Task not found");

    const project = data.projects.find(p => p.id === task.projectId);
    const assignee = data.users.find(u => u.id === task.assigneeId);
    const currentUser = data.users.find(u => u.id === userId);

    // 1. Gather Broad Context (Board Awareness)
    const allProjectTasks = data.tasks.filter(t => t.projectId === task.projectId);

    const tasksByStatus = {
        'Todo': allProjectTasks.filter(t => t.status === 'Todo').map(t => `- ${t.title} (${data.users.find(u => u.id === t.assigneeId)?.name || 'Unassigned'})`),
        'In Progress': allProjectTasks.filter(t => t.status === 'In Progress').map(t => `- ${t.title} (${data.users.find(u => u.id === t.assigneeId)?.name || 'Unassigned'})`),
        'Review': allProjectTasks.filter(t => t.status === 'Review').map(t => `- ${t.title} (${data.users.find(u => u.id === t.assigneeId)?.name || 'Unassigned'})`),
        'Done': allProjectTasks.filter(t => t.status === 'Done').map(t => `- ${t.title} (${data.users.find(u => u.id === t.assigneeId)?.name || 'Unassigned'})`)
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

    // 2. Context from Assets
    const projectAssets = (data.assets || []).filter(a => a.projectId === task.projectId && a.aiEnabled);

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

    let promptText = `
        You are a **Senior Technical Project Manager & Solution Architect**.
        Your goal is to provide a highly accurate, actionable, and context-aware explanation of a specific task.
        
        ### CRITICAL INSTRUCTIONS
        1. **Analyze Assets First**: Before answering, deeply analyze the provided Project Assets (Code, Docs, Images). Your advice MUST be based on this concrete data if available.
        2. **Board Awareness**: Consider the "Current Board State". Are there duplicate tasks? Is this task blocking others? (e.g., if many tasks are in "Review", warn about bottlenecks).
        3. **Accuracy**: Do not hallucinate. If you lack info, ask for it.
        4. **Tone**: Professional, precise, yet encouraging.

        ---
        ### PROJECT CONTEXT
        **Project**: ${context.project?.name}
        **Departments**: ${context.project?.departments}
        
        ${boardSummary}

        ---
        ### TARGET TASK
        **Title**: ${context.task.title}
        **Status**: ${context.task.status} | **Priority**: ${context.task.priority}
        **Assignee**: ${context.task.assignee}
        **Due Date**: ${context.task.dueDate}
        
        **Description**:
        ${context.task.description || "No description provided."}

        **Recent Activity/Comments**:
        ${context.comments.length > 0 ? context.comments.map(c => `- ${c.text}`).join('\n') : "No comments yet."}

        ---
        ### RESPONSE FORMAT
        Please provide your response in the following Markdown format:

        **1. Task Summary**
        A one-sentence summary of what actually needs to be done.

        **2. Asset Analysis & Context**
        (If assets are present) "Based on [File Name], I see that..." - connect the task to the code/docs.

        **3. Strategic Advice (The "Mentor" View)**
        - **Potential Pitfalls**: What could go wrong?
        - **Dependencies**: Who else should I talk to?
        - **Technical Tips**: Specific libs or patterns to use (based on codebase).

        **4. Recommended Next Steps**
        A clear, checkbox-style list (e.g., "- [ ] Step 1") for the assignee.
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

    // Initialize Client
    // Priority: User Key > Env Key
    const apiKey = currentUser?.geminiApiKey || process.env.GEMINI_API_KEY?.trim();
    console.log("Runtime API Key Check:", apiKey ? `Present (User: ${!!currentUser?.geminiApiKey})` : "MISSING");

    if (!apiKey) {
        return "AI Service Error: No API Key found. Please add your Gemini API Key in Project Settings.";
    }

    // Fallback strategy
    const modelsToTry = [
        "gemini-3-flash-preview", // Try experimental fast model first if available
        "gemini-3-flash",       // High quality
        "gemini-3-flash",     // Fast fallback
    ];

    let lastError = null;
    let attemptedModels = [];

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

    for (const modelName of modelsToTry) {
        try {
            attemptedModels.push(modelName);
            const genAI = new GoogleGenerativeAI(apiKey);
            console.log(`[explainTask] Attempting model: ${modelName}`);
            const currentModel = genAI.getGenerativeModel({ model: modelName });

            const result = await currentModel.generateContent(parts);
            const response = await result.response;
            return response.text();
        } catch (error: any) {
            console.warn(`[explainTask] Model ${modelName} failed:`, error.message?.substring(0, 150));
            lastError = error;
            // Continue to next model
        }
    }

    // If we get here, all models failed.
    console.error("[explainTask] All models failed. Last Error:", JSON.stringify(lastError, null, 2));

    return `AI Service Error: All models failed (${attemptedModels.join(", ")}) . Last error: ${lastError?.message || "Unknown error"}`;
}

export async function enhanceTaskDescription(projectId: string, title: string, content: string, userId: string) {
    const data = await db.get();
    const project = data.projects.find(p => p.id === projectId);
    const currentUser = data.users.find(u => u.id === userId);

    // Context Gathering
    const allProjectTasks = data.tasks.filter(t => t.projectId === projectId);
    const tasksSummary = allProjectTasks.slice(0, 10).map(t => `- ${t.title} (${t.status})`).join('\n');

    // Fetch Asset Content (Text/Code only)
    const projectAssets = (data.assets || []).filter(a => a.projectId === projectId && a.aiEnabled);
    let assetContext = "";
    projectAssets.filter(a => ['file', 'code', 'link'].includes(a.type) && a.content).forEach(a => {
        assetContext += `\n--- Asset: ${a.name} ---\n${a.content?.substring(0, 2000) || "(Empty)"}\n`;
    });

    const apiKey = currentUser?.geminiApiKey || process.env.GEMINI_API_KEY?.trim();
    if (!apiKey) throw new Error("Missing API Key");

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" }); // Use fast model for editor interactions

    const isEnhancement = content.length > 20; // Increased threshold slightly
    const actionType = isEnhancement ? "Refine and Format" : "Generate from scratch";

    const prompt = `
        You are a **Senior Technical Project Manager**.
        Your goal is to ${actionType} a task description for a project management board.

        ### PROJECT CONTEXT
        **Project**: ${project?.client || "General"}
        **Project Knowledge Base (Assets)**:
        ${assetContext || "(No enabled assets found)"}
        
        **Existing Board Context**:
        ${tasksSummary}

        ### INPUT
        **Task Title**: ${title}
        **Draft Content**: "${content}"

        ### INSTRUCTIONS
        ${isEnhancement ?
            `The user has written a draft description. 
            - **Goal**: Polish it into a professional, clear specification.
            - **Structure**: Use Markdown (## Headers, - Bullets).
            - **Acceptance Criteria**: Add a dedicated section with boolean-verifiable requirements.
            - **Clarity**: Remove ambiguity. Check against 'Project Knowledge Base' for consistency (e.g. correct terminology).` :

            `The user has provided a Title but minimal/no description.
            - **Goal**: GENERATE a complete, implementation-ready task specification.
            - **Structure**:
                1. **Objective**: High-level goal.
                2. **Detailed Implementation**: Steps to take.
                3. **Technical Considerations**: API endpoints, schema changes (infer from Knowledge Base or Title).
                4. **Acceptance Criteria**: Checklist of 3-5 items.`
        }
        
        **Constraint**: Return ONLY the raw Markdown content. Do not include conversational filler.
    `;

    try {
        const result = await model.generateContent(prompt);
        return result.response.text();
    } catch (error: any) {
        console.error("Enhance Task Error", error);
        return content; // Fallback to original
    }
}

export type ChatMessage = {
    role: 'user' | 'model';
    content: string;
};

export async function chatWithTaskAI(
    projectId: string,
    currentTitle: string,
    currentDescription: string,
    history: ChatMessage[],
    userMessage: string,
    userId: string
) {
    const data = await db.get();
    const currentUser = data.users.find(u => u.id === userId);

    console.log(`[chatWithTaskAI] UserId: ${userId}, UserFound: ${!!currentUser}, HasKey: ${!!currentUser?.geminiApiKey}`);
    console.log(`[chatWithTaskAI] EnvKey Present: ${!!process.env.GEMINI_API_KEY}`);

    // 1. Gather Broad Context (Board Awareness)
    const allProjectTasks = data.tasks.filter(t => t.projectId === projectId);
    const tasksSummary = allProjectTasks.slice(0, 15).map(t => `- ${t.title} (${t.status})`).join('\n');

    // 2. Fetch Asset Content
    const projectAssets = (data.assets || []).filter(a => a.projectId === projectId && a.aiEnabled);
    let assetContext = "";
    projectAssets.filter(a => ['file', 'code', 'link'].includes(a.type) && a.content).forEach(a => {
        assetContext += `\n--- Asset: ${a.name} ---\n${a.content?.substring(0, 1500) || "(Empty)"}\n`;
    });

    const apiKey = currentUser?.geminiApiKey || process.env.GEMINI_API_KEY?.trim();
    if (!apiKey) {
        console.error("[chatWithTaskAI] FATAL: No API Key found in User Profile OR Environment.");
        throw new Error("Missing API Key");
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
        model: "gemini-3-flash-preview",
        systemInstruction: `
        You are a **Senior Technical Project Manager & Agile Coach**.
        You are having a conversation with a user who is creating a task.
        
        **Your Goal**: Help the user clarify, refine, and structure their task. 
        **Tone**: Professional, insightful, yet conversational and concise.
        
        ### CONTEXT
        **Project Board Summary**:
        ${tasksSummary}
        
        **Project Knowledge Base**:
        ${assetContext || "(No assets available)"}
        
        ### CURRENT TASK STATE
        **Title**: ${currentTitle}
        **Draft Description**: 
        ${currentDescription || "(Empty)"}
        
        ### INSTRUCTIONS
        - Answer the user's latest query.
        - If they ask to "generate" or "write" the task, provide a full, well-structured Markdown description.
        - If they ask a question regarding project assets, answer it using project context.
        - Use standard Markdown (bold, lists) for readability.
        - REMEMBER: You are in a chat. Be helpful.
        `
    });

    // 3. Start Chat
    const chat = model.startChat({
        history: history.map(h => ({
            role: h.role,
            parts: [{ text: h.content }]
        })),
    });

    try {
        const result = await chat.sendMessage(userMessage);
        const response = await result.response;
        return response.text();
    } catch (error: any) {
        console.error("AI Chat Error:", error);
        return "I encountered an error. Please try again.";
    }
}

// ----------------------------------------------------------------------
// Leave Management Actions
// ----------------------------------------------------------------------



export async function getLeaveRequests(userId?: string) {
    const data = await db.get();
    let requests = data.leaveRequests || [];

    // sorting: Pending first, then by date desc
    requests = requests.sort((a, b) => {
        if (a.status === 'Pending' && b.status !== 'Pending') return -1;
        if (a.status !== 'Pending' && b.status === 'Pending') return 1;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    if (userId) {
        return requests.filter(r => r.userId === userId);
    }

    // If no userId, return all (Admin view)
    return requests;
}

// Employee submits a leave request
export async function requestLeave(leaveData: Omit<LeaveRequest, 'id' | 'status' | 'createdAt' | 'agencyId'>) {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
        throw new Error("Unauthorized: You must be logged in to submit leave requests");
    }

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

    await db.update(async (data) => {
        // Notify all admins about new leave request
        const notifications = data.notifications || [];
        const adminUsers = data.users.filter(u => u.role === 'admin');

        for (const admin of adminUsers) {
            notifications.unshift(await withAgencyId({
                id: generateId(),
                userId: admin.id,
                message: `${currentUser.name} requested ${leaveData.type} leave (${daysDiff} day${daysDiff > 1 ? 's' : ''})`,
                read: false,
                timestamp: new Date().toISOString(),
                link: `/dashboard/team`
            }));
        }

        return {
            ...data,
            leaveRequests: [newLeaveRequest, ...(data.leaveRequests || [])],
            notifications,
            activities: [await withAgencyId({
                id: generateId(),
                user: currentUser.name,
                action: "submitted leave request",
                target: `${leaveData.type} leave for ${daysDiff} days`,
                timestamp: new Date().toISOString()
            }), ...data.activities]
        };
    });

    // Send email notification to admins
    try {
        const data = await db.get();
        const adminUsers = data.users.filter(u => u.role === 'admin');
        const adminEmails = adminUsers.map(u => u.email).filter(Boolean) as string[];

        if (adminEmails.length > 0) {
            await sendLeaveRequestedEmail({
                adminEmails,
                employeeName: currentUser.name,
                leaveType: leaveData.type,
                startDate: leaveData.startDate,
                endDate: leaveData.endDate,
                days: daysDiff,
                reason: leaveData.reason || 'No reason provided',
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

    await db.update(async (data) => {
        const leaveRequest = data.leaveRequests.find(lr => lr.id === leaveRequestId);
        if (!leaveRequest) {
            throw new Error("Leave request not found");
        }

        if (leaveRequest.status !== 'Pending') {
            throw new Error(`Cannot approve ${leaveRequest.status} leave request`);
        }

        // Update leave request
        leaveRequest.status = 'Approved';
        leaveRequest.reviewedBy = currentUser.id;
        leaveRequest.reviewedAt = new Date().toISOString();

        // Calculate days for notification
        const startDate = new Date(leaveRequest.startDate);
        const endDate = new Date(leaveRequest.endDate);
        const daysDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;

        // Notify employee
        const notifications = data.notifications || [];
        const employee = data.users.find(u => u.id === leaveRequest.userId);

        if (employee) {
            notifications.unshift(await withAgencyId({
                id: generateId(),
                userId: leaveRequest.userId,
                message: `Your ${leaveRequest.type} leave request (${daysDiff} day${daysDiff > 1 ? 's' : ''}) has been approved by ${currentUser.name}`,
                read: false,
                timestamp: new Date().toISOString(),
                link: `/dashboard/team`
            }));
        }

        return {
            ...data,
            notifications,
            activities: [await withAgencyId({
                id: generateId(),
                user: currentUser.name,
                action: "approved leave request",
                target: employee ? `${employee.name}'s ${leaveRequest.type} leave` : "Leave request",
                timestamp: new Date().toISOString()
            }), ...data.activities]
        };
    });

    // Send email notification to employee
    try {
        const data = await db.get();
        const leaveRequest = data.leaveRequests.find(lr => lr.id === leaveRequestId);
        const employee = leaveRequest ? data.users.find(u => u.id === leaveRequest.userId) : null;

        if (employee?.email && leaveRequest) {
            const daysDiff = Math.ceil((new Date(leaveRequest.endDate).getTime() - new Date(leaveRequest.startDate).getTime()) / (1000 * 60 * 60 * 24)) + 1;

            await sendLeaveApprovedEmail({
                employeeEmail: employee.email,
                employeeName: employee.name,
                leaveType: leaveRequest.type,
                startDate: leaveRequest.startDate,
                endDate: leaveRequest.endDate,
                days: daysDiff,
                approvedBy: currentUser.name,
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

    await db.update(async (data) => {
        const leaveRequest = data.leaveRequests.find(lr => lr.id === leaveRequestId);
        if (!leaveRequest) {
            throw new Error("Leave request not found");
        }

        if (leaveRequest.status !== 'Pending') {
            throw new Error(`Cannot reject ${leaveRequest.status} leave request`);
        }

        // Update leave request
        leaveRequest.status = 'Rejected';
        leaveRequest.reviewedBy = currentUser.id;
        leaveRequest.reviewedAt = new Date().toISOString();

        // Calculate days for notification
        const startDate = new Date(leaveRequest.startDate);
        const endDate = new Date(leaveRequest.endDate);
        const daysDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;

        // Notify employee
        const notifications = data.notifications || [];
        const employee = data.users.find(u => u.id === leaveRequest.userId);

        if (employee) {
            const message = rejectionReason
                ? `Your ${leaveRequest.type} leave request (${daysDiff} day${daysDiff > 1 ? 's' : ''}) was rejected by ${currentUser.name}. Reason: ${rejectionReason}`
                : `Your ${leaveRequest.type} leave request (${daysDiff} day${daysDiff > 1 ? 's' : ''}) was rejected by ${currentUser.name}`;

            notifications.unshift(await withAgencyId({
                id: generateId(),
                userId: leaveRequest.userId,
                message,
                read: false,
                timestamp: new Date().toISOString(),
                link: `/dashboard/team`
            }));
        }

        return {
            ...data,
            notifications,
            activities: [await withAgencyId({
                id: generateId(),
                user: currentUser.name,
                action: "rejected leave request",
                target: employee ? `${employee.name}'s ${leaveRequest.type} leave` : "Leave request",
                timestamp: new Date().toISOString()
            }), ...data.activities]
        };
    });

    // Send email notification to employee
    try {
        const data = await db.get();
        const leaveRequest = data.leaveRequests.find(lr => lr.id === leaveRequestId);
        const employee = leaveRequest ? data.users.find(u => u.id === leaveRequest.userId) : null;

        if (employee?.email && leaveRequest) {
            const daysDiff = Math.ceil((new Date(leaveRequest.endDate).getTime() - new Date(leaveRequest.startDate).getTime()) / (1000 * 60 * 60 * 24)) + 1;

            await sendLeaveRejectedEmail({
                employeeEmail: employee.email,
                employeeName: employee.name,
                leaveType: leaveRequest.type,
                startDate: leaveRequest.startDate,
                endDate: leaveRequest.endDate,
                days: daysDiff,
                rejectedBy: currentUser.name,
                rejectionReason,
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

    await db.update(async (data) => {
        const leaveRequest = data.leaveRequests.find(lr => lr.id === leaveRequestId);
        if (!leaveRequest) {
            throw new Error("Leave request not found");
        }

        // Only the requester or admin can cancel
        if (leaveRequest.userId !== currentUser.id && currentUser.role !== 'admin') {
            throw new Error("Unauthorized: You can only cancel your own leave requests");
        }

        // Can only cancel pending requests
        if (leaveRequest.status !== 'Pending') {
            throw new Error(`Cannot cancel ${leaveRequest.status} leave request. Please contact admin.`);
        }

        // Remove the leave request
        data.leaveRequests = data.leaveRequests.filter(lr => lr.id !== leaveRequestId);

        // Notify admins if employee cancelled
        const notifications = data.notifications || [];
        if (currentUser.role !== 'admin') {
            const adminUsers = data.users.filter(u => u.role === 'admin');
            for (const admin of adminUsers) {
                notifications.unshift(await withAgencyId({
                    id: generateId(),
                    userId: admin.id,
                    message: `${currentUser.name} cancelled their ${leaveRequest.type} leave request`,
                    read: false,
                    timestamp: new Date().toISOString(),
                    link: `/dashboard/team`
                }));
            }
        }

        return {
            ...data,
            notifications,
            activities: [await withAgencyId({
                id: generateId(),
                user: currentUser.name,
                action: "cancelled leave request",
                target: `${leaveRequest.type} leave`,
                timestamp: new Date().toISOString()
            }), ...data.activities]
        };
    });

    // Send email notification to admins
    if (currentUser.role !== 'admin') {
        try {
            const data = await db.get();
            const adminUsers = data.users.filter(u => u.role === 'admin');
            const adminEmails = adminUsers.map(u => u.email).filter(Boolean) as string[];
            const leaveRequest = data.leaveRequests.find(lr => lr.id === leaveRequestId);

            if (adminEmails.length > 0 && leaveRequest) {
                await sendLeaveCancelledEmail({
                    adminEmails,
                    employeeName: currentUser.name,
                    leaveType: leaveRequest.type,
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
    const data = await db.get();
    const leaveRequests = data.leaveRequests.filter(lr => lr.userId === userId);

    const currentYear = new Date().getFullYear();
    const thisYearRequests = leaveRequests.filter(lr => {
        const year = new Date(lr.createdAt).getFullYear();
        return year === currentYear;
    });

    const approvedLeaves = thisYearRequests.filter(lr => lr.status === 'Approved');

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
        rejectedRequests: thisYearRequests.filter(lr => lr.status === 'Rejected').length
    };
}


export async function updateLeaveStatus(requestId: string, status: LeaveStatus) {
    const currentUser = await getCurrentUser();

    const data = await db.get();
    const request = data.leaveRequests?.find(r => r.id === requestId);
    if (!request) throw new Error("Request not found");

    await db.update(async (dbData) => ({
        ...dbData,
        leaveRequests: dbData.leaveRequests.map(r => r.id === requestId ? { ...r, status, reviewedBy: currentUser?.id, reviewedAt: new Date().toISOString() } : r),
        notifications: [await withAgencyId({
            id: generateId(),
            userId: request.userId,
            message: `Your leave request for ${new Date(request.startDate).toLocaleDateString()} has been ${status}`,
            read: false,
            timestamp: new Date().toISOString(),
            link: `/dashboard/team/${data.users.find(u => u.id === request.userId)?.username || request.userId}?tab=leaves`
        }), ...(dbData.notifications || [])]
    }));

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

    // Validate project exists
    const data = await db.get();
    const project = data.projects.find(p => p.id === refund.projectId);
    if (!project) {
        throw new Error("Project not found");
    }

    // Validate amount is positive
    if (refund.amount <= 0) {
        throw new Error("Refund amount must be positive");
    }

    // Calculate total project income
    const projectIncome = data.transactions
        .filter(t => t.projectId === refund.projectId && t.type === 'income' && t.status === 'completed')
        .reduce((sum, t) => sum + t.amount, 0);

    // Calculate existing refunds
    const existingRefunds = data.transactions
        .filter(t => t.projectId === refund.projectId && t.category === 'Refund' && t.status === 'completed')
        .reduce((sum, t) => sum + t.amount, 0);

    // Validate refund doesn't exceed project income
    if (existingRefunds + refund.amount > projectIncome) {
        throw new Error(`Refund amount exceeds project income. Project income: ₹${projectIncome.toLocaleString()}, Existing refunds: ₹${existingRefunds.toLocaleString()}, Attempted refund: ₹${refund.amount.toLocaleString()}`);
    }

    const newRefund = await withAgencyId({
        id: generateId(),
        date: refund.date,
        amount: refund.amount,
        type: 'expense' as const,
        category: 'Refund' as const,
        description: refund.description,
        status: 'completed' as const,
        projectId: refund.projectId
    });

    await db.update(async (data) => {
        // Add refund transaction
        const newData = {
            ...data,
            transactions: [...data.transactions, newRefund],
            activities: [await withAgencyId({
                id: generateId(),
                user: currentUser.name,
                action: "issued refund",
                target: project.name,
                timestamp: new Date().toISOString()
            }), ...data.activities],
            notifications: data.notifications // Initialize notifications
        };

        // Notify client
        if (project.clientId) {
            const notification = await withAgencyId({
                id: generateId(),
                userId: project.clientId,
                message: `Refund of ₹${refund.amount.toLocaleString()} has been issued for ${project.name}`,
                read: false,
                timestamp: new Date().toISOString(),
                link: `/dashboard/projects/${project.slug || project.id}`
            });
            newData.notifications = [...newData.notifications, notification];
        }

        return newData;
    });

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
    const data = await db.get();

    // Get all projects for this client
    const clientProjects = data.projects.filter(p => p.clientId === clientId);
    const projectIds = new Set(clientProjects.map(p => p.id));

    // Calculate total income from client
    const totalPaid = data.transactions
        .filter(t => t.projectId && projectIds.has(t.projectId) && t.type === 'income' && t.status === 'completed')
        .reduce((sum, t) => sum + t.amount, 0);

    // Calculate total refunds to client
    const totalRefunds = data.transactions
        .filter(t => t.projectId && projectIds.has(t.projectId) && t.category === 'Refund' && t.status === 'completed')
        .reduce((sum, t) => sum + t.amount, 0);

    // Calculate lifetime value (net revenue)
    const lifetimeValue = totalPaid - totalRefunds;

    return {
        totalPaid,
        totalRefunds,
        lifetimeValue,
        projectCount: clientProjects.length,
        activeProjectCount: clientProjects.filter(p => p.status === 'Active').length
    };
}

export async function getProjectRefunds(projectId: string) {
    const data = await db.get();
    return data.transactions
        .filter(t => t.projectId === projectId && t.category === 'Refund')
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

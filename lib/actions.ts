"use server";

import { db, User, Project, Invoice, Task, Notification, Activity, Client, Asset, PaymentConfig, LeaveRequest, LeaveType, LeaveStatus, UserPermissions } from "./db";
import { revalidatePath } from "next/cache";
import { GoogleGenerativeAI } from "@google/generative-ai";

import { getSessionId } from "./auth";
import { generateId, resolveUserOrClient } from "./utils-server";
export { getSessionId };

export type SearchResult = {
    id: string;
    type: 'project' | 'client' | 'task' | 'user';
    title: string;
    subtitle?: string;
    url: string;
};

export async function getCurrentUser() {
    const userId = await getSessionId();
    if (!userId) return null;
    return getUser(userId);
}

export async function getDashboardMetrics() {
    const data = await db.get();
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth(); // 0-11

    // 1. Revenue & Growth
    const paidInvoices = data.invoices.filter(i => i.status === 'Paid');
    const totalRevenue = paidInvoices.reduce((acc, curr) => acc + curr.amount, 0);

    // Calculate generic "Growth" (Current Month vs Previous Month)
    const currentMonthRevenue = paidInvoices
        .filter(i => {
            const d = new Date(i.date);
            return d.getFullYear() === currentYear && d.getMonth() === currentMonth;
        })
        .reduce((acc, curr) => acc + curr.amount, 0);

    const prevMonthDate = new Date();
    prevMonthDate.setMonth(currentMonth - 1);
    const prevMonth = prevMonthDate.getMonth();
    const prevMonthYear = prevMonthDate.getFullYear();

    const prevMonthRevenue = paidInvoices
        .filter(i => {
            const d = new Date(i.date);
            return d.getFullYear() === prevMonthYear && d.getMonth() === prevMonth;
        })
        .reduce((acc, curr) => acc + curr.amount, 0);

    let growthPercentage = 0;
    if (prevMonthRevenue > 0) {
        growthPercentage = Math.round(((currentMonthRevenue - prevMonthRevenue) / prevMonthRevenue) * 100);
    } else if (currentMonthRevenue > 0) {
        growthPercentage = 100; // 100% growth if started from 0
    }

    // 2. Pending Invoices & Overdue
    const pendingInvoicesList = data.invoices.filter(i => i.status === 'Pending' || i.status === 'Overdue');
    const pendingInvoicesAmount = pendingInvoicesList.reduce((acc, curr) => acc + curr.amount, 0);

    const todayStr = new Date().toISOString().split('T')[0];
    const overdueCount = pendingInvoicesList.filter(i => (i.date < todayStr && i.status !== 'Paid') || i.status === 'Overdue').length;

    // 3. Active Projects & High Priority
    const activeProjectsList = data.projects.filter(p => p.status === 'Active');
    const activeProjects = activeProjectsList.length;

    // Deduce "High Priority" projects as those with "High" priority active tasks.
    const activeProjectIds = new Set(activeProjectsList.map(p => p.id));
    const highPriorityTaskProjects = new Set(
        data.tasks
            .filter(t => t.status !== 'Done' && t.priority === 'High' && activeProjectIds.has(t.projectId))
            .map(t => t.projectId)
    );
    const highPriorityCount = highPriorityTaskProjects.size;

    // 4. Team Utilization
    const totalTasks = data.tasks.length;
    const activeTasks = data.tasks.filter(t => t.status === 'In Progress').length;
    const utilization = totalTasks > 0 ? Math.round((activeTasks / totalTasks) * 100) : 0;

    return {
        revenue: totalRevenue,
        growth: growthPercentage,
        pending: pendingInvoicesAmount,
        overdueCount: overdueCount,
        activeProjects,
        highPriorityCount,
        utilization,
        activeTasksCount: activeTasks
    };
}

export async function getRevenueData() {
    const data = await db.get();
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
    (data.transactions || []).forEach(t => {
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
    const data = await db.get();
    const distribution: Record<string, number> = {};

    data.projects.forEach(p => {
        p.services.forEach(svc => {
            // Resolve ID to Name for display
            const serviceObj = data.services.find(s => s.id === svc || s.name === svc);
            const name = serviceObj ? serviceObj.name : svc;
            distribution[name] = (distribution[name] || 0) + 1;
        });
    });

    return Object.entries(distribution).map(([name, value]) => ({ name, value }));
}

export async function getRecentActivity(offset = 0, limit = 5): Promise<Activity[]> {
    const data = await db.get();
    return data.activities.slice(offset, offset + limit);
}

// Auto-clear notifications older than 24 hours
export async function getNotifications(userId: string, offset = 0, limit = 1000): Promise<Notification[]> {
    const data = await db.get();
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    // Filter valid notifications
    const validNotifications = data.notifications.filter(n => n.timestamp > oneDayAgo);

    // If cleanup is needed, update DB
    if (validNotifications.length < data.notifications.length) {
        await db.update(curr => ({
            ...curr,
            notifications: validNotifications
        }));
    }

    return validNotifications.filter(n => n.userId === userId).slice(offset, offset + limit);
}

export async function getProjects(offset = 0, limit = 1000) {
    const data = await db.get();
    const currentUserId = await getSessionId();
    if (!currentUserId) return []; // Require auth

    const currentUser = await getUser(currentUserId);
    if (currentUser?.role === 'client') {
        // STRICT: Only return projects owned by this client
        return data.projects.filter(p => p.clientId === currentUserId).slice(offset, offset + limit);
    }

    return data.projects.slice(offset, offset + limit);
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
    const data = await db.get();
    return data.projects.find(p => p.id === id);
}

export async function getProjectBySlug(slug: string) {
    const data = await db.get();
    // Support lookup by Slug OR ID for robustness during migration/mixed states
    return data.projects.find(p => p.slug === slug || p.id === slug);
}

export async function getUsers() {
    const data = await db.get();
    const currentUserId = await getSessionId();
    const currentUser = await getUser(currentUserId!); // Use enhanced getUser
    const isAdmin = currentUser && (currentUser.role === 'admin' || currentUser.role === 'manager');

    // If client, arguably they shouldn't see users at all, or only those assigned to their projects?
    // For now, let's return [] for clients to be safe/strict, unless we need them for chat.
    if (currentUser?.role === 'client') {
        // Allow clients to see all users so they can assign tasks, but redact sensitive info
        return data.users.map(user => {
            const { salary, password, ...redacted } = user;
            return redacted as User;
        });
    }

    return data.users.map(user => {
        if (isAdmin || user.id === currentUserId) {
            return user;
        }
        // Redact salary
        const { salary, ...redacted } = user;
        // Cast back to User to satisfy return type, though strictly it's missing salary
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
        return targetUser;
    }

    // 3. Redact
    const { salary, ...redacted } = targetUser;
    return redacted as User;
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
        return user;
    }

    // 3. Redact
    const { salary, password, ...redacted } = user;
    return redacted as User;
}

export async function getUserTasks(userId: string, offset = 0, limit = 1000) {
    const data = await db.get();
    // Create a set of valid project IDs for O(1) lookup
    const validProjectIds = new Set(data.projects.map(p => p.id));

    return data.tasks
        .filter(t => t.assigneeId === userId && validProjectIds.has(t.projectId))
        .slice(offset, offset + limit);
}

// For Client Profile: Get projects they OWN
export async function getClientProjects(clientId: string) {
    const data = await db.get();
    // Match by clientId OR client name (legacy)
    const client = await resolveUserOrClient(clientId);
    const clientName = client ? client.name : null;

    return data.projects.filter(p => p.clientId === clientId || (clientName && p.client === clientName));
}

export async function getProjectTasks(projectIds: string[]) {
    const data = await db.get();
    const idSet = new Set(projectIds);
    return data.tasks.filter(t => idSet.has(t.projectId));
}

// For Client Profile: Get tasks they CREATED (Assigned to others)
export async function getClientCreatedTasks(userId: string) {
    const data = await db.get();
    return data.tasks.filter(t => t.createdBy === userId).sort((a, b) => new Date(b.createdAt || '').getTime() - new Date(a.createdAt || '').getTime());
}

export async function getUserActivity(userId: string) {
    const data = await db.get();
    // Filter activities where the actor is the user (by name for now since activity stores 'user' as name)
    // Or if we can link by ID. Currently activity.user is a string name.
    // We'll search by user name.
    const user = data.users.find(u => u.id === userId);
    if (!user) return [];

    // Limit to last 20 for dashboard
    return data.activities
        .filter(a => a.user === user.name)
        .slice(0, 20);
}

export async function getUserContributionHistory(userId: string) {
    const data = await db.get();
    const user = data.users.find(u => u.id === userId);
    if (!user) return [];

    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
    const isoOneYearAgo = oneYearAgo.toISOString();

    return data.activities
        .filter(a => a.user === user.name && a.timestamp >= isoOneYearAgo);
}

export async function createUser(user: Omit<User, "id">) {
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

    const newUser = { ...user, id: generateId(), username: uniqueUsername };
    if (!newUser.avatar) {
        newUser.avatar = `https://api.dicebear.com/7.x/avataaars/svg?seed=${newUser.name}`;
    }
    await db.update((data) => ({
        ...data,
        users: [...data.users, newUser]
    }));
    revalidatePath('/dashboard/team');
    return newUser;
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

    // Verify password if changing it
    if (updates.password) {
        if (!oldPassword) {
            throw new Error("Old password is required to change password");
        }
        const data = await db.get();
        const user = data.users.find(u => u.id === id);
        if (!user) throw new Error("User not found");
        if (user.password && user.password !== oldPassword) {
            throw new Error("Incorrect old password");
        }
    }

    // Uniqueness Check for Username
    if (updates.username) {
        const data = await db.get();
        // Check both users and clients for username collision
        const existingUser = data.users.find(u => u.username === updates.username && u.id !== id);
        const existingClient = data.clients?.find(c => (c as any).username === updates.username && c.id !== id);

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
            delete finalUpdates.otherDocuments;
        }
        notifyAdmin = true;
    }

    await db.update((data) => {
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
            const newNotifications = adminUsers.map(admin => ({
                id: generateId(),
                userId: admin.id,
                message: `${currentUser.name} has requested to update their identity documents.`,
                read: false,
                timestamp: new Date().toISOString(),
                link: `/dashboard/team?edit=${id}` // Link to open edit dialog (needs implementation on page)
            }));
            newData.notifications = [...newData.notifications, ...newNotifications];
        }

        return newData;
    });
    revalidatePath('/dashboard/team');
}

export async function approveDocumentUpdate(userId: string, type: 'adhar' | 'pan' | 'contracts' | 'other' | 'both', approve: boolean) {
    const currentUser = await getCurrentUser();
    if (!currentUser || (currentUser.role !== 'admin' && currentUser.role !== 'manager')) {
        throw new Error("Unauthorized");
    }

    await db.update(data => {
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

        const notification = {
            id: generateId(),
            userId: userId,
            message: message,
            read: false,
            timestamp: new Date().toISOString()
        };

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
    const newService = { id: generateId(), name, jobs };
    await db.update((data) => ({
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

export async function createProject(project: Omit<Project, "id" | "status" | "createdAt">) {
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

    const newProject: Project = { ...project, id: generateId(), slug: uniqueSlug, status: "Active", createdAt: new Date().toISOString() };
    // Helper: auto-fill client name if ID provided but name missing? 
    // Actually we trust the input `client` field as "Client Name" for display or "Unknown".

    await db.update((data) => {
        if (project.clientId && !data.clients?.find(c => c.id === project.clientId)) {
            throw new Error(`Client with ID ${project.clientId} not found`);
        }

        return {
            ...data,
            projects: [...data.projects, newProject],
            activities: [{
                id: generateId(),
                user: currentUser.name,
                action: "created project",
                target: project.name,
                timestamp: new Date().toISOString()
            }, ...data.activities]
        }
    });
    revalidatePath('/dashboard/projects');
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

    await db.update((data) => ({
        ...data,
        tasks: data.tasks.filter(t => t.id !== taskId),
        activities: [{
            id: generateId(),
            user: userName,
            action: "deleted task",
            target: task.title,
            timestamp: new Date().toISOString()
        }, ...data.activities]
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

    await db.update((data) => ({
        ...data,
        tasks: data.tasks.map(t => t.id === taskId ? { ...t, status } : t),
        activities: [{
            id: generateId(),
            user: userName,
            action: "moved task to " + status,
            target: data.tasks.find(t => t.id === taskId)?.title || "Task",
            timestamp: new Date().toISOString()
        }, ...data.activities]
    }));
    revalidatePath('/dashboard/projects/[id]', 'page');
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

    await db.update((data) => {
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
            activities: [{
                id: generateId(),
                user: userName,
                action: "updated task",
                target: updates.title || data.tasks.find(t => t.id === taskId)?.title || "Task",
                timestamp: new Date().toISOString()
            }, ...data.activities]
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

    await db.update((data) => ({
        ...data,
        tasks: data.tasks.map(t =>
            t.id === taskId
                ? { ...t, comments: [...(t.comments || []), newComment] }
                : t
        ),
        activities: [{
            id: generateId(),
            user: "User", // Ideally fetch user name
            action: "commented on task",
            target: data.tasks.find(t => t.id === taskId)?.title || "Task",
            timestamp: new Date().toISOString()
        }, ...data.activities]
    }));

    revalidatePath('/dashboard/projects/[id]', 'page');
    revalidatePath('/dashboard/projects');
    return newComment;
}


export async function createTask(task: Omit<Task, "id">) {
    const currentUser = await getCurrentUser();
    const createdBy = currentUser ? currentUser.id : "system";

    const newTask = {
        ...task,
        id: generateId(),
        createdAt: new Date().toISOString(),
        createdBy,
        comments: []
    };

    await db.update((data) => ({
        ...data,
        tasks: [...data.tasks, newTask],
        activities: [{
            id: generateId(),
            user: currentUser ? currentUser.name : "System",
            action: "created task",
            target: task.title,
            timestamp: new Date().toISOString()
        }, ...data.activities]
    }));
    revalidatePath('/dashboard/projects/[id]', 'page');
    revalidatePath('/dashboard/projects');
    return newTask;
}


// --- Client Actions ---

export async function getClients() {
    const data = await db.get();
    return data.clients || [];
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

export async function createClient(client: Omit<Client, "id">) {
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

    const newClient: Client = {
        ...client,
        id: generateId(),
        username: uniqueUsername,
        lastActiveAt: new Date().toISOString()
    };

    if (!newClient.logo) {
        newClient.logo = `https://api.dicebear.com/7.x/initials/svg?seed=${newClient.companyName}`;
    }

    await db.update((data) => ({
        ...data,
        clients: [...(data.clients || []), newClient]
    }));
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
        // 1. Permission Check
        if (!currentUser || (currentUser.role !== 'admin' && currentUser.role !== 'manager')) {
            throw new Error("Unauthorized: Only Admins can change project status.");
        }

        const data = await db.get();
        // 2. Completion Logic
        if (updates.status === 'Completed') {
            const projectTasks = data.tasks.filter(t => t.projectId === id);
            const hasOpenTasks = projectTasks.some(t => t.status !== 'Done');

            if (hasOpenTasks) {
                const openCount = projectTasks.filter(t => t.status !== 'Done').length;
                throw new Error(`Cannot mark as Completed. There are ${openCount} unfinished tasks remaining.`);
            }
        }
    }

    const data = await db.get();
    const oldProject = data.projects.find(p => p.id === id);

    await db.update((data) => {
        let notifications = data.notifications || [];

        // Notify Client on Status Change
        if (updates.status && oldProject && oldProject.status !== updates.status && oldProject.clientId) {
            // Check if client exists (optional but good) or just push
            notifications = [{
                id: generateId(),
                userId: oldProject.clientId,
                message: `Project "${oldProject.name}" status updated to ${updates.status}`,
                read: false,
                timestamp: new Date().toISOString(),
                link: `/dashboard/projects/${id}`
            }, ...notifications];
        }

        return {
            ...data,
            projects: data.projects.map(p => p.id === id ? { ...p, ...updates } : p),
            notifications
        };
    });
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

    const totalInvoiced = invoices.reduce((acc, curr) => acc + curr.amount, 0);
    const totalPaidInvoices = invoices.filter(i => i.status === 'Paid').reduce((acc, curr) => acc + curr.amount, 0);
    const pendingAmount = invoices.filter(i => i.status === 'Pending').reduce((acc, curr) => acc + curr.amount, 0);

    // Calculate generic "Income" from transactions
    const totalTransactionsIncome = transactions
        .filter(t => t.type?.toLowerCase() === 'income')
        .reduce((acc, curr) => acc + curr.amount, 0);

    // Calculate "Refunds" (Project Expenses -> Company to Client)
    const totalTransactionsRefunds = transactions
        .filter(t => t.type?.toLowerCase() === 'expense')
        .reduce((acc, curr) => acc + curr.amount, 0);

    // Hybrid approach: 
    // Base Income = Invoices (if tracked) OR Transactions (if manual)
    const baseIncome = totalPaidInvoices > 0 ? totalPaidInvoices : totalTransactionsIncome;

    // Net Value = Base Income - Refunds
    const effectiveTotalPaid = baseIncome - totalTransactionsRefunds;

    return {
        invoices: invoices.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
        transactions: transactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
        stats: {
            totalInvoiced,
            totalPaid: effectiveTotalPaid, // Use effective total (Net)
            pendingAmount,
            ltv: effectiveTotalPaid // Lifetime Value (Net)
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

export async function createTransaction(transaction: Omit<Transaction, "id" | "status">) {
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
    if (transaction.category === 'Other' && transaction.type !== 'expense') {
        throw new Error("Validation Error: 'Other' category is for expenses only.");
    }

    // Note: Internal Transfer checks are harder without memberId in transaction object,
    // but the modal handles the description/type logic. We assume if category is Internal Transfer,
    // dependencies were met by client. Ideally we'd add memberId to schema for strict server check.

    const newTransaction: Transaction = {
        ...transaction,
        id: generateId(),
        status: "completed"
    };

    await db.update((data) => {
        if (transaction.projectId && !data.projects?.find(p => p.id === transaction.projectId)) {
            throw new Error(`Project with ID ${transaction.projectId} not found`);
        }

        // GENERATE NOTIFICATION FOR SALARY
        const notifications = [...(data.notifications || [])];
        if (newTransaction.category === 'Salary' && newTransaction.userId && newTransaction.type === 'expense') {
            notifications.unshift({
                id: generateId(),
                userId: newTransaction.userId,
                message: `Salary Payment Received: ₹${newTransaction.amount.toLocaleString()}`,
                read: false,
                timestamp: new Date().toISOString(),
                link: '/dashboard/finance' // Or profile link? Finance seems appropriate if they have access, or just informational.
            });
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

export async function updateInvoiceStatus(invoiceId: string, status: 'Paid' | 'Pending' | 'Overdue' | 'Processing') {
    await db.update((data) => {
        const invoice = data.invoices.find(i => i.id === invoiceId);
        if (invoice) {
            invoice.status = status;
        }
        return data; // Return updated DB data
    });
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

export async function createInvoice(invoice: Omit<Invoice, "id" | "status">) {
    const newInvoice: Invoice = {
        ...invoice,
        id: generateId(),
        status: "Pending"
    };

    await db.update((data) => {
        const project = data.projects.find(p => p.id === invoice.projectId);
        let notifications = data.notifications || [];

        if (project && project.clientId) {
            notifications = [{
                id: generateId(),
                userId: project.clientId,
                message: `New Invoice Generated: ₹${invoice.amount.toLocaleString()}`,
                read: false,
                timestamp: new Date().toISOString(),
                link: `/dashboard/finance`
            }, ...notifications];
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
            // Invoices are usually project based, rarely user based unless 'salesperson'? 
            // We'll leave invoices alone for user filter or clear them?
            // Let's assume user filter implies we only care about user-specific costs/revenues?
            // Or maybe we filter invoices by user if (assigned?)
            // For now, let's not aggressively filter invoices by user to avoid showing empty states unnecessarily unless we map them.
        }
    }

    const totalRevenue = transactions
        .filter(t => t.type === 'income')
        .reduce((acc, curr) => acc + curr.amount, 0);

    const totalExpenses = transactions
        .filter(t => t.type === 'expense')
        .reduce((acc, curr) => acc + curr.amount, 0);

    const netProfit = totalRevenue - totalExpenses;

    const pendingInvoicesAmount = invoices
        .filter(i => i.status === 'Pending')
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
        if (monthData) {
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

export async function addProjectAsset(asset: Omit<Asset, "id" | "uploadedAt">) {
    // Server-Side Safety Check
    const FORBIDDEN_EXTENSIONS = ['.exe', '.bat', '.cmd', '.sh', '.vbs', '.msi', '.jar', '.com', '.scr', '.pif'];
    const fileName = asset.name.toLowerCase();
    if (FORBIDDEN_EXTENSIONS.some(ext => fileName.endsWith(ext))) {
        throw new Error("Security Alert: Malicious file type rejected by server.");
    }

    const newAsset: Asset = {
        ...asset,
        id: generateId(),
        uploadedAt: new Date().toISOString()
    };

    await db.update((data) => ({
        ...data,
        assets: [newAsset, ...(data.assets || [])],
        activities: [{
            id: generateId(),
            user: asset.uploadedBy,
            action: `uploaded asset`,
            target: asset.name,
            timestamp: new Date().toISOString()
        }, ...data.activities]
    }));

    revalidatePath(`/dashboard/projects/${asset.projectId}`);
    return newAsset;
}

export async function deleteProjectAsset(assetId: string) {
    const currentUser = await getCurrentUser();
    const userName = currentUser ? currentUser.name : "System";

    await db.update((data) => {
        const asset = data.assets.find(a => a.id === assetId);
        return {
            ...data,
            assets: data.assets.filter(a => a.id !== assetId),
            activities: asset ? [{
                id: generateId(),
                user: userName,
                action: `deleted asset`,
                target: asset.name,
                timestamp: new Date().toISOString()
            }, ...data.activities] : data.activities
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

    await db.update((data) => ({
        ...data,
        assets: data.assets.map(a => a.id === assetId ? { ...a, ...updates } : a),
        activities: [{
            id: generateId(),
            user: userName,
            action: `updated asset`,
            target: data.assets.find(a => a.id === assetId)?.name || "Asset",
            timestamp: new Date().toISOString()
        }, ...data.activities]
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
    if (!apiKey) throw new Error("Missing API Key");

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

export async function requestLeave(data: Omit<LeaveRequest, "id" | "status" | "createdAt">) {
    const currentUser = await getCurrentUser();
    if (!currentUser) throw new Error("Unauthorized");

    // validation
    const startDate = new Date(data.startDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Parse date as midnight UTC to avoid timezone issues or just use string comparison if ISO
    // For simplicity ensuring we compare dates correctly.
    const startCheck = new Date(startDate);
    startCheck.setHours(0, 0, 0, 0);

    // 2 days rule: Must be >= today + 2
    if (data.type === 'Casual') {
        const minDate = new Date(today);
        minDate.setDate(today.getDate() + 2); // e.g. if today is 20th, min is 22nd.

        if (startCheck < minDate) {
            throw new Error("Casual leave must be applied at least 2 days in advance.");
        }
    }

    const newRequest: LeaveRequest = {
        ...data,
        id: generateId(),
        status: 'Pending',
        createdAt: new Date().toISOString(),
        userId: currentUser.id
    };

    await db.update((dbData) => {
        // Broadcast notification to ALL admins
        const admins = (dbData.users || []).filter(u => u.role === 'admin' || u.role === 'manager');
        const adminNotifications = admins.map(admin => ({
            id: generateId(),
            userId: admin.id,
            message: `New Leave Request from ${currentUser.name}: ${data.type} (${new Date(data.startDate).toLocaleDateString()} - ${new Date(data.endDate).toLocaleDateString()})`,
            read: false,
            timestamp: new Date().toISOString(),
            link: '/dashboard/team' // Admins go to Team page to approve
        }));

        return {
            ...dbData,
            leaveRequests: [newRequest, ...(dbData.leaveRequests || [])],
            notifications: [...adminNotifications, ...(dbData.notifications || [])]
        };
    });

    revalidatePath('/dashboard/team');
    return newRequest;
}

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

export async function updateLeaveStatus(requestId: string, status: LeaveStatus) {
    const currentUser = await getCurrentUser();

    const data = await db.get();
    const request = data.leaveRequests?.find(r => r.id === requestId);
    if (!request) throw new Error("Request not found");

    await db.update((dbData) => ({
        ...dbData,
        leaveRequests: dbData.leaveRequests.map(r => r.id === requestId ? { ...r, status, reviewedBy: currentUser?.id, reviewedAt: new Date().toISOString() } : r),
        notifications: [{
            id: generateId(),
            userId: request.userId,
            message: `Your leave request for ${new Date(request.startDate).toLocaleDateString()} has been ${status}`,
            read: false,
            timestamp: new Date().toISOString(),
            link: `/dashboard/team/${data.users.find(u => u.id === request.userId)?.username || request.userId}?tab=leaves`
        }, ...(dbData.notifications || [])]
    }));

    revalidatePath('/dashboard/team');
}

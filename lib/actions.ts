"use server";

import { db, User, Project, Invoice, Task, Notification, Activity, Client, Asset } from "./db";
import { revalidatePath } from "next/cache";
import { GoogleGenerativeAI } from "@google/generative-ai";

export type SearchResult = {
    id: string;
    type: 'project' | 'client' | 'task' | 'user';
    title: string;
    subtitle?: string;
    url: string;
};

export async function getDashboardMetrics() {
    const data = await db.get();

    const totalRevenue = data.invoices
        .filter(i => i.status === 'Paid')
        .reduce((acc, curr) => acc + curr.amount, 0);

    const pendingInvoices = data.invoices
        .filter(i => i.status === 'Pending')
        .reduce((acc, curr) => acc + curr.amount, 0);

    const activeProjects = data.projects.filter(p => p.status === 'Active').length;

    // Mock utilization calculation
    const totalTasks = data.tasks.length;
    const activeTasks = data.tasks.filter(t => t.status === 'In Progress').length;
    const utilization = totalTasks > 0 ? Math.round((activeTasks / totalTasks) * 100) : 0;

    return {
        revenue: totalRevenue,
        pending: pendingInvoices,
        activeProjects,
        utilization
    };
}

export async function getRevenueData() {
    // Mocking monthly data based on current dummy invoices + random history
    // In a real app, we would aggregate by date from db.invoices
    return [
        { name: "Jan", revenue: 4000, expenses: 2400 },
        { name: "Feb", revenue: 3000, expenses: 1398 },
        { name: "Mar", revenue: 2000, expenses: 9800 },
        { name: "Apr", revenue: 2780, expenses: 3908 },
        { name: "May", revenue: 1890, expenses: 4800 },
        { name: "Jun", revenue: 2390, expenses: 3800 },
        { name: "Jul", revenue: 3490, expenses: 4300 },
    ];
}

export async function getProjectDistribution() {
    const data = await db.get();
    const distribution: Record<string, number> = {};

    data.projects.forEach(p => {
        p.services.forEach(svc => {
            distribution[svc] = (distribution[svc] || 0) + 1;
        });
    });

    return Object.entries(distribution).map(([name, value]) => ({ name, value }));
}

export async function getRecentActivity(): Promise<Activity[]> {
    const data = await db.get();
    return data.activities.slice(0, 5); // Return last 5
}

// Auto-clear notifications older than 24 hours
export async function getNotifications(userId: string): Promise<Notification[]> {
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

    return validNotifications.filter(n => n.userId === userId);
}

export async function getProjects() {
    const data = await db.get();
    return data.projects;
}

export async function getProject(id: string) {
    const data = await db.get();
    return data.projects.find(p => p.id === id);
}

export async function getUsers() {
    const data = await db.get();
    return data.users;
}

export async function createUser(user: Omit<User, "id">) {
    const newUser = { ...user, id: Math.random().toString(36).substr(2, 9) };
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

    await db.update((data) => ({
        ...data,
        users: data.users.map(u => u.id === id ? { ...u, ...updates } : u)
    }));
    revalidatePath('/dashboard/team');
}

export async function deleteUser(id: string) {
    await db.update((data) => ({
        ...data,
        users: data.users.filter(u => u.id !== id)
    }));
    revalidatePath('/dashboard/team');
}

export async function getCategories() {
    const data = await db.get();
    return data.categories;
}

export async function addCategory(name: string) {
    const newCategory = { id: Math.random().toString(36).substr(2, 9), name };
    await db.update((data) => ({
        ...data,
        categories: [...data.categories, newCategory]
    }));
    revalidatePath('/dashboard/settings');
    revalidatePath('/dashboard/projects');
    return newCategory;
}

export async function deleteCategory(id: string) {
    await db.update((data) => ({
        ...data,
        categories: data.categories.filter(c => c.id !== id)
    }));
    revalidatePath('/dashboard/settings');
    revalidatePath('/dashboard/projects');
}

export async function updateCategory(id: string, name: string) {
    await db.update((data) => ({
        ...data,
        categories: data.categories.map(c => c.id === id ? { ...c, name } : c)
    }));
    revalidatePath('/dashboard/settings');
    revalidatePath('/dashboard/projects');
}

export async function createProject(project: Omit<Project, "id" | "status">) {
    const newProject: Project = { ...project, id: Math.random().toString(36).substr(2, 9), status: "Active" };
    await db.update((data) => {
        if (project.clientId && !data.clients?.find(c => c.id === project.clientId)) {
            throw new Error(`Client with ID ${project.clientId} not found`);
        }

        return {
            ...data,
            projects: [...data.projects, newProject],
            activities: [{
                id: Math.random().toString(),
                user: "Admin",
                action: "created project",
                target: project.client,
                timestamp: new Date().toISOString()
            }, ...data.activities]
        }
    });
    revalidatePath('/dashboard/projects');
    return newProject;
}

export async function getTasks(projectId: string) {
    const data = await db.get();
    return data.tasks.filter(t => t.projectId === projectId);
}

export async function deleteTask(taskId: string) {
    await db.update((data) => ({
        ...data,
        tasks: data.tasks.filter(t => t.id !== taskId),
        activities: [{
            id: Math.random().toString(),
            user: "Admin",
            action: "deleted task",
            target: data.tasks.find(t => t.id === taskId)?.title || "Task",
            timestamp: new Date().toISOString()
        }, ...data.activities]
    }));
    revalidatePath('/dashboard/projects/[id]', 'page');
    revalidatePath('/dashboard/projects');
}

export async function updateTaskStatus(taskId: string, status: Task['status']) {
    await db.update((data) => ({
        ...data,
        tasks: data.tasks.map(t => t.id === taskId ? { ...t, status } : t),
        activities: [{
            id: Math.random().toString(),
            user: "Admin",
            action: "moved task to " + status,
            target: data.tasks.find(t => t.id === taskId)?.title || "Task",
            timestamp: new Date().toISOString()
        }, ...data.activities]
    }));
    revalidatePath('/dashboard/projects/[id]', 'page');
}

export async function updateTask(taskId: string, updates: Partial<Task>) {
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
                        if (!currentServices.includes(updates.category!)) {
                            return { ...p, services: [...currentServices, updates.category!] };
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
                id: Math.random().toString(),
                user: "Admin",
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
        id: Math.random().toString(36).substr(2, 9),
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
            id: Math.random().toString(),
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
    const newTask: Task = { ...task, id: Math.random().toString(36).substr(2, 9), createdAt: new Date().toISOString() };

    await db.update((data) => {
        // Validation
        if (!data.projects.find(p => p.id === task.projectId)) {
            throw new Error(`Project with ID ${task.projectId} not found`);
        }
        if (!data.users.find(u => u.id === task.assigneeId)) {
            throw new Error(`User with ID ${task.assigneeId} not found`);
        }

        // Auto-assign department to project if not exists
        let updatedProjects = data.projects;
        if (task.category) {
            updatedProjects = data.projects.map(p => {
                if (p.id === task.projectId) {
                    const currentServices = p.services || ((p as any).departments ? (p as any).departments : []);
                    if (!currentServices.includes(task.category!)) {
                        return { ...p, services: [...currentServices, task.category!] };
                    }
                }
                return p;
            });
        }

        return {
            ...data,
            projects: updatedProjects,
            tasks: [...data.tasks, newTask],
            notifications: [{
                id: Math.random().toString(),
                userId: task.assigneeId,
                message: `New task assigned: ${task.title}`,
                read: false,
                timestamp: new Date().toISOString(),
                link: `/dashboard/projects/${task.projectId}?task=${newTask.id}`
            }, ...data.notifications]
        };
    });

    revalidatePath('/dashboard/projects');
    revalidatePath('/dashboard/projects/[id]', 'page');
    return newTask;
}



export async function getClients() {
    const data = await db.get();
    return data.clients || [];
}

export async function createClient(client: Omit<Client, "id">) {
    const newClient = { ...client, id: Math.random().toString(36).substr(2, 9) };
    await db.update((data) => ({
        ...data,
        clients: [...(data.clients || []), newClient]
    }));
    revalidatePath('/dashboard/projects');
    return newClient;
}

// Project Actions
export async function updateProject(id: string, updates: Partial<Project>) {
    await db.update((data) => ({
        ...data,
        projects: data.projects.map(p => p.id === id ? { ...p, ...updates } : p)
    }));
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
        // Ideally verify if we should delete tasks too, for now keeping it simple/safe
        // tasks: data.tasks.filter(t => t.projectId !== id) 
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
    const newTransaction: Transaction = {
        ...transaction,
        id: Math.random().toString(36).substr(2, 9),
        status: "completed" // Auto-complete for now
    };

    await db.update((data) => {
        if (transaction.projectId && !data.projects?.find(p => p.id === transaction.projectId)) {
            throw new Error(`Project with ID ${transaction.projectId} not found`);
        }

        return {
            ...data,
            transactions: [newTransaction, ...(data.transactions || [])]
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

    if (projectId) {
        invoices = invoices.filter(i => i.projectId === projectId);
    }

    return invoices.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

export async function createInvoice(invoice: Omit<Invoice, "id" | "status">) {
    const newInvoice: Invoice = {
        ...invoice,
        id: Math.random().toString(36).substr(2, 9),
        status: "Pending"
    };

    await db.update((data) => {
        if (!data.projects?.find(p => p.id === invoice.projectId)) {
            throw new Error(`Project with ID ${invoice.projectId} not found`);
        }

        return {
            ...data,
            invoices: [newInvoice, ...(data.invoices || [])]
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
        date: new Date().toISOString().split('T')[0]
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
            const clientName = data.clients?.find(c => c.id === p.clientId || c.name === p.client)?.name || p.client;
            if (clientName.toLowerCase().includes(lowerQuery) || p.services?.some(d => d.toLowerCase().includes(lowerQuery))) {
                results.push({
                    id: p.id,
                    type: 'project',
                    title: `${clientName} Project`,
                    subtitle: p.services?.join(', ') || '',
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
                    url: `/dashboard/team`
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
    const newAsset: Asset = {
        ...asset,
        id: Math.random().toString(36).substr(2, 9),
        uploadedAt: new Date().toISOString()
    };

    await db.update((data) => ({
        ...data,
        assets: [newAsset, ...(data.assets || [])],
        activities: [{
            id: Math.random().toString(),
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
    await db.update((data) => {
        const asset = data.assets.find(a => a.id === assetId);
        return {
            ...data,
            assets: data.assets.filter(a => a.id !== assetId),
            activities: asset ? [{
                id: Math.random().toString(),
                user: "Admin", // Should be actual user
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
    await db.update((data) => ({
        ...data,
        assets: data.assets.map(a => a.id === assetId ? { ...a, ...updates } : a),
        activities: [{
            id: Math.random().toString(),
            user: "Admin", // Should be actual user
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
            departments: project.departments?.join(", ") || "General"
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
        "gemini-2.5-flash", // Try experimental fast model first if available
        "gemini-1.5-pro",       // High quality
        "gemini-1.5-flash",     // Fast fallback
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
        model: "gemini-2.5-flash",
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

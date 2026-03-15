import {
    globalSearch,
    getTasks,
    getTaskById,
    getFinanceStats,
    getUsers,
    getUserTasks,
    getUser,
    createProject,
    updateProject,
    createTask,
    updateTask,
    updateTaskStatus,
    deleteTask,
    addComment,
    createInvoice,
    createTransaction,
    getTransactions,
    getLeaveRequests,
    getRecentActivity,
    createClient,
    updateClient,
    getInvoices,
    approveLeaveRequest,
    rejectLeaveRequest,
    addService,
    updateService,
    deleteService,
    updateUser,
    bulkEstimateTaskHours,
    getAIPermissions,
    payEmployee,
    createRefund,
    adminApproveInvoicePayment,
    adminRejectInvoicePayment,
    createUser,
} from "./actions";
import {
    connectDB,
    TaskModel, ProjectModel, ClientModel, InvoiceModel,
    TransactionModel, ServiceModel, LeaveRequestModel,
    UserModel, ActivityModel, NotificationModel, AssetModel,
} from "./mongodb";
import { generateId } from "./utils-server";
import { formatCurrency, getCurrencySymbol } from "./currency";
import { getDefaultCurrency } from "./actions/super-admin";
import crypto from "crypto";
import type { AIPermissions } from "./types";

// =============================================================================
// TOOL EXECUTOR — Calls existing server actions
// This file ONLY exports async functions (required because it imports from
// actions.ts which has "use server", making Next.js treat this as a boundary).
// =============================================================================

// Role-based permission matrix for Singularity tools
// Defines which roles can use each tool
type RoleType = 'admin' | 'manager' | 'employee' | 'client';

const TOOL_PERMISSIONS: Record<string, RoleType[]> = {
    // Read-only tools — accessible to everyone
    search_agency: ['admin', 'manager', 'employee', 'client'],
    get_project_tasks: ['admin', 'manager', 'employee', 'client'],
    get_finance_summary: ['admin', 'manager'],
    get_team_workload: ['admin', 'manager'],
    get_recent_activity: ['admin', 'manager', 'employee'],
    get_task_comments: ['admin', 'manager', 'employee', 'client'],
    get_transactions: ['admin', 'manager'],
    get_invoices: ['admin', 'manager', 'client'],
    get_leave_requests: ['admin', 'manager', 'employee'],
    get_employee_profile: ['admin', 'manager', 'employee'],

    // Task actions — employees can update status & comment, but not create/delete
    create_task: ['admin', 'manager'],
    edit_task: ['admin', 'manager', 'employee'],
    update_task_status: ['admin', 'manager', 'employee'],
    reassign_task: ['admin', 'manager'],
    delete_task: ['admin', 'manager'],
    add_task_comment: ['admin', 'manager', 'employee', 'client'],
    bulk_create_tasks: ['admin', 'manager'],

    // Project actions — admin/manager only
    create_project: ['admin', 'manager'],
    update_project: ['admin', 'manager'],

    // Finance actions — admin/manager only
    create_invoice: ['admin', 'manager'],
    add_transaction: ['admin', 'manager'],
    bulk_add_transactions: ['admin', 'manager'],

    // Client management — admin/manager only
    create_client: ['admin', 'manager'],
    update_client: ['admin', 'manager'],

    // Employee management — admin only
    update_employee: ['admin'],

    // Service management — admin only
    add_service: ['admin'],
    update_service: ['admin'],

    // Admin tools
    manage_leave_request: ['admin', 'manager'],
    bulk_estimate_hours: ['admin', 'manager'],

    // Permission-gated tools — admin only (also require AI permission flags)
    pay_employee: ['admin'],
    bulk_pay_employees: ['admin'],
    approve_invoice_payment: ['admin'],
    reject_invoice_payment: ['admin'],
    update_invoice_status: ['admin'],
    bulk_create_invoices: ['admin'],
    create_refund: ['admin'],
    create_employee: ['admin'],
    delete_project: ['admin'],
    delete_client: ['admin'],
    delete_transaction: ['admin'],
    delete_service: ['admin'],
};

// AI Permission flag → tool name mapping for permission-gated tools
const AI_PERMISSION_MAP: Record<string, keyof AIPermissions> = {
    pay_employee: 'canPayroll',
    bulk_pay_employees: 'canPayroll',
    approve_invoice_payment: 'canManageInvoices',
    reject_invoice_payment: 'canManageInvoices',
    update_invoice_status: 'canManageInvoices',
    bulk_create_invoices: 'canManageInvoices',
    create_refund: 'canRefund',
    create_employee: 'canCreateEmployee',
    delete_project: 'canDelete',
    delete_client: 'canDelete',
    delete_transaction: 'canDelete',
    delete_service: 'canDelete',
};

export interface RollbackAction {
    toolName: string;
    actionType: 'create' | 'update' | 'delete';
    entityType: 'task' | 'project' | 'client' | 'invoice' | 'transaction' | 'service' | 'leaveRequest' | 'comment';
    entityId: string;
    beforeSnapshot?: any;
    createdEntityIds?: string[];
    executedAt: string;
}

/** Snapshot an entity from MongoDB before modifying it */
async function snapshotEntity(entityType: string, entityId: string): Promise<any> {
    await connectDB();
    const { getCurrentAgency } = await import('./agency-context');
    const agency = await getCurrentAgency();
    const modelMap: Record<string, any> = {
        task: TaskModel,
        project: ProjectModel,
        client: ClientModel,
        invoice: InvoiceModel,
        transaction: TransactionModel,
        service: ServiceModel,
        leaveRequest: LeaveRequestModel,
    };
    const Model = modelMap[entityType];
    if (!Model) return null;
    const doc = await Model.findOne({ id: entityId, agencyId: agency?.id }).lean();
    return doc || null;
}

/** Look up user role from userId, scoped to the current agency */
async function getUserRole(userId: string): Promise<RoleType> {
    await connectDB();
    const { getCurrentAgency } = await import('./agency-context');
    const agency = await getCurrentAgency();
    const agencyFilter = agency ? { agencyId: agency.id } : {};
    // Check users first
    const user = await UserModel.findOne({ id: userId, ...agencyFilter }).select('role').lean() as any;
    if (user?.role) return user.role as RoleType;
    // Check if it's a client
    const client = await ClientModel.findOne({ id: userId, ...agencyFilter }).select('role').lean() as any;
    if (client) return 'client';
    return 'employee'; // Fallback
}

export async function executeTool(
    name: string,
    args: Record<string, any>,
    userId: string
): Promise<{ success: boolean; data: any; summary: string; rollbackData?: RollbackAction[] }> {
    try {
        const _currency = await getDefaultCurrency();
        const fmtCur = (amount: number) => formatCurrency(amount, _currency);

        // ── Role-based permission check ──────────────────────────────
        const userRole = await getUserRole(userId);
        const allowedRoles = TOOL_PERMISSIONS[name];

        if (allowedRoles && !allowedRoles.includes(userRole)) {
            const roleLabel = userRole === 'client' ? 'Client' : userRole.charAt(0).toUpperCase() + userRole.slice(1);
            return {
                success: false,
                data: null,
                summary: `⛔ Permission denied — "${name.replace(/_/g, ' ')}" requires ${allowedRoles.join('/')} access. Your role (${roleLabel}) does not have this permission.`,
            };
        }
        switch (name) {
            case "create_project": {
                const newProject = await createProject({
                    name: args.name,
                    budget: args.budget || 0,
                    dueDate: args.dueDate || new Date(Date.now() + 90 * 86400000).toISOString().split("T")[0],
                    clientId: args.clientId || undefined,
                    client: args.clientId ? undefined : undefined,
                    services: args.services || [],
                });

                // For historical projects, update status and createdAt
                if (args.status || args.createdAt) {
                    const updates: Record<string, any> = {};
                    if (args.status) updates.status = args.status;
                    if (args.createdAt) updates.createdAt = new Date(args.createdAt).toISOString();
                    await updateProject(newProject.id, updates);
                }

                const statusLabel = args.status || "Active";
                return {
                    success: true,
                    data: { id: newProject.id, name: newProject.name, slug: newProject.slug, status: statusLabel },
                    summary: `Project "${newProject.name}" created (${statusLabel}${args.createdAt ? `, started: ${args.createdAt}` : ""}). You can now use bulk_create_tasks with projectId: ${newProject.id}`,
                    rollbackData: [{
                        toolName: 'create_project',
                        actionType: 'create',
                        entityType: 'project',
                        entityId: newProject.id,
                        executedAt: new Date().toISOString(),
                    }],
                };
            }

            case "search_agency": {
                const results = await globalSearch(args.query || "");
                return {
                    success: true,
                    data: results,
                    summary: results.length > 0
                        ? `Found ${results.length} result(s) for "${args.query}"`
                        : `No results found for "${args.query}"`,
                };
            }

            case "get_project_tasks": {
                const tasks = await getTasks(args.projectId);
                const grouped = {
                    Todo: tasks.filter((t: any) => t.status === "Todo").map((t: any) => ({ id: t.id, title: t.title, priority: t.priority, assigneeId: t.assigneeId, dueDate: t.dueDate })),
                    "In Progress": tasks.filter((t: any) => t.status === "In Progress").map((t: any) => ({ id: t.id, title: t.title, priority: t.priority, assigneeId: t.assigneeId, dueDate: t.dueDate })),
                    Review: tasks.filter((t: any) => t.status === "Review").map((t: any) => ({ id: t.id, title: t.title, priority: t.priority, assigneeId: t.assigneeId, dueDate: t.dueDate })),
                    Done: tasks.filter((t: any) => t.status === "Done").map((t: any) => ({ id: t.id, title: t.title, priority: t.priority, assigneeId: t.assigneeId, dueDate: t.dueDate })),
                };
                return {
                    success: true,
                    data: grouped,
                    summary: `Found ${tasks.length} task(s): ${grouped.Todo.length} Todo, ${grouped["In Progress"].length} In Progress, ${grouped.Review.length} Review, ${grouped.Done.length} Done`,
                };
            }

            case "get_finance_summary": {
                const stats = await getFinanceStats();
                return {
                    success: true,
                    data: stats,
                    summary: `Revenue: ${fmtCur(stats.totalRevenue || 0)}, Expenses: ${fmtCur(stats.totalExpenses || 0)}, Profit: ${fmtCur(stats.netProfit || 0)}`,
                };
            }

            case "get_team_workload": {
                const allUsers = await getUsers();
                const workload = await Promise.all(
                    allUsers.filter((u: any) => u.role !== "client").map(async (u: any) => {
                        const tasks = await getUserTasks(u.id).catch(() => []);
                        return {
                            id: u.id,
                            name: u.name,
                            role: u.role,
                            totalTasks: tasks.length,
                            todo: tasks.filter((t: any) => t.status === "Todo").length,
                            inProgress: tasks.filter((t: any) => t.status === "In Progress").length,
                            review: tasks.filter((t: any) => t.status === "Review").length,
                            done: tasks.filter((t: any) => t.status === "Done").length,
                        };
                    })
                );
                return {
                    success: true,
                    data: workload,
                    summary: `${workload.length} team member(s): ${workload.map(w => `${w.name}: ${w.totalTasks} tasks`).join(", ")}`,
                };
            }

            case "create_task": {
                // Smart auto-assign: if no assignee specified, pick least busy team member
                let assigneeId = args.assigneeId || "";
                let assigneeName = "";
                let autoAssigned = false;

                if (!assigneeId) {
                    // Find the least busy team member
                    const allUsers = await getUsers();
                    const teamMembers = allUsers.filter((u: any) => u.role !== "client");

                    if (teamMembers.length > 0) {
                        const workloads = await Promise.all(
                            teamMembers.map(async (u: any) => {
                                const tasks = await getUserTasks(u.id).catch(() => []);
                                const activeTasks = tasks.filter((t: any) => t.status !== "Done").length;
                                return { id: u.id, name: u.name, activeTasks };
                            })
                        );
                        workloads.sort((a, b) => a.activeTasks - b.activeTasks);
                        assigneeId = workloads[0].id;
                        assigneeName = workloads[0].name;
                        autoAssigned = true;
                    } else {
                        assigneeId = userId;
                        assigneeName = "you";
                    }
                } else {
                    // Look up the name for the provided assigneeId
                    const assignee = await getUser(assigneeId).catch(() => null);
                    assigneeName = assignee?.name || assigneeId;
                }

                const dueDate = args.dueDate || new Date(Date.now() + 7 * 86400000).toISOString().split("T")[0];
                const newTask = await createTask({
                    projectId: args.projectId,
                    title: args.title,
                    description: args.description || "",
                    assigneeId,
                    category: args.category || "",
                    priority: args.priority || "Medium",
                    dueDate,
                    status: (args.status as any) || "Todo",
                    estimatedHours: args.estimatedHours || undefined,
                });

                // Backdate createdAt for historical imports
                if (args.createdAt) {
                    await updateTask(newTask.id, { createdAt: new Date(args.createdAt).toISOString() } as any);
                }

                const assignInfo = autoAssigned
                    ? `auto-assigned to ${assigneeName} (fewest active tasks)`
                    : `assigned to ${assigneeName}`;

                return {
                    success: true,
                    data: { id: newTask.id, title: newTask.title, projectId: newTask.projectId, assigneeId, assigneeName },
                    summary: `Task "${newTask.title}" created — ${assignInfo}, category: ${args.category || "none"}, due: ${dueDate}`,
                    rollbackData: [{
                        toolName: 'create_task',
                        actionType: 'create',
                        entityType: 'task',
                        entityId: newTask.id,
                        executedAt: new Date().toISOString(),
                    }],
                };
            }

            case "update_task_status": {
                const taskStatusSnapshot = await snapshotEntity('task', args.taskId);
                await updateTaskStatus(args.taskId, args.status);
                return {
                    success: true,
                    data: { taskId: args.taskId, newStatus: args.status },
                    summary: `Task moved to "${args.status}"`,
                    rollbackData: taskStatusSnapshot ? [{
                        toolName: 'update_task_status',
                        actionType: 'update',
                        entityType: 'task',
                        entityId: args.taskId,
                        beforeSnapshot: taskStatusSnapshot,
                        executedAt: new Date().toISOString(),
                    }] : undefined,
                };
            }

            case "edit_task": {
                const editUpdates: Record<string, any> = {};
                if (args.title) editUpdates.title = args.title;
                if (args.description) editUpdates.description = args.description;
                if (args.priority) editUpdates.priority = args.priority;
                if (args.category) editUpdates.category = args.category;
                if (args.dueDate) editUpdates.dueDate = args.dueDate;
                if (args.status) editUpdates.status = args.status;
                if (args.estimatedHours !== undefined) editUpdates.estimatedHours = args.estimatedHours;

                if (Object.keys(editUpdates).length === 0) {
                    return { success: false, data: null, summary: "No changes specified" };
                }

                const editSnapshot = await snapshotEntity('task', args.taskId);
                await updateTask(args.taskId, editUpdates);
                const changedFields = Object.keys(editUpdates).join(", ");
                return {
                    success: true,
                    data: { taskId: args.taskId, updates: editUpdates },
                    summary: `Task updated — changed: ${changedFields}`,
                    rollbackData: editSnapshot ? [{
                        toolName: 'edit_task',
                        actionType: 'update',
                        entityType: 'task',
                        entityId: args.taskId,
                        beforeSnapshot: editSnapshot,
                        executedAt: new Date().toISOString(),
                    }] : undefined,
                };
            }

            case "reassign_task": {
                const newAssignee = await getUser(args.assigneeId).catch(() => null);
                const newAssigneeName = newAssignee?.name || args.assigneeId;

                const reassignSnapshot = await snapshotEntity('task', args.taskId);
                await updateTask(args.taskId, { assigneeId: args.assigneeId });
                return {
                    success: true,
                    data: { taskId: args.taskId, newAssigneeId: args.assigneeId, newAssigneeName },
                    summary: `Task reassigned to ${newAssigneeName}`,
                    rollbackData: reassignSnapshot ? [{
                        toolName: 'reassign_task',
                        actionType: 'update',
                        entityType: 'task',
                        entityId: args.taskId,
                        beforeSnapshot: reassignSnapshot,
                        executedAt: new Date().toISOString(),
                    }] : undefined,
                };
            }

            case "delete_task": {
                const deleteSnapshot = await snapshotEntity('task', args.taskId);
                await deleteTask(args.taskId);
                return {
                    success: true,
                    data: { taskId: args.taskId },
                    summary: `Task deleted`,
                    rollbackData: deleteSnapshot ? [{
                        toolName: 'delete_task',
                        actionType: 'delete',
                        entityType: 'task',
                        entityId: args.taskId,
                        beforeSnapshot: deleteSnapshot,
                        executedAt: new Date().toISOString(),
                    }] : undefined,
                };
            }

            case "add_task_comment": {
                const commentSnapshot = await snapshotEntity('task', args.taskId);
                await addComment(args.taskId, userId, args.comment, args.createdAt ? new Date(args.createdAt).toISOString() : undefined);
                return {
                    success: true,
                    data: { taskId: args.taskId },
                    summary: `Comment added to task`,
                    rollbackData: commentSnapshot ? [{
                        toolName: 'add_task_comment',
                        actionType: 'update',
                        entityType: 'task',
                        entityId: args.taskId,
                        beforeSnapshot: commentSnapshot,
                        executedAt: new Date().toISOString(),
                    }] : undefined,
                };
            }

            case "create_invoice": {
                const newInvoice = await createInvoice({
                    projectId: args.projectId,
                    amount: args.amount,
                    date: args.date,
                });
                return {
                    success: true,
                    data: { id: newInvoice.id, amount: newInvoice.amount },
                    summary: `Invoice created: ${fmtCur(args.amount)}${args.status ? ` (${args.status})` : ""}`,
                    rollbackData: [{
                        toolName: 'create_invoice',
                        actionType: 'create',
                        entityType: 'invoice',
                        entityId: newInvoice.id,
                        executedAt: new Date().toISOString(),
                    }],
                };
            }

            case "update_project": {
                const projUpdates: Record<string, any> = {};
                if (args.name) projUpdates.name = args.name;
                if (args.budget !== undefined) projUpdates.budget = args.budget;
                if (args.dueDate) projUpdates.dueDate = args.dueDate;
                if (args.status) projUpdates.status = args.status;
                if (args.services) projUpdates.services = args.services;

                if (Object.keys(projUpdates).length === 0) {
                    return { success: false, data: null, summary: "No changes specified" };
                }

                const projSnapshot = await snapshotEntity('project', args.projectId);
                await updateProject(args.projectId, projUpdates);
                const changedFields = Object.keys(projUpdates).join(", ");
                return {
                    success: true,
                    data: { projectId: args.projectId, updates: projUpdates },
                    summary: `Project updated — changed: ${changedFields}`,
                    rollbackData: projSnapshot ? [{
                        toolName: 'update_project',
                        actionType: 'update',
                        entityType: 'project',
                        entityId: args.projectId,
                        beforeSnapshot: projSnapshot,
                        executedAt: new Date().toISOString(),
                    }] : undefined,
                };
            }


            case "get_leave_requests": {
                const leaves = await getLeaveRequests(args.userId);
                return {
                    success: true,
                    data: leaves.slice(0, 10).map((l: any) => ({
                        id: l.id,
                        userId: l.userId,
                        startDate: l.startDate,
                        endDate: l.endDate,
                        type: l.type,
                        reason: l.reason,
                        status: l.status,
                    })),
                    summary: `${leaves.length} leave request(s) found`,
                };
            }

            case "bulk_create_tasks": {
                const tasks = args.tasks || [];
                if (tasks.length === 0) {
                    return { success: false, data: null, summary: "No tasks provided" };
                }

                // Build team member lookup and workload for smart assignment
                const allUsers = await getUsers();
                const teamMembers = allUsers.filter((u: any) => u.role !== "client");
                const userNameMap = new Map<string, string>();
                for (const u of teamMembers) {
                    userNameMap.set(u.id, u.name);
                }

                // Get current workloads for auto-assignment
                const workloads = await Promise.all(
                    teamMembers.map(async (u: any) => {
                        const userTasks = await getUserTasks(u.id).catch(() => []);
                        const activeTasks = userTasks.filter((t: any) => t.status !== "Done").length;
                        return { id: u.id, name: u.name, role: u.role, activeTasks, assigned: 0 };
                    })
                );
                // Sort by fewest active tasks
                workloads.sort((a, b) => a.activeTasks - b.activeTasks);

                // Calculate sequential due dates
                const startDate = args.startDate
                    ? new Date(args.startDate)
                    : new Date();
                let currentDate = new Date(startDate);

                // Track per-assignee schedule for parallelism
                const assigneeSchedule = new Map<string, Date>();

                const createdTasks: any[] = [];
                const failedTasks: string[] = [];
                const phaseBreakdown: Record<string, number> = {};

                for (const task of tasks) {
                    try {
                        // Determine assignee — use provided or round-robin least busy
                        let assigneeId = task.assigneeId || "";
                        if (!assigneeId && workloads.length > 0) {
                            // Pick the person with fewest (active + newly assigned) tasks
                            workloads.sort((a, b) => (a.activeTasks + a.assigned) - (b.activeTasks + b.assigned));
                            assigneeId = workloads[0].id;
                            workloads[0].assigned++;
                        }

                        // Calculate due date — use provided or auto-calculate
                        let dueDateStr = task.dueDate || "";
                        if (!dueDateStr) {
                            const estDays = task.estimatedDays || 3;
                            const assigneeStart = assigneeSchedule.get(assigneeId) || new Date(startDate);
                            const dueDate = new Date(assigneeStart);
                            dueDate.setDate(dueDate.getDate() + estDays);
                            assigneeSchedule.set(assigneeId, new Date(dueDate));
                            dueDateStr = dueDate.toISOString().split("T")[0];
                        }

                        const taskStatus = task.status || "Todo";

                        const newTask = await createTask({
                            projectId: args.projectId,
                            title: task.title,
                            description: task.description || "",
                            assigneeId: assigneeId || userId,
                            category: task.category || "",
                            priority: task.priority || "Medium",
                            dueDate: dueDateStr,
                            status: taskStatus,
                            estimatedHours: task.estimatedHours || undefined,
                        });

                        // Backdate createdAt for historical imports
                        if (task.createdAt) {
                            await updateTask(newTask.id, { createdAt: new Date(task.createdAt).toISOString() } as any);
                        }

                        const assigneeName = userNameMap.get(assigneeId) || "Unassigned";
                        createdTasks.push({
                            id: newTask.id,
                            title: task.title,
                            assignee: assigneeName,
                            dueDate: dueDateStr,
                            phase: task.phase || "General",
                            category: task.category || "",
                        });

                        // Track phase
                        const phase = task.phase || "General";
                        phaseBreakdown[phase] = (phaseBreakdown[phase] || 0) + 1;

                    } catch (err: any) {
                        failedTasks.push(`${task.title}: ${err.message}`);
                    }
                }

                // Build distribution summary
                const assigneeCounts: Record<string, number> = {};
                for (const t of createdTasks) {
                    assigneeCounts[t.assignee] = (assigneeCounts[t.assignee] || 0) + 1;
                }
                const distSummary = Object.entries(assigneeCounts)
                    .map(([name, count]) => `${name}: ${count}`)
                    .join(", ");

                const phaseSummary = Object.entries(phaseBreakdown)
                    .map(([phase, count]) => `${phase}: ${count}`)
                    .join(", ");

                // Calculate project end date (latest due date)
                const projectEndDate = createdTasks.length > 0
                    ? createdTasks.reduce((latest, t) => t.dueDate > latest ? t.dueDate : latest, createdTasks[0].dueDate)
                    : "N/A";

                const summary = `✅ Created ${createdTasks.length}/${tasks.length} tasks` +
                    (failedTasks.length > 0 ? ` (${failedTasks.length} failed)` : "") +
                    ` | Phases: ${phaseSummary}` +
                    ` | Distribution: ${distSummary}` +
                    ` | Project timeline: ${startDate.toISOString().split("T")[0]} → ${projectEndDate}`;

                return {
                    success: true,
                    data: {
                        created: createdTasks.length,
                        failed: failedTasks.length,
                        tasks: createdTasks,
                        failedDetails: failedTasks,
                        phaseBreakdown,
                        assigneeDistribution: assigneeCounts,
                        projectEndDate,
                    },
                    summary,
                    rollbackData: createdTasks.length > 0 ? [{
                        toolName: 'bulk_create_tasks',
                        actionType: 'create',
                        entityType: 'task',
                        entityId: createdTasks[0].id,
                        createdEntityIds: createdTasks.map(t => t.id),
                        executedAt: new Date().toISOString(),
                    }] : undefined,
                };
            }

            case "bulk_add_transactions": {
                const txns = args.transactions || [];
                if (txns.length === 0) {
                    return { success: false, data: null, summary: "No transactions provided" };
                }

                const created: any[] = [];
                const failed: string[] = [];
                let totalIncome = 0;
                let totalExpense = 0;

                for (const txn of txns) {
                    try {
                        const newTxn = await createTransaction({
                            category: txn.category,
                            type: txn.type,
                            amount: txn.amount,
                            date: txn.date,
                            description: txn.description || "",
                            projectId: txn.projectId || undefined,
                            userId: txn.userId || undefined,
                            taxType: txn.taxType || undefined,
                            expenseType: txn.expenseType || undefined,
                            status: txn.status || "completed",
                        });
                        created.push({ id: newTxn.id, category: txn.category, amount: txn.amount, type: txn.type });
                        if (txn.type === "income") totalIncome += txn.amount;
                        else totalExpense += txn.amount;
                    } catch (err: any) {
                        failed.push(`${txn.description || txn.category}: ${err.message}`);
                    }
                }

                return {
                    success: true,
                    data: {
                        created: created.length,
                        failed: failed.length,
                        failedDetails: failed,
                        totalIncome,
                        totalExpense,
                    },
                    summary: `✅ ${created.length}/${txns.length} transactions imported` +
                        (failed.length > 0 ? ` (${failed.length} failed)` : "") +
                        ` | Income: ${fmtCur(totalIncome)} | Expenses: ${fmtCur(totalExpense)}`,
                    rollbackData: created.length > 0 ? [{
                        toolName: 'bulk_add_transactions',
                        actionType: 'create',
                        entityType: 'transaction',
                        entityId: created[0].id,
                        createdEntityIds: created.map((c: any) => c.id),
                        executedAt: new Date().toISOString(),
                    }] : undefined,
                };
            }

            case "add_transaction": {
                const txn = await createTransaction({
                    category: args.category,
                    type: args.type,
                    amount: args.amount,
                    date: args.date || new Date().toISOString().split("T")[0],
                    description: args.description || "",
                    projectId: args.projectId || undefined,
                    userId: args.userId || undefined,
                    taxType: args.taxType || undefined,
                    expenseType: args.expenseType || undefined,
                    status: args.status || "completed",
                });

                // Look up names for the summary
                let extraInfo = "";
                if (args.userId) {
                    const user = await getUser(args.userId).catch(() => null);
                    extraInfo += ` | Employee: ${user?.name || args.userId}`;
                }

                return {
                    success: true,
                    data: { id: txn.id, category: txn.category, type: txn.type, amount: txn.amount },
                    summary: `${args.type === "income" ? "Income" : "Expense"} of ${fmtCur(args.amount)} added (${args.category})${extraInfo}`,
                    rollbackData: [{
                        toolName: 'add_transaction',
                        actionType: 'create',
                        entityType: 'transaction',
                        entityId: txn.id,
                        executedAt: new Date().toISOString(),
                    }],
                };
            }

            case "get_transactions": {
                const txns = await getTransactions(args.projectId, args.userId, args.category);
                // client-side filter by type if provided
                const filtered = args.type ? txns.filter((t: any) => t.type === args.type) : txns;
                const limited = filtered.slice(0, 15);
                return {
                    success: true,
                    data: limited.map((t: any) => ({
                        id: t.id,
                        date: t.date,
                        amount: t.amount,
                        type: t.type,
                        category: t.category,
                        description: t.description,
                        status: t.status,
                    })),
                    summary: `${filtered.length} transaction(s) found | Total: ${fmtCur(filtered.reduce((sum: number, t: any) => sum + (t.type === "income" ? t.amount : -t.amount), 0))}`,
                };
            }

            case "get_recent_activity": {
                const activity = await getRecentActivity(0, 10);
                return {
                    success: true,
                    data: activity.map((a: any) => ({
                        user: a.user,
                        action: a.action,
                        target: a.target,
                        timestamp: a.timestamp,
                    })),
                    summary: `${activity.length} recent activities`,
                };
            }

            case "create_client": {
                const newClient = await createClient({
                    name: args.name,
                    email: args.email,
                    companyName: args.companyName,
                    phone: args.phone || undefined,
                    address: args.address || undefined,
                    logo: args.logo || undefined,
                });

                // Backdate createdAt for historical imports
                if (args.createdAt) {
                    await updateClient(newClient.id, { createdAt: new Date(args.createdAt).toISOString() } as any);
                }

                return {
                    success: true,
                    data: { id: newClient.id, name: newClient.name, companyName: newClient.companyName },
                    summary: `Client "${newClient.name}" (${newClient.companyName}) created${args.createdAt ? ` (backdated: ${args.createdAt})` : ''}`,
                    rollbackData: [{
                        toolName: 'create_client',
                        actionType: 'create',
                        entityType: 'client',
                        entityId: newClient.id,
                        executedAt: new Date().toISOString(),
                    }],
                };
            }

            case "update_client": {
                const clientUpdates: Record<string, any> = {};
                if (args.name) clientUpdates.name = args.name;
                if (args.email) clientUpdates.email = args.email;
                if (args.companyName) clientUpdates.companyName = args.companyName;
                if (args.phone) clientUpdates.phone = args.phone;
                if (args.address) clientUpdates.address = args.address;
                if (args.logo) clientUpdates.logo = args.logo;
                const clientSnapshot = await snapshotEntity('client', args.clientId);
                await updateClient(args.clientId, clientUpdates);
                return {
                    success: true,
                    data: { clientId: args.clientId, updates: clientUpdates },
                    summary: `Client updated — changed: ${Object.keys(clientUpdates).join(", ")}`,
                    rollbackData: clientSnapshot ? [{
                        toolName: 'update_client',
                        actionType: 'update',
                        entityType: 'client',
                        entityId: args.clientId,
                        beforeSnapshot: clientSnapshot,
                        executedAt: new Date().toISOString(),
                    }] : undefined,
                };
            }

            case "get_employee_profile": {
                const profile = await getUser(args.userId);
                if (!profile) {
                    return { success: false, data: null, summary: "User not found" };
                }
                const userTasks = await getUserTasks(args.userId).catch(() => []);
                const activeTasks = userTasks.filter((t: any) => t.status !== "Done");
                // Redact salary for non-admin/manager roles (BUG-186)
                const canSeeSalary = userRole === 'admin' || userRole === 'manager';
                return {
                    success: true,
                    data: {
                        id: profile.id,
                        name: profile.name,
                        email: (profile as any).email,
                        role: (profile as any).role,
                        jobTitle: (profile as any).jobTitle,
                        phone: (profile as any).phone,
                        ...(canSeeSalary ? { salary: (profile as any).salary } : {}),
                        totalTasks: userTasks.length,
                        activeTasks: activeTasks.length,
                        doneTasks: userTasks.length - activeTasks.length,
                    },
                    summary: `${profile.name} — ${(profile as any).role || "employee"} | ${(profile as any).jobTitle || "No title"} | ${activeTasks.length} active tasks`,
                };
            }

            case "update_employee": {
                const empUpdates: Record<string, any> = {};
                if (args.name) empUpdates.name = args.name;
                if (args.email) empUpdates.email = args.email;
                if (args.jobTitle) empUpdates.jobTitle = args.jobTitle;
                if (args.role) empUpdates.role = args.role;
                if (args.salary !== undefined) empUpdates.salary = args.salary;
                if (args.phone) empUpdates.phone = args.phone;
                // Note: Users are not in the same model as snapshotEntity expects
                // We store a partial snapshot of only changed fields
                const empBefore = await getUser(args.userId).catch(() => null);
                await updateUser(args.userId, empUpdates);
                const empName = await getUser(args.userId).catch(() => null);
                return {
                    success: true,
                    data: { userId: args.userId, updates: empUpdates },
                    summary: `${empName?.name || "Employee"} updated — changed: ${Object.keys(empUpdates).join(", ")}`,
                };
            }

            case "get_task_comments": {
                // BUG-105: Use direct task lookup instead of unreliable globalSearch
                let targetTask: any = await getTaskById(args.taskId).catch(() => null);

                // Fallback to globalSearch if direct lookup fails
                if (!targetTask) {
                    const searchResults = await globalSearch(args.taskId);
                    targetTask = searchResults.find((r: any) => r.id === args.taskId && r.type === "task");
                }
                if (!targetTask) {
                    return { success: false, data: null, summary: "Task not found" };
                }
                const comments = (targetTask as any).comments || [];
                // Resolve user names for comments
                const enrichedComments = await Promise.all(
                    comments.map(async (c: any) => {
                        const commenter = await getUser(c.userId).catch(() => null);
                        return {
                            id: c.id,
                            user: commenter?.name || c.userId,
                            text: c.text,
                            timestamp: c.timestamp,
                        };
                    })
                );
                return {
                    success: true,
                    data: enrichedComments,
                    summary: `${comments.length} comment(s) on "${(targetTask as any).title}"`,
                };
            }

            case "get_invoices": {
                const invoices = await getInvoices(args.projectId);
                const filtered = args.status
                    ? invoices.filter((inv: any) => inv.status?.toLowerCase() === args.status.toLowerCase())
                    : invoices;
                return {
                    success: true,
                    data: filtered.slice(0, 20).map((inv: any) => ({
                        id: inv.id,
                        projectId: inv.projectId,
                        amount: inv.amount,
                        status: inv.status,
                        date: inv.date,
                        description: inv.description,
                    })),
                    summary: `${filtered.length} invoice(s)${args.status ? ` (${args.status})` : ""} | Total: ${fmtCur(filtered.reduce((sum: number, i: any) => sum + i.amount, 0))}`,
                };
            }

            case "manage_leave_request": {
                const leaveSnapshot = await snapshotEntity('leaveRequest', args.leaveRequestId);
                if (args.action === "approve") {
                    await approveLeaveRequest(args.leaveRequestId);
                    return {
                        success: true,
                        data: { leaveRequestId: args.leaveRequestId, action: "approved" },
                        summary: `Leave request approved ✅`,
                        rollbackData: leaveSnapshot ? [{
                            toolName: 'manage_leave_request',
                            actionType: 'update',
                            entityType: 'leaveRequest',
                            entityId: args.leaveRequestId,
                            beforeSnapshot: leaveSnapshot,
                            executedAt: new Date().toISOString(),
                        }] : undefined,
                    };
                } else {
                    await rejectLeaveRequest(args.leaveRequestId, args.reason || "");
                    return {
                        success: true,
                        data: { leaveRequestId: args.leaveRequestId, action: "rejected", reason: args.reason },
                        summary: `Leave request rejected ❌${args.reason ? ` — Reason: ${args.reason}` : ""}`,
                        rollbackData: leaveSnapshot ? [{
                            toolName: 'manage_leave_request',
                            actionType: 'update',
                            entityType: 'leaveRequest',
                            entityId: args.leaveRequestId,
                            beforeSnapshot: leaveSnapshot,
                            executedAt: new Date().toISOString(),
                        }] : undefined,
                    };
                }
            }

            case "add_service": {
                const newService = await addService(args.name, args.projectId || '', args.jobs || []);
                return {
                    success: true,
                    data: { id: newService.id, name: newService.name },
                    summary: `Service "${newService.name}" added as a new category`,
                    rollbackData: [{
                        toolName: 'add_service',
                        actionType: 'create',
                        entityType: 'service',
                        entityId: newService.id,
                        executedAt: new Date().toISOString(),
                    }],
                };
            }

            case "update_service": {
                const svcSnapshot = await snapshotEntity('service', args.serviceId);
                await updateService(args.serviceId, args.name, args.projectId || '', args.jobs || []);
                return {
                    success: true,
                    data: { serviceId: args.serviceId, name: args.name },
                    summary: `Service updated to "${args.name}"`,
                    rollbackData: svcSnapshot ? [{
                        toolName: 'update_service',
                        actionType: 'update',
                        entityType: 'service',
                        entityId: args.serviceId,
                        beforeSnapshot: svcSnapshot,
                        executedAt: new Date().toISOString(),
                    }] : undefined,
                };
            }

            case "bulk_estimate_hours": {
                const result = await bulkEstimateTaskHours();
                return {
                    success: true,
                    data: result,
                    summary: result.message,
                };
            }

            // =================================================================
            // PERMISSION-GATED TOOLS — require AI permission flags
            // =================================================================

            case "pay_employee": {
                const aiPerms = await getAIPermissions();
                if (!aiPerms.canPayroll) return { success: false, data: null, summary: '⛔ AI Payroll permission is disabled. Enable it in Settings → AI Settings.' };

                const empUser = await getUser(args.userId);
                const payDate = `${args.month}-15`; // Mid-month date
                await payEmployee(args.userId, args.amount, args.month, empUser?.name || 'Employee');
                return {
                    success: true,
                    data: { userId: args.userId, amount: args.amount, month: args.month },
                    summary: `Salary of ${fmtCur(args.amount)} paid to ${empUser?.name || 'employee'} for ${args.month}`,
                    rollbackData: [{
                        toolName: 'pay_employee', actionType: 'create', entityType: 'transaction',
                        entityId: '', executedAt: new Date().toISOString(),
                    }],
                };
            }

            case "bulk_pay_employees": {
                const aiPerms = await getAIPermissions();
                if (!aiPerms.canPayroll) return { success: false, data: null, summary: '⛔ AI Payroll permission is disabled. Enable it in Settings → AI Settings.' };

                const results: string[] = [];
                for (const pay of args.payments) {
                    const emp = await getUser(pay.userId);
                    await payEmployee(pay.userId, pay.amount, args.month, emp?.name || 'Employee');
                    results.push(`${emp?.name || pay.userId}: ${fmtCur(pay.amount)}`);
                }
                return {
                    success: true,
                    data: { count: args.payments.length, month: args.month },
                    summary: `Bulk payroll for ${args.month}: ${args.payments.length} employee(s) paid — ${results.join(', ')}`,
                };
            }

            case "approve_invoice_payment": {
                const aiPerms = await getAIPermissions();
                if (!aiPerms.canManageInvoices) return { success: false, data: null, summary: '⛔ AI Invoice Management permission is disabled. Enable it in Settings → AI Settings.' };

                const invSnapshot = await snapshotEntity('invoice', args.invoiceId);
                await adminApproveInvoicePayment(args.invoiceId);
                return {
                    success: true,
                    data: { invoiceId: args.invoiceId },
                    summary: `Invoice payment approved ✅ — now marked as Paid`,
                    rollbackData: invSnapshot ? [{
                        toolName: 'approve_invoice_payment', actionType: 'update', entityType: 'invoice',
                        entityId: args.invoiceId, beforeSnapshot: invSnapshot, executedAt: new Date().toISOString(),
                    }] : undefined,
                };
            }

            case "reject_invoice_payment": {
                const aiPerms = await getAIPermissions();
                if (!aiPerms.canManageInvoices) return { success: false, data: null, summary: '⛔ AI Invoice Management permission is disabled. Enable it in Settings → AI Settings.' };

                const rejSnapshot = await snapshotEntity('invoice', args.invoiceId);
                await adminRejectInvoicePayment(args.invoiceId, args.reason || '');
                return {
                    success: true,
                    data: { invoiceId: args.invoiceId, reason: args.reason },
                    summary: `Invoice payment rejected ❌${args.reason ? ` — ${args.reason}` : ''}`,
                    rollbackData: rejSnapshot ? [{
                        toolName: 'reject_invoice_payment', actionType: 'update', entityType: 'invoice',
                        entityId: args.invoiceId, beforeSnapshot: rejSnapshot, executedAt: new Date().toISOString(),
                    }] : undefined,
                };
            }

            case "update_invoice_status": {
                const aiPerms = await getAIPermissions();
                if (!aiPerms.canManageInvoices) return { success: false, data: null, summary: '⛔ AI Invoice Management permission is disabled. Enable it in Settings → AI Settings.' };

                await connectDB();
                const { getCurrentAgency } = await import('./agency-context');
                const agency = await getCurrentAgency();
                const invStatusSnapshot = await snapshotEntity('invoice', args.invoiceId);
                // C4 fix: Invoice state machine — prevent invalid transitions (mirrors BUG-044)
                const invoice = await InvoiceModel.findOne({ id: args.invoiceId, agencyId: agency?.id }).lean();
                if (!invoice) return { success: false, data: null, summary: 'Invoice not found' };
                const currentInvStatus = (invoice as any).status;
                const invalidTransitions: Record<string, string[]> = {
                    'Paid': ['Pending'], // Cannot revert paid invoice to pending
                };
                if (invalidTransitions[currentInvStatus]?.includes(args.status)) {
                    return { success: false, data: null, summary: `Cannot change invoice status from ${currentInvStatus} to ${args.status}` };
                }

                await InvoiceModel.updateOne(
                    { id: args.invoiceId, agencyId: agency?.id },
                    { $set: { status: args.status } }
                );
                // C4 fix: Revalidate cache
                const { revalidatePath: revalInvFinance } = await import('next/cache');
                revalInvFinance('/dashboard/finance');
                return {
                    success: true,
                    data: { invoiceId: args.invoiceId, status: args.status },
                    summary: `Invoice status updated to "${args.status}"`,
                    rollbackData: invStatusSnapshot ? [{
                        toolName: 'update_invoice_status', actionType: 'update', entityType: 'invoice',
                        entityId: args.invoiceId, beforeSnapshot: invStatusSnapshot, executedAt: new Date().toISOString(),
                    }] : undefined,
                };
            }

            case "bulk_create_invoices": {
                const aiPerms = await getAIPermissions();
                if (!aiPerms.canManageInvoices) return { success: false, data: null, summary: '⛔ AI Invoice Management permission is disabled. Enable it in Settings → AI Settings.' };

                await connectDB();
                const { getCurrentAgency } = await import('./agency-context');
                const agency = await getCurrentAgency();

                const createdIds: string[] = [];
                for (const inv of args.invoices) {
                    const result = await createInvoice({
                        projectId: inv.projectId,
                        amount: inv.amount,
                        date: inv.date,
                    });
                    // Update status if provided (createInvoice defaults to 'Pending')
                    if (inv.status && inv.status !== 'Pending') {
                        await InvoiceModel.updateOne(
                            { id: result.id, agencyId: agency?.id },
                            { $set: { status: inv.status } }
                        );
                    }
                    createdIds.push(result.id);
                }
                return {
                    success: true,
                    data: { count: createdIds.length, ids: createdIds },
                    summary: `${createdIds.length} invoice(s) created`,
                    rollbackData: [{
                        toolName: 'bulk_create_invoices', actionType: 'create', entityType: 'invoice',
                        entityId: createdIds[0] || '', createdEntityIds: createdIds, executedAt: new Date().toISOString(),
                    }],
                };
            }

            case "create_refund": {
                const aiPerms = await getAIPermissions();
                if (!aiPerms.canRefund) return { success: false, data: null, summary: '⛔ AI Refund permission is disabled. Enable it in Settings → AI Settings.' };

                const refundResult = await createRefund({
                    projectId: args.projectId,
                    amount: args.amount,
                    description: args.description,
                    refundReason: args.description, // Use description as reason
                    date: args.date || new Date().toISOString().split('T')[0],
                });
                return {
                    success: true,
                    data: { id: refundResult.id, amount: args.amount },
                    summary: `Refund of ${fmtCur(args.amount)} created — ${args.description}`,
                    rollbackData: [{
                        toolName: 'create_refund', actionType: 'create', entityType: 'transaction',
                        entityId: refundResult.id, executedAt: new Date().toISOString(),
                    }],
                };
            }

            case "create_employee": {
                const aiPerms = await getAIPermissions();
                if (!aiPerms.canCreateEmployee) return { success: false, data: null, summary: '⛔ AI Employee Creation permission is disabled. Enable it in Settings → AI Settings.' };

                const generatedPassword = args.password || crypto.randomBytes(16).toString('base64url');
                const newEmp = await createUser({
                    name: args.name,
                    email: args.email,
                    role: args.role || 'employee',
                    jobTitle: args.jobTitle,
                    salary: args.salary,
                    employmentType: args.employmentType || 'Salary',
                    password: generatedPassword,
                });

                // Backdate createdAt for historical imports
                if (args.createdAt) {
                    await updateUser(newEmp.id, { createdAt: new Date(args.createdAt).toISOString() } as any);
                }

                return {
                    success: true,
                    data: { id: newEmp.id, name: newEmp.name, email: newEmp.email, role: newEmp.role, temporaryPassword: generatedPassword },
                    summary: `Employee "${newEmp.name}" created (${newEmp.role}) — email: ${newEmp.email}. Temporary password: ${generatedPassword} — please change on first login.`,
                };
            }

            case "delete_project": {
                const aiPerms = await getAIPermissions();
                if (!aiPerms.canDelete) return { success: false, data: null, summary: '⛔ AI Delete permission is disabled. Enable it in Settings → AI Settings.' };

                await connectDB();
                const { getCurrentAgency } = await import('./agency-context');
                const agency = await getCurrentAgency();
                const projSnapshot = await snapshotEntity('project', args.projectId);
                const proj = await ProjectModel.findOne({ id: args.projectId, agencyId: agency?.id }).lean();
                if (!proj) return { success: false, data: null, summary: 'Project not found' };

                // Clean up uploaded files from blob storage (Vercel Blob + Azure) before deleting asset records
                const projectAssets = await AssetModel.find({ projectId: args.projectId, agencyId: agency?.id }).select('url').lean();
                if (projectAssets.length > 0) {
                    const { deleteFile } = await import('@/lib/storage');
                    const BATCH_SIZE = 10;
                    for (let i = 0; i < projectAssets.length; i += BATCH_SIZE) {
                        const batch = projectAssets.slice(i, i + BATCH_SIZE);
                        await Promise.allSettled(
                            batch.map((asset: any) => asset.url ? deleteFile(asset.url) : Promise.resolve())
                        );
                    }
                    console.log(`[singularity:delete_project] Cleaned up ${projectAssets.length} files from storage`);
                }

                // Delete project and all related data
                await Promise.all([
                    ProjectModel.deleteOne({ id: args.projectId, agencyId: agency?.id }),
                    TaskModel.deleteMany({ projectId: args.projectId, agencyId: agency?.id }),
                    InvoiceModel.deleteMany({ projectId: args.projectId, agencyId: agency?.id }),
                    AssetModel.deleteMany({ projectId: args.projectId, agencyId: agency?.id }),
                    TransactionModel.deleteMany({ projectId: args.projectId, agencyId: agency?.id }),
                    ActivityModel.deleteMany({ target: args.projectId, agencyId: agency?.id }),
                    NotificationModel.deleteMany({ agencyId: agency?.id, link: { $regex: args.projectId } }),
                ]);
                // Decrement agency usage counter (mirrors actions.ts:deleteProject)
                if (agency) {
                    const { decrementAgencyUsage } = await import('./agency-context');
                    await decrementAgencyUsage(agency.id, 'projects');
                }
                // C1 fix: Revalidate cache
                const { revalidatePath } = await import('next/cache');
                revalidatePath('/dashboard/projects');
                return {
                    success: true,
                    data: { projectId: args.projectId },
                    summary: `Project "${(proj as any).name}" and all its data deleted permanently`,
                    rollbackData: projSnapshot ? [{
                        toolName: 'delete_project', actionType: 'delete', entityType: 'project',
                        entityId: args.projectId, beforeSnapshot: projSnapshot, executedAt: new Date().toISOString(),
                    }] : undefined,
                };
            }

            case "delete_client": {
                const aiPerms = await getAIPermissions();
                if (!aiPerms.canDelete) return { success: false, data: null, summary: '⛔ AI Delete permission is disabled. Enable it in Settings → AI Settings.' };

                await connectDB();
                const { getCurrentAgency } = await import('./agency-context');
                const agency = await getCurrentAgency();
                const clientSnapshot = await snapshotEntity('client', args.clientId);
                const cl = await ClientModel.findOne({ id: args.clientId, agencyId: agency?.id }).lean();
                if (!cl) return { success: false, data: null, summary: 'Client not found' };

                await ClientModel.updateOne(
                    { id: args.clientId, agencyId: agency?.id },
                    { $set: { archived: true, archivedAt: new Date().toISOString() } }
                );
                // C2 fix: Clean up notifications for archived client (mirrors actions.ts:deleteClient)
                await NotificationModel.deleteMany({ userId: args.clientId, agencyId: agency?.id });
                // Decrement agency usage counter (mirrors actions.ts:deleteClient)
                if (agency) {
                    const { decrementAgencyUsage } = await import('./agency-context');
                    await decrementAgencyUsage(agency.id, 'clients');
                }
                // C2 fix: Revalidate cache
                const { revalidatePath: revalClients } = await import('next/cache');
                revalClients('/dashboard/clients');
                return {
                    success: true,
                    data: { clientId: args.clientId },
                    summary: `Client "${(cl as any).name}" archived (financial data preserved)`,
                    rollbackData: clientSnapshot ? [{
                        toolName: 'delete_client', actionType: 'update', entityType: 'client',
                        entityId: args.clientId, beforeSnapshot: clientSnapshot, executedAt: new Date().toISOString(),
                    }] : undefined,
                };
            }

            case "delete_transaction": {
                const aiPerms = await getAIPermissions();
                if (!aiPerms.canDelete) return { success: false, data: null, summary: '⛔ AI Delete permission is disabled. Enable it in Settings → AI Settings.' };

                await connectDB();
                const { getCurrentAgency } = await import('./agency-context');
                const agency = await getCurrentAgency();
                const txnSnapshot = await snapshotEntity('transaction', args.transactionId);
                const txn = await TransactionModel.findOne({ id: args.transactionId, agencyId: agency?.id }).lean();
                if (!txn) return { success: false, data: null, summary: 'Transaction not found' };

                await TransactionModel.deleteOne({ id: args.transactionId, agencyId: agency?.id });
                // C3 fix: Revalidate cache
                const { revalidatePath: revalFinance } = await import('next/cache');
                revalFinance('/dashboard/finance');
                return {
                    success: true,
                    data: { transactionId: args.transactionId },
                    summary: `Transaction deleted: ${fmtCur((txn as any).amount)} (${(txn as any).category})`,
                    rollbackData: txnSnapshot ? [{
                        toolName: 'delete_transaction', actionType: 'delete', entityType: 'transaction',
                        entityId: args.transactionId, beforeSnapshot: txnSnapshot, executedAt: new Date().toISOString(),
                    }] : undefined,
                };
            }

            case "delete_service": {
                const aiPerms = await getAIPermissions();
                if (!aiPerms.canDelete) return { success: false, data: null, summary: '⛔ AI Delete permission is disabled. Enable it in Settings → AI Settings.' };

                const svcDelSnapshot = await snapshotEntity('service', args.serviceId);
                try {
                    await deleteService(args.serviceId);
                } catch (err: any) {
                    return { success: false, data: null, summary: err.message };
                }
                return {
                    success: true,
                    data: { serviceId: args.serviceId },
                    summary: `Service deleted`,
                    rollbackData: svcDelSnapshot ? [{
                        toolName: 'delete_service', actionType: 'delete', entityType: 'service',
                        entityId: args.serviceId, beforeSnapshot: svcDelSnapshot, executedAt: new Date().toISOString(),
                    }] : undefined,
                };
            }

            default:
                return {
                    success: false,
                    data: null,
                    summary: `Unknown tool: ${name}`,
                };
        }
    } catch (error: any) {
        console.error(`[Tool Executor] ${name} failed:`, error.message);
        return {
            success: false,
            data: null,
            summary: `Error: ${error.message || "Tool execution failed"}`,
        };
    }
}

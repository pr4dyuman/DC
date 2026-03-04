import {
    globalSearch,
    getTasks,
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
    updateUser,
    bulkEstimateTaskHours,
} from "./actions";
import {
    connectDB,
    TaskModel, ProjectModel, ClientModel, InvoiceModel,
    TransactionModel, ServiceModel, LeaveRequestModel,
    UserModel,
} from "./mongodb";

// =============================================================================
// TOOL EXECUTOR — Calls existing server actions
// This file ONLY exports async functions (required because it imports from
// actions.ts which has "use server", making Next.js treat this as a boundary).
// =============================================================================

// Role-based permission matrix for Singularity tools
// Defines which roles can use each tool
type RoleType = 'admin' | 'manager' | 'employee' | 'specialist' | 'client';

const TOOL_PERMISSIONS: Record<string, RoleType[]> = {
    // Read-only tools — accessible to everyone
    search_agency: ['admin', 'manager', 'employee', 'specialist', 'client'],
    get_project_tasks: ['admin', 'manager', 'employee', 'specialist', 'client'],
    get_finance_summary: ['admin', 'manager'],
    get_team_workload: ['admin', 'manager'],
    get_recent_activity: ['admin', 'manager', 'employee', 'specialist'],
    get_task_comments: ['admin', 'manager', 'employee', 'specialist', 'client'],
    get_transactions: ['admin', 'manager'],
    get_invoices: ['admin', 'manager', 'client'],
    get_leave_requests: ['admin', 'manager', 'employee', 'specialist'],
    get_employee_profile: ['admin', 'manager', 'employee', 'specialist'],

    // Task actions — employees can update status & comment, but not create/delete
    create_task: ['admin', 'manager'],
    edit_task: ['admin', 'manager', 'employee', 'specialist'],
    update_task_status: ['admin', 'manager', 'employee', 'specialist'],
    reassign_task: ['admin', 'manager'],
    delete_task: ['admin', 'manager'],
    add_task_comment: ['admin', 'manager', 'employee', 'specialist', 'client'],
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
    const doc = await Model.findOne({ id: entityId }).lean();
    return doc || null;
}

/** Look up user role from userId */
async function getUserRole(userId: string): Promise<RoleType> {
    await connectDB();
    // Check users first
    const user = await UserModel.findOne({ id: userId }).select('role').lean() as any;
    if (user?.role) return user.role as RoleType;
    // Check if it's a client
    const client = await ClientModel.findOne({ id: userId }).select('role').lean() as any;
    if (client) return 'client';
    return 'employee'; // Fallback
}

export async function executeTool(
    name: string,
    args: Record<string, any>,
    userId: string
): Promise<{ success: boolean; data: any; summary: string; rollbackData?: RollbackAction[] }> {
    try {
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
                    summary: `Revenue: ₹${(stats.totalRevenue || 0).toLocaleString("en-IN")}, Expenses: ₹${(stats.totalExpenses || 0).toLocaleString("en-IN")}, Profit: ₹${(stats.netProfit || 0).toLocaleString("en-IN")}`,
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
                await addComment(args.taskId, userId, args.comment);
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
                    summary: `Invoice created: ₹${args.amount.toLocaleString("en-IN")}${args.status ? ` (${args.status})` : ""}`,
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
                        ` | Income: ₹${totalIncome.toLocaleString("en-IN")} | Expenses: ₹${totalExpense.toLocaleString("en-IN")}`,
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
                    summary: `${args.type === "income" ? "Income" : "Expense"} of ₹${args.amount.toLocaleString("en-IN")} added (${args.category})${extraInfo}`,
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
                    summary: `${filtered.length} transaction(s) found | Total: ₹${filtered.reduce((sum: number, t: any) => sum + (t.type === "income" ? t.amount : -t.amount), 0).toLocaleString("en-IN")}`,
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
                return {
                    success: true,
                    data: { id: newClient.id, name: newClient.name, companyName: newClient.companyName },
                    summary: `Client "${newClient.name}" (${newClient.companyName}) created`,
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
                return {
                    success: true,
                    data: {
                        id: profile.id,
                        name: profile.name,
                        email: (profile as any).email,
                        role: (profile as any).role,
                        jobTitle: (profile as any).jobTitle,
                        phone: (profile as any).phone,
                        salary: (profile as any).salary,
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
                const searchResults = await globalSearch(args.taskId);
                const targetTask = searchResults.find((r: any) => r.id === args.taskId && r.type === "task");
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
                    summary: `${filtered.length} invoice(s)${args.status ? ` (${args.status})` : ""} | Total: ₹${filtered.reduce((sum: number, i: any) => sum + i.amount, 0).toLocaleString("en-IN")}`,
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
                const newService = await addService(args.name, args.jobs || []);
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
                await updateService(args.serviceId, args.name, args.jobs || []);
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

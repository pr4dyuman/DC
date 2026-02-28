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
    updateUser,
} from "./actions";

// =============================================================================
// TOOL EXECUTOR — Calls existing server actions
// This file ONLY exports async functions (required because it imports from
// actions.ts which has "use server", making Next.js treat this as a boundary).
// =============================================================================

export async function executeTool(
    name: string,
    args: Record<string, any>,
    userId: string
): Promise<{ success: boolean; data: any; summary: string }> {
    try {
        switch (name) {
            case "create_project": {
                const newProject = await createProject({
                    name: args.name,
                    budget: args.budget || 0,
                    dueDate: args.dueDate || new Date(Date.now() + 90 * 86400000).toISOString().split("T")[0],
                    clientId: args.clientId || undefined,
                    client: args.clientId ? undefined : undefined,
                    services: [],
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
                    status: "Todo",
                });

                const assignInfo = autoAssigned
                    ? `auto-assigned to ${assigneeName} (fewest active tasks)`
                    : `assigned to ${assigneeName}`;

                return {
                    success: true,
                    data: { id: newTask.id, title: newTask.title, projectId: newTask.projectId, assigneeId, assigneeName },
                    summary: `Task "${newTask.title}" created — ${assignInfo}, category: ${args.category || "none"}, due: ${dueDate}`,
                };
            }

            case "update_task_status": {
                await updateTaskStatus(args.taskId, args.status);
                return {
                    success: true,
                    data: { taskId: args.taskId, newStatus: args.status },
                    summary: `Task moved to "${args.status}"`,
                };
            }

            case "edit_task": {
                const updates: Record<string, any> = {};
                if (args.title) updates.title = args.title;
                if (args.description) updates.description = args.description;
                if (args.priority) updates.priority = args.priority;
                if (args.category) updates.category = args.category;
                if (args.dueDate) updates.dueDate = args.dueDate;

                if (Object.keys(updates).length === 0) {
                    return { success: false, data: null, summary: "No changes specified" };
                }

                await updateTask(args.taskId, updates);
                const changedFields = Object.keys(updates).join(", ");
                return {
                    success: true,
                    data: { taskId: args.taskId, updates },
                    summary: `Task updated — changed: ${changedFields}`,
                };
            }

            case "reassign_task": {
                const newAssignee = await getUser(args.assigneeId).catch(() => null);
                const newAssigneeName = newAssignee?.name || args.assigneeId;

                await updateTask(args.taskId, { assigneeId: args.assigneeId });
                return {
                    success: true,
                    data: { taskId: args.taskId, newAssigneeId: args.assigneeId, newAssigneeName },
                    summary: `Task reassigned to ${newAssigneeName}`,
                };
            }

            case "delete_task": {
                await deleteTask(args.taskId);
                return {
                    success: true,
                    data: { taskId: args.taskId },
                    summary: `Task deleted`,
                };
            }

            case "add_task_comment": {
                await addComment(args.taskId, userId, args.comment);
                return {
                    success: true,
                    data: { taskId: args.taskId },
                    summary: `Comment added to task`,
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
                    summary: `Invoice created: ₹${args.amount.toLocaleString("en-IN")}`,
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
                };
            }

            case "get_transactions": {
                const txns = await getTransactions(args.projectId, args.userId, args.category);
                const limited = txns.slice(0, 15);
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
                    summary: `${txns.length} transaction(s) found | Total: ₹${txns.reduce((sum: number, t: any) => sum + (t.type === "income" ? t.amount : -t.amount), 0).toLocaleString("en-IN")}`,
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
                });
                return {
                    success: true,
                    data: { id: newClient.id, name: newClient.name, companyName: newClient.companyName },
                    summary: `Client "${newClient.name}" (${newClient.companyName}) created`,
                };
            }

            case "update_client": {
                const updates: Record<string, any> = {};
                if (args.name) updates.name = args.name;
                if (args.email) updates.email = args.email;
                if (args.companyName) updates.companyName = args.companyName;
                if (args.phone) updates.phone = args.phone;
                if (args.address) updates.address = args.address;
                await updateClient(args.clientId, updates);
                return {
                    success: true,
                    data: { clientId: args.clientId, updates },
                    summary: `Client updated — changed: ${Object.keys(updates).join(", ")}`,
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
                return {
                    success: true,
                    data: invoices.slice(0, 20).map((inv: any) => ({
                        id: inv.id,
                        projectId: inv.projectId,
                        amount: inv.amount,
                        status: inv.status,
                        date: inv.date,
                    })),
                    summary: `${invoices.length} invoice(s) | Total: ₹${invoices.reduce((sum: number, i: any) => sum + i.amount, 0).toLocaleString("en-IN")}`,
                };
            }

            case "manage_leave_request": {
                if (args.action === "approve") {
                    await approveLeaveRequest(args.leaveRequestId);
                    return {
                        success: true,
                        data: { leaveRequestId: args.leaveRequestId, action: "approved" },
                        summary: `Leave request approved ✅`,
                    };
                } else {
                    await rejectLeaveRequest(args.leaveRequestId, args.reason || "");
                    return {
                        success: true,
                        data: { leaveRequestId: args.leaveRequestId, action: "rejected", reason: args.reason },
                        summary: `Leave request rejected ❌${args.reason ? ` — Reason: ${args.reason}` : ""}`,
                    };
                }
            }

            case "add_service": {
                const newService = await addService(args.name, args.jobs || []);
                return {
                    success: true,
                    data: { id: newService.id, name: newService.name },
                    summary: `Service "${newService.name}" added as a new category`,
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

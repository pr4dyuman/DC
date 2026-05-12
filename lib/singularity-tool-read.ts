import {
    getFinanceStats,
    getInvoices,
    getLeaveRequests,
    getRecentActivity,
    getTaskById,
    getTasks,
    getTransactions,
    getUser,
    getUsers,
    getUserTasks,
    globalSearch,
} from "./actions";
import { getTaskAssigneeIds } from "./task-assignees";
import type { Activity, Comment, Invoice, Task, User } from "./types";

type RoleType = "admin" | "manager" | "employee" | "client";
type CurrencyFormatter = (amount: number) => string;
type ToolExecutionResult = {
    success: boolean;
    data: unknown;
    summary: string;
    rollbackData?: undefined;
};
type ReadOnlyToolName =
    | "search_agency"
    | "get_project_tasks"
    | "get_finance_summary"
    | "get_team_workload"
    | "get_leave_requests"
    | "get_transactions"
    | "get_recent_activity"
    | "get_employee_profile"
    | "get_task_comments"
    | "get_invoices";
type ToolArgs = Record<string, unknown>;
type EmployeeProfileRecord = User & { phone?: string; contactNumber?: string };
type TaskCommentContainer = Pick<Task, "id" | "title"> & { comments?: Comment[] };
type InvoiceWithDescription = Invoice & { description?: string };

function getStringArg(args: ToolArgs, key: string): string {
    const value = args[key];
    return typeof value === "string" ? value : "";
}

export async function executeReadOnlyTool(
    name: ReadOnlyToolName,
    args: ToolArgs,
    userRole: RoleType,
    fmtCur: CurrencyFormatter
): Promise<ToolExecutionResult> {
    switch (name) {
        case "search_agency": {
            const query = getStringArg(args, "query");
            const results = await globalSearch(query);
            return {
                success: true,
                data: results,
                summary: results.length > 0
                    ? `Found ${results.length} result(s) for "${query}"`
                    : `No results found for "${query}"`,
            };
        }

        case "get_project_tasks": {
            const projectId = getStringArg(args, "projectId");
            const tasks = await getTasks(projectId);
            const summarizeTask = (task: Task) => ({
                id: task.id,
                title: task.title,
                priority: task.priority,
                assigneeId: task.assigneeId,
                assigneeIds: getTaskAssigneeIds(task),
                dueDate: task.dueDate,
            });
            const grouped = {
                Todo: tasks.filter((task) => task.status === "Todo").map(summarizeTask),
                "In Progress": tasks.filter((task) => task.status === "In Progress").map(summarizeTask),
                Review: tasks.filter((task) => task.status === "Review").map(summarizeTask),
                Done: tasks.filter((task) => task.status === "Done").map(summarizeTask),
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
                allUsers.filter((user) => user.role !== "client").map(async (user) => {
                    const tasks = await getUserTasks(user.id).catch(() => [] as Task[]);
                    return {
                        id: user.id,
                        name: user.name,
                        role: user.role,
                        totalTasks: tasks.length,
                        todo: tasks.filter((task) => task.status === "Todo").length,
                        inProgress: tasks.filter((task) => task.status === "In Progress").length,
                        review: tasks.filter((task) => task.status === "Review").length,
                        done: tasks.filter((task) => task.status === "Done").length,
                    };
                })
            );
            return {
                success: true,
                data: workload,
                summary: `${workload.length} team member(s): ${workload.map((entry) => `${entry.name}: ${entry.totalTasks} tasks`).join(", ")}`,
            };
        }

        case "get_leave_requests": {
            const requestedUserId = getStringArg(args, "userId");
            const leaves = await getLeaveRequests(requestedUserId || undefined);
            return {
                success: true,
                data: leaves.slice(0, 10).map((leave) => ({
                    id: leave.id,
                    userId: leave.userId,
                    startDate: leave.startDate,
                    endDate: leave.endDate,
                    type: leave.type,
                    reason: leave.reason,
                    status: leave.status,
                })),
                summary: `${leaves.length} leave request(s) found`,
            };
        }

        case "get_transactions": {
            const projectId = getStringArg(args, "projectId") || undefined;
            const userId = getStringArg(args, "userId") || undefined;
            const category = getStringArg(args, "category") || undefined;
            const typeFilter = getStringArg(args, "type");
            const transactions = await getTransactions(projectId, userId, category);
            const filtered = typeFilter
                ? transactions.filter((transaction) => transaction.type === typeFilter)
                : transactions;
            const limited = filtered.slice(0, 15);
            return {
                success: true,
                data: limited.map((transaction) => ({
                    id: transaction.id,
                    date: transaction.date,
                    amount: transaction.amount,
                    type: transaction.type,
                    category: transaction.category,
                    description: transaction.description,
                    status: transaction.status,
                })),
                summary: `${filtered.length} transaction(s) found | Total: ${fmtCur(filtered.reduce((sum, transaction) => sum + (transaction.type === "income" ? transaction.amount : -transaction.amount), 0))}`,
            };
        }

        case "get_recent_activity": {
            const activity = await getRecentActivity(0, 10);
            return {
                success: true,
                data: activity.map((entry: Activity) => ({
                    user: entry.user,
                    action: entry.action,
                    target: entry.target,
                    timestamp: entry.timestamp,
                })),
                summary: `${activity.length} recent activities`,
            };
        }

        case "get_employee_profile": {
            const requestedUserId = getStringArg(args, "userId");
            const profile = await getUser(requestedUserId);
            if (!profile) {
                return { success: false, data: null, summary: "User not found" };
            }

            const profileRecord = profile as EmployeeProfileRecord;
            const userTasks = await getUserTasks(requestedUserId).catch(() => [] as Task[]);
            const activeTasks = userTasks.filter((task) => task.status !== "Done");
            const canSeeSalary = userRole === "admin" || userRole === "manager";

            return {
                success: true,
                data: {
                    id: profileRecord.id,
                    name: profileRecord.name,
                    email: profileRecord.email,
                    role: profileRecord.role,
                    jobTitle: profileRecord.jobTitle,
                    phone: profileRecord.phone ?? profileRecord.contactNumber,
                    ...(canSeeSalary ? { salary: profileRecord.salary } : {}),
                    totalTasks: userTasks.length,
                    activeTasks: activeTasks.length,
                    doneTasks: userTasks.length - activeTasks.length,
                },
                summary: `${profileRecord.name} — ${profileRecord.role || "employee"} | ${profileRecord.jobTitle || "No title"} | ${activeTasks.length} active tasks`,
            };
        }

        case "get_task_comments": {
            const taskId = getStringArg(args, "taskId");
            let targetTask = await getTaskById(taskId).catch(() => null) as TaskCommentContainer | null;

            if (!targetTask) {
                const searchResults = await globalSearch(taskId);
                targetTask = (searchResults.find((result) => result.id === taskId && result.type === "task") as TaskCommentContainer | undefined) ?? null;
            }

            if (!targetTask) {
                return { success: false, data: null, summary: "Task not found" };
            }

            const comments = targetTask.comments || [];
            const enrichedComments = await Promise.all(
                comments.map(async (comment) => {
                    const commenter = await getUser(comment.userId).catch(() => null);
                    return {
                        id: comment.id,
                        user: commenter?.name || comment.userId,
                        text: comment.text,
                        timestamp: comment.timestamp,
                    };
                })
            );

            return {
                success: true,
                data: enrichedComments,
                summary: `${comments.length} comment(s) on "${targetTask.title}"`,
            };
        }

        case "get_invoices": {
            const projectId = getStringArg(args, "projectId") || undefined;
            const statusFilter = getStringArg(args, "status");
            const invoices = await getInvoices(projectId);
            const filtered = statusFilter
                ? invoices.filter((invoice) => invoice.status?.toLowerCase() === statusFilter.toLowerCase())
                : invoices;
            return {
                success: true,
                data: filtered.slice(0, 20).map((invoice) => ({
                    id: invoice.id,
                    projectId: invoice.projectId,
                    amount: invoice.amount,
                    status: invoice.status,
                    date: invoice.date,
                    description: (invoice as InvoiceWithDescription).description,
                })),
                summary: `${filtered.length} invoice(s)${statusFilter ? ` (${statusFilter})` : ""} | Total: ${fmtCur(filtered.reduce((sum, invoice) => sum + invoice.amount, 0))}`,
            };
        }
    }
}

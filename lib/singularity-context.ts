import {
    getCurrentUser,
    getProjects,
    getClients,
    getUsers,
    getFinanceStats,
    getRecentActivity,
    getTasks,
    getServices,
    getUserTasks,
} from "./actions";
import { fmtDate } from "./date-utils";
import { formatCurrency } from "./currency";
import { getDefaultCurrency } from "./actions/super-admin";
import { getTaskAssigneeIds } from "./task-assignees";
import type { Activity, Client, Project, Service, Task, User } from "./types";

type ContextProject = Pick<Project, "id" | "name" | "status" | "client">;
type ContextClient = Pick<Client, "id" | "name" | "companyName" | "email">;
type ContextUser = Pick<User, "id" | "name" | "role" | "jobTitle" | "email">;
type ContextService = Pick<Service, "name" | "employees">;
type ContextTask = Pick<Task, "id" | "title" | "status" | "priority" | "assigneeId" | "assigneeIds" | "category" | "dueDate">;
type ContextActivity = Pick<Activity, "user" | "action" | "target" | "timestamp">;
type FinanceSnapshot = Awaited<ReturnType<typeof getFinanceStats>>;
type CurrentUserSummary = { id?: string; name?: string; role?: string } | null;

/**
 * Build a rich system instruction for Singularity Agent Mode.
 * Fetches live agency data so the AI knows about projects, clients, team,
 * finance, services (categories), and per-employee task assignments.
 */
export async function buildSingularityContext(userId: string): Promise<string> {
    try {
        const currentUser = await getCurrentUser().catch(() => null) as CurrentUserSummary;
        const userName = currentUser?.name || "User";
        const userRole = currentUser?.role || "unknown";
        const isPrivileged = userRole === "admin" || userRole === "manager";

        const [projectsRaw, clientsRaw, usersRaw, financeStats, recentActivityRaw, servicesRaw, currency] = await Promise.all([
            getProjects().catch(() => []),
            getClients().catch(() => []),
            getUsers().catch(() => []),
            (isPrivileged
                ? getFinanceStats()
                : Promise.resolve({
                    totalRevenue: 0,
                    totalExpenses: 0,
                    netProfit: 0,
                    pendingInvoicesAmount: 0,
                    pendingInvoicesCount: 0,
                })).catch(() => ({
                totalRevenue: 0,
                totalExpenses: 0,
                netProfit: 0,
                pendingInvoicesAmount: 0,
                pendingInvoicesCount: 0,
            })),
            getRecentActivity(0, 10).catch(() => []),
            getServices().catch(() => []),
            getDefaultCurrency().catch(() => "USD"),
        ]);

        const projects = projectsRaw as ContextProject[];
        const clients = clientsRaw as ContextClient[];
        const users = usersRaw as ContextUser[];
        const recentActivity = recentActivityRaw as ContextActivity[];
        const services = servicesRaw as ContextService[];

        const todayIso = new Date().toISOString().split("T")[0];

        const userMap = new Map<string, ContextUser>();
        for (const user of users) {
            userMap.set(user.id, user);
        }

        let lookupSection = "";
        const teamMembers = users.filter((user) => user.role !== "client");
        if (teamMembers.length > 0) {
            lookupSection += "TEAM NAME -> ID:\n";
            for (const user of teamMembers) {
                lookupSection += `  "${user.name}" -> assigneeId: "${user.id}"\n`;
            }
        }
        if (projects.length > 0) {
            lookupSection += "\nPROJECT NAME -> ID:\n";
            for (const project of projects.slice(0, 20)) {
                lookupSection += `  "${project.name}" -> projectId: "${project.id}"\n`;
            }
        }
        if (clients.length > 0) {
            lookupSection += "\nCLIENT NAME -> ID:\n";
            for (const client of clients.slice(0, 20)) {
                lookupSection += `  "${client.name}" (${client.companyName || ""}) -> clientId: "${client.id}"\n`;
            }
        }

        let categorySection = "";
        if (services.length > 0) {
            categorySection = services
                .map((service) => `- "${service.name}"${service.employees?.length ? ` (Employees: ${service.employees.join(", ")})` : ""}`)
                .join("\n");
        } else {
            categorySection = "(No services/categories configured)";
        }

        let projectSection = "";
        if (projects.length > 0) {
            const projectLines = await Promise.all(
                projects.slice(0, 20).map(async (project) => {
                    const tasks = await getTasks(project.id).catch(() => []) as ContextTask[];
                    const todo = tasks.filter((task) => task.status === "Todo");
                    const inProgress = tasks.filter((task) => task.status === "In Progress");
                    const review = tasks.filter((task) => task.status === "Review");
                    const done = tasks.filter((task) => task.status === "Done");
                    const clientName = project.client || "No Client";

                    let line = `\n### Project: "${project.name}" (ID: "${project.id}")`;
                    line += `\n  Status: ${project.status} | Client: ${clientName}`;
                    line += `\n  Tasks: ${tasks.length} total - ${todo.length} Todo, ${inProgress.length} In Progress, ${review.length} Review, ${done.length} Done`;

                    const activeTasks = [...todo, ...inProgress, ...review].slice(0, 15);
                    if (activeTasks.length > 0) {
                        line += "\n  Active tasks:";
                        for (const task of activeTasks) {
                            const assigneeNames = getTaskAssigneeIds(task)
                                .map((assigneeId) => userMap.get(assigneeId)?.name)
                                .filter(Boolean);
                            line += `\n    - "${task.title}" (ID: "${task.id}") | ${task.status} | Priority: ${task.priority || "Medium"} | Assigned: ${assigneeNames.length > 0 ? assigneeNames.join(", ") : "Unassigned"} | Category: ${task.category || "None"} | Due: ${task.dueDate || "No date"}`;
                        }
                    }

                    return line;
                })
            );
            projectSection = projectLines.join("\n");
        } else {
            projectSection = "(No projects yet)";
        }

        let clientSection = "";
        if (clients.length > 0) {
            clientSection = clients
                .slice(0, 20)
                .map((client) => `- ID: "${client.id}" | ${client.name} | Company: ${client.companyName} | Email: ${client.email || "N/A"}`)
                .join("\n");
        } else {
            clientSection = "(No clients yet)";
        }

        let teamSection = "";
        if (users.length > 0) {
            const visibleTeamUsers = users.filter((user) => user.role !== "client").slice(0, 20);
            const teamLines = isPrivileged
                ? await Promise.all(
                    visibleTeamUsers.map(async (user) => {
                        const tasks = await getUserTasks(user.id).catch(() => []) as ContextTask[];
                        const todo = tasks.filter((task) => task.status === "Todo").length;
                        const inProgress = tasks.filter((task) => task.status === "In Progress").length;
                        const review = tasks.filter((task) => task.status === "Review").length;
                        const done = tasks.filter((task) => task.status === "Done").length;

                        let line = `- ID: "${user.id}" | ${user.name} (${user.role}) | ${user.jobTitle || "No title"} | Email: ${user.email}`;
                        line += `\n    Tasks: ${tasks.length} total - ${todo} Todo, ${inProgress} In Progress, ${review} Review, ${done} Done`;

                        const activeTasks = tasks.filter((task) => task.status !== "Done").slice(0, 5);
                        if (activeTasks.length > 0) {
                            line += "\n    Currently working on:";
                            for (const task of activeTasks) {
                                line += `\n      -> "${task.title}" (${task.status}) | Priority: ${task.priority || "Medium"}`;
                            }
                        }

                        return line;
                    })
                )
                : visibleTeamUsers.map((user) => `- ID: "${user.id}" | ${user.name} (${user.role}) | ${user.jobTitle || "No title"} | Email: ${user.email}`);
            teamSection = teamLines.join("\n");
        } else {
            teamSection = "(No team members yet)";
        }

        const finance = financeStats as FinanceSnapshot;
        const financeSection = isPrivileged
            ? `Revenue: ${formatCurrency(finance.totalRevenue || 0, currency)} | Expenses: ${formatCurrency(finance.totalExpenses || 0, currency)} | Net Profit: ${formatCurrency(finance.netProfit || 0, currency)}
Pending Invoices: ${finance.pendingInvoicesCount || 0} (${formatCurrency(finance.pendingInvoicesAmount || 0, currency)})`
            : "(Finance snapshot hidden for this role)";

        let activitySection = "";
        if (recentActivity.length > 0) {
            activitySection = recentActivity
                .slice(0, 8)
                .map((activity) => `- ${activity.user}: ${activity.action} -> ${activity.target} (${fmtDate(activity.timestamp, "UTC", "en-US")})`)
                .join("\n");
        } else {
            activitySection = "(No recent activity)";
        }

        return `You are Singularity Agent - an AI-powered agency management assistant.
You are talking to ${userName} (role: ${userRole}, ID: "${currentUser?.id || userId}").

You have full awareness of this agency's data and can perform actions using the tools available to you.

CRITICAL: Always use EXACT IDs from the lookup table below. NEVER guess or fabricate IDs.

=== QUICK LOOKUP TABLE ===
${lookupSection}

=== TASK CATEGORIES (from Services) ===
When creating tasks, use one of these exact category names:
${categorySection}

=== PROJECTS ===
${projectSection}

=== CLIENTS ===
${clientSection}

=== TEAM MEMBERS & WORKLOAD ===
${teamSection}

=== FINANCE SNAPSHOT ===
${financeSection}

=== RECENT ACTIVITY ===
${activitySection}

=== INSTRUCTIONS ===
- When asked about agency data, answer using the information above.
- When asked to perform an action (create task, update status, etc.), use the appropriate tool.

WARNING: ASSIGNING TASKS - SMART AUTO-ASSIGN:
- If the user says "assign to [name]", look up that person's exact assigneeId from the QUICK LOOKUP TABLE.
- If the user names multiple people, pass all of their IDs in assigneeIds. Keep assigneeId as the first person only for backward compatibility.
- If the user does NOT specify who to assign to, you MUST auto-assign to the team member with the FEWEST active tasks (Todo + In Progress + Review). Check the TEAM MEMBERS & WORKLOAD section to find who has the least work. NEVER default to the admin or the current user - always pick the least busy developer/employee.
- After assigning, ALWAYS confirm by name who it was assigned to and why (e.g. "Assigned to Rahul - he currently has the fewest active tasks").

WARNING: DUE DATE - SMART ESTIMATION:
- If the user does NOT specify a due date, estimate one based on the task:
  - Simple/small tasks (bug fix, text change, minor update): 2 days from now
  - Medium tasks (new feature section, design update, integration): 5 days from now
  - Large/complex tasks (full page build, major refactor, new system): 10 days from now
- Factor in the task priority: High priority tasks should have shorter deadlines.
- Use YYYY-MM-DD format. Today's date is ${todayIso}.

AI PROJECT PLANNER - BULK TASK GENERATION:
When the user provides a project brief or asks you to "plan a project" or "break down tasks":
- Use the bulk_create_tasks tool to create ALL tasks at once.
- Generate a COMPREHENSIVE breakdown - aim for 15-100+ tasks covering the FULL project scope.
- Organize tasks into phases: Planning -> Design -> Development -> Testing -> Deployment.
- For EACH task, provide: a clear title, detailed description with acceptance criteria, the right category (from services), appropriate priority, and estimatedDays.
- DISTRIBUTE assignees evenly across the team based on their role/expertise and current workload. Match task categories to team members' skills.
- Set estimatedDays realistically (1-14 per task). The system auto-calculates sequential due dates per assignee.
- After creating, present a summary table showing phases, task distribution, and project timeline.

WARNING: HISTORICAL / COMPLETED PROJECTS - CRITICAL:
When creating tasks for a COMPLETED or historical project (started in the past):
- You MUST ALWAYS pass startDate = the project's ORIGINAL historical start date (e.g. "2025-02-01"). NEVER use today's date or omit startDate.
- Set each task's status to "Done".
- If the document provides phase date ranges (e.g. "Phase 1: Feb 1 - Feb 3"), you MUST set each task's dueDate to the correct date within that phase. Do NOT leave dueDate empty.
- Example: tasks in "Phase 1 (Feb 1-3)" should have dueDate between 2025-02-01 and 2025-02-03 based on sequence.
- If the document provides a completedAt or completion date per task, pass it as completedAt.
- NEVER create historical project tasks without startDate and per-task dueDate — this causes all tasks to land on today's date (wrong year) in the heatmap.

CRITICAL - UPLOADED TASK FILES / DOCUMENTS:
When the user uploads a file (TXT, PDF, etc.) containing a list of tasks:
- You MUST create EVERY SINGLE TASK listed in the file. Do NOT summarize, skip, or create only a subset.
- First, COUNT the total number of tasks in the file. Tell the user: "I found X tasks in your file."
- If the file contains more than 40 tasks, call bulk_create_tasks MULTIPLE TIMES in separate rounds. Send ~30-40 tasks per call.
- After each bulk_create_tasks call, continue with the NEXT batch until ALL tasks are created.
- After all batches are done, report: "Created X/Y total tasks across Z batches."
- NEVER stop after the first batch and say "Shall I continue?". You MUST continue automatically until ALL tasks are created.
- If the file specifies phases, dates, assignees, or other details, use them exactly as written — especially dueDate and startDate.

WARNING: RESPONSE FORMATTING - CRITICAL:
- NEVER show raw IDs (like "euumyvv5t" or "3g4x23wyr") to the user. These are internal system IDs.
- ALWAYS refer to people by their NAME (e.g. "Rahul", "Priya"), not their ID.
- ALWAYS refer to projects by their NAME (e.g. "Web Redesign"), not their ID.
- IDs are ONLY for tool calls (assigneeId, projectId, taskId parameters). In your text responses, ONLY use human-readable names.
- ALWAYS end every response with proper sentence-ending punctuation (. ! or ?).

GENERAL:
- When creating a task, ALWAYS set: assigneeId or assigneeIds, category (from services list), priority, and dueDate.
- If the user doesn't specify a category, pick the most appropriate one from the services list.
- If the user refers to a project/person by name, match it to the correct ID from the QUICK LOOKUP TABLE.
- Be professional, concise, and helpful. Use markdown formatting.
- If you cannot find a matching project or person, ask the user to clarify. NEVER fabricate IDs.

WARNING: PROJECT SERVICES/CATEGORIES - CRITICAL:
- When creating a project with create_project, ALWAYS populate the services array with relevant category names from the SERVICES list.
- Example: for a mobile app project -> services: ["Mobile Development", "UI Design", "QA Testing"]
- If a project already exists without categories, use update_project to add the services array.
- NEVER create a project with an empty services array if the agency has services configured.

STRICT TOOL USAGE CONSTRAINTS - NEVER VIOLATE THESE:
- You can ONLY perform actions by calling the appropriate tool. If no tool exists for an action, tell the user it is not possible.
- NEVER claim to have completed an action unless you ACTUALLY called a tool and received a successful response.
- If a tool call is not shown in the Actions panel, you did NOT perform that action. Do not pretend otherwise.
- To move many tasks to Done at once, use bulk_update_task_status (with autoBackdate=true for per-task dates). Do NOT use update_task_status in a loop.
- If you cannot complete a request in one turn, tell the user honestly and suggest breaking it into smaller steps.
- When processing uploaded files with many tasks, you MUST call bulk_create_tasks multiple times until ALL tasks are created. Do NOT stop after one call.`;
    } catch (error) {
        console.error("[Singularity Context] Error building context:", error);
        return `You are Singularity Agent - an AI assistant.
Could not load full agency data. Answer questions generally and inform the user that agency data is temporarily unavailable.`;
    }
}

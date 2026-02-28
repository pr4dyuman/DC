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

/**
 * Build a rich system instruction for Singularity Agent Mode.
 * Fetches live agency data so the AI knows about projects, clients, team,
 * finance, services (categories), and per-employee task assignments.
 */
export async function buildSingularityContext(userId: string): Promise<string> {
    try {
        // Fetch all data in parallel
        const [projects, clients, users, financeStats, recentActivity, services] = await Promise.all([
            getProjects().catch(() => []),
            getClients().catch(() => []),
            getUsers().catch(() => []),
            getFinanceStats().catch(() => ({
                totalRevenue: 0,
                totalExpenses: 0,
                netProfit: 0,
                pendingInvoicesAmount: 0,
                pendingInvoicesCount: 0,
            })),
            getRecentActivity(0, 10).catch(() => []),
            getServices().catch(() => []),
        ]);

        // Find the current user
        const currentUser = await getCurrentUser().catch(() => null);
        const userName = currentUser?.name || "User";
        const userRole = currentUser?.role || "unknown";

        // Build a user lookup map for assignee names
        const userMap = new Map<string, any>();
        for (const u of users) {
            userMap.set(u.id, u);
        }

        // Build quick lookup table (name → ID) for easy matching
        let lookupSection = "";
        const teamMembers = users.filter((u: any) => u.role !== "client");
        if (teamMembers.length > 0) {
            lookupSection += "TEAM NAME → ID:\n";
            for (const u of teamMembers) {
                lookupSection += `  "${u.name}" → assigneeId: "${u.id}"\n`;
            }
        }
        if (projects.length > 0) {
            lookupSection += "\nPROJECT NAME → ID:\n";
            for (const p of projects.slice(0, 20)) {
                lookupSection += `  "${(p as any).name}" → projectId: "${(p as any).id}"\n`;
            }
        }
        if (clients.length > 0) {
            lookupSection += "\nCLIENT NAME → ID:\n";
            for (const c of (clients as any[]).slice(0, 20)) {
                lookupSection += `  "${c.name}" (${c.companyName || ""}) → clientId: "${c.id}"\n`;
            }
        }

        // Build service/category list
        let categorySection = "";
        if (services.length > 0) {
            categorySection = services
                .map((s: any) => `- "${s.name}"${s.jobs?.length ? ` (Jobs: ${s.jobs.map((j: any) => j.title).join(", ")})` : ""}`)
                .join("\n");
        } else {
            categorySection = "(No services/categories configured)";
        }

        // Build project summaries with task details
        let projectSection = "";
        if (projects.length > 0) {
            const projectLines = await Promise.all(
                projects.slice(0, 20).map(async (p: any) => {
                    const tasks = await getTasks(p.id).catch(() => []);
                    const todo = tasks.filter((t: any) => t.status === "Todo");
                    const inProgress = tasks.filter((t: any) => t.status === "In Progress");
                    const review = tasks.filter((t: any) => t.status === "Review");
                    const done = tasks.filter((t: any) => t.status === "Done");
                    const clientName = p.client || "No Client";

                    let line = `\n### Project: "${p.name}" (ID: "${p.id}")`;
                    line += `\n  Status: ${p.status} | Client: ${clientName}`;
                    line += `\n  Tasks: ${tasks.length} total — ${todo.length} Todo, ${inProgress.length} In Progress, ${review.length} Review, ${done.length} Done`;

                    // List active tasks with assignee info
                    const activeTasks = [...todo, ...inProgress, ...review].slice(0, 15);
                    if (activeTasks.length > 0) {
                        line += `\n  Active tasks:`;
                        for (const t of activeTasks) {
                            const assignee = userMap.get(t.assigneeId);
                            const assigneeName = assignee ? assignee.name : "Unassigned";
                            line += `\n    - "${t.title}" (ID: "${t.id}") | ${t.status} | Priority: ${t.priority || "Medium"} | Assigned: ${assigneeName} | Category: ${t.category || "None"} | Due: ${t.dueDate || "No date"}`;
                        }
                    }

                    return line;
                })
            );
            projectSection = projectLines.join("\n");
        } else {
            projectSection = "(No projects yet)";
        }

        // Build client list
        let clientSection = "";
        if (clients.length > 0) {
            clientSection = clients
                .slice(0, 20)
                .map((c: any) => `- ID: "${c.id}" | ${c.name} | Company: ${c.companyName} | Email: ${c.email || "N/A"}`)
                .join("\n");
        } else {
            clientSection = "(No clients yet)";
        }

        // Build team member list WITH their current task assignments
        let teamSection = "";
        if (users.length > 0) {
            const teamLines = await Promise.all(
                users.filter((u: any) => u.role !== "client").slice(0, 20).map(async (u: any) => {
                    const tasks = await getUserTasks(u.id).catch(() => []);
                    const todo = tasks.filter((t: any) => t.status === "Todo").length;
                    const inProgress = tasks.filter((t: any) => t.status === "In Progress").length;
                    const review = tasks.filter((t: any) => t.status === "Review").length;
                    const done = tasks.filter((t: any) => t.status === "Done").length;

                    let line = `- ID: "${u.id}" | ${u.name} (${u.role}) | ${u.jobTitle || "No title"} | Email: ${u.email}`;
                    line += `\n    Tasks: ${tasks.length} total — ${todo} Todo, ${inProgress} In Progress, ${review} Review, ${done} Done`;

                    // Show their active tasks
                    const activeTasks = tasks.filter((t: any) => t.status !== "Done").slice(0, 5);
                    if (activeTasks.length > 0) {
                        line += `\n    Currently working on:`;
                        for (const t of activeTasks) {
                            line += `\n      → "${t.title}" (${t.status}) | Priority: ${t.priority || "Medium"}`;
                        }
                    }

                    return line;
                })
            );
            teamSection = teamLines.join("\n");
        } else {
            teamSection = "(No team members yet)";
        }

        // Finance snapshot
        const finance = financeStats as any;
        const financeSection = `Revenue: ₹${(finance.totalRevenue || 0).toLocaleString("en-IN")} | Expenses: ₹${(finance.totalExpenses || 0).toLocaleString("en-IN")} | Net Profit: ₹${(finance.netProfit || 0).toLocaleString("en-IN")}
Pending Invoices: ${finance.pendingInvoicesCount || 0} (₹${(finance.pendingInvoicesAmount || 0).toLocaleString("en-IN")})`;

        // Recent activity
        let activitySection = "";
        if (recentActivity.length > 0) {
            activitySection = recentActivity
                .slice(0, 8)
                .map((a: any) => `- ${a.user}: ${a.action} → ${a.target} (${new Date(a.timestamp).toLocaleDateString()})`)
                .join("\n");
        } else {
            activitySection = "(No recent activity)";
        }

        // Compose the system instruction
        return `You are Singularity Agent — an AI-powered agency management assistant.
You are talking to ${userName} (role: ${userRole}, ID: "${currentUser?.id || userId}").

You have full awareness of this agency's data and can perform actions using the tools available to you.

⚠️ CRITICAL: Always use EXACT IDs from the lookup table below. NEVER guess or fabricate IDs.

═══ QUICK LOOKUP TABLE ═══
${lookupSection}

═══ TASK CATEGORIES (from Services) ═══
When creating tasks, use one of these exact category names:
${categorySection}

═══ PROJECTS ═══
${projectSection}

═══ CLIENTS ═══
${clientSection}

═══ TEAM MEMBERS & WORKLOAD ═══
${teamSection}

═══ FINANCE SNAPSHOT ═══
${financeSection}

═══ RECENT ACTIVITY ═══
${activitySection}

═══ INSTRUCTIONS ═══
- When asked about agency data, answer using the information above.
- When asked to perform an action (create task, update status, etc.), use the appropriate tool.

⚠️ ASSIGNING TASKS — SMART AUTO-ASSIGN:
- If the user says "assign to [name]", look up that person's exact assigneeId from the QUICK LOOKUP TABLE.
- If the user does NOT specify who to assign to, you MUST auto-assign to the team member with the FEWEST active tasks (Todo + In Progress + Review). Check the TEAM MEMBERS & WORKLOAD section to find who has the least work. NEVER default to the admin or the current user — always pick the least busy developer/employee.
- After assigning, ALWAYS confirm by name who it was assigned to and why (e.g. "Assigned to Rahul — he currently has the fewest active tasks").

⚠️ DUE DATE — SMART ESTIMATION:
- If the user does NOT specify a due date, estimate one based on the task:
  - Simple/small tasks (bug fix, text change, minor update): 2 days from now
  - Medium tasks (new feature section, design update, integration): 5 days from now
  - Large/complex tasks (full page build, major refactor, new system): 10 days from now
- Factor in the task priority: High priority tasks should have shorter deadlines.
- Use YYYY-MM-DD format. Today's date is ${new Date().toISOString().split("T")[0]}.

🚀 AI PROJECT PLANNER — BULK TASK GENERATION:
When the user provides a project brief or asks you to "plan a project" or "break down tasks":
- Use the bulk_create_tasks tool to create ALL tasks at once.
- Generate a COMPREHENSIVE breakdown — aim for 15-100+ tasks covering the FULL project scope.
- Organize tasks into phases: Planning → Design → Development → Testing → Deployment.
- For EACH task, provide: a clear title, detailed description with acceptance criteria, the right category (from services), appropriate priority, and estimatedDays.
- DISTRIBUTE assignees evenly across the team based on their role/expertise and current workload. Match task categories to team members' skills.
- Set estimatedDays realistically (1-14 per task). The system auto-calculates sequential due dates per assignee.
- After creating, present a summary table showing phases, task distribution, and project timeline.

⚠️ RESPONSE FORMATTING — CRITICAL:
- NEVER show raw IDs (like "euumyvv5t" or "3g4x23wyr") to the user. These are internal system IDs.
- ALWAYS refer to people by their NAME (e.g. "Rahul", "Priya"), not their ID.
- ALWAYS refer to projects by their NAME (e.g. "Web Redesign"), not their ID.
- IDs are ONLY for tool calls (assigneeId, projectId, taskId parameters). In your text responses, ONLY use human-readable names.

GENERAL:
- When creating a task, ALWAYS set: assigneeId, category (from services list), priority, and dueDate.
- If the user doesn't specify a category, pick the most appropriate one from the services list.
- If the user refers to a project/person by name, match it to the correct ID from the QUICK LOOKUP TABLE.
- Be professional, concise, and helpful. Use markdown formatting.
- If you cannot find a matching project or person, ask the user to clarify. NEVER fabricate IDs.`;

    } catch (error) {
        console.error("[Singularity Context] Error building context:", error);
        return `You are Singularity Agent — an AI assistant.
Could not load full agency data. Answer questions generally and inform the user that agency data is temporarily unavailable.`;
    }
}

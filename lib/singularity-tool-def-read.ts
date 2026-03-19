export const SINGULARITY_TOOL_DECLARATIONS_READ = [
    {
        name: "search_agency",
        description: "Search across all agency data - projects, clients, tasks, and team members. Supports generic queries like 'projects', 'clients', 'tasks', 'team' to list all entities of that type. For specific lookups, use a name or keyword. NOTE: If the data is already available in your context (QUICK LOOKUP TABLE), prefer using that directly instead of calling this tool.",
        parameters: {
            type: "OBJECT",
            properties: {
                query: { type: "STRING", description: "The search query" },
            },
            required: ["query"],
        },
    },
    {
        name: "get_project_tasks",
        description: "Get all tasks in a specific project, grouped by status (Todo, In Progress, Review, Done). Use this when the user asks about tasks in a project.",
        parameters: {
            type: "OBJECT",
            properties: {
                projectId: { type: "STRING", description: "The project ID (from the context)" },
            },
            required: ["projectId"],
        },
    },
    {
        name: "get_finance_summary",
        description: "Get the current financial summary - total revenue, expenses, net profit, and pending invoices.",
        parameters: {
            type: "OBJECT",
            properties: {},
        },
    },
    {
        name: "get_team_workload",
        description: "Get the workload for each team member - how many tasks each person has and in what status.",
        parameters: {
            type: "OBJECT",
            properties: {},
        },
    },
    {
        name: "get_leave_requests",
        description: "Get leave requests. Optionally filter by a specific user.",
        parameters: {
            type: "OBJECT",
            properties: {
                userId: { type: "STRING", description: "Optional user ID to filter by" },
            },
        },
    },
    {
        name: "get_transactions",
        description: "Get financial transactions. Can filter by project, user, category, or type (income/expense). Use this when the user asks about transactions, payments, salary history, expenses, etc.",
        parameters: {
            type: "OBJECT",
            properties: {
                projectId: { type: "STRING", description: "Filter by project ID" },
                userId: { type: "STRING", description: "Filter by user ID (for salary/reimbursement history)" },
                type: { type: "STRING", description: "Filter by transaction type", enum: ["income", "expense"] },
                category: {
                    type: "STRING",
                    description: "Filter by category",
                    enum: ["Project", "Salary", "Freelancer", "Tax", "Reimbursement", "Retainer", "Internal Transfer", "Investor", "Refund", "Other"],
                },
            },
        },
    },
    {
        name: "get_recent_activity",
        description: "Get the most recent activity feed for the agency.",
        parameters: {
            type: "OBJECT",
            properties: {},
        },
    },
    {
        name: "get_employee_profile",
        description: "Get full profile details for a team member or client - name, role, email, job title, salary, and task summary. Use when the user asks about someone's profile or details.",
        parameters: {
            type: "OBJECT",
            properties: {
                userId: { type: "STRING", description: "The user ID to look up from the QUICK LOOKUP TABLE" },
            },
            required: ["userId"],
        },
    },
    {
        name: "get_task_comments",
        description: "Get all comments on a specific task. Use when the user asks about discussions, notes, or comments on a task.",
        parameters: {
            type: "OBJECT",
            properties: {
                taskId: { type: "STRING", description: "The task ID" },
            },
            required: ["taskId"],
        },
    },
    {
        name: "get_invoices",
        description: "Get invoices - all or filtered by project or status. Shows amount, status, and date.",
        parameters: {
            type: "OBJECT",
            properties: {
                projectId: { type: "STRING", description: "Optional project ID to filter by" },
                status: { type: "STRING", description: "Filter by status", enum: ["pending", "paid", "Overdue", "Processing"] },
            },
        },
    },
];

// =============================================================================
// TOOL DECLARATIONS — Gemini Function Calling Schema
// This file has NO server action imports, so Next.js won't treat it as an
// action boundary. Safe to export consts and sync functions.
// =============================================================================

export const SINGULARITY_TOOL_DECLARATIONS = [
    {
        name: "create_project",
        description: "Create a new project in the agency. Use this when the user asks to create, start, or set up a new project. After creating, you can use bulk_create_tasks to fill it with tasks. For HISTORICAL/past projects, set status to 'Completed' and provide a past createdAt date. ALWAYS set services to the relevant categories for this project.",
        parameters: {
            type: "OBJECT",
            properties: {
                name: { type: "STRING", description: "Project name" },
                clientId: { type: "STRING", description: "Client ID from the QUICK LOOKUP TABLE (optional)" },
                budget: { type: "NUMBER", description: "Project budget in INR" },
                dueDate: { type: "STRING", description: "Project deadline in YYYY-MM-DD format" },
                status: { type: "STRING", description: "Project status — use 'Completed' for past/historical projects", enum: ["Active", "Completed", "On Hold"] },
                createdAt: { type: "STRING", description: "For historical projects, the original start date in YYYY-MM-DD format" },
                services: { type: "ARRAY", description: "List of service/category names relevant to this project (e.g. 'Mobile Development', 'UI Design', 'SEO'). Use names from the available services in the agency context.", items: { type: "STRING" } },
            },
            required: ["name", "budget", "dueDate"],
        },
    },
    {
        name: "search_agency",
        description: "Search across all agency data — projects, clients, tasks, and team members. Use this when the user asks to find or look up something.",
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
        description: "Get the current financial summary — total revenue, expenses, net profit, and pending invoices.",
        parameters: {
            type: "OBJECT",
            properties: {},
        },
    },
    {
        name: "get_team_workload",
        description: "Get the workload for each team member — how many tasks each person has and in what status.",
        parameters: {
            type: "OBJECT",
            properties: {},
        },
    },
    {
        name: "update_project",
        description: "Update an existing project's details — name, budget, deadline, status, description, or assigned services/categories. Use when the user asks to edit, rename, or change a project.",
        parameters: {
            type: "OBJECT",
            properties: {
                projectId: { type: "STRING", description: "The project ID from the QUICK LOOKUP TABLE" },
                name: { type: "STRING", description: "New project name (optional)" },
                budget: { type: "NUMBER", description: "New budget in INR (optional)" },
                dueDate: { type: "STRING", description: "New deadline in YYYY-MM-DD format (optional)" },
                status: { type: "STRING", description: "New status", enum: ["Active", "Completed", "On Hold"] },
                services: { type: "ARRAY", description: "Updated list of service/category names for this project", items: { type: "STRING" } },
            },
            required: ["projectId"],
        },
    },
    {
        name: "create_task",
        description: "Create a new task in a project. If no assignee specified, it auto-assigns to the least busy team member.",
        parameters: {
            type: "OBJECT",
            properties: {
                projectId: { type: "STRING", description: "The project ID to create the task in" },
                title: { type: "STRING", description: "The title of the task" },
                description: { type: "STRING", description: "Optional detailed description of the task" },
                assigneeId: { type: "STRING", description: "The user ID to assign the task to — look up from the QUICK LOOKUP TABLE. Leave empty to auto-assign to least busy person." },
                category: { type: "STRING", description: "Task category — must be one of the service names from the context" },
                priority: { type: "STRING", description: "Task priority: Low, Medium, or High", enum: ["Low", "Medium", "High"] },
                dueDate: { type: "STRING", description: "Due date in YYYY-MM-DD format. Estimate based on task complexity if not specified." },
                status: { type: "STRING", description: "Initial task status (default: Todo)", enum: ["Todo", "In Progress", "Review", "Done"] },
            },
            required: ["projectId", "title"],
        },
    },
    {
        name: "update_task_status",
        description: "Move a task to a different status column (Todo, In Progress, Review, Done).",
        parameters: {
            type: "OBJECT",
            properties: {
                taskId: { type: "STRING", description: "The task ID" },
                status: { type: "STRING", description: "The new status", enum: ["Todo", "In Progress", "Review", "Done"] },
            },
            required: ["taskId", "status"],
        },
    },
    {
        name: "edit_task",
        description: "Edit/update an existing task — change its title, description, priority, category, or due date. Use this when the user asks to edit, modify, or update a task's details.",
        parameters: {
            type: "OBJECT",
            properties: {
                taskId: { type: "STRING", description: "The task ID to edit" },
                title: { type: "STRING", description: "New title (optional, only if changing)" },
                description: { type: "STRING", description: "New description (optional)" },
                priority: { type: "STRING", description: "New priority", enum: ["Low", "Medium", "High"] },
                category: { type: "STRING", description: "New category — must be a service name" },
                dueDate: { type: "STRING", description: "New due date in YYYY-MM-DD format" },
                status: { type: "STRING", description: "New task status", enum: ["Todo", "In Progress", "Review", "Done"] },
            },
            required: ["taskId"],
        },
    },
    {
        name: "reassign_task",
        description: "Reassign an existing task to a different team member. Use this when the user asks to reassign, transfer, or change who a task is assigned to.",
        parameters: {
            type: "OBJECT",
            properties: {
                taskId: { type: "STRING", description: "The task ID to reassign" },
                assigneeId: { type: "STRING", description: "The new assignee's user ID — look up from the QUICK LOOKUP TABLE" },
            },
            required: ["taskId", "assigneeId"],
        },
    },
    {
        name: "delete_task",
        description: "Delete a task permanently. Use this when the user asks to remove or delete a task. Always confirm before deleting.",
        parameters: {
            type: "OBJECT",
            properties: {
                taskId: { type: "STRING", description: "The task ID to delete" },
            },
            required: ["taskId"],
        },
    },
    {
        name: "add_task_comment",
        description: "Add a comment to a task.",
        parameters: {
            type: "OBJECT",
            properties: {
                taskId: { type: "STRING", description: "The task ID" },
                comment: { type: "STRING", description: "The comment text" },
            },
            required: ["taskId", "comment"],
        },
    },
    {
        name: "create_invoice",
        description: "Create a new invoice for a project.",
        parameters: {
            type: "OBJECT",
            properties: {
                projectId: { type: "STRING", description: "The project ID" },
                amount: { type: "NUMBER", description: "Invoice amount in INR" },
                date: { type: "STRING", description: "Invoice date in YYYY-MM-DD format" },
            },
            required: ["projectId", "amount", "date"],
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
        name: "bulk_create_tasks",
        description: "Create multiple tasks at once from a project plan/breakdown. For HISTORICAL/completed projects, set each task's status to 'Done' and provide a past dueDate. For new projects, leave status as default (Todo) and provide estimatedDays for auto-scheduling.",
        parameters: {
            type: "OBJECT",
            properties: {
                projectId: { type: "STRING", description: "The project ID to create tasks in" },
                startDate: { type: "STRING", description: "Project start date in YYYY-MM-DD format. Tasks will be scheduled sequentially from this date." },
                tasks: {
                    type: "ARRAY",
                    description: "Array of tasks to create. Generate as many as needed (10-100+) to cover the full project scope.",
                    items: {
                        type: "OBJECT",
                        properties: {
                            title: { type: "STRING", description: "Clear, actionable task title" },
                            description: { type: "STRING", description: "Detailed task description with acceptance criteria" },
                            category: { type: "STRING", description: "Service category from the available list" },
                            priority: { type: "STRING", description: "Low, Medium, or High", enum: ["Low", "Medium", "High"] },
                            assigneeId: { type: "STRING", description: "User ID from the QUICK LOOKUP TABLE" },
                            estimatedDays: { type: "NUMBER", description: "Estimated days to complete (1-14). Used to calculate due date for new tasks." },
                            phase: { type: "STRING", description: "Project phase (e.g. 'Planning', 'Design', 'Development', 'Testing', 'Deployment')" },
                            status: { type: "STRING", description: "Task status — use 'Done' for completed historical tasks", enum: ["Todo", "In Progress", "Review", "Done"] },
                            dueDate: { type: "STRING", description: "For historical tasks, the actual completion date in YYYY-MM-DD format. Overrides auto-calculation." },
                        },
                        required: ["title", "description", "category", "priority"],
                    },
                },
            },
            required: ["projectId", "tasks"],
        },
    },
    {
        name: "bulk_add_transactions",
        description: `Import multiple financial transactions at once. Use for historical data import, monthly salary batch, or bulk expense recording. Each transaction follows the same validation rules as add_transaction.`,
        parameters: {
            type: "OBJECT",
            properties: {
                transactions: {
                    type: "ARRAY",
                    description: "Array of transactions to create",
                    items: {
                        type: "OBJECT",
                        properties: {
                            category: { type: "STRING", enum: ["Project", "Salary", "Freelancer", "Tax", "Reimbursement", "Retainer", "Internal Transfer", "Investor", "Refund", "Other"] },
                            type: { type: "STRING", enum: ["income", "expense"] },
                            amount: { type: "NUMBER", description: "Amount in INR" },
                            date: { type: "STRING", description: "Transaction date in YYYY-MM-DD format (can be past dates for historical data)" },
                            description: { type: "STRING" },
                            projectId: { type: "STRING", description: "Required for Project, Retainer, Refund" },
                            userId: { type: "STRING", description: "Required for Salary, Reimbursement" },
                            taxType: { type: "STRING", enum: ["GST", "TDS", "Income Tax", "Professional Tax", "Other"] },
                            expenseType: { type: "STRING", enum: ["Travel", "Meals", "Client Meeting", "Equipment", "Other"] },
                            status: { type: "STRING", enum: ["completed", "pending"] },
                        },
                        required: ["category", "type", "amount", "date", "description"],
                    },
                },
            },
            required: ["transactions"],
        },
    },
    {
        name: "add_transaction",
        description: `Add a financial transaction. VALIDATION RULES by category:
- "Project": type=income, REQUIRES projectId
- "Salary": type=expense, REQUIRES userId (employee to pay)
- "Freelancer": type=expense, optional projectId
- "Tax": type=expense, REQUIRES taxType (GST/TDS/Income Tax/Professional Tax/Other)
- "Reimbursement": type=expense, REQUIRES userId, REQUIRES expenseType (Travel/Meals/Client Meeting/Equipment/Other)
- "Retainer": type=income, REQUIRES projectId (client subscription)
- "Internal Transfer": type=expense or income
- "Investor": type=income
- "Refund": type=expense, REQUIRES projectId
- "Other": type=income or expense
Always follow these rules strictly. The system will reject invalid combinations.`,
        parameters: {
            type: "OBJECT",
            properties: {
                category: {
                    type: "STRING",
                    description: "Transaction category",
                    enum: ["Project", "Salary", "Freelancer", "Tax", "Reimbursement", "Retainer", "Internal Transfer", "Investor", "Refund", "Other"],
                },
                type: {
                    type: "STRING",
                    description: "income or expense — determined by category (see validation rules above)",
                    enum: ["income", "expense"],
                },
                amount: { type: "NUMBER", description: "Amount in INR" },
                date: { type: "STRING", description: "Date in YYYY-MM-DD format" },
                description: { type: "STRING", description: "Description of the transaction" },
                projectId: { type: "STRING", description: "Required for Project, Retainer, Refund categories" },
                userId: { type: "STRING", description: "Required for Salary, Reimbursement — the employee's user ID" },
                taxType: { type: "STRING", description: "Required for Tax category", enum: ["GST", "TDS", "Income Tax", "Professional Tax", "Other"] },
                expenseType: { type: "STRING", description: "Required for Reimbursement category", enum: ["Travel", "Meals", "Client Meeting", "Equipment", "Other"] },
                status: { type: "STRING", description: "completed or pending", enum: ["completed", "pending"] },
            },
            required: ["category", "type", "amount", "date", "description"],
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
        name: "create_client",
        description: "Create a new client in the agency. Use when the user asks to add a client or company.",
        parameters: {
            type: "OBJECT",
            properties: {
                name: { type: "STRING", description: "Client contact person name" },
                email: { type: "STRING", description: "Client email address" },
                companyName: { type: "STRING", description: "Client's company name" },
                phone: { type: "STRING", description: "Phone number (optional)" },
                address: { type: "STRING", description: "Address (optional)" },
                logo: { type: "STRING", description: "URL to client logo image (optional)" },
            },
            required: ["name", "email", "companyName"],
        },
    },
    {
        name: "update_client",
        description: "Update a client's details — name, email, company, phone, address, or logo.",
        parameters: {
            type: "OBJECT",
            properties: {
                clientId: { type: "STRING", description: "The client ID to update" },
                name: { type: "STRING" },
                email: { type: "STRING" },
                companyName: { type: "STRING" },
                phone: { type: "STRING" },
                address: { type: "STRING" },
                logo: { type: "STRING", description: "URL to client logo image" },
            },
            required: ["clientId"],
        },
    },
    {
        name: "get_employee_profile",
        description: "Get full profile details for a team member or client — name, role, email, job title, salary, and task summary. Use when the user asks about someone's profile or details.",
        parameters: {
            type: "OBJECT",
            properties: {
                userId: { type: "STRING", description: "The user ID to look up from the QUICK LOOKUP TABLE" },
            },
            required: ["userId"],
        },
    },
    {
        name: "update_employee",
        description: "Update an employee's profile — job title, role, salary, email, phone. Only admins can update others. Use when the user asks to change someone's role, salary, or profile.",
        parameters: {
            type: "OBJECT",
            properties: {
                userId: { type: "STRING", description: "The user ID to update" },
                name: { type: "STRING" },
                email: { type: "STRING" },
                jobTitle: { type: "STRING" },
                role: { type: "STRING", description: "User role", enum: ["admin", "manager", "employee", "specialist"] },
                salary: { type: "NUMBER", description: "Monthly salary in INR" },
                phone: { type: "STRING" },
            },
            required: ["userId"],
        },
    },
    {
        name: "update_service",
        description: "Update an existing service/category — rename it or change its job roles. Use when the user asks to edit or rename a service/department.",
        parameters: {
            type: "OBJECT",
            properties: {
                serviceId: { type: "STRING", description: "The service ID to update" },
                name: { type: "STRING", description: "New service name" },
                jobs: {
                    type: "ARRAY",
                    description: "Updated list of job roles under this service",
                    items: {
                        type: "OBJECT",
                        properties: {
                            title: { type: "STRING", description: "Job title" },
                            count: { type: "NUMBER", description: "Number of positions" },
                        },
                        required: ["title", "count"],
                    },
                },
            },
            required: ["serviceId", "name"],
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
        description: "Get invoices — all or filtered by project or status. Shows amount, status, and date.",
        parameters: {
            type: "OBJECT",
            properties: {
                projectId: { type: "STRING", description: "Optional project ID to filter by" },
                status: { type: "STRING", description: "Filter by status", enum: ["pending", "paid", "Overdue", "Processing"] },
            },
        },
    },
    {
        name: "manage_leave_request",
        description: "Approve or reject a pending leave request. Only admins can do this.",
        parameters: {
            type: "OBJECT",
            properties: {
                leaveRequestId: { type: "STRING", description: "The leave request ID" },
                action: { type: "STRING", description: "Approve or reject", enum: ["approve", "reject"] },
                reason: { type: "STRING", description: "Rejection reason (required when rejecting)" },
            },
            required: ["leaveRequestId", "action"],
        },
    },
    {
        name: "add_service",
        description: "Add a new service/category to the agency. Services are used as task categories. Use when the user asks to add a new department or service offering.",
        parameters: {
            type: "OBJECT",
            properties: {
                name: { type: "STRING", description: "Service name (e.g. 'Mobile Development', 'SEO')" },
                jobs: {
                    type: "ARRAY",
                    description: "List of job roles under this service",
                    items: {
                        type: "OBJECT",
                        properties: {
                            title: { type: "STRING", description: "Job title (e.g. 'React Developer')" },
                            count: { type: "NUMBER", description: "Number of positions" },
                        },
                        required: ["title", "count"],
                    },
                },
            },
            required: ["name"],
        },
    },
];

// =============================================================================
// TOOL NAME → DISPLAY NAME MAPPING
// =============================================================================

const TOOL_DISPLAY_NAMES: Record<string, string> = {
    create_project: "Creating project",
    update_project: "✏️ Updating project",
    search_agency: "Searching agency",
    get_project_tasks: "Fetching tasks",
    get_finance_summary: "Loading finances",
    get_team_workload: "Checking workload",
    create_task: "Creating task",
    update_task_status: "Updating status",
    edit_task: "Editing task",
    reassign_task: "Reassigning task",
    delete_task: "Deleting task",
    add_task_comment: "Adding comment",
    create_invoice: "Creating invoice",
    get_leave_requests: "Checking leaves",
    get_recent_activity: "Loading activity",
    bulk_create_tasks: "🚀 Planning project tasks",
    bulk_add_transactions: "💰 Importing transactions",
    add_transaction: "💰 Adding transaction",
    get_transactions: "📊 Loading transactions",
    create_client: "👤 Adding client",
    update_client: "✏️ Updating client",
    get_employee_profile: "👤 Loading profile",
    update_employee: "✏️ Updating employee",
    get_task_comments: "💬 Loading comments",
    get_invoices: "📄 Loading invoices",
    manage_leave_request: "📋 Processing leave",
    add_service: "➕ Adding service",
    update_service: "✏️ Updating service",
};

export function getToolDisplayName(toolName: string): string {
    return TOOL_DISPLAY_NAMES[toolName] || toolName;
}

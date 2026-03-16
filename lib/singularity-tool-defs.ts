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
        description: "Search across all agency data — projects, clients, tasks, and team members. Supports generic queries like 'projects', 'clients', 'tasks', 'team' to list all entities of that type. For specific lookups, use a name or keyword. NOTE: If the data is already available in your context (QUICK LOOKUP TABLE), prefer using that directly instead of calling this tool.",
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
        description: "Update an existing project's details — name, budget, deadline, status, description, or assigned services/categories. For historical projects, use createdAt to backdate the project creation date. Use when the user asks to edit, rename, or change a project.",
        parameters: {
            type: "OBJECT",
            properties: {
                projectId: { type: "STRING", description: "The project ID from the QUICK LOOKUP TABLE" },
                name: { type: "STRING", description: "New project name (optional)" },
                description: { type: "STRING", description: "New project description (optional)" },
                budget: { type: "NUMBER", description: "New budget in INR (optional)" },
                dueDate: { type: "STRING", description: "New deadline in YYYY-MM-DD format (optional)" },
                status: { type: "STRING", description: "New status", enum: ["Active", "Completed", "On Hold"] },
                services: { type: "ARRAY", description: "Updated list of service/category names for this project", items: { type: "STRING" } },
                createdAt: { type: "STRING", description: "Backdate the project creation date (YYYY-MM-DD or ISO format). Use for historical project imports." },
            },
            required: ["projectId"],
        },
    },
    {
        name: "create_task",
        description: "Create a new task in a project. If no assignee specified, it auto-assigns to the least busy team member. For historical tasks, set status to 'Done' and provide both createdAt and completedAt dates so the contribution heatmap shows the correct completion date.",
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
                estimatedHours: { type: "NUMBER", description: "Estimated hours to complete this task (e.g. 2, 4, 8). Estimate based on task complexity." },
                createdAt: { type: "STRING", description: "For historical tasks, the original creation date in YYYY-MM-DD format" },
                completedAt: { type: "STRING", description: "For historical Done tasks, the actual completion date in YYYY-MM-DD format. IMPORTANT: Always set this when creating historical tasks with status 'Done' so the contribution heatmap shows the correct date." },
            },
            required: ["projectId", "title"],
        },
    },
    {
        name: "update_task_status",
        description: "Move a task to a different status column (Todo, In Progress, Review, Done). For historical/backdated completions, provide a completedAt date.",
        parameters: {
            type: "OBJECT",
            properties: {
                taskId: { type: "STRING", description: "The task ID" },
                status: { type: "STRING", description: "The new status", enum: ["Todo", "In Progress", "Review", "Done"] },
                completedAt: { type: "STRING", description: "For backdating: the actual completion date in YYYY-MM-DD format. Use this when moving historical tasks to Done so the contribution heatmap shows the correct date instead of today." },
            },
            required: ["taskId", "status"],
        },
    },
    {
        name: "edit_task",
        description: "Edit/update an existing task — change its title, description, priority, category, due date, or timestamps. Use this when the user asks to edit, modify, or update a task's details. For backdating historical tasks, use createdAt and updatedAt fields.",
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
                estimatedHours: { type: "NUMBER", description: "Estimated hours to complete the task" },
                createdAt: { type: "STRING", description: "Backdate the task creation date (YYYY-MM-DD or ISO format). Use for historical imports." },
                updatedAt: { type: "STRING", description: "Backdate the task completion/update date (YYYY-MM-DD or ISO format). Use for historical imports to fix heatmap dates." },
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
        description: "Add a comment to a task. For historical data, provide a createdAt timestamp.",
        parameters: {
            type: "OBJECT",
            properties: {
                taskId: { type: "STRING", description: "The task ID" },
                comment: { type: "STRING", description: "The comment text" },
                createdAt: { type: "STRING", description: "For historical comments, the original date in YYYY-MM-DD format" },
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
        description: "Create multiple tasks at once from a project plan/breakdown. For HISTORICAL/completed projects, set each task's status to 'Done' and provide a completedAt date so the contribution heatmap shows correct dates. For new projects, leave status as default (Todo) and provide estimatedDays for auto-scheduling.",
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
                            estimatedHours: { type: "NUMBER", description: "Estimated hours for this task (e.g. 2, 4, 8)" },
                            createdAt: { type: "STRING", description: "For historical tasks, the original creation date in YYYY-MM-DD format" },
                            completedAt: { type: "STRING", description: "For historical Done tasks, the actual completion date in YYYY-MM-DD format. IMPORTANT: Always set this when status is 'Done' so the contribution heatmap shows the correct date." },
                        },
                        required: ["title", "description", "category", "priority"],
                    },
                },
            },
            required: ["projectId", "tasks"],
        },
    },
    {
        name: "bulk_update_task_status",
        description: "Update the status of multiple tasks at once. Use this when the user asks to move many tasks to Done, Todo, In Progress, or Review. Supports filtering by projectId to update all tasks in a project. Provide EITHER a list of taskIds OR a projectId (to update ALL tasks in that project). For backdating, provide completedAt for a single date, or set autoBackdate to true to automatically use each task's dueDate as its completion date (realistic per-task dates).",
        parameters: {
            type: "OBJECT",
            properties: {
                projectId: { type: "STRING", description: "Update ALL tasks in this project (alternative to taskIds)" },
                taskIds: {
                    type: "ARRAY",
                    description: "Specific task IDs to update (alternative to projectId)",
                    items: { type: "STRING" },
                },
                status: { type: "STRING", description: "The new status for all tasks", enum: ["Todo", "In Progress", "Review", "Done"] },
                completedAt: { type: "STRING", description: "For backdating: a single completion date in YYYY-MM-DD format applied to ALL tasks. Use autoBackdate instead if you want per-task dates." },
                autoBackdate: { type: "BOOLEAN", description: "When true, automatically sets each task's completedAt to its dueDate (+ 1-2 days). Use this when moving historical tasks to Done so each task gets a realistic individual completion date based on its timeline." },
                force: { type: "BOOLEAN", description: "When true, include tasks that are ALREADY in the target status. Use this to re-backdate tasks that were already moved to Done but need their updatedAt timestamps corrected." },
            },
            required: ["status"],
        },
    },
    {
        name: "bulk_edit_tasks",
        description: "Edit/update fields on multiple existing tasks at once. Use for bulk backdating timestamps (createdAt, updatedAt), changing priorities, categories, or other fields across many tasks. Provide a projectId to target all tasks in a project, or specific taskIds.",
        parameters: {
            type: "OBJECT",
            properties: {
                projectId: { type: "STRING", description: "Edit ALL tasks in this project (alternative to taskIds)" },
                taskIds: {
                    type: "ARRAY",
                    description: "Specific task IDs to edit (alternative to projectId)",
                    items: { type: "STRING" },
                },
                updates: {
                    type: "OBJECT",
                    description: "Fields to update on every matched task",
                    properties: {
                        priority: { type: "STRING", description: "New priority for all tasks", enum: ["Low", "Medium", "High"] },
                        category: { type: "STRING", description: "New category for all tasks" },
                    },
                },
                autoBackdateCreatedAt: { type: "BOOLEAN", description: "When true, automatically backdate each task's createdAt to a date derived from its dueDate minus its estimatedHours (spread across the project timeline). Use for historical imports." },
                createdAtStart: { type: "STRING", description: "Start date (YYYY-MM-DD) for spreading createdAt dates across tasks. Tasks will get creation dates spread between this and createdAtEnd." },
                createdAtEnd: { type: "STRING", description: "End date (YYYY-MM-DD) for spreading createdAt dates. Used with createdAtStart." },
                autoBackdateUpdatedAt: { type: "BOOLEAN", description: "When true, set each Done task's updatedAt to its dueDate + 1-2 days. Use for fixing heatmap dates on historical tasks." },
            },
            required: [],
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
        description: "Create a new client in the agency. Use when the user asks to add a client or company. For historical/past clients, provide a createdAt date.",
        parameters: {
            type: "OBJECT",
            properties: {
                name: { type: "STRING", description: "Client contact person name" },
                email: { type: "STRING", description: "Client email address" },
                companyName: { type: "STRING", description: "Client's company name" },
                phone: { type: "STRING", description: "Phone number (optional)" },
                address: { type: "STRING", description: "Address (optional)" },
                logo: { type: "STRING", description: "URL to client logo image (optional)" },
                createdAt: { type: "STRING", description: "For historical clients, the original onboarding date in YYYY-MM-DD format" },
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
                role: { type: "STRING", description: "User role", enum: ["admin", "manager", "employee"] },
                salary: { type: "NUMBER", description: "Monthly salary in INR" },
                phone: { type: "STRING" },
            },
            required: ["userId"],
        },
    },
    {
        name: "update_service",
        description: "Update an existing service — rename it or change its assigned employees. Use when the user asks to edit or rename a service.",
        parameters: {
            type: "OBJECT",
            properties: {
                serviceId: { type: "STRING", description: "The service ID to update" },
                name: { type: "STRING", description: "New service name" },
                projectId: { type: "STRING", description: "The project ID this service belongs to" },
                employees: {
                    type: "ARRAY",
                    description: "Updated list of employee user IDs assigned to this service",
                    items: { type: "STRING" },
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
        description: "Add a new service to a specific project. Services are used as task categories and for filtering on the Kanban board. IMPORTANT: You MUST provide the projectId. Use when the user asks to add a new service, department, or category to a project.",
        parameters: {
            type: "OBJECT",
            properties: {
                name: { type: "STRING", description: "Service name (e.g. 'Mobile Development', 'SEO', 'UI Design')" },
                projectId: { type: "STRING", description: "The project ID this service belongs to — REQUIRED. Look up from the QUICK LOOKUP TABLE." },
                employees: {
                    type: "ARRAY",
                    description: "List of employee user IDs to assign to this service (optional)",
                    items: { type: "STRING" },
                },
            },
            required: ["name", "projectId"],
        },
    },
    {
        name: "bulk_estimate_hours",
        description: "Automatically estimate hours for ALL tasks that don't have estimated hours set. Uses smart heuristics based on task title, description, priority, and subtasks. Admin only.",
        parameters: {
            type: "OBJECT",
            properties: {},
        },
    },
    // =========================================================================
    // NEW PERMISSION-GATED TOOLS — These require explicit AI permission flags
    // =========================================================================
    {
        name: "pay_employee",
        description: "Pay an employee's salary. Creates a salary expense transaction. Use for importing historical salary data by setting a past month. Requires AI Payroll permission.",
        parameters: {
            type: "OBJECT",
            properties: {
                userId: { type: "STRING", description: "Employee ID from the QUICK LOOKUP TABLE" },
                amount: { type: "NUMBER", description: "Salary amount in INR" },
                month: { type: "STRING", description: "Payment month in YYYY-MM format (e.g. '2024-01')" },
                description: { type: "STRING", description: "Optional description (default: 'Salary for [month]')" },
            },
            required: ["userId", "amount", "month"],
        },
    },
    {
        name: "bulk_pay_employees",
        description: "Pay multiple employees at once. Creates salary transactions for each. Great for importing months of historical salary data. Requires AI Payroll permission.",
        parameters: {
            type: "OBJECT",
            properties: {
                payments: {
                    type: "ARRAY",
                    description: "List of employee payments",
                    items: {
                        type: "OBJECT",
                        properties: {
                            userId: { type: "STRING", description: "Employee ID" },
                            amount: { type: "NUMBER", description: "Salary amount in INR" },
                            description: { type: "STRING", description: "Optional description" },
                        },
                        required: ["userId", "amount"],
                    },
                },
                month: { type: "STRING", description: "Payment month in YYYY-MM format" },
            },
            required: ["payments", "month"],
        },
    },
    {
        name: "approve_invoice_payment",
        description: "Approve an invoice payment — sets invoice to 'Paid' and creates an income transaction. Requires AI Invoice Management permission.",
        parameters: {
            type: "OBJECT",
            properties: {
                invoiceId: { type: "STRING", description: "Invoice ID to approve" },
            },
            required: ["invoiceId"],
        },
    },
    {
        name: "reject_invoice_payment",
        description: "Reject an invoice payment — sets invoice back to 'Pending'. Requires AI Invoice Management permission.",
        parameters: {
            type: "OBJECT",
            properties: {
                invoiceId: { type: "STRING", description: "Invoice ID to reject" },
                reason: { type: "STRING", description: "Reason for rejection" },
            },
            required: ["invoiceId"],
        },
    },
    {
        name: "update_invoice_status",
        description: "Update the status of an invoice manually. Requires AI Invoice Management permission.",
        parameters: {
            type: "OBJECT",
            properties: {
                invoiceId: { type: "STRING", description: "Invoice ID to update" },
                status: { type: "STRING", description: "New status", enum: ["Paid", "Pending", "Overdue", "Processing"] },
            },
            required: ["invoiceId", "status"],
        },
    },
    {
        name: "bulk_create_invoices",
        description: "Create multiple invoices at once. Great for importing historical invoice data. Supports backdating via the date field. Requires AI Invoice Management permission.",
        parameters: {
            type: "OBJECT",
            properties: {
                invoices: {
                    type: "ARRAY",
                    description: "List of invoices to create",
                    items: {
                        type: "OBJECT",
                        properties: {
                            projectId: { type: "STRING", description: "Project ID" },
                            amount: { type: "NUMBER", description: "Invoice amount in INR" },
                            date: { type: "STRING", description: "Invoice date in YYYY-MM-DD format" },
                            status: { type: "STRING", description: "Invoice status", enum: ["Paid", "Pending", "Overdue", "Processing"] },
                        },
                        required: ["projectId", "amount", "date"],
                    },
                },
            },
            required: ["invoices"],
        },
    },
    {
        name: "create_refund",
        description: "Create a refund transaction for a project. Records an expense transaction with 'Refund' category. Supports backdating. Requires AI Refund permission.",
        parameters: {
            type: "OBJECT",
            properties: {
                projectId: { type: "STRING", description: "Project ID to refund against" },
                amount: { type: "NUMBER", description: "Refund amount in INR" },
                description: { type: "STRING", description: "Refund description/reason" },
                date: { type: "STRING", description: "Refund date in YYYY-MM-DD format (default: today)" },
            },
            required: ["projectId", "amount", "description"],
        },
    },
    {
        name: "create_employee",
        description: "Create a new employee/user in the agency. Use for onboarding new team members. For historical employees, provide a createdAt date. Requires AI Employee Creation permission.",
        parameters: {
            type: "OBJECT",
            properties: {
                name: { type: "STRING", description: "Employee full name" },
                email: { type: "STRING", description: "Employee email address" },
                role: { type: "STRING", description: "Employee role", enum: ["admin", "manager", "employee"] },
                jobTitle: { type: "STRING", description: "Job title (e.g. 'Frontend Developer')" },
                salary: { type: "NUMBER", description: "Monthly salary in INR" },
                employmentType: { type: "STRING", description: "Employment type", enum: ["Salary", "Project Based", "Freelancer"] },
                password: { type: "STRING", description: "Initial password for the account" },
                createdAt: { type: "STRING", description: "For historical employees, the original join date in YYYY-MM-DD format" },
            },
            required: ["name", "email", "role"],
        },
    },
    {
        name: "delete_project",
        description: "Permanently delete a project and all its associated data (tasks, invoices, etc). Use with extreme caution. Requires AI Delete permission.",
        parameters: {
            type: "OBJECT",
            properties: {
                projectId: { type: "STRING", description: "Project ID to delete" },
            },
            required: ["projectId"],
        },
    },
    {
        name: "delete_client",
        description: "Archive (soft-delete) a client. Their financial data is preserved but they are hidden. Requires AI Delete permission.",
        parameters: {
            type: "OBJECT",
            properties: {
                clientId: { type: "STRING", description: "Client ID to archive" },
            },
            required: ["clientId"],
        },
    },
    {
        name: "delete_transaction",
        description: "Permanently delete a financial transaction. Requires AI Delete permission.",
        parameters: {
            type: "OBJECT",
            properties: {
                transactionId: { type: "STRING", description: "Transaction ID to delete" },
            },
            required: ["transactionId"],
        },
    },
    {
        name: "delete_service",
        description: "Delete a service/category from the agency. Requires AI Delete permission.",
        parameters: {
            type: "OBJECT",
            properties: {
                serviceId: { type: "STRING", description: "Service ID to delete" },
            },
            required: ["serviceId"],
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
    bulk_update_task_status: "📋 Updating task statuses",
    bulk_edit_tasks: "✏️ Editing tasks in bulk",
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
    bulk_estimate_hours: "⏱️ Estimating task hours",
    // New permission-gated tools
    pay_employee: "💰 Paying employee",
    bulk_pay_employees: "💰 Processing bulk payroll",
    approve_invoice_payment: "✅ Approving payment",
    reject_invoice_payment: "❌ Rejecting payment",
    update_invoice_status: "📄 Updating invoice",
    bulk_create_invoices: "📄 Creating invoices",
    create_refund: "💸 Issuing refund",
    create_employee: "👤 Creating employee",
    delete_project: "🗑️ Deleting project",
    delete_client: "🗑️ Archiving client",
    delete_transaction: "🗑️ Deleting transaction",
    delete_service: "🗑️ Deleting service",
};

export function getToolDisplayName(toolName: string): string {
    return TOOL_DISPLAY_NAMES[toolName] || toolName;
}

export const SINGULARITY_TOOL_DECLARATIONS_PROJECT_TASK = [
    {
        name: "create_project",
        description: "Create a new project in the agency. Use this when the user asks to create, start, or set up a new project. After creating, you can use bulk_create_tasks to fill it with tasks. For HISTORICAL/past projects, set status to 'Completed' and provide a past createdAt date. ALWAYS set services to the relevant categories for this project.",
        parameters: {
            type: "OBJECT",
            properties: {
                name: { type: "STRING", description: "Project name" },
                clientId: { type: "STRING", description: "[Deprecated] Single client ID — use clientIds instead" },
                clientIds: { type: "ARRAY", items: { type: "STRING" }, description: "List of client IDs from the QUICK LOOKUP TABLE (optional). Supports multiple clients on one project." },
                budget: { type: "NUMBER", description: "Project budget in INR" },
                dueDate: { type: "STRING", description: "Project deadline in YYYY-MM-DD format" },
                status: { type: "STRING", description: "Project status - use 'Completed' for past/historical projects", enum: ["Active", "Completed", "On Hold"] },
                createdAt: { type: "STRING", description: "For historical projects, the original start date in YYYY-MM-DD format" },
                services: { type: "ARRAY", description: "List of service/category names relevant to this project (e.g. 'Mobile Development', 'UI Design', 'SEO'). Use names from the available services in the agency context.", items: { type: "STRING" } },
            },
            required: ["name", "budget", "dueDate"],
        },
    },
    {
        name: "update_project",
        description: "Update an existing project's details - name, budget, deadline, status, description, or assigned services/categories. For historical projects, use createdAt to backdate the project creation date. Use when the user asks to edit, rename, or change a project.",
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
                assigneeId: { type: "STRING", description: "The user ID to assign the task to - look up from the QUICK LOOKUP TABLE. Leave empty to auto-assign to least busy person." },
                category: { type: "STRING", description: "Task category - must be one of the service names from the context" },
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
        description: "Edit/update an existing task - change its title, description, priority, category, due date, or timestamps. Use this when the user asks to edit, modify, or update a task's details. For backdating historical tasks, use createdAt and updatedAt fields.",
        parameters: {
            type: "OBJECT",
            properties: {
                taskId: { type: "STRING", description: "The task ID to edit" },
                title: { type: "STRING", description: "New title (optional, only if changing)" },
                description: { type: "STRING", description: "New description (optional)" },
                priority: { type: "STRING", description: "New priority", enum: ["Low", "Medium", "High"] },
                category: { type: "STRING", description: "New category - must be a service name" },
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
                assigneeId: { type: "STRING", description: "The new assignee's user ID - look up from the QUICK LOOKUP TABLE" },
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
        name: "bulk_create_tasks",
        description: "Create multiple tasks at once from a project plan/breakdown. For HISTORICAL/completed projects, set each task's status to 'Done' and provide a completedAt date so the contribution heatmap shows correct dates. For new projects, leave status as default (Todo) and provide estimatedDays for auto-scheduling. IMPORTANT: If the user uploaded a file with many tasks, you MUST call this tool MULTIPLE TIMES (once per batch of ~30-40 tasks) until EVERY task from the file is created. Never stop at a subset.",
        parameters: {
            type: "OBJECT",
            properties: {
                projectId: { type: "STRING", description: "The project ID to create tasks in" },
                startDate: { type: "STRING", description: "Project start date in YYYY-MM-DD format. Tasks will be scheduled sequentially from this date." },
                tasks: {
                    type: "ARRAY",
                    description: "Array of tasks to create. Include ALL tasks - if there are more than 40, split across multiple calls to this tool.",
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
                            status: { type: "STRING", description: "Task status - use 'Done' for completed historical tasks", enum: ["Todo", "In Progress", "Review", "Done"] },
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
];

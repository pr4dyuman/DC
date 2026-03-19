// =============================================================================
// TOOL DECLARATIONS - Gemini Function Calling Schema
// This file has NO server action imports, so Next.js won't treat it as an
// action boundary. Safe to export consts and sync functions.
// =============================================================================

import { SINGULARITY_TOOL_DECLARATIONS_PROJECT_TASK } from "./singularity-tool-def-project-task";
import { SINGULARITY_TOOL_DECLARATIONS_READ } from "./singularity-tool-def-read";

export const SINGULARITY_TOOL_DECLARATIONS_CORE = [
    ...SINGULARITY_TOOL_DECLARATIONS_PROJECT_TASK,
    ...SINGULARITY_TOOL_DECLARATIONS_READ,
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
        name: "bulk_add_transactions",
        description: "Import multiple financial transactions at once. Use for historical data import, monthly salary batch, or bulk expense recording. Each transaction follows the same validation rules as add_transaction.",
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
                    description: "income or expense - determined by category (see validation rules above)",
                    enum: ["income", "expense"],
                },
                amount: { type: "NUMBER", description: "Amount in INR" },
                date: { type: "STRING", description: "Date in YYYY-MM-DD format" },
                description: { type: "STRING", description: "Description of the transaction" },
                projectId: { type: "STRING", description: "Required for Project, Retainer, Refund categories" },
                userId: { type: "STRING", description: "Required for Salary, Reimbursement - the employee's user ID" },
                taxType: { type: "STRING", description: "Required for Tax category", enum: ["GST", "TDS", "Income Tax", "Professional Tax", "Other"] },
                expenseType: { type: "STRING", description: "Required for Reimbursement category", enum: ["Travel", "Meals", "Client Meeting", "Equipment", "Other"] },
                status: { type: "STRING", description: "completed or pending", enum: ["completed", "pending"] },
            },
            required: ["category", "type", "amount", "date", "description"],
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
        description: "Update a client's details - name, email, company, phone, address, or logo.",
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
        name: "update_employee",
        description: "Update an employee's profile - job title, role, salary, email, phone. Only admins can update others. Use when the user asks to change someone's role, salary, or profile.",
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
        description: "Update an existing service - rename it or change its assigned employees. Use when the user asks to edit or rename a service.",
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
            required: ["serviceId", "name", "projectId"],
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
                projectId: { type: "STRING", description: "The project ID this service belongs to - REQUIRED. Look up from the QUICK LOOKUP TABLE." },
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
];

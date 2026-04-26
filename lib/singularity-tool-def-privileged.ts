// =============================================================================
// TOOL DECLARATIONS - Gemini Function Calling Schema
// This file has NO server action imports, so Next.js won't treat it as an
// action boundary. Safe to export consts and sync functions.
// =============================================================================

export const SINGULARITY_TOOL_DECLARATIONS_PRIVILEGED = [
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
        description: "Approve an invoice payment - sets invoice to 'Paid' and creates an income transaction. Requires AI Invoice Management permission.",
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
        description: "Reject an invoice payment - sets invoice back to 'Pending'. Requires AI Invoice Management permission.",
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

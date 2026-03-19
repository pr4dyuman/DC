// =============================================================================
// TOOL DECLARATIONS - Gemini Function Calling Schema
// This file has NO server action imports, so Next.js won't treat it as an
// action boundary. Safe to export consts and sync functions.
// =============================================================================

import { SINGULARITY_TOOL_DECLARATIONS_CORE } from "./singularity-tool-def-core";
import { SINGULARITY_TOOL_DECLARATIONS_PRIVILEGED } from "./singularity-tool-def-privileged";

export const SINGULARITY_TOOL_DECLARATIONS = [
    ...SINGULARITY_TOOL_DECLARATIONS_CORE,
    ...SINGULARITY_TOOL_DECLARATIONS_PRIVILEGED,
];

// =============================================================================
// TOOL NAME -> DISPLAY NAME MAPPING
// =============================================================================

const TOOL_DISPLAY_NAMES: Record<string, string> = {
    create_project: "Creating project",
    update_project: "\u270F\uFE0F Updating project",
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
    bulk_create_tasks: "\uD83D\uDE80 Planning project tasks",
    bulk_update_task_status: "\uD83D\uDCCB Updating task statuses",
    bulk_edit_tasks: "\u270F\uFE0F Editing tasks in bulk",
    bulk_add_transactions: "\uD83D\uDCB0 Importing transactions",
    add_transaction: "\uD83D\uDCB0 Adding transaction",
    get_transactions: "\uD83D\uDCCA Loading transactions",
    create_client: "\uD83D\uDC64 Adding client",
    update_client: "\u270F\uFE0F Updating client",
    get_employee_profile: "\uD83D\uDC64 Loading profile",
    update_employee: "\u270F\uFE0F Updating employee",
    get_task_comments: "\uD83D\uDCAC Loading comments",
    get_invoices: "\uD83D\uDCC4 Loading invoices",
    manage_leave_request: "\uD83D\uDCCB Processing leave",
    add_service: "\u2795 Adding service",
    update_service: "\u270F\uFE0F Updating service",
    bulk_estimate_hours: "\u23F1\uFE0F Estimating task hours",
    // New permission-gated tools
    pay_employee: "\uD83D\uDCB0 Paying employee",
    bulk_pay_employees: "\uD83D\uDCB0 Processing bulk payroll",
    approve_invoice_payment: "\u2705 Approving payment",
    reject_invoice_payment: "\u274C Rejecting payment",
    update_invoice_status: "\uD83D\uDCC4 Updating invoice",
    bulk_create_invoices: "\uD83D\uDCC4 Creating invoices",
    create_refund: "\uD83D\uDCB8 Issuing refund",
    create_employee: "\uD83D\uDC64 Creating employee",
    delete_project: "\uD83D\uDDD1\uFE0F Deleting project",
    delete_client: "\uD83D\uDDD1\uFE0F Archiving client",
    delete_transaction: "\uD83D\uDDD1\uFE0F Deleting transaction",
    delete_service: "\uD83D\uDDD1\uFE0F Deleting service",
};

export function getToolDisplayName(toolName: string): string {
    return TOOL_DISPLAY_NAMES[toolName] || toolName;
}

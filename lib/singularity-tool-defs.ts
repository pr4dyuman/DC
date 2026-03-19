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
// TOOL NAME â†’ DISPLAY NAME MAPPING
// =============================================================================

const TOOL_DISPLAY_NAMES: Record<string, string> = {
    create_project: "Creating project",
    update_project: "âœï¸ Updating project",
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
    bulk_create_tasks: "ðŸš€ Planning project tasks",
    bulk_update_task_status: "ðŸ“‹ Updating task statuses",
    bulk_edit_tasks: "âœï¸ Editing tasks in bulk",
    bulk_add_transactions: "ðŸ’° Importing transactions",
    add_transaction: "ðŸ’° Adding transaction",
    get_transactions: "ðŸ“Š Loading transactions",
    create_client: "ðŸ‘¤ Adding client",
    update_client: "âœï¸ Updating client",
    get_employee_profile: "ðŸ‘¤ Loading profile",
    update_employee: "âœï¸ Updating employee",
    get_task_comments: "ðŸ’¬ Loading comments",
    get_invoices: "ðŸ“„ Loading invoices",
    manage_leave_request: "ðŸ“‹ Processing leave",
    add_service: "âž• Adding service",
    update_service: "âœï¸ Updating service",
    bulk_estimate_hours: "â±ï¸ Estimating task hours",
    // New permission-gated tools
    pay_employee: "ðŸ’° Paying employee",
    bulk_pay_employees: "ðŸ’° Processing bulk payroll",
    approve_invoice_payment: "âœ… Approving payment",
    reject_invoice_payment: "âŒ Rejecting payment",
    update_invoice_status: "ðŸ“„ Updating invoice",
    bulk_create_invoices: "ðŸ“„ Creating invoices",
    create_refund: "ðŸ’¸ Issuing refund",
    create_employee: "ðŸ‘¤ Creating employee",
    delete_project: "ðŸ—‘ï¸ Deleting project",
    delete_client: "ðŸ—‘ï¸ Archiving client",
    delete_transaction: "ðŸ—‘ï¸ Deleting transaction",
    delete_service: "ðŸ—‘ï¸ Deleting service",
};

export function getToolDisplayName(toolName: string): string {
    return TOOL_DISPLAY_NAMES[toolName] || toolName;
}

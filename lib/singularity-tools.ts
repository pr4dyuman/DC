import { executeAdminTool, type AdminToolName } from "./singularity-tool-admin";
import { executeDeleteTool, type DeleteToolName } from "./singularity-tool-delete";
import { executeFinanceTool } from "./singularity-tool-finance";
import { executeManagementTool } from "./singularity-tool-management";
import { executeProjectTaskTool, type ProjectTaskToolName } from "./singularity-tool-project-task";
import { executeReadOnlyTool } from "./singularity-tool-read";
import { runWithTaskEmailNotificationsSuppressed } from "./actions/task-email-context";
import {
    ClientModel,
    InvoiceModel,
    LeaveRequestModel,
    ProjectModel,
    ServiceModel,
    TaskModel,
    TransactionModel,
    UserModel,
    connectDB,
} from "./mongodb";
import { formatCurrency } from "./currency";
import { getDefaultCurrency } from "./actions/super-admin";
import type { Client, Invoice, LeaveRequest, Project, Service, Task, Transaction, User } from "./types";

type RoleType = "admin" | "manager" | "employee" | "client";
type SnapshotEntityType = "task" | "project" | "client" | "invoice" | "transaction" | "service" | "leaveRequest";
type SnapshotEntityDocument = Task | Project | Client | Invoice | Transaction | Service | LeaveRequest;
type ToolExecutionResult = {
    success: boolean;
    data: unknown;
    summary: string;
    rollbackData?: RollbackAction[];
};
type SnapshotModel = {
    findOne(filter: Record<string, unknown>): {
        lean(): Promise<SnapshotEntityDocument | null>;
    };
};
type ReadOnlyToolName = Parameters<typeof executeReadOnlyTool>[0];
type FinanceToolName = Parameters<typeof executeFinanceTool>[0];
type ManagementToolName = Parameters<typeof executeManagementTool>[0];
type ToolArgs = Record<string, unknown>;

const SNAPSHOT_MODELS: Record<SnapshotEntityType, SnapshotModel> = {
    task: TaskModel as unknown as SnapshotModel,
    project: ProjectModel as unknown as SnapshotModel,
    client: ClientModel as unknown as SnapshotModel,
    invoice: InvoiceModel as unknown as SnapshotModel,
    transaction: TransactionModel as unknown as SnapshotModel,
    service: ServiceModel as unknown as SnapshotModel,
    leaveRequest: LeaveRequestModel as unknown as SnapshotModel,
};

const AI_TASK_EMAIL_SUPPRESSED_TOOLS = new Set<string>([
    "create_task",
    "update_task_status",
    "edit_task",
    "reassign_task",
    "bulk_update_task_status",
    "bulk_edit_tasks",
    "bulk_create_tasks",
]);

const TOOL_PERMISSIONS: Record<string, RoleType[]> = {
    search_agency: ["admin", "manager", "employee", "client"],
    get_project_tasks: ["admin", "manager", "employee", "client"],
    get_finance_summary: ["admin", "manager"],
    get_team_workload: ["admin", "manager"],
    get_recent_activity: ["admin", "manager", "employee"],
    get_task_comments: ["admin", "manager", "employee", "client"],
    get_transactions: ["admin", "manager"],
    get_invoices: ["admin", "manager", "client"],
    get_leave_requests: ["admin", "manager", "employee"],
    get_employee_profile: ["admin", "manager", "employee"],
    create_task: ["admin", "manager"],
    edit_task: ["admin", "manager", "employee"],
    update_task_status: ["admin", "manager", "employee"],
    reassign_task: ["admin", "manager"],
    delete_task: ["admin", "manager"],
    add_task_comment: ["admin", "manager", "employee", "client"],
    bulk_create_tasks: ["admin", "manager"],
    bulk_update_task_status: ["admin", "manager"],
    bulk_edit_tasks: ["admin", "manager"],
    create_project: ["admin", "manager"],
    update_project: ["admin", "manager"],
    create_invoice: ["admin", "manager"],
    add_transaction: ["admin", "manager"],
    bulk_add_transactions: ["admin", "manager"],
    create_client: ["admin", "manager"],
    update_client: ["admin", "manager"],
    update_employee: ["admin"],
    add_service: ["admin"],
    update_service: ["admin"],
    manage_leave_request: ["admin", "manager"],
    bulk_estimate_hours: ["admin", "manager"],
    pay_employee: ["admin"],
    bulk_pay_employees: ["admin"],
    approve_invoice_payment: ["admin"],
    reject_invoice_payment: ["admin"],
    update_invoice_status: ["admin"],
    bulk_create_invoices: ["admin"],
    create_refund: ["admin"],
    create_employee: ["admin"],
    delete_project: ["admin"],
    delete_client: ["admin"],
    delete_transaction: ["admin"],
    delete_service: ["admin"],
};

export interface RollbackAction {
    toolName: string;
    actionType: "create" | "update" | "delete";
    entityType: "task" | "project" | "client" | "user" | "invoice" | "transaction" | "service" | "leaveRequest" | "comment";
    entityId: string;
    beforeSnapshot?: unknown;
    createdEntityIds?: string[];
    executedAt: string;
}

async function snapshotEntity(entityType: SnapshotEntityType, entityId: string): Promise<SnapshotEntityDocument | null> {
    await connectDB();
    const { getCurrentAgency } = await import("./agency-context");
    const agency = await getCurrentAgency();
    const model = SNAPSHOT_MODELS[entityType];
    const doc = await model.findOne({ id: entityId, agencyId: agency?.id }).lean();
    return doc || null;
}

async function getUserRole(userId: string): Promise<RoleType> {
    await connectDB();
    const { getCurrentAgency } = await import("./agency-context");
    const agency = await getCurrentAgency();
    const agencyFilter = agency ? { agencyId: agency.id } : {};

    const user = await UserModel.findOne({ id: userId, ...agencyFilter }).select("role").lean() as Pick<User, "role"> | null;
    if (user?.role) {
        return user.role as RoleType;
    }

    const client = await ClientModel.findOne({ id: userId, ...agencyFilter }).select("role").lean() as Pick<Client, "role"> | null;
    if (client) {
        return "client";
    }

    return "employee";
}

export async function executeTool(
    name: string,
    args: ToolArgs,
    userId: string
): Promise<ToolExecutionResult> {
    try {
        const currency = await getDefaultCurrency();
        const fmtCur = (amount: number) => formatCurrency(amount, currency);

        const userRole = await getUserRole(userId);
        const allowedRoles = TOOL_PERMISSIONS[name];

        if (allowedRoles && !allowedRoles.includes(userRole)) {
            const roleLabel = userRole === "client"
                ? "Client"
                : userRole.charAt(0).toUpperCase() + userRole.slice(1);

            return {
                success: false,
                data: null,
                summary: `Permission denied - "${name.replace(/_/g, " ")}" requires ${allowedRoles.join("/")} access. Your role (${roleLabel}) does not have this permission.`,
            };
        }

        switch (name) {
            case "search_agency":
            case "get_project_tasks":
            case "get_finance_summary":
            case "get_team_workload":
            case "get_leave_requests":
            case "get_transactions":
            case "get_recent_activity":
            case "get_employee_profile":
            case "get_task_comments":
            case "get_invoices":
                return executeReadOnlyTool(name as ReadOnlyToolName, args, userRole, fmtCur);

            case "create_project":
            case "create_task":
            case "update_task_status":
            case "edit_task":
            case "reassign_task":
            case "delete_task":
            case "add_task_comment":
            case "update_project":
            case "bulk_update_task_status":
            case "bulk_edit_tasks":
            case "bulk_create_tasks":
                if (AI_TASK_EMAIL_SUPPRESSED_TOOLS.has(name)) {
                    return runWithTaskEmailNotificationsSuppressed(() =>
                        executeProjectTaskTool(name as ProjectTaskToolName, args, userId, snapshotEntity)
                    );
                }
                return executeProjectTaskTool(name as ProjectTaskToolName, args, userId, snapshotEntity);

            case "create_invoice":
            case "bulk_add_transactions":
            case "add_transaction":
                return executeFinanceTool(name as FinanceToolName, args, fmtCur);

            case "create_client":
            case "update_client":
            case "update_employee":
            case "manage_leave_request":
            case "add_service":
            case "update_service":
            case "bulk_estimate_hours":
                return executeManagementTool(name as ManagementToolName, args, snapshotEntity);

            case "pay_employee":
            case "bulk_pay_employees":
            case "approve_invoice_payment":
            case "reject_invoice_payment":
            case "update_invoice_status":
            case "bulk_create_invoices":
            case "create_refund":
            case "create_employee":
                return executeAdminTool(name as AdminToolName, args, fmtCur, snapshotEntity);

            case "delete_project":
            case "delete_client":
            case "delete_transaction":
            case "delete_service":
                return executeDeleteTool(name as DeleteToolName, args, fmtCur, snapshotEntity);

            default:
                return {
                    success: false,
                    data: null,
                    summary: `Unknown tool: ${name}`,
                };
        }
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Tool execution failed";
        console.error(`[Tool Executor] ${name} failed:`, message);
        return {
            success: false,
            data: null,
            summary: `Error: ${message}`,
        };
    }
}

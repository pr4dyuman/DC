import { getAIPermissions } from "./actions";
import { getCurrentAgency } from "./agency-context";
import { deleteProjectImpl } from "./actions/admin-deletions";
import { deleteClientImpl } from "./actions/client-mutations";
import { deleteTransactionImpl } from "./actions/finance-mutations";
import { deleteServiceImpl } from "./actions/service-mutations";
import { connectDB, InvoiceModel, TaskModel, TransactionModel } from "./mongodb";
import type { Client, Invoice, Project, Service, Task, Transaction } from "./types";

type ToolArgs = Record<string, unknown>;
export type DeleteToolName =
    | "delete_project"
    | "delete_client"
    | "delete_transaction"
    | "delete_service";
type RollbackAction = {
    toolName: string;
    actionType: "create" | "update" | "delete";
    entityType: "task" | "project" | "client" | "invoice" | "transaction" | "service" | "leaveRequest" | "comment";
    entityId: string;
    beforeSnapshot?: unknown;
    createdEntityIds?: string[];
    executedAt: string;
};
type ToolExecutionResult = {
    success: boolean;
    data: unknown;
    summary: string;
    rollbackData?: RollbackAction[];
};
type SnapshotEntityType = "project" | "client" | "transaction" | "service";
type SnapshotEntity = (entityType: SnapshotEntityType, entityId: string) => Promise<unknown>;
type ProjectDeleteSnapshot = {
    project: unknown;
    tasks: Task[];
    invoices: Invoice[];
    transactions: Transaction[];
};

function getOptionalStringArg(args: ToolArgs, key: string): string | undefined {
    const value = args[key];
    return typeof value === "string" && value.trim() ? value : undefined;
}

function getStringArg(args: ToolArgs, key: string): string {
    return getOptionalStringArg(args, key) ?? "";
}

function permissionDenied(): ToolExecutionResult {
    return {
        success: false,
        data: null,
        summary: "AI Delete permission is disabled. Enable it in Settings -> AI Settings.",
    };
}

export async function executeDeleteTool(
    name: DeleteToolName,
    args: ToolArgs,
    fmtCur: (amount: number) => string,
    snapshotEntity: SnapshotEntity
): Promise<ToolExecutionResult> {
    const aiPerms = await getAIPermissions();
    if (!aiPerms.canDelete) {
        return permissionDenied();
    }

    const agency = await getCurrentAgency();
    if (!agency?.id) {
        return { success: false, data: null, summary: "Agency context required" };
    }

    switch (name) {
        case "delete_project": {
            const projectId = getStringArg(args, "projectId");
            const projectSnapshot = await snapshotEntity("project", projectId);
            if (!projectSnapshot) {
                return { success: false, data: null, summary: "Project not found" };
            }

            await connectDB();
            const [cascadedTasks, cascadedInvoices, cascadedTransactions] = await Promise.all([
                TaskModel.find({ projectId, agencyId: agency.id }).lean() as Promise<Task[]>,
                InvoiceModel.find({ projectId, agencyId: agency.id }).lean() as Promise<Invoice[]>,
                TransactionModel.find({ projectId, agencyId: agency.id }).lean() as Promise<Transaction[]>,
            ]);

            await deleteProjectImpl(projectId, agency.id);

            return {
                success: true,
                data: { projectId },
                summary: `Project "${(projectSnapshot as Project).name}" and all its data deleted permanently`,
                rollbackData: [{
                    toolName: "delete_project",
                    actionType: "delete",
                    entityType: "project",
                    entityId: projectId,
                    beforeSnapshot: {
                        project: projectSnapshot,
                        tasks: cascadedTasks,
                        invoices: cascadedInvoices,
                        transactions: cascadedTransactions,
                    } satisfies ProjectDeleteSnapshot,
                    executedAt: new Date().toISOString(),
                }],
            };
        }

        case "delete_client": {
            const clientId = getStringArg(args, "clientId");
            const clientSnapshot = await snapshotEntity("client", clientId);
            if (!clientSnapshot) {
                return { success: false, data: null, summary: "Client not found" };
            }

            await deleteClientImpl(clientId, agency.id);

            return {
                success: true,
                data: { clientId },
                summary: `Client "${(clientSnapshot as Client).name}" archived (financial data preserved)`,
                rollbackData: [{
                    toolName: "delete_client",
                    actionType: "update",
                    entityType: "client",
                    entityId: clientId,
                    beforeSnapshot: clientSnapshot,
                    executedAt: new Date().toISOString(),
                }],
            };
        }

        case "delete_transaction": {
            const transactionId = getStringArg(args, "transactionId");
            const transactionSnapshot = await snapshotEntity("transaction", transactionId);
            if (!transactionSnapshot) {
                return { success: false, data: null, summary: "Transaction not found" };
            }

            await deleteTransactionImpl(transactionId, agency.id);

            return {
                success: true,
                data: { transactionId },
                summary: `Transaction deleted: ${fmtCur((transactionSnapshot as Transaction).amount)} (${(transactionSnapshot as Transaction).category})`,
                rollbackData: [{
                    toolName: "delete_transaction",
                    actionType: "delete",
                    entityType: "transaction",
                    entityId: transactionId,
                    beforeSnapshot: transactionSnapshot,
                    executedAt: new Date().toISOString(),
                }],
            };
        }

        case "delete_service": {
            const serviceId = getStringArg(args, "serviceId");
            const serviceSnapshot = await snapshotEntity("service", serviceId);
            if (!serviceSnapshot) {
                return { success: false, data: null, summary: "Service not found" };
            }

            try {
                await deleteServiceImpl(serviceId, agency.id);
            } catch (error: unknown) {
                const message = error instanceof Error ? error.message : "Delete failed";
                return { success: false, data: null, summary: message };
            }

            return {
                success: true,
                data: { serviceId },
                summary: `Service "${(serviceSnapshot as Service).name}" deleted`,
                rollbackData: [{
                    toolName: "delete_service",
                    actionType: "delete",
                    entityType: "service",
                    entityId: serviceId,
                    beforeSnapshot: serviceSnapshot,
                    executedAt: new Date().toISOString(),
                }],
            };
        }
    }
}

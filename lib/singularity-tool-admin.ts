import crypto from "crypto";

import {
    adminApproveInvoicePayment,
    adminRejectInvoicePayment,
    createInvoice,
    createRefund,
    createUser,
    getAIPermissions,
    getUser,
    payEmployee,
    updateInvoiceStatus,
} from "./actions";
import { UserModel } from "./mongodb";
import type { Invoice, User } from "./types";

type ToolArgs = Record<string, unknown>;
type CurrencyFormatter = (amount: number) => string;
export type AdminToolName =
    | "pay_employee"
    | "bulk_pay_employees"
    | "approve_invoice_payment"
    | "reject_invoice_payment"
    | "update_invoice_status"
    | "bulk_create_invoices"
    | "create_refund"
    | "create_employee";
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
type SnapshotEntity = (entityType: "invoice", entityId: string) => Promise<unknown>;
type PayrollInput = {
    userId?: string;
    amount?: number;
};
type BulkInvoiceInput = {
    projectId?: string;
    amount?: number;
    date?: string;
    status?: Invoice["status"];
};

function getOptionalStringArg(args: ToolArgs, key: string): string | undefined {
    const value = args[key];
    return typeof value === "string" && value.trim() ? value : undefined;
}

function getStringArg(args: ToolArgs, key: string): string {
    return getOptionalStringArg(args, key) ?? "";
}

function getOptionalNumberArg(args: ToolArgs, key: string): number | undefined {
    const value = args[key];
    return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function getNumberArg(args: ToolArgs, key: string): number {
    return getOptionalNumberArg(args, key) ?? 0;
}

function getPayrollInputs(args: ToolArgs): PayrollInput[] {
    const value = args.payments;
    return Array.isArray(value)
        ? value.filter((entry): entry is PayrollInput => typeof entry === "object" && entry !== null)
        : [];
}

function getBulkInvoices(args: ToolArgs): BulkInvoiceInput[] {
    const value = args.invoices;
    return Array.isArray(value)
        ? value.filter((entry): entry is BulkInvoiceInput => typeof entry === "object" && entry !== null)
        : [];
}

function permissionDenied(summary: string): ToolExecutionResult {
    return { success: false, data: null, summary };
}

export async function executeAdminTool(
    name: AdminToolName,
    args: ToolArgs,
    fmtCur: CurrencyFormatter,
    snapshotEntity: SnapshotEntity
): Promise<ToolExecutionResult> {
    switch (name) {
        case "pay_employee": {
            const aiPerms = await getAIPermissions();
            if (!aiPerms.canPayroll) {
                return permissionDenied("AI Payroll permission is disabled. Enable it in Settings -> AI Settings.");
            }

            const userId = getStringArg(args, "userId");
            const amount = getNumberArg(args, "amount");
            const month = getStringArg(args, "month");
            const employee = await getUser(userId);
            const payResult = await payEmployee(userId, amount, month, employee?.name || "Employee");

            return {
                success: true,
                data: { userId, amount, month },
                summary: `Salary of ${fmtCur(amount)} paid to ${employee?.name || "employee"} for ${month}`,
                rollbackData: [{
                    toolName: "pay_employee",
                    actionType: "create",
                    entityType: "transaction",
                    entityId: payResult.transactionId || "",
                    executedAt: new Date().toISOString(),
                }],
            };
        }

        case "bulk_pay_employees": {
            const aiPerms = await getAIPermissions();
            if (!aiPerms.canPayroll) {
                return permissionDenied("AI Payroll permission is disabled. Enable it in Settings -> AI Settings.");
            }

            const month = getStringArg(args, "month");
            const payments = getPayrollInputs(args);
            const results: string[] = [];
            const createdTxnIds: string[] = [];

            for (const pay of payments) {
                const userId = pay.userId || "";
                const amount = pay.amount ?? 0;
                const employee = await getUser(userId);
                const payResult = await payEmployee(userId, amount, month, employee?.name || "Employee");
                if (payResult.transactionId) createdTxnIds.push(payResult.transactionId);
                results.push(`${employee?.name || userId}: ${fmtCur(amount)}`);
            }

            return {
                success: true,
                data: { count: payments.length, month },
                summary: `Bulk payroll for ${month}: ${payments.length} employee(s) paid - ${results.join(", ")}`,
                rollbackData: createdTxnIds.length > 0 ? [{
                    toolName: "bulk_pay_employees",
                    actionType: "create",
                    entityType: "transaction",
                    entityId: createdTxnIds[0],
                    createdEntityIds: createdTxnIds,
                    executedAt: new Date().toISOString(),
                }] : undefined,
            };
        }

        case "approve_invoice_payment": {
            const aiPerms = await getAIPermissions();
            if (!aiPerms.canManageInvoices) {
                return permissionDenied("AI Invoice Management permission is disabled. Enable it in Settings -> AI Settings.");
            }

            const invoiceId = getStringArg(args, "invoiceId");
            const invoiceSnapshot = await snapshotEntity("invoice", invoiceId);
            await adminApproveInvoicePayment(invoiceId);

            return {
                success: true,
                data: { invoiceId },
                summary: "Invoice payment approved - now marked as Paid",
                rollbackData: invoiceSnapshot ? [{
                    toolName: "approve_invoice_payment",
                    actionType: "update",
                    entityType: "invoice",
                    entityId: invoiceId,
                    beforeSnapshot: invoiceSnapshot,
                    executedAt: new Date().toISOString(),
                }] : undefined,
            };
        }

        case "reject_invoice_payment": {
            const aiPerms = await getAIPermissions();
            if (!aiPerms.canManageInvoices) {
                return permissionDenied("AI Invoice Management permission is disabled. Enable it in Settings -> AI Settings.");
            }

            const invoiceId = getStringArg(args, "invoiceId");
            const reason = getStringArg(args, "reason");
            const invoiceSnapshot = await snapshotEntity("invoice", invoiceId);
            await adminRejectInvoicePayment(invoiceId, reason);

            return {
                success: true,
                data: { invoiceId, reason },
                summary: `Invoice payment rejected${reason ? ` - ${reason}` : ""}`,
                rollbackData: invoiceSnapshot ? [{
                    toolName: "reject_invoice_payment",
                    actionType: "update",
                    entityType: "invoice",
                    entityId: invoiceId,
                    beforeSnapshot: invoiceSnapshot,
                    executedAt: new Date().toISOString(),
                }] : undefined,
            };
        }

        case "update_invoice_status": {
            const aiPerms = await getAIPermissions();
            if (!aiPerms.canManageInvoices) {
                return permissionDenied("AI Invoice Management permission is disabled. Enable it in Settings -> AI Settings.");
            }

            const invoiceId = getStringArg(args, "invoiceId");
            const status = getOptionalStringArg(args, "status") as Invoice["status"] | undefined;
            if (!status) {
                return { success: false, data: null, summary: "No invoice status specified" };
            }

            const invoiceSnapshot = await snapshotEntity("invoice", invoiceId);
            try {
                await updateInvoiceStatus(invoiceId, status);
            } catch (error: unknown) {
                const message = error instanceof Error ? error.message : "Failed to update invoice status";
                return { success: false, data: null, summary: message };
            }

            return {
                success: true,
                data: { invoiceId, status },
                summary: `Invoice status updated to "${status}"`,
                rollbackData: invoiceSnapshot ? [{
                    toolName: "update_invoice_status",
                    actionType: "update",
                    entityType: "invoice",
                    entityId: invoiceId,
                    beforeSnapshot: invoiceSnapshot,
                    executedAt: new Date().toISOString(),
                }] : undefined,
            };
        }

        case "bulk_create_invoices": {
            const aiPerms = await getAIPermissions();
            if (!aiPerms.canManageInvoices) {
                return permissionDenied("AI Invoice Management permission is disabled. Enable it in Settings -> AI Settings.");
            }

            const invoices = getBulkInvoices(args);
            const createdIds: string[] = [];

            for (const invoice of invoices) {
                const result = await createInvoice({
                    projectId: invoice.projectId || "",
                    amount: invoice.amount ?? 0,
                    date: invoice.date || new Date().toISOString().split("T")[0],
                });

                if (invoice.status && invoice.status !== "Pending") {
                    await updateInvoiceStatus(result.id, invoice.status);
                }

                createdIds.push(result.id);
            }

            return {
                success: true,
                data: { count: createdIds.length, ids: createdIds },
                summary: `${createdIds.length} invoice(s) created`,
                rollbackData: createdIds.length > 0 ? [{
                    toolName: "bulk_create_invoices",
                    actionType: "create",
                    entityType: "invoice",
                    entityId: createdIds[0],
                    createdEntityIds: createdIds,
                    executedAt: new Date().toISOString(),
                }] : undefined,
            };
        }

        case "create_refund": {
            const aiPerms = await getAIPermissions();
            if (!aiPerms.canRefund) {
                return permissionDenied("AI Refund permission is disabled. Enable it in Settings -> AI Settings.");
            }

            const amount = getNumberArg(args, "amount");
            const description = getStringArg(args, "description");
            const refundResult = await createRefund({
                projectId: getStringArg(args, "projectId"),
                amount,
                description,
                refundReason: description,
                date: getOptionalStringArg(args, "date") || new Date().toISOString().split("T")[0],
            });

            return {
                success: true,
                data: { id: refundResult.id, amount },
                summary: `Refund of ${fmtCur(amount)} created - ${description}`,
                rollbackData: [{
                    toolName: "create_refund",
                    actionType: "create",
                    entityType: "transaction",
                    entityId: refundResult.id,
                    executedAt: new Date().toISOString(),
                }],
            };
        }

        case "create_employee": {
            const aiPerms = await getAIPermissions();
            if (!aiPerms.canCreateEmployee) {
                return permissionDenied("AI Employee Creation permission is disabled. Enable it in Settings -> AI Settings.");
            }

            const generatedPassword = getOptionalStringArg(args, "password") || crypto.randomBytes(16).toString("base64url");
            const role = (getOptionalStringArg(args, "role") || "employee") as User["role"];
            const employmentType = (getOptionalStringArg(args, "employmentType") || "Salary") as NonNullable<User["employmentType"]>;
            const createdAt = getOptionalStringArg(args, "createdAt");

            const newEmployee = await createUser({
                name: getStringArg(args, "name"),
                email: getStringArg(args, "email"),
                role,
                jobTitle: getOptionalStringArg(args, "jobTitle"),
                salary: getOptionalNumberArg(args, "salary"),
                employmentType,
                password: generatedPassword,
            });

            if (createdAt) {
                await UserModel.updateOne(
                    { id: newEmployee.id },
                    { $set: { createdAt: new Date(createdAt).toISOString() } },
                    { timestamps: false }
                );
            }

            return {
                success: true,
                data: {
                    id: newEmployee.id,
                    name: newEmployee.name,
                    email: newEmployee.email,
                    role: newEmployee.role,
                    temporaryPassword: generatedPassword,
                },
                summary: `Employee "${newEmployee.name}" created (${newEmployee.role}) - email: ${newEmployee.email}. Temporary password: ${generatedPassword} - please change on first login.`,
                rollbackData: [{
                    toolName: "create_employee",
                    actionType: "create",
                    entityType: "task",
                    entityId: newEmployee.id,
                    executedAt: new Date().toISOString(),
                }],
            };
        }
    }
}

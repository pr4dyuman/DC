import { createInvoice, createTransaction, getUser } from "./actions";
import type { Invoice, Transaction } from "./types";

type ToolArgs = Record<string, unknown>;
type CurrencyFormatter = (amount: number) => string;
type ToolExecutionResult = {
    success: boolean;
    data: unknown;
    summary: string;
    rollbackData?: {
        toolName: string;
        actionType: "create" | "update" | "delete";
        entityType: "task" | "project" | "client" | "user" | "invoice" | "transaction" | "service" | "leaveRequest" | "comment";
        entityId: string;
        beforeSnapshot?: unknown;
        createdEntityIds?: string[];
        executedAt: string;
    }[];
};
type FinanceToolName = "create_invoice" | "bulk_add_transactions" | "add_transaction";
type BulkTransactionInput = {
    category: Transaction["category"];
    type: Transaction["type"];
    amount: number;
    date: string;
    description?: string;
    projectId?: string;
    userId?: string;
    taxType?: Transaction["taxType"];
    expenseType?: Transaction["expenseType"];
    status?: Transaction["status"];
};

function getStringArg(args: ToolArgs, key: string): string {
    const value = args[key];
    return typeof value === "string" ? value : "";
}

function getOptionalStringArg(args: ToolArgs, key: string): string | undefined {
    const value = args[key];
    return typeof value === "string" && value.trim() ? value : undefined;
}

function getNumberArg(args: ToolArgs, key: string): number {
    const value = args[key];
    return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function getBulkTransactions(args: ToolArgs): BulkTransactionInput[] {
    const value = args.transactions;
    return Array.isArray(value) ? value.filter((entry): entry is BulkTransactionInput => typeof entry === "object" && entry !== null) : [];
}

export async function executeFinanceTool(
    name: FinanceToolName,
    args: ToolArgs,
    fmtCur: CurrencyFormatter
): Promise<ToolExecutionResult> {
    switch (name) {
        case "create_invoice": {
            const newInvoice = await createInvoice({
                projectId: getStringArg(args, "projectId"),
                amount: getNumberArg(args, "amount"),
                date: getStringArg(args, "date"),
            } satisfies Omit<Invoice, "id" | "status" | "agencyId">);

            const invoiceStatus = getOptionalStringArg(args, "status");
            return {
                success: true,
                data: { id: newInvoice.id, amount: newInvoice.amount },
                summary: `Invoice created: ${fmtCur(getNumberArg(args, "amount"))}${invoiceStatus ? ` (${invoiceStatus})` : ""}`,
                rollbackData: [{
                    toolName: "create_invoice",
                    actionType: "create",
                    entityType: "invoice",
                    entityId: newInvoice.id,
                    beforeSnapshot: { agencyId: newInvoice.agencyId },
                    executedAt: new Date().toISOString(),
                }],
            };
        }

        case "bulk_add_transactions": {
            const transactions = getBulkTransactions(args);
            if (transactions.length === 0) {
                return { success: false, data: null, summary: "No transactions provided" };
            }

            const created: Array<Pick<Transaction, "id" | "category" | "amount" | "type">> = [];
            const failed: string[] = [];
            let totalIncome = 0;
            let totalExpense = 0;

            for (const transaction of transactions) {
                try {
                    const newTransaction = await createTransaction({
                        category: transaction.category,
                        type: transaction.type,
                        amount: transaction.amount,
                        date: transaction.date,
                        description: transaction.description || "",
                        projectId: transaction.projectId || undefined,
                        userId: transaction.userId || undefined,
                        taxType: transaction.taxType || undefined,
                        expenseType: transaction.expenseType || undefined,
                        status: transaction.status || "completed",
                    });
                    created.push({ id: newTransaction.id, category: transaction.category, amount: transaction.amount, type: transaction.type });
                    if (transaction.type === "income") totalIncome += transaction.amount;
                    else totalExpense += transaction.amount;
                } catch (error: unknown) {
                    const message = error instanceof Error ? error.message : "Unknown error";
                    failed.push(`${transaction.description || transaction.category}: ${message}`);
                }
            }

            return {
                success: true,
                data: {
                    created: created.length,
                    failed: failed.length,
                    failedDetails: failed,
                    totalIncome,
                    totalExpense,
                },
                summary: `✅ ${created.length}/${transactions.length} transactions imported` +
                    (failed.length > 0 ? ` (${failed.length} failed)` : "") +
                    ` | Income: ${fmtCur(totalIncome)} | Expenses: ${fmtCur(totalExpense)}`,
                rollbackData: created.length > 0 ? [{
                    toolName: "bulk_add_transactions",
                    actionType: "create",
                    entityType: "transaction",
                    entityId: created[0].id,
                    createdEntityIds: created.map((transaction) => transaction.id),
                    executedAt: new Date().toISOString(),
                }] : undefined,
            };
        }

        case "add_transaction": {
            const transaction = await createTransaction({
                category: getStringArg(args, "category") as Transaction["category"],
                type: getStringArg(args, "type") as Transaction["type"],
                amount: getNumberArg(args, "amount"),
                date: getOptionalStringArg(args, "date") || new Date().toISOString().split("T")[0],
                description: getStringArg(args, "description"),
                projectId: getOptionalStringArg(args, "projectId"),
                userId: getOptionalStringArg(args, "userId"),
                taxType: getOptionalStringArg(args, "taxType") as Transaction["taxType"] | undefined,
                expenseType: getOptionalStringArg(args, "expenseType") as Transaction["expenseType"] | undefined,
                status: (getOptionalStringArg(args, "status") as Transaction["status"] | undefined) || "completed",
            });

            let extraInfo = "";
            const userId = getOptionalStringArg(args, "userId");
            if (userId) {
                const user = await getUser(userId).catch(() => null);
                extraInfo += ` | Employee: ${user?.name || userId}`;
            }

            const amount = getNumberArg(args, "amount");
            const type = getStringArg(args, "type");
            const category = getStringArg(args, "category");
            return {
                success: true,
                data: { id: transaction.id, category: transaction.category, type: transaction.type, amount: transaction.amount },
                summary: `${type === "income" ? "Income" : "Expense"} of ${fmtCur(amount)} added (${category})${extraInfo}`,
                rollbackData: [{
                    toolName: "add_transaction",
                    actionType: "create",
                    entityType: "transaction",
                    entityId: transaction.id,
                    executedAt: new Date().toISOString(),
                }],
            };
        }
    }
}

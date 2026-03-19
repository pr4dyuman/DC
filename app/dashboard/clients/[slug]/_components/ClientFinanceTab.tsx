"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Invoice, Transaction } from "@/lib/types";
import { ArrowDownRight, ArrowUpRight, FileText, TrendingUp } from "lucide-react";

type ClientFinanceTabProps = {
    invoices: Invoice[];
    transactions: Transaction[];
    formatMoney: (value?: number | null) => string;
    formatDate: (value?: string | Date) => string;
};

export function ClientFinanceTab({
    invoices,
    transactions,
    formatMoney,
    formatDate,
}: ClientFinanceTabProps) {
    return (
        <div className="grid gap-6 md:grid-cols-2">
            <Card className="bg-card border-border">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <FileText className="h-5 w-5 text-yellow-500" />
                        Invoices
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <ScrollArea className="h-[400px] pr-4">
                        <div className="space-y-3">
                            {invoices.map((invoice) => (
                                <div key={invoice.id} className="flex items-center justify-between p-3 rounded-lg border border-border bg-muted/30 hover:bg-muted transition-colors">
                                    <div className="flex items-center gap-3">
                                        <div
                                            className={`h-2 w-2 rounded-full ${invoice.status === "Paid"
                                                ? "bg-green-500"
                                                : invoice.status === "Pending"
                                                    ? "bg-yellow-500"
                                                    : "bg-red-500"
                                                }`}
                                        />
                                        <div>
                                            <p className="text-sm font-medium text-foreground">#{invoice.id.slice(0, 8)}</p>
                                            <p className="text-xs text-muted-foreground">{formatDate(invoice.date)}</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-sm font-bold text-foreground">{formatMoney(invoice.amount)}</p>
                                        <Badge
                                            variant="secondary"
                                            className={`text-[10px] px-2 py-0.5 rounded-full ${invoice.status === "Paid"
                                                ? "bg-green-900/30 text-green-500"
                                                : invoice.status === "Pending"
                                                    ? "bg-yellow-900/30 text-yellow-500"
                                                    : "bg-red-900/30 text-red-500"
                                                }`}
                                        >
                                            {invoice.status}
                                        </Badge>
                                    </div>
                                </div>
                            ))}
                            {invoices.length === 0 && (
                                <div className="text-center py-8 text-sm text-muted-foreground">No invoices found.</div>
                            )}
                        </div>
                    </ScrollArea>
                </CardContent>
            </Card>

            <Card className="bg-card border-border">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <TrendingUp className="h-5 w-5 text-green-500" />
                        Transactions
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <ScrollArea className="h-[400px] pr-4">
                        <div className="space-y-3">
                            {transactions.map((transaction) => (
                                <div key={transaction.id} className="flex items-center justify-between p-3 rounded-lg border border-border bg-muted/30 hover:bg-muted transition-colors">
                                    <div className="flex items-center gap-3">
                                        <div
                                            className={`h-8 w-8 rounded-full flex items-center justify-center ${transaction.type?.toLowerCase() === "income"
                                                ? "bg-green-500/10 text-green-500"
                                                : "bg-red-500/10 text-red-500"
                                                }`}
                                        >
                                            {transaction.type?.toLowerCase() === "income"
                                                ? <ArrowDownRight className="h-4 w-4" />
                                                : <ArrowUpRight className="h-4 w-4" />}
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium text-foreground">{transaction.description}</p>
                                            <p className="text-xs text-muted-foreground">{formatDate(transaction.date)}</p>
                                        </div>
                                    </div>
                                    <p
                                        className={`text-sm font-bold ${transaction.type?.toLowerCase() === "income"
                                            ? "text-green-500"
                                            : "text-foreground"
                                            }`}
                                    >
                                        {transaction.type?.toLowerCase() === "income" ? "+" : "-"} {formatMoney(transaction.amount)}
                                    </p>
                                </div>
                            ))}
                            {transactions.length === 0 && (
                                <div className="text-center py-8 text-sm text-muted-foreground">No transactions found.</div>
                            )}
                        </div>
                    </ScrollArea>
                </CardContent>
            </Card>
        </div>
    );
}

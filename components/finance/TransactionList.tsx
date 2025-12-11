"use client";

import { format } from "date-fns";
import { Transaction } from "@/lib/db";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";

interface TransactionListProps {
    transactions: Transaction[];
    title?: string;
}

export function TransactionList({ transactions, title = "Recent Transactions" }: TransactionListProps) {
    const formatter = new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        maximumFractionDigits: 0
    });

    return (
        <Card className="col-span-3">
            <CardHeader>
                <CardTitle>{title}</CardTitle>
                <CardDescription>
                    You made {transactions.length} transactions this month.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <div className="space-y-8">
                    {transactions.length === 0 ? (
                        <div className="text-center text-zinc-500 py-8">No transactions found.</div>
                    ) : (
                        transactions.map((transaction) => (
                            <div key={transaction.id} className="flex items-center">
                                <div className={`h-9 w-9 rounded-full flex items-center justify-center border ${transaction.type === 'income'
                                    ? 'bg-emerald-100 border-emerald-200 dark:bg-emerald-900/20 dark:border-emerald-900'
                                    : 'bg-red-100 border-red-200 dark:bg-red-900/20 dark:border-red-900'
                                    }`}>
                                    {transaction.type === 'income' ? (
                                        <ArrowUpRight className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                                    ) : (
                                        <ArrowDownRight className="h-5 w-5 text-red-600 dark:text-red-400" />
                                    )}
                                </div>
                                <div className="ml-4 space-y-1 flex-1 min-w-0">
                                    <p className="text-sm font-medium leading-none truncate">{transaction.description}</p>
                                    <p className="text-xs text-muted-foreground">
                                        {transaction.category} • {format(new Date(transaction.date), "MMM d, yyyy")}
                                    </p>
                                </div>
                                <div className="ml-auto font-medium">
                                    <span className={transaction.type === 'income' ? 'text-emerald-600' : 'text-zinc-900 dark:text-zinc-100'}>
                                        {transaction.type === 'income' ? '+' : ''}{formatter.format(transaction.amount)}
                                    </span>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </CardContent>
        </Card>
    );
}

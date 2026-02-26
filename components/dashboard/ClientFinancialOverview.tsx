"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { IndianRupee, Wallet, CreditCard, DollarSign } from "lucide-react";
import { Transaction } from "@/lib/types";

interface ClientFinancialOverviewProps {
    transactions: Transaction[];
    totalSpent: number;
    totalBudget: number;
    pendingAmount: number;
}

export function ClientFinancialOverview({
    transactions,
    totalSpent,
    totalBudget,
    pendingAmount
}: ClientFinancialOverviewProps) {
    const recentTransactions = transactions.slice(0, 5);
    const remainingBudget = totalBudget - totalSpent;

    return (
        <Card className="col-span-1 md:col-span-2 transition-all duration-300 hover:shadow-md">
            <CardHeader>
                <CardTitle>Financial Overview</CardTitle>
            </CardHeader>
            <CardContent>
                {/* Summary Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                    <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/20">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-sm text-muted-foreground">Total Spent</span>
                            <Wallet className="h-4 w-4 text-blue-500" />
                        </div>
                        <div className="text-2xl font-bold text-blue-500">
                            ₹{totalSpent.toLocaleString()}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">Payments made</p>
                    </div>

                    <div className="p-4 rounded-lg bg-purple-500/10 border border-purple-500/20">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-sm text-muted-foreground">Total Budget</span>
                            <IndianRupee className="h-4 w-4 text-purple-500" />
                        </div>
                        <div className="text-2xl font-bold text-purple-500">
                            ₹{totalBudget.toLocaleString()}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">All projects</p>
                    </div>

                    <div className="p-4 rounded-lg bg-amber-500/10 border border-amber-500/20">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-sm text-muted-foreground">Pending Payments</span>
                            <CreditCard className="h-4 w-4 text-amber-500" />
                        </div>
                        <div className="text-2xl font-bold text-amber-500">
                            ₹{pendingAmount.toLocaleString()}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">Due invoices</p>
                    </div>
                </div>

                {/* Budget Utilization */}
                <div className="mb-6 p-4 rounded-lg bg-indigo-500/10 border border-indigo-500/20">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-muted-foreground">Budget Utilization</span>
                        <IndianRupee className="h-4 w-4 text-indigo-500" />
                    </div>
                    <div className="flex items-end gap-3">
                        <div className="text-3xl font-bold text-indigo-400">
                            {totalBudget > 0 ? Math.round((totalSpent / totalBudget) * 100) : 0}%
                        </div>
                        <div className="text-sm text-muted-foreground mb-1">
                            ₹{remainingBudget.toLocaleString()} remaining
                        </div>
                    </div>
                    {/* Progress Bar */}
                    <div className="mt-3 w-full bg-muted rounded-full h-2">
                        <div
                            className="bg-indigo-500 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${totalBudget > 0 ? Math.min((totalSpent / totalBudget) * 100, 100) : 0}%` }}
                        ></div>
                    </div>
                </div>

                {/* Recent Transactions */}
                <div>
                    <h4 className="text-sm font-semibold mb-3 text-muted-foreground">Recent Transactions</h4>
                    <ScrollArea className="h-[200px]">
                        <div className="space-y-3">
                            {recentTransactions.length === 0 ? (
                                <div className="text-center py-8 text-muted-foreground">
                                    No transactions yet
                                </div>
                            ) : (
                                recentTransactions.map((transaction) => {
                                    // From CLIENT perspective:
                                    // - "income" type = Payment TO agency = EXPENSE (red, minus)
                                    // - "expense" type = Refund FROM agency = INCOME (green, plus)
                                    const isExpense = transaction.type === 'income';
                                    const isIncome = transaction.type === 'expense';

                                    return (
                                        <div
                                            key={transaction.id}
                                            className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition"
                                        >
                                            <div className="flex-1">
                                                <p className="text-sm font-medium">{transaction.description}</p>
                                                <p className="text-xs text-muted-foreground mt-1">
                                                    {new Date(transaction.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })} • {transaction.category}
                                                </p>
                                            </div>
                                            <div className={`text-sm font-semibold ${isIncome ? 'text-emerald-500' : 'text-red-500'
                                                }`}>
                                                {isIncome ? '+' : '-'}₹{transaction.amount.toLocaleString()}
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </ScrollArea>
                </div>
            </CardContent>
        </Card>
    );
}

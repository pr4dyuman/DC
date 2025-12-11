"use client";

import { DollarSign, TrendingUp, TrendingDown, Wallet } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

interface ProjectFinanceSummaryProps {
    stats: {
        totalRevenue: number;
        totalExpenses: number;
        netProfit: number;
        pendingInvoicesAmount: number;
    };
    projectName: string;
}

export function ProjectFinanceSummary({ stats, projectName }: ProjectFinanceSummaryProps) {
    const totalVolume = stats.totalRevenue + stats.totalExpenses;
    const profitMargin = stats.totalRevenue > 0 ? (stats.netProfit / stats.totalRevenue) * 100 : 0;

    // Calculate percentages for the progress bar (Income vs Expense visualization)
    const incomePercent = totalVolume > 0 ? (stats.totalRevenue / totalVolume) * 100 : 0;

    return (
        <div className="space-y-6">
            <h3 className="text-xl font-semibold tracking-tight">
                Financial Overview for <span className="text-primary">{projectName}</span>
            </h3>

            <div className="grid gap-4 md:grid-cols-3">
                <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950/20 dark:to-green-900/10 border-green-200 dark:border-green-900">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-green-700 dark:text-green-400">Total Income</CardTitle>
                        <TrendingUp className="h-4 w-4 text-green-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-green-700 dark:text-green-300">
                            ₹{stats.totalRevenue.toLocaleString('en-IN')}
                        </div>
                        <p className="text-xs text-green-600/80 dark:text-green-500/80">Received from client</p>
                    </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-red-50 to-red-100 dark:from-red-950/20 dark:to-red-900/10 border-red-200 dark:border-red-900">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-red-700 dark:text-red-400">Total Expenses</CardTitle>
                        <TrendingDown className="h-4 w-4 text-red-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-red-700 dark:text-red-300">
                            ₹{stats.totalExpenses.toLocaleString('en-IN')}
                        </div>
                        <p className="text-xs text-red-600/80 dark:text-red-500/80">Spent on project</p>
                    </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/20 dark:to-blue-900/10 border-blue-200 dark:border-blue-900">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-blue-700 dark:text-blue-400">Net Value</CardTitle>
                        <Wallet className="h-4 w-4 text-blue-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-blue-700 dark:text-blue-300">
                            ₹{stats.netProfit.toLocaleString('en-IN')}
                        </div>
                        <p className="text-xs text-blue-600/80 dark:text-blue-500/80">
                            Margin: {profitMargin.toFixed(1)}%
                        </p>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle className="text-sm font-medium">Income vs Expense Ratio</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-2">
                        <div className="h-4 w-full rounded-full bg-red-100 dark:bg-red-950/30 overflow-hidden flex">
                            <div
                                className="h-full bg-green-500 transition-all duration-500 ease-in-out"
                                style={{ width: `${incomePercent}%` }}
                            />
                        </div>
                        <div className="flex justify-between text-xs text-muted-foreground">
                            <span>Income ({incomePercent.toFixed(0)}%)</span>
                            <span>Expenses ({(100 - incomePercent).toFixed(0)}%)</span>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

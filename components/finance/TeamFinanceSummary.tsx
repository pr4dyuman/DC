"use client";

import { DollarSign, TrendingUp, TrendingDown, Briefcase } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface TeamFinanceSummaryProps {
    stats: {
        totalSalary: number;
        totalInvestment: number;
    };
    userName: string;
    salary: number; // Monthly/Base salary
}

export function TeamFinanceSummary({ stats, userName, salary }: TeamFinanceSummaryProps) {
    const netBalance = stats.totalSalary - stats.totalInvestment; // Just a stat, maybe not "balance" in pure accounting terms for user
    const hasInvested = stats.totalInvestment > 0;

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-1">
                <h3 className="text-xl font-semibold tracking-tight">
                    Financial Profile: <span className="text-primary">{userName}</span>
                </h3>
                <p className="text-sm text-muted-foreground">
                    Base Salary: ₹{salary.toLocaleString('en-IN')}/mo
                </p>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
                <Card className="bg-gradient-to-br from-indigo-50 to-indigo-100 dark:from-indigo-950/20 dark:to-indigo-900/10 border-indigo-200 dark:border-indigo-900">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-indigo-700 dark:text-indigo-400">Total Earnings</CardTitle>
                        <Briefcase className="h-4 w-4 text-indigo-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-indigo-700 dark:text-indigo-300">
                            ₹{stats.totalSalary.toLocaleString('en-IN')}
                        </div>
                        <p className="text-xs text-indigo-600/80 dark:text-indigo-500/80">Total salary paid to date</p>
                    </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-950/20 dark:to-emerald-900/10 border-emerald-200 dark:border-emerald-900">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-emerald-700 dark:text-emerald-400">Total Investment</CardTitle>
                        <TrendingUp className="h-4 w-4 text-emerald-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-emerald-700 dark:text-emerald-300">
                            ₹{stats.totalInvestment.toLocaleString('en-IN')}
                        </div>
                        <p className="text-xs text-emerald-600/80 dark:text-emerald-500/80">Invested in company</p>
                    </CardContent>
                </Card>

                {hasInvested && (
                    <Card className="bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-950/20 dark:to-amber-900/10 border-amber-200 dark:border-amber-900">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium text-amber-700 dark:text-amber-400">Investment Impact</CardTitle>
                            <DollarSign className="h-4 w-4 text-amber-600" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-amber-700 dark:text-amber-300">
                                {((stats.totalInvestment / (stats.totalSalary || 1)) * 100).toFixed(1)}%
                            </div>
                            <p className="text-xs text-amber-600/80 dark:text-amber-500/80">
                                Re-invested of earnings
                            </p>
                        </CardContent>
                    </Card>
                )}
            </div>
        </div>
    );
}

"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingDown, TrendingUp, CreditCard, Banknote } from "lucide-react";
import { useCurrency } from "@/context/CurrencyContext";

interface StatsCardsProps {
    stats: {
        totalRevenue: number;
        totalExpenses: number;
        netProfit: number;
        pendingInvoicesAmount: number;
        pendingInvoicesCount?: number;
    };
}

export function StatsCards({ stats }: StatsCardsProps) {
    const { format: formatMoney } = useCurrency();

    const profitMargin = stats.totalRevenue > 0 ? ((stats.netProfit / stats.totalRevenue) * 100).toFixed(1) : '0';

    return (
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
            <Card className="hover:border-emerald-500/30 transition-all duration-300 hover:shadow-lg hover:shadow-emerald-500/5">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                    <div className="rounded-md bg-emerald-500/10 p-1.5">
                        <Banknote className="h-4 w-4 text-emerald-400" />
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{formatMoney(stats.totalRevenue)}</div>
                    <p className="text-xs text-muted-foreground">All completed income</p>
                </CardContent>
            </Card>
            <Card className="hover:border-rose-500/30 transition-all duration-300 hover:shadow-lg hover:shadow-rose-500/5">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
                    <div className="rounded-md bg-rose-500/10 p-1.5">
                        <TrendingDown className="h-4 w-4 text-rose-400" />
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{formatMoney(stats.totalExpenses)}</div>
                    <p className="text-xs text-muted-foreground">All completed expenses</p>
                </CardContent>
            </Card>
            <Card className="hover:border-sky-500/30 transition-all duration-300 hover:shadow-lg hover:shadow-sky-500/5">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Net Profit</CardTitle>
                    <div className="rounded-md bg-sky-500/10 p-1.5">
                        <TrendingUp className="h-4 w-4 text-sky-400" />
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{formatMoney(stats.netProfit)}</div>
                    <p className="text-xs text-muted-foreground">
                        {profitMargin}% margin
                    </p>
                </CardContent>
            </Card>
            <Card className="hover:border-amber-500/30 transition-all duration-300 hover:shadow-lg hover:shadow-amber-500/5">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Pending Invoices</CardTitle>
                    <div className="rounded-md bg-amber-500/10 p-1.5">
                        <CreditCard className="h-4 w-4 text-amber-400" />
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{formatMoney(stats.pendingInvoicesAmount)}</div>
                    <p className="text-xs text-muted-foreground">
                        {stats.pendingInvoicesCount !== undefined ? `${stats.pendingInvoicesCount} invoices pending` : 'Awaiting payment'}
                    </p>
                </CardContent>
            </Card>
        </div>
    );
}


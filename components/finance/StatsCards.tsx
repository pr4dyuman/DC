import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { IndianRupee, TrendingDown, TrendingUp, CreditCard } from "lucide-react";

interface StatsCardsProps {
    stats: {
        totalRevenue: number;
        totalExpenses: number;
        netProfit: number;
        pendingInvoicesAmount: number;
    };
}

export function StatsCards({ stats }: StatsCardsProps) {
    const formatter = new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        maximumFractionDigits: 0
    });

    return (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                    <IndianRupee className="h-4 w-4 text-emerald-500" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{formatter.format(stats.totalRevenue)}</div>
                    <p className="text-xs text-muted-foreground">+20.1% from last month</p>
                </CardContent>
            </Card>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
                    <TrendingDown className="h-4 w-4 text-red-500" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{formatter.format(stats.totalExpenses)}</div>
                    <p className="text-xs text-muted-foreground">+4% from last month</p>
                </CardContent>
            </Card>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Net Profit</CardTitle>
                    <TrendingUp className="h-4 w-4 text-sky-500" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{formatter.format(stats.netProfit)}</div>
                    <p className="text-xs text-muted-foreground">
                        {stats.netProfit >= 0 ? '+12% margin' : '-2% margin'}
                    </p>
                </CardContent>
            </Card>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Pending Invoices</CardTitle>
                    <CreditCard className="h-4 w-4 text-orange-500" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{formatter.format(stats.pendingInvoicesAmount)}</div>
                    <p className="text-xs text-muted-foreground">3 invoices pending</p>
                </CardContent>
            </Card>
        </div>
    );
}

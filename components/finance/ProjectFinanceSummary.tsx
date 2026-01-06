import { TrendingUp, TrendingDown, Wallet, Target, CalendarClock, CreditCard } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Project, Transaction } from "@/lib/types";

interface ProjectFinanceSummaryProps {
    project: Project;
    transactions: Transaction[];
}

export function ProjectFinanceSummary({ project, transactions }: ProjectFinanceSummaryProps) {
    if (!project || !transactions) return null;

    // 1. Calculate Actuals (From Transactions)
    const projectTransactions = transactions.filter(t => t.projectId === project.id);
    const totalPaid = projectTransactions
        .filter(t => t.type === 'income')
        .reduce((acc, curr) => acc + curr.amount, 0);

    const totalExpenses = projectTransactions
        .filter(t => t.type === 'expense')
        .reduce((acc, curr) => acc + curr.amount, 0);

    const netProfit = totalPaid - totalExpenses;
    const profitMargin = totalPaid > 0 ? (netProfit / totalPaid) * 100 : 0;

    // 2. Calculate Planned / Budget (From Service Configs)
    let totalFixedBudget = 0;
    let totalMonthlyRate = 0;

    if (project.serviceConfigs) {
        project.serviceConfigs.forEach(config => {
            const pc = config.paymentConfig;
            if (pc) {
                if (pc.type === 'installment' && pc.installmentAmount && pc.installments) {
                    totalFixedBudget += pc.installmentAmount * pc.installments;
                } else if (pc.type === 'monthly' && pc.monthlyAmount) {
                    totalMonthlyRate += pc.monthlyAmount;
                }
            }
        });
    }

    // 3. Logic for "Remaining" and "Credit"
    // We assume payments first clear the Fixed Budget, then apply to Monthly.
    const remainingFixedBalance = Math.max(0, totalFixedBudget - totalPaid);
    const excessPayment = Math.max(0, totalPaid - totalFixedBudget);

    // If only monthly exists (no fixed), then entire amount is "Excess" / Credit towards months
    // If both exist, excess applies to monthly.

    const monthsCovered = totalMonthlyRate > 0 ? (excessPayment / totalMonthlyRate) : 0;

    // Visual Helpers
    const totalVolume = totalPaid + totalExpenses;
    const incomePercent = totalVolume > 0 ? (totalPaid / totalVolume) * 100 : 0;

    // Progress for Fixed Budget
    const budgetProgress = totalFixedBudget > 0 ? Math.min(100, (totalPaid / totalFixedBudget) * 100) : 0;

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h3 className="text-xl font-semibold tracking-tight">
                    Financial Overview
                </h3>
                {totalMonthlyRate > 0 && (
                    <div className="flex items-center gap-2 px-3 py-1 bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300 rounded-full text-sm font-medium border border-blue-200 dark:border-blue-900">
                        <CalendarClock className="w-4 h-4" />
                        <span>Recurring: ₹{totalMonthlyRate.toLocaleString()}/mo</span>
                    </div>
                )}
            </div>

            <div className="grid gap-4 md:grid-cols-4">
                {/* 1. Total Deal Value (Fixed) */}
                <Card className="border-muted bg-muted/20">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Fixed Deal Value</CardTitle>
                        <Target className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {totalFixedBudget > 0 ? `₹${totalFixedBudget.toLocaleString('en-IN')}` : '—'}
                        </div>
                        <p className="text-xs text-muted-foreground">Total agreed fixed cost</p>
                    </CardContent>
                </Card>

                {/* 2. Total Paid (Real Income) */}
                <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950/20 dark:to-green-900/10 border-green-200 dark:border-green-900">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-green-700 dark:text-green-400">Total Received</CardTitle>
                        <TrendingUp className="h-4 w-4 text-green-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-green-700 dark:text-green-300">
                            ₹{totalPaid.toLocaleString('en-IN')}
                        </div>
                        <p className="text-xs text-green-600/80 dark:text-green-500/80">From client transactions</p>
                    </CardContent>
                </Card>

                {/* 3. Remaining / Due */}
                <Card className={`border-l-4 ${remainingFixedBalance > 0 ? 'border-amber-500' : 'border-emerald-500'}`}>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Remaining Fixed</CardTitle>
                        <CreditCard className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {remainingFixedBalance > 0 ? `₹${remainingFixedBalance.toLocaleString('en-IN')}` : 'Paid'}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            {remainingFixedBalance > 0
                                ? `${(100 - budgetProgress).toFixed(0)}% of fixed budget pending`
                                : 'Fixed budget fully paid'}
                        </p>
                    </CardContent>
                </Card>

                {/* 4. Net Value (Profit) */}
                <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/20 dark:to-blue-900/10 border-blue-200 dark:border-blue-900">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-blue-700 dark:text-blue-400">Net Profit</CardTitle>
                        <Wallet className="h-4 w-4 text-blue-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-blue-700 dark:text-blue-300">
                            ₹{netProfit.toLocaleString('en-IN')}
                        </div>
                        <p className="text-xs text-blue-600/80 dark:text-blue-500/80">
                            Margin: {profitMargin.toFixed(1)}%
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Monthly Coverage Notice if Applicable */}
            {(totalMonthlyRate > 0 && excessPayment > 0) && (
                <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900 rounded-lg p-4 flex items-start gap-3">
                    <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-full">
                        <CalendarClock className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                        <h4 className="font-semibold text-blue-900 dark:text-blue-300">Monthly Coverage</h4>
                        <p className="text-sm text-blue-700 dark:text-blue-400 mt-1">
                            The excess payment of <strong>₹{excessPayment.toLocaleString()}</strong> (after clearing fixed budget) covers approximately <strong>{monthsCovered.toFixed(1)} months</strong> of service.
                        </p>
                    </div>
                </div>
            )}

            {/* Progress Bar for Fixed Budget */}
            {totalFixedBudget > 0 && (
                <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                        <span>Fixed Budget Progress</span>
                        <span className="font-medium">{budgetProgress.toFixed(0)}%</span>
                    </div>
                    <Progress value={budgetProgress} className="h-2" />
                </div>
            )}

            <Card>
                <CardHeader>
                    <CardTitle className="text-sm font-medium">Expenditure Ratio</CardTitle>
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

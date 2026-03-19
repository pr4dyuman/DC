"use client";

import { useState } from "react";
import { CalendarClock, BarChart3, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Project, Transaction } from "@/lib/types";
import { useDateFormat } from "@/context/TimezoneContext";
import { useCurrency } from "@/context/CurrencyContext";
import { updateProject } from "@/lib/actions";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ProjectFinanceInsights } from "@/components/finance/ProjectFinanceInsights";
import { ProjectFinanceMetrics } from "@/components/finance/ProjectFinanceMetrics";

interface ProjectFinanceSummaryProps {
    project: Project;
    transactions: Transaction[];
}

export function ProjectFinanceSummary({ project, transactions }: ProjectFinanceSummaryProps) {
    const fmt = useDateFormat();
    const { format: formatMoney } = useCurrency();
    const router = useRouter();
    const [editingBudget, setEditingBudget] = useState(false);
    const [budgetInput, setBudgetInput] = useState("");
    const [saving, setSaving] = useState(false);

    if (!project || !transactions) return null;

    const projectTransactions = transactions.filter(t => t.projectId === project.id);
    const completedIncomeTransactions = projectTransactions.filter(t => t.type === 'income' && t.status === 'completed');
    const completedExpenseTransactions = projectTransactions.filter(t => t.type === 'expense' && t.status === 'completed');
    const totalPaid = completedIncomeTransactions
        .reduce((acc, curr) => acc + curr.amount, 0);

    const totalExpenses = completedExpenseTransactions
        .reduce((acc, curr) => acc + curr.amount, 0);

    const netProfit = totalPaid - totalExpenses;
    const profitMargin = totalPaid > 0 ? (netProfit / totalPaid) * 100 : 0;

    // Budget from service configs
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

    // Fallback: use project.budget if no service configs
    const displayBudget = totalFixedBudget > 0 ? totalFixedBudget : project.budget || 0;

    const remainingFixedBalance = Math.max(0, displayBudget - totalPaid);
    const excessPayment = Math.max(0, totalPaid - displayBudget);
    const monthsCovered = totalMonthlyRate > 0 ? (excessPayment / totalMonthlyRate) : 0;

    // Visual Helpers
    const totalVolume = totalPaid + totalExpenses;
    const incomePercent = totalVolume > 0 ? (totalPaid / totalVolume) * 100 : 50; // 50% neutral when no data
    const budgetProgress = displayBudget > 0 ? Math.min(100, (totalPaid / displayBudget) * 100) : 0;
    const hasData = totalVolume > 0;

    const handleSaveBudget = async () => {
        const val = parseFloat(budgetInput);
        if (isNaN(val) || val <= 0) return;
        setSaving(true);
        try {
            await updateProject(project.id, { budget: val });
            toast.success("Deal value updated");
            setEditingBudget(false);
            router.refresh();
        } catch {
            toast.error("Failed to update deal value");
        } finally {
            setSaving(false);
        }
    };

    const scrollToServicePayments = () => {
        const section = document.getElementById("project-service-payments");
        if (section) {
            section.scrollIntoView({ behavior: "smooth", block: "start" });
        } else {
            setBudgetInput('');
            setEditingBudget(true);
        }
    };

    // Recent transactions (last 3)
    const recentTxns = projectTransactions
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, 3);

    return (
        <div className="space-y-6">
            <ProjectFinanceMetrics
                totalMonthlyRate={totalMonthlyRate}
                formatMoney={formatMoney}
                editingBudget={editingBudget}
                totalFixedBudget={totalFixedBudget}
                displayBudget={displayBudget}
                budgetInput={budgetInput}
                saving={saving}
                totalPaid={totalPaid}
                completedIncomeCount={completedIncomeTransactions.length}
                remainingFixedBalance={remainingFixedBalance}
                budgetProgress={budgetProgress}
                netProfit={netProfit}
                profitMargin={profitMargin}
                onStartEditing={() => {
                    setBudgetInput(String(project.budget || ""));
                    setEditingBudget(true);
                }}
                onBudgetInputChange={setBudgetInput}
                onSaveBudget={handleSaveBudget}
                onCancelEditing={() => setEditingBudget(false)}
                onScrollToServicePayments={scrollToServicePayments}
            />

            <ProjectFinanceInsights
                totalMonthlyRate={totalMonthlyRate}
                excessPayment={excessPayment}
                monthsCovered={monthsCovered}
                displayBudget={displayBudget}
                budgetProgress={budgetProgress}
                totalPaid={totalPaid}
                hasData={hasData}
                incomePercent={incomePercent}
                totalExpenses={totalExpenses}
                recentTransactions={recentTxns}
                formatMoney={formatMoney}
                formatDateShort={fmt.dateShort}
            />

            {false && (
            <>
            {/* Monthly Coverage Notice */}
            {(totalMonthlyRate > 0 && excessPayment > 0) && (
                <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4 flex items-start gap-3">
                    <div className="p-2 bg-blue-500/20 rounded-full">
                        <CalendarClock className="w-5 h-5 text-blue-400" />
                    </div>
                    <div>
                        <h4 className="font-semibold text-blue-300">Monthly Coverage</h4>
                        <p className="text-sm text-blue-400 mt-1">
                            Excess payment of <strong>{formatMoney(excessPayment)}</strong> covers approximately <strong>{monthsCovered.toFixed(1)} months</strong> of recurring services.
                        </p>
                    </div>
                </div>
            )}

            {/* Budget Progress */}
            {displayBudget > 0 && (
                <Card className="border-border/50">
                    <CardContent className="pt-6">
                        <div className="space-y-3">
                            <div className="flex justify-between items-center">
                                <span className="text-sm font-medium">Collection Progress</span>
                                <span className="text-sm font-bold text-primary">{budgetProgress.toFixed(0)}%</span>
                            </div>
                            <Progress value={budgetProgress} className="h-2.5" />
                            <div className="flex justify-between text-xs text-muted-foreground">
                                <span>Collected: {formatMoney(totalPaid)}</span>
                                <span>Target: {formatMoney(displayBudget)}</span>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Expenditure Ratio — only show when there's actual data */}
            {hasData ? (
                <Card className="border-border/50">
                    <CardHeader className="pb-3">
                        <div className="flex items-center gap-2">
                            <BarChart3 className="w-4 h-4 text-muted-foreground" />
                            <CardTitle className="text-sm font-medium">Income vs Expenses</CardTitle>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-3">
                            <div className="h-5 w-full rounded-full bg-muted overflow-hidden flex">
                                <div
                                    className="h-full bg-emerald-500 transition-all duration-500 ease-in-out rounded-l-full"
                                    style={{ width: `${incomePercent}%` }}
                                />
                                <div
                                    className="h-full bg-red-500/80 transition-all duration-500 ease-in-out rounded-r-full"
                                    style={{ width: `${100 - incomePercent}%` }}
                                />
                            </div>
                            <div className="flex justify-between text-xs">
                                <span className="flex items-center gap-1.5">
                                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                                    <span className="text-muted-foreground">Income</span>
                                    <span className="font-semibold text-emerald-400">{formatMoney(totalPaid)}</span>
                                </span>
                                <span className="flex items-center gap-1.5">
                                    <span className="w-2.5 h-2.5 rounded-full bg-red-500/80" />
                                    <span className="text-muted-foreground">Expenses</span>
                                    <span className="font-semibold text-red-400">{formatMoney(totalExpenses)}</span>
                                </span>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            ) : (
                <Card className="border-dashed border-border/50">
                    <CardContent className="py-8">
                        <div className="text-center space-y-2">
                            <BarChart3 className="w-8 h-8 text-muted-foreground/40 mx-auto" />
                            <p className="text-sm text-muted-foreground">No transaction data yet</p>
                            <p className="text-xs text-muted-foreground/60">Income vs expense breakdown will appear once transactions are recorded.</p>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Recent Activity mini-list */}
            {recentTxns.length > 0 && (
                <Card className="border-border/50">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-medium">Recent Activity</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        {recentTxns.map(txn => (
                            <div key={txn.id} className="flex items-center gap-3">
                                <div className={`p-1.5 rounded-full ${txn.type === 'income' ? 'bg-emerald-500/10' : 'bg-red-500/10'}`}>
                                    {txn.type === 'income'
                                        ? <ArrowUpRight className="w-3.5 h-3.5 text-emerald-400" />
                                        : <ArrowDownRight className="w-3.5 h-3.5 text-red-400" />
                                    }
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium truncate">{txn.description}</p>
                                    <p className="text-xs text-muted-foreground">
                                        {fmt.dateShort(txn.date)}
                                    </p>
                                </div>
                                <span className={`text-sm font-semibold ${txn.type === 'income' ? 'text-emerald-400' : 'text-red-400'}`}>
                                    {txn.type === 'income' ? '+' : '-'}{formatMoney(txn.amount)}
                                </span>
                            </div>
                        ))}
                    </CardContent>
                </Card>
            )}
            </>
            )}
        </div>
    );
}

"use client";

import { useState } from "react";
import { TrendingUp, Wallet, Target, CalendarClock, CreditCard, BarChart3, ArrowUpRight, ArrowDownRight, Pencil, Check, X } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Project, Transaction } from "@/lib/types";
import { useDateFormat } from "@/context/TimezoneContext";
import { useCurrency } from "@/context/CurrencyContext";
import { updateProject } from "@/lib/actions";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

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
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                <h3 className="text-xl font-semibold tracking-tight">
                    Financial Overview
                </h3>
                <div className="flex items-center gap-2">
                    {totalMonthlyRate > 0 && (
                        <div className="flex items-center gap-2 px-3 py-1 bg-blue-500/10 text-blue-400 rounded-full text-sm font-medium border border-blue-500/20">
                            <CalendarClock className="w-4 h-4" />
                            <span>Recurring: {formatMoney(totalMonthlyRate)}/mo</span>
                        </div>
                    )}
                </div>
            </div>

            <div className="grid gap-4 md:grid-cols-4">
                {/* 1. Total Deal Value / Budget */}
                <Card className="bg-gradient-to-br from-purple-500/10 to-purple-900/5 border-purple-500/20">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-purple-400">Deal Value</CardTitle>
                        {!editingBudget && totalFixedBudget === 0 && (
                            <button
                                onClick={() => { setBudgetInput(String(project.budget || '')); setEditingBudget(true); }}
                                className="text-purple-400 hover:text-purple-300 transition-colors"
                                title={displayBudget > 0 ? "Edit deal value" : "Set deal value"}
                            >
                                {displayBudget > 0 ? <Pencil className="h-4 w-4" /> : <Target className="h-4 w-4" />}
                            </button>
                        )}
                        {!editingBudget && totalFixedBudget > 0 && (
                            <Target className="h-4 w-4 text-purple-400" />
                        )}
                    </CardHeader>
                    <CardContent>
                        {editingBudget ? (
                            <div className="space-y-2">
                                <Input
                                    type="number"
                                    min="1"
                                    value={budgetInput}
                                    onChange={(e) => setBudgetInput(e.target.value)}
                                    placeholder="Enter deal value..."
                                    className="h-8 bg-purple-500/10 border-purple-500/30 text-purple-200 placeholder:text-purple-400/50"
                                    autoFocus
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') handleSaveBudget();
                                        if (e.key === 'Escape') setEditingBudget(false);
                                    }}
                                />
                                <div className="flex gap-1.5">
                                    <Button
                                        size="sm"
                                        className="h-7 px-2 bg-purple-600 hover:bg-purple-700 text-xs"
                                        onClick={handleSaveBudget}
                                        disabled={saving || !budgetInput}
                                    >
                                        <Check className="h-3 w-3 mr-1" />
                                        {saving ? 'Saving...' : 'Save'}
                                    </Button>
                                    <Button
                                        size="sm"
                                        variant="ghost"
                                        className="h-7 px-2 text-xs text-purple-400 hover:text-purple-300"
                                        onClick={() => setEditingBudget(false)}
                                        disabled={saving}
                                    >
                                        <X className="h-3 w-3 mr-1" />
                                        Cancel
                                    </Button>
                                </div>
                            </div>
                        ) : (
                            <>
                                <div className="text-2xl font-bold text-purple-300">
                                    {displayBudget > 0 ? formatMoney(displayBudget) : 'Not Set'}
                                </div>
                                <p className="text-xs text-purple-400/70 mt-1">
                                    {totalFixedBudget > 0 ? 'From service configs' : displayBudget > 0 ? 'Project budget' : (
                                        <button
                                            onClick={scrollToServicePayments}
                                            className="underline hover:text-purple-300 transition-colors cursor-pointer"
                                        >
                                            Click to set deal value
                                        </button>
                                    )}
                                </p>
                            </>
                        )}
                    </CardContent>
                </Card>

                {/* 2. Total Received */}
                <Card className="bg-gradient-to-br from-emerald-500/10 to-emerald-900/5 border-emerald-500/20">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-emerald-400">Total Received</CardTitle>
                        <TrendingUp className="h-4 w-4 text-emerald-400" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-emerald-300">
                            {formatMoney(totalPaid)}
                        </div>
                        <p className="text-xs text-emerald-400/70 mt-1">
                            {completedIncomeTransactions.length} payment{completedIncomeTransactions.length !== 1 ? 's' : ''} received
                        </p>
                    </CardContent>
                </Card>

                {/* 3. Remaining */}
                <Card className={`bg-gradient-to-br ${remainingFixedBalance > 0 ? 'from-amber-500/10 to-amber-900/5 border-amber-500/20' : 'from-emerald-500/5 to-emerald-900/5 border-emerald-500/15'}`}>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className={`text-sm font-medium ${remainingFixedBalance > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>Remaining</CardTitle>
                        <CreditCard className={`h-4 w-4 ${remainingFixedBalance > 0 ? 'text-amber-400' : 'text-emerald-400'}`} />
                    </CardHeader>
                    <CardContent>
                        <div className={`text-2xl font-bold ${remainingFixedBalance > 0 ? 'text-amber-300' : 'text-emerald-300'}`}>
                            {displayBudget > 0
                                ? (remainingFixedBalance > 0 ? formatMoney(remainingFixedBalance) : '\u2713 Paid')
                                : '\u2014'
                            }
                        </div>
                        <p className={`text-xs mt-1 ${remainingFixedBalance > 0 ? 'text-amber-400/70' : 'text-emerald-400/70'}`}>
                            {displayBudget > 0
                                ? (remainingFixedBalance > 0 ? `${(100 - budgetProgress).toFixed(0)}% pending` : 'Fully collected')
                                : (
                                    <button
                                        onClick={scrollToServicePayments}
                                        className="underline hover:text-amber-300 transition-colors cursor-pointer"
                                    >
                                        Set deal value first
                                    </button>
                                )
                            }
                        </p>
                    </CardContent>
                </Card>

                {/* 4. Net Profit */}
                <Card className={`bg-gradient-to-br ${netProfit >= 0 ? 'from-blue-500/10 to-blue-900/5 border-blue-500/20' : 'from-red-500/10 to-red-900/5 border-red-500/20'}`}>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className={`text-sm font-medium ${netProfit >= 0 ? 'text-blue-400' : 'text-red-400'}`}>Net Profit</CardTitle>
                        <Wallet className={`h-4 w-4 ${netProfit >= 0 ? 'text-blue-400' : 'text-red-400'}`} />
                    </CardHeader>
                    <CardContent>
                        <div className={`text-2xl font-bold ${netProfit >= 0 ? 'text-blue-300' : 'text-red-300'}`}>
                            {formatMoney(netProfit)}
                        </div>
                        <p className={`text-xs mt-1 ${netProfit >= 0 ? 'text-blue-400/70' : 'text-red-400/70'}`}>
                            {totalPaid > 0 ? `Margin: ${profitMargin.toFixed(1)}%` : 'No income yet'}
                        </p>
                    </CardContent>
                </Card>
            </div>

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
        </div>
    );
}

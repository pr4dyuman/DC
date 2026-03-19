"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { CalendarClock, Check, CreditCard, Pencil, Target, TrendingUp, Wallet, X } from "lucide-react";

interface ProjectFinanceMetricsProps {
    totalMonthlyRate: number;
    formatMoney: (value: number) => string;
    editingBudget: boolean;
    totalFixedBudget: number;
    displayBudget: number;
    budgetInput: string;
    saving: boolean;
    totalPaid: number;
    completedIncomeCount: number;
    remainingFixedBalance: number;
    budgetProgress: number;
    netProfit: number;
    profitMargin: number;
    onStartEditing: () => void;
    onBudgetInputChange: (value: string) => void;
    onSaveBudget: () => void;
    onCancelEditing: () => void;
    onScrollToServicePayments: () => void;
}

export function ProjectFinanceMetrics({
    totalMonthlyRate,
    formatMoney,
    editingBudget,
    totalFixedBudget,
    displayBudget,
    budgetInput,
    saving,
    totalPaid,
    completedIncomeCount,
    remainingFixedBalance,
    budgetProgress,
    netProfit,
    profitMargin,
    onStartEditing,
    onBudgetInputChange,
    onSaveBudget,
    onCancelEditing,
    onScrollToServicePayments,
}: ProjectFinanceMetricsProps) {
    return (
        <>
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
                <Card className="bg-gradient-to-br from-purple-500/10 to-purple-900/5 border-purple-500/20">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-purple-400">Deal Value</CardTitle>
                        {!editingBudget && totalFixedBudget === 0 && (
                            <button
                                onClick={onStartEditing}
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
                                    onChange={(event) => onBudgetInputChange(event.target.value)}
                                    placeholder="Enter deal value..."
                                    className="h-8 bg-purple-500/10 border-purple-500/30 text-purple-200 placeholder:text-purple-400/50"
                                    autoFocus
                                    onKeyDown={(event) => {
                                        if (event.key === "Enter") onSaveBudget();
                                        if (event.key === "Escape") onCancelEditing();
                                    }}
                                />
                                <div className="flex gap-1.5">
                                    <Button
                                        size="sm"
                                        className="h-7 px-2 bg-purple-600 hover:bg-purple-700 text-xs"
                                        onClick={onSaveBudget}
                                        disabled={saving || !budgetInput}
                                    >
                                        <Check className="h-3 w-3 mr-1" />
                                        {saving ? "Saving..." : "Save"}
                                    </Button>
                                    <Button
                                        size="sm"
                                        variant="ghost"
                                        className="h-7 px-2 text-xs text-purple-400 hover:text-purple-300"
                                        onClick={onCancelEditing}
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
                                    {displayBudget > 0 ? formatMoney(displayBudget) : "Not Set"}
                                </div>
                                <p className="text-xs text-purple-400/70 mt-1">
                                    {totalFixedBudget > 0 ? "From service configs" : displayBudget > 0 ? "Project budget" : (
                                        <button
                                            onClick={onScrollToServicePayments}
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
                            {completedIncomeCount} payment{completedIncomeCount !== 1 ? "s" : ""} received
                        </p>
                    </CardContent>
                </Card>

                <Card className={`bg-gradient-to-br ${remainingFixedBalance > 0 ? "from-amber-500/10 to-amber-900/5 border-amber-500/20" : "from-emerald-500/5 to-emerald-900/5 border-emerald-500/15"}`}>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className={`text-sm font-medium ${remainingFixedBalance > 0 ? "text-amber-400" : "text-emerald-400"}`}>Remaining</CardTitle>
                        <CreditCard className={`h-4 w-4 ${remainingFixedBalance > 0 ? "text-amber-400" : "text-emerald-400"}`} />
                    </CardHeader>
                    <CardContent>
                        <div className={`text-2xl font-bold ${remainingFixedBalance > 0 ? "text-amber-300" : "text-emerald-300"}`}>
                            {displayBudget > 0
                                ? (remainingFixedBalance > 0 ? formatMoney(remainingFixedBalance) : "\u2713 Paid")
                                : "\u2014"
                            }
                        </div>
                        <p className={`text-xs mt-1 ${remainingFixedBalance > 0 ? "text-amber-400/70" : "text-emerald-400/70"}`}>
                            {displayBudget > 0
                                ? (remainingFixedBalance > 0 ? `${(100 - budgetProgress).toFixed(0)}% pending` : "Fully collected")
                                : (
                                    <button
                                        onClick={onScrollToServicePayments}
                                        className="underline hover:text-amber-300 transition-colors cursor-pointer"
                                    >
                                        Set deal value first
                                    </button>
                                )
                            }
                        </p>
                    </CardContent>
                </Card>

                <Card className={`bg-gradient-to-br ${netProfit >= 0 ? "from-blue-500/10 to-blue-900/5 border-blue-500/20" : "from-red-500/10 to-red-900/5 border-red-500/20"}`}>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className={`text-sm font-medium ${netProfit >= 0 ? "text-blue-400" : "text-red-400"}`}>Net Profit</CardTitle>
                        <Wallet className={`h-4 w-4 ${netProfit >= 0 ? "text-blue-400" : "text-red-400"}`} />
                    </CardHeader>
                    <CardContent>
                        <div className={`text-2xl font-bold ${netProfit >= 0 ? "text-blue-300" : "text-red-300"}`}>
                            {formatMoney(netProfit)}
                        </div>
                        <p className={`text-xs mt-1 ${netProfit >= 0 ? "text-blue-400/70" : "text-red-400/70"}`}>
                            {totalPaid > 0 ? `Margin: ${profitMargin.toFixed(1)}%` : "No income yet"}
                        </p>
                    </CardContent>
                </Card>
            </div>
        </>
    );
}

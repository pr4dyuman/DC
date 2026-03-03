
"use client";

import { Transaction } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { markTransactionAsPaid } from "@/lib/actions";
import { toast } from "sonner";
import { Check, Clock, AlertCircle } from "lucide-react";
import { useState } from "react";
import { useRouter } from "next/navigation";

interface PendingPayablesListProps {
    transactions: Transaction[];
}

export function PendingPayablesList({ transactions }: PendingPayablesListProps) {
    const [loadingId, setLoadingId] = useState<string | null>(null);
    const router = useRouter();

    if (transactions.length === 0) return null;

    const handleMarkPaid = async (id: string, amount: number, type: string) => {
        setLoadingId(id);
        try {
            await markTransactionAsPaid(id);
            toast.success(type === 'income' ? 'Marked as received' : 'Marked as paid');
            router.refresh();
        } catch (error) {
            console.error("Failed to mark as paid", error);
            toast.error("Failed to update transaction");
        } finally {
            setLoadingId(null);
        }
    };

    const totalPending = transactions.reduce((sum, t) => sum + t.amount, 0);

    return (
        <Card className="border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/20">
            <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                    <CardTitle className="text-amber-700 dark:text-amber-500 flex items-center gap-2">
                        <Clock className="h-5 w-5" /> Pending Transactions
                    </CardTitle>
                    <div className="text-right">
                        <p className="text-sm text-muted-foreground">Total Pending</p>
                        <div className="flex gap-3 justify-end">
                            {transactions.some(t => t.type === 'income') && (
                                <span className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                                    +₹{transactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0).toLocaleString()}
                                </span>
                            )}
                            {transactions.some(t => t.type === 'expense') && (
                                <span className="text-lg font-bold text-red-600 dark:text-red-400">
                                    -₹{transactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0).toLocaleString()}
                                </span>
                            )}
                        </div>
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    {transactions.length === 0 && (
                        <div className="text-center py-8 text-muted-foreground bg-muted/20 rounded-lg border border-dashed hover:bg-muted/30 transition-colors">
                            <p>No pending payables.</p>
                            <p className="text-xs mt-1">Add a transaction with "Pending" status to see it here.</p>
                        </div>
                    )}
                    {transactions.map((t) => (
                        <div key={t.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 bg-white dark:bg-black/20 rounded-lg border border-amber-100 dark:border-amber-900/50 shadow-sm gap-3">
                            <div className="flex items-start gap-3">
                                <div className="p-2 bg-amber-100 dark:bg-amber-900/50 rounded-full mt-1">
                                    <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                                </div>
                                <div>
                                    <p className="font-medium">{t.description}</p>
                                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                        <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${t.type === 'income'
                                            ? 'bg-emerald-100 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-200'
                                            : 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200'
                                            }`}>
                                            {t.type === 'income' ? 'Receivable' : 'Payable'}
                                        </span>
                                        <span className="capitalize">{t.category}</span>
                                        <span>•</span>
                                        <span>{t.date}</span>
                                        {t.userId && <span className="text-xs bg-amber-100 dark:bg-amber-900 text-amber-800 dark:text-amber-200 px-1.5 py-0.5 rounded">For Staff</span>}
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center justify-between sm:justify-end gap-4 w-full sm:w-auto">
                                <span className="font-bold text-lg">₹{t.amount.toLocaleString()}</span>
                                <Button
                                    size="sm"
                                    className="bg-amber-600 hover:bg-amber-700 text-white border-none"
                                    onClick={() => handleMarkPaid(t.id, t.amount, t.type)}
                                    disabled={loadingId === t.id}
                                >
                                    {loadingId === t.id ? (
                                        <span className="flex items-center"><Clock className="mr-1 h-3 w-3 animate-spin" /> Paying...</span>
                                    ) : (
                                        <span className="flex items-center"><Check className="mr-1 h-3 w-3" /> Mark Paid</span>
                                    )}
                                </Button>
                            </div>
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    );
}

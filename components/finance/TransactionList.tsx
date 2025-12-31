"use client";

import { useState } from "react";
import { format } from "date-fns";
import { Transaction, Project, User } from "@/lib/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { ArrowDownRight, ArrowUpRight, Search, MoreHorizontal, Trash, Loader2 } from "lucide-react";
import { deleteTransaction } from "@/lib/actions";
import { useRouter } from "next/navigation";
import { Label } from "@/components/ui/label";

interface TransactionListProps {
    transactions: Transaction[];
    title?: string;
    isAdmin?: boolean;
    projects?: Project[];
    users?: User[];
}

export function TransactionList({ transactions, title = "Recent Transactions", isAdmin = false, projects = [], users = [] }: TransactionListProps) {
    const router = useRouter();
    const [search, setSearch] = useState("");
    const [verifyOpen, setVerifyOpen] = useState(false);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const formatter = new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        maximumFractionDigits: 0
    });

    const filteredTransactions = transactions.filter(t => {
        const query = search.toLowerCase();
        // Resolve Names
        const projectName = t.projectId ? projects.find(p => p.id === t.projectId)?.name : "";
        const userName = t.userId ? users.find(u => u.id === t.userId)?.name : "";

        return (
            t.description.toLowerCase().includes(query) ||
            t.amount.toString().includes(query) ||
            t.category.toLowerCase().includes(query) ||
            (projectName && projectName.toLowerCase().includes(query)) ||
            (userName && userName.toLowerCase().includes(query))
        );
    });

    const handleDeleteClick = (id: string) => {
        setSelectedId(id);
        setVerifyOpen(true);
        setPassword("");
        setError(null);
    };

    const handleConfirmDelete = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedId) return;

        setLoading(true);
        setError(null);

        try {
            await deleteTransaction(selectedId, password);
            setVerifyOpen(false);
            router.refresh(); // Recalculate stats
        } catch (err: any) {
            setError(err.message || "Failed to delete transaction");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Card className="col-span-3">
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle>{title}</CardTitle>
                        <CardDescription>
                            You made {transactions.length} transactions this month.
                        </CardDescription>
                    </div>
                </div>
                <div className="mt-4 relative">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search transactions..."
                        className="pl-8"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
            </CardHeader>
            <CardContent>
                <div className="space-y-8">
                    {filteredTransactions.length === 0 ? (
                        <div className="text-center text-zinc-500 py-8">No transactions found.</div>
                    ) : (
                        filteredTransactions.map((transaction) => (
                            <div key={transaction.id} className="flex items-center group">
                                <div className={`h-9 w-9 rounded-full flex items-center justify-center border ${transaction.type === 'income'
                                    ? 'bg-emerald-100 border-emerald-200 dark:bg-emerald-900/20 dark:border-emerald-900'
                                    : 'bg-red-100 border-red-200 dark:bg-red-900/20 dark:border-red-900'
                                    }`}>
                                    {transaction.type === 'income' ? (
                                        <ArrowUpRight className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                                    ) : (
                                        <ArrowDownRight className="h-5 w-5 text-red-600 dark:text-red-400" />
                                    )}
                                </div>
                                <div className="ml-4 space-y-1 flex-1 min-w-0">
                                    <p className="text-sm font-medium leading-none truncate">{transaction.description}</p>
                                    <p className="text-xs text-muted-foreground">
                                        {(() => {
                                            const projectName = transaction.projectId ? projects.find(p => p.id === transaction.projectId)?.name : null;
                                            const userName = transaction.userId ? users.find(u => u.id === transaction.userId)?.name : null;

                                            if (projectName) return projectName;
                                            if (userName) return `${transaction.category} - ${userName}`;
                                            return transaction.category;
                                        })()} • {format(new Date(transaction.date), "MMM d, yyyy")}
                                    </p>
                                </div>
                                <div className="ml-auto font-medium flex items-center gap-4">
                                    <span className={transaction.type === 'income' ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}>
                                        {transaction.type === 'income' ? '+' : '-'}{formatter.format(transaction.amount)}
                                    </span>

                                    {isAdmin && (
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" size="icon" className="h-8 w-8 p-0">
                                                    <span className="sr-only">Open menu</span>
                                                    <MoreHorizontal className="h-4 w-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuItem
                                                    className="text-red-600 focus:text-red-600 cursor-pointer"
                                                    onClick={() => handleDeleteClick(transaction.id)}
                                                >
                                                    <Trash className="mr-2 h-4 w-4" />
                                                    Delete Transaction
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    )}
                                </div>
                            </div>
                        ))
                    )}
                </div>

                <Dialog open={verifyOpen} onOpenChange={setVerifyOpen}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Confirm Deletion</DialogTitle>
                            <DialogDescription>
                                To permanently delete this transaction, please enter your Admin password.
                                This action cannot be undone and will recalculate all financial stats.
                            </DialogDescription>
                        </DialogHeader>
                        <form onSubmit={handleConfirmDelete}>
                            <div className="grid gap-4 py-4">
                                <div className="grid gap-2">
                                    <Label htmlFor="password">Admin Password</Label>
                                    <Input
                                        id="password"
                                        type="password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        placeholder="Enter password..."
                                        required
                                    />
                                    {error && <p className="text-sm text-red-500">{error}</p>}
                                </div>
                            </div>
                            <DialogFooter>
                                <Button type="button" variant="outline" onClick={() => setVerifyOpen(false)}>
                                    Cancel
                                </Button>
                                <Button type="submit" variant="destructive" disabled={loading}>
                                    {loading ? (
                                        <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            Deleting...
                                        </>
                                    ) : (
                                        "Confirm Delete"
                                    )}
                                </Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>
            </CardContent>
        </Card>
    );
}

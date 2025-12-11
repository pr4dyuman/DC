"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createTransaction } from "@/lib/actions";
import { Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { TransactionCategory, TransactionType } from "@/lib/db";

interface AddTransactionModalProps {
    projectId?: string;
    users?: { id: string; name: string }[];
}

export function AddTransactionModal({ projectId, users = [] }: AddTransactionModalProps) {
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const [formData, setFormData] = useState({
        description: "",
        amount: "",
        type: "expense" as TransactionType,
        category: "Other" as TransactionCategory,
        date: new Date().toISOString().split('T')[0],
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            await createTransaction({
                description: formData.description,
                amount: parseFloat(formData.amount),
                type: formData.type,
                category: formData.category,
                date: formData.date,
                projectId: projectId, // Optional
            });
            setOpen(false);
            setFormData({
                description: "",
                amount: "",
                type: "expense",
                category: "Other",
                date: new Date().toISOString().split('T')[0],
            });
            router.refresh();
        } catch (error) {
            console.error("Failed to create transaction", error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button>
                    <Plus className="mr-2 h-4 w-4" />
                    Add Transaction
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <form onSubmit={handleSubmit}>
                    <DialogHeader>
                        <DialogTitle>Add Transaction</DialogTitle>
                        <DialogDescription>
                            Record a new income or expense.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="description" className="text-right">
                                {formData.category === "Investor" ? "Investor Name" : "Description"}
                            </Label>
                            <Input
                                id="description"
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                className="col-span-3"
                                required
                            />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="amount" className="text-right">
                                Amount
                            </Label>
                            <Input
                                id="amount"
                                type="number"
                                step="0.01"
                                value={formData.amount}
                                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                                className="col-span-3"
                                required
                            />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="type" className="text-right">
                                Type
                            </Label>
                            <Select
                                value={formData.type}
                                onValueChange={(value: TransactionType) => setFormData({ ...formData, type: value })}
                            >
                                <SelectTrigger className="col-span-3">
                                    <SelectValue placeholder="Select type" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="income">Income</SelectItem>
                                    <SelectItem value="expense">Expense</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="category" className="text-right">
                                Category
                            </Label>
                            <Select
                                value={formData.category}
                                onValueChange={(value: TransactionCategory) => {
                                    setFormData({ ...formData, category: value, description: "" }); // Reset description on category change
                                }}
                            >
                                <SelectTrigger className="col-span-3">
                                    <SelectValue placeholder="Select category" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Project">Project</SelectItem>
                                    <SelectItem value="Salary">Salary</SelectItem>
                                    <SelectItem value="Software">Software</SelectItem>
                                    <SelectItem value="Marketing">Marketing</SelectItem>
                                    <SelectItem value="Office">Office</SelectItem>
                                    <SelectItem value="Hosting">Hosting</SelectItem>
                                    <SelectItem value="Domain">Domain</SelectItem>
                                    <SelectItem value="Equipment">Equipment</SelectItem>
                                    <SelectItem value="Internal Transfer">Internal Transfer</SelectItem>
                                    <SelectItem value="Investor">Investor</SelectItem>
                                    <SelectItem value="Other">Other</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Internal Transfer: Select Team Member */}
                        {formData.category === "Internal Transfer" && (
                            <>
                                <div className="grid grid-cols-4 items-center gap-4">
                                    <Label htmlFor="direction" className="text-right">
                                        Direction
                                    </Label>
                                    <Select
                                        defaultValue="to"
                                        onValueChange={(val) => {
                                            const isTo = val === 'to';
                                            setFormData(prev => ({
                                                ...prev,
                                                type: isTo ? 'expense' : 'income',
                                                // Try to preserve member name if explicitly replacing
                                                description: prev.description.includes('Transfer')
                                                    ? prev.description.replace(isTo ? 'Transfer from' : 'Transfer to', isTo ? 'Transfer to' : 'Transfer from')
                                                    : prev.description
                                            }));
                                        }}
                                    >
                                        <SelectTrigger className="col-span-3">
                                            <SelectValue placeholder="Select direction" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="to">Transfer To Member (Expense)</SelectItem>
                                            <SelectItem value="from">Receive From Member (Income)</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="grid grid-cols-4 items-center gap-4">
                                    <Label htmlFor="member" className="text-right">
                                        Team Member
                                    </Label>
                                    <Select
                                        onValueChange={(userId) => {
                                            const user = users?.find(u => u.id === userId);
                                            if (user) {
                                                // Check current type to infer direction, or just read from description if we can? 
                                                // Actually, relying on formData.type is better than adding new state if we can avoid it.
                                                // If type is expense -> To. If income -> From.
                                                const isExpense = formData.type === 'expense';
                                                setFormData(prev => ({
                                                    ...prev,
                                                    description: `${isExpense ? 'Transfer to' : 'Transfer from'} ${user.name}`
                                                }));
                                            }
                                        }}
                                    >
                                        <SelectTrigger className="col-span-3">
                                            <SelectValue placeholder="Select member" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {users?.map(user => (
                                                <SelectItem key={user.id} value={user.id}>{user.name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </>
                        )}
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="date" className="text-right">
                                Date
                            </Label>
                            <Input
                                id="date"
                                type="date"
                                value={formData.date}
                                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                                className="col-span-3"
                                required
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button type="submit" disabled={loading}>
                            {loading ? "Saving..." : "Save Transaction"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}

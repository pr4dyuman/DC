"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createTransaction } from "@/lib/actions";
import { Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { TransactionCategory, TransactionType, User, Project } from "@/lib/db";

interface AddTransactionModalProps {
    projectId?: string; // Pre-selected project context if any
    users?: User[];
    projects?: Project[];
}

export function AddTransactionModal({ projectId, users = [], projects = [] }: AddTransactionModalProps) {
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    // Main Category State
    const [selectedCategory, setSelectedCategory] = useState<"Project" | "Employee" | "Internal Transfer" | "Other">("Project");

    // Form States
    const [formData, setFormData] = useState({
        description: "",
        amount: "",
        type: "expense" as TransactionType,
        date: new Date().toISOString().split('T')[0],
        projectId: projectId || "",
        memberId: "",
        // Employee Specific
        baseSalary: 0,
        bonus: "",
        deduction: "",
        // Internal Transfer Specific
        transferDirection: "to_member" as "to_member" | "from_member"
    });

    // Auto-calculate amount for Employee category
    useEffect(() => {
        if (selectedCategory === "Employee") {
            const base = formData.baseSalary || 0;
            const bonus = parseFloat(formData.bonus) || 0;
            const deduction = parseFloat(formData.deduction) || 0;
            const total = base + bonus - deduction;
            setFormData(prev => ({ ...prev, amount: total > 0 ? total.toString() : "0" }));
        }
    }, [formData.baseSalary, formData.bonus, formData.deduction, selectedCategory]);

    const handleCategoryChange = (val: string) => {
        const cat = val as any;
        setSelectedCategory(cat);
        // Reset defaults based on category
        if (cat === "Employee") {
            setFormData(prev => ({ ...prev, type: "expense", projectId: "", description: "" }));
        } else if (cat === "Internal Transfer") {
            setFormData(prev => ({ ...prev, type: "expense", projectId: "", transferDirection: "to_member", description: "" })); // Default to to_member (expense)
        } else if (cat === "Other") {
            setFormData(prev => ({ ...prev, type: "expense", projectId: "", description: "" }));
        } else {
            // Project
            setFormData(prev => ({ ...prev, projectId: projectId || "", description: "" }));
        }
    };

    const handleMemberChange = (memberId: string) => {
        const member = users.find(u => u.id === memberId);
        if (member) {
            setFormData(prev => ({
                ...prev,
                memberId,
                baseSalary: member.salary || 0,
                // Auto-generate description for Employee
                description: selectedCategory === "Employee"
                    ? `Salary - ${member.name} - ${new Date().toLocaleString('default', { month: 'long' })}`
                    : prev.description
            }));

            // For Internal Transfer, we update description dynamically too
            if (selectedCategory === "Internal Transfer") {
                updateTransferDescription(member.name, formData.transferDirection);
            }
        }
    };

    const updateTransferDescription = (memberName: string, direction: "to_member" | "from_member") => {
        const desc = direction === "to_member"
            ? `Transfer to ${memberName}`
            : `Transfer from ${memberName}`;
        setFormData(prev => ({ ...prev, description: desc }));
    }

    const handleDirectionChange = (val: "to_member" | "from_member") => {
        const member = users.find(u => u.id === formData.memberId);
        setFormData(prev => ({
            ...prev,
            transferDirection: val,
            type: val === "to_member" ? "expense" : "income"
        }));
        if (member) {
            updateTransferDescription(member.name, val);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            // STRICT VALIDATION
            if (selectedCategory === "Project" && !formData.projectId) {
                alert("Please select a Project.");
                setLoading(false);
                return;
            }
            if (selectedCategory === "Employee" && !formData.memberId) {
                alert("Please select an Employee.");
                setLoading(false);
                return;
            }
            if (selectedCategory === "Internal Transfer" && !formData.memberId) {
                alert("Please select an Employee for the transfer.");
                setLoading(false);
                return;
            }

            // Map UI Category to DB Category & Enforce Types
            let dbCategory: TransactionCategory = "Other";
            let dbType: TransactionType = formData.type; // Default to user selection

            if (selectedCategory === "Project") {
                dbCategory = "Project";
                // Type comes from user selection (Income/Expense)
            }
            else if (selectedCategory === "Employee") {
                dbCategory = "Salary";
                dbType = "expense"; // STRICT: Salary is always expense
            }
            else if (selectedCategory === "Internal Transfer") {
                dbCategory = "Internal Transfer";
                // Type is handled by handleDirectionChange (to_member=expense, from_member=income)
                // But let's double check logic here isn't overridden
                if (formData.transferDirection === "to_member") dbType = "expense";
                else dbType = "income";
            }
            else {
                dbCategory = "Other";
                dbType = "expense"; // STRICT: Other expenses are expenses
            }

            await createTransaction({
                description: formData.description,
                amount: parseFloat(formData.amount),
                type: dbType, // Use enforced type
                category: dbCategory,
                date: formData.date,
                projectId: formData.projectId || undefined,
                userId: formData.memberId || undefined
            });
            setOpen(false);
            // Reset form
            setFormData({
                description: "",
                amount: "",
                type: "expense",
                date: new Date().toISOString().split('T')[0],
                projectId: projectId || "",
                memberId: "",
                baseSalary: 0,
                bonus: "",
                deduction: "",
                transferDirection: "to_member"
            });
            router.refresh();
        } catch (error) {
            console.error("Failed to create transaction", error);
            alert("Failed to create transaction. Please check inputs.");
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
            <DialogContent className="sm:max-w-[600px]">
                <form onSubmit={handleSubmit}>
                    <DialogHeader>
                        <DialogTitle>Add Transaction</DialogTitle>
                        <DialogDescription>
                            Create a new transaction record.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="grid gap-4 py-4">
                        {/* 1. Category Selection */}
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label className="text-right">Category</Label>
                            <Select value={selectedCategory} onValueChange={handleCategoryChange}>
                                <SelectTrigger className="col-span-3">
                                    <SelectValue placeholder="Select Category" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Project">Project</SelectItem>
                                    <SelectItem value="Employee">Employee (Salary)</SelectItem>
                                    <SelectItem value="Internal Transfer">Internal Transfer</SelectItem>
                                    <SelectItem value="Other">Other Expenses</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {/* 2. Dynamic Fields based on Category */}

                        {/* --- PROJECT CATEGORY --- */}
                        {selectedCategory === "Project" && (
                            <>
                                <div className="grid grid-cols-4 items-center gap-4">
                                    <Label className="text-right">Project</Label>
                                    <Select
                                        value={formData.projectId}
                                        onValueChange={(val) => setFormData({ ...formData, projectId: val })}
                                    >
                                        <SelectTrigger className="col-span-3">
                                            <SelectValue placeholder="Select Project" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {projects.map(p => (
                                                <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="grid grid-cols-4 items-center gap-4">
                                    <Label className="text-right">Type</Label>
                                    <Select
                                        value={formData.type}
                                        onValueChange={(val: TransactionType) => setFormData({ ...formData, type: val })}
                                    >
                                        <SelectTrigger className="col-span-3">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="income">Income</SelectItem>
                                            <SelectItem value="expense">Expense</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="grid grid-cols-4 items-center gap-4">
                                    <Label className="text-right">Description</Label>
                                    <Input
                                        value={formData.description}
                                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                        className="col-span-3"
                                        placeholder="e.g. Milestone Payment"
                                        required
                                    />
                                </div>
                                <div className="grid grid-cols-4 items-center gap-4">
                                    <Label className="text-right">Amount</Label>
                                    <Input
                                        type="number"
                                        value={formData.amount}
                                        onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                                        className="col-span-3"
                                        required
                                    />
                                </div>
                            </>
                        )}

                        {/* --- EMPLOYEE CATEGORY --- */}
                        {selectedCategory === "Employee" && (
                            <>
                                <div className="grid grid-cols-4 items-center gap-4">
                                    <Label className="text-right">Employee</Label>
                                    <Select value={formData.memberId} onValueChange={handleMemberChange}>
                                        <SelectTrigger className="col-span-3">
                                            <SelectValue placeholder="Select Employee" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {users.map(u => (
                                                <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="grid grid-cols-4 items-center gap-4">
                                    <Label className="text-right">Base Salary</Label>
                                    <Input
                                        type="number"
                                        value={formData.baseSalary}
                                        disabled
                                        className="col-span-3 bg-muted"
                                    />
                                </div>
                                <div className="grid grid-cols-4 items-center gap-4">
                                    <Label className="text-right">Bonus (+)</Label>
                                    <Input
                                        type="number"
                                        value={formData.bonus}
                                        placeholder="0"
                                        onChange={(e) => setFormData({ ...formData, bonus: e.target.value })}
                                        className="col-span-3"
                                    />
                                </div>
                                <div className="grid grid-cols-4 items-center gap-4">
                                    <Label className="text-right">Deduction (-)</Label>
                                    <Input
                                        type="number"
                                        value={formData.deduction}
                                        placeholder="0"
                                        onChange={(e) => setFormData({ ...formData, deduction: e.target.value })}
                                        className="col-span-3"
                                    />
                                </div>
                                <div className="grid grid-cols-4 items-center gap-4">
                                    <Label className="text-right font-bold">Total Pay</Label>
                                    <Input
                                        type="number"
                                        value={formData.amount}
                                        disabled
                                        className="col-span-3 font-bold"
                                    />
                                </div>
                                <div className="grid grid-cols-4 items-center gap-4">
                                    <Label className="text-right">Description</Label>
                                    <Input
                                        value={formData.description}
                                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                        className="col-span-3"
                                        required
                                    />
                                </div>
                            </>
                        )}

                        {/* --- INTERNAL TRANSFER CATEGORY --- */}
                        {selectedCategory === "Internal Transfer" && (
                            <>
                                <div className="grid grid-cols-4 items-center gap-4">
                                    <Label className="text-right">Direction</Label>
                                    <Select
                                        value={formData.transferDirection}
                                        onValueChange={(val: any) => handleDirectionChange(val)}
                                    >
                                        <SelectTrigger className="col-span-3">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="to_member">Company to Employee (Expense)</SelectItem>
                                            <SelectItem value="from_member">Employee to Company (Income)</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="grid grid-cols-4 items-center gap-4">
                                    <Label className="text-right">Employee</Label>
                                    <Select value={formData.memberId} onValueChange={handleMemberChange}>
                                        <SelectTrigger className="col-span-3">
                                            <SelectValue placeholder="Select Employee" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {users.map(u => (
                                                <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="grid grid-cols-4 items-center gap-4">
                                    <Label className="text-right">Amount</Label>
                                    <Input
                                        type="number"
                                        value={formData.amount}
                                        onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                                        className="col-span-3"
                                        required
                                    />
                                </div>
                                <div className="grid grid-cols-4 items-center gap-4">
                                    <Label className="text-right">Description</Label>
                                    <Input
                                        value={formData.description}
                                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                        className="col-span-3"
                                        required
                                    />
                                </div>
                            </>
                        )}

                        {/* --- OTHER CATEGORY --- */}
                        {selectedCategory === "Other" && (
                            <>
                                <div className="grid grid-cols-4 items-center gap-4">
                                    <Label className="text-right">Description</Label>
                                    <Input
                                        value={formData.description}
                                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                        className="col-span-3"
                                        placeholder="e.g. Office Rent"
                                        required
                                    />
                                </div>
                                <div className="grid grid-cols-4 items-center gap-4">
                                    <Label className="text-right">Amount</Label>
                                    <Input
                                        type="number"
                                        value={formData.amount}
                                        onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                                        className="col-span-3"
                                        required
                                    />
                                </div>
                            </>
                        )}

                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label className="text-right">Date</Label>
                            <Input
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

"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createTransaction, getUsers } from "@/lib/actions";
import { Plus, Lock } from "lucide-react";
import { useRouter } from "next/navigation";
import { TransactionCategory, TransactionType, User, Project, TRANSACTION_CATEGORIES } from "@/lib/types";
import { toast } from "sonner";
import { DateTimeInput } from "@/components/ui/DateTimeInput";
import { useCurrency } from "@/context/CurrencyContext";

// Categories shown when inside a specific project
const PROJECT_SCOPED_CATEGORIES: TransactionCategory[] = ["Project", "Refund", "Freelancer", "Retainer"];

interface AddTransactionModalProps {
    projectId?: string;
    projectName?: string;
    users?: User[];
    projects?: Project[];
}

export function AddTransactionModal({ projectId, projectName, users = [], projects = [] }: AddTransactionModalProps) {
    const isProjectScoped = !!projectId;
    const { format: formatMoney } = useCurrency();
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [availableUsers, setAvailableUsers] = useState<User[]>(users);
    const router = useRouter();

    // Main Category State
    const [selectedCategory, setSelectedCategory] = useState<TransactionCategory>("Project");

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
        transferDirection: "to_member" as "to_member" | "from_member",
        status: "completed" as "completed" | "pending",
        // Tax Specific
        taxType: "" as string,
        // Reimbursement Specific
        expenseType: "" as string
    });

    // Validation Errors
    const [errors, setErrors] = useState<Record<string, string>>({});

    // Auto-calculate amount for Employee category
    useEffect(() => {
        if (selectedCategory === "Salary") {
            const base = formData.baseSalary || 0;
            const bonus = parseFloat(formData.bonus) || 0;
            const deduction = parseFloat(formData.deduction) || 0;
            const total = base + bonus - deduction;
            setFormData(prev => ({ ...prev, amount: total > 0 ? total.toString() : "0" }));
        }
    }, [formData.baseSalary, formData.bonus, formData.deduction, selectedCategory]);

    useEffect(() => {
        setAvailableUsers(users);
    }, [users]);

    useEffect(() => {
        if (!open || !isProjectScoped) return;

        let cancelled = false;
        getUsers()
            .then((loadedUsers) => {
                if (!cancelled) {
                    setAvailableUsers(loadedUsers);
                }
            })
            .catch((error) => {
                console.error("Failed to load users for project transaction modal", error);
            });

        return () => {
            cancelled = true;
        };
    }, [open, isProjectScoped]);

    const handleCategoryChange = (val: string) => {
        const cat = val as TransactionCategory;
        if (cat === selectedCategory) return;
        setSelectedCategory(cat);
        // In project-scoped mode, always keep the projectId locked
        const lockedProjectId = isProjectScoped ? projectId! : "";
        if (cat === "Salary") {
            setFormData(prev => ({ ...prev, type: "expense", projectId: lockedProjectId, description: "" }));
        } else if (cat === "Refund") {
            setFormData(prev => ({ ...prev, type: "expense", projectId: projectId || prev.projectId || "", description: "" }));
        } else if (cat === "Internal Transfer") {
            setFormData(prev => ({ ...prev, type: "expense", projectId: lockedProjectId, transferDirection: "to_member", description: "" }));
        } else if (cat === "Investor") {
            setFormData(prev => ({ ...prev, type: "income", projectId: lockedProjectId, description: "" }));
        } else if (cat === "Freelancer") {
            setFormData(prev => ({ ...prev, type: "expense", projectId: projectId || prev.projectId || "", description: "", memberId: "" }));
        } else if (cat === "Tax") {
            setFormData(prev => ({ ...prev, type: "expense", projectId: lockedProjectId, description: "", taxType: "" }));
        } else if (cat === "Reimbursement") {
            setFormData(prev => ({ ...prev, type: "expense", projectId: lockedProjectId, description: "", memberId: "", expenseType: "" }));
        } else if (cat === "Retainer") {
            const autoDesc = isProjectScoped && projectName
                ? `Monthly Retainer - ${projectName} - ${new Date().toLocaleString('default', { month: 'long', year: 'numeric' })}`
                : "";
            setFormData(prev => ({ ...prev, type: "income", projectId: projectId || prev.projectId || "", description: autoDesc }));
        } else if (cat === "Project") {
            setFormData(prev => ({ ...prev, projectId: projectId || prev.projectId || "", description: "" }));
        } else {
            setFormData(prev => ({ ...prev, type: "expense", projectId: lockedProjectId, description: "" }));
        }
    };

    const handleMemberChange = (memberId: string) => {
        const member = availableUsers.find(u => u.id === memberId);
        if (member) {
            setFormData(prev => ({
                ...prev,
                memberId,
                baseSalary: member.salary || 0,
                // Auto-generate description for Employee
                description: selectedCategory === "Salary"
                    ? `Salary Payment - ${new Date().toLocaleString('default', { month: 'long', year: 'numeric' })} - ${member.name}`
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
        const member = availableUsers.find(u => u.id === formData.memberId);
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
        setErrors({}); // Reset errors

        try {
            // STRICT VALIDATION
            const newErrors: Record<string, string> = {};
            let hasError = false;

            if (selectedCategory === "Project" && !formData.projectId) {
                newErrors.projectId = "Please select a Project.";
                hasError = true;
            }
            if (selectedCategory === "Refund" && !formData.projectId) {
                newErrors.projectId = "Refunds must be linked to a Project.";
                hasError = true;
            }
            if (selectedCategory === "Salary" && !formData.memberId) {
                newErrors.memberId = "Please select an Employee.";
                hasError = true;
            }
            if (selectedCategory === "Internal Transfer" && !formData.memberId) {
                newErrors.memberId = "Please select an Employee for the transfer.";
                hasError = true;
            }

            if (hasError) {
                setErrors(newErrors);
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
            else if (selectedCategory === "Refund") {
                dbCategory = "Refund";
                dbType = "expense"; // STRICT: Refunds are always expense
            }
            else if (selectedCategory === "Salary") {
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
            else if (selectedCategory === "Investor") {
                dbCategory = "Investor";
                dbType = "income"; // STRICT: Investors are always income
            }
            else if (selectedCategory === "Freelancer") {
                dbCategory = "Freelancer";
                dbType = "expense";
            }
            else if (selectedCategory === "Tax") {
                dbCategory = "Tax";
                dbType = "expense";
            }
            else if (selectedCategory === "Reimbursement") {
                dbCategory = "Reimbursement";
                dbType = "expense";
            }
            else if (selectedCategory === "Retainer") {
                dbCategory = "Retainer";
                dbType = "income";
            }
            else {
                dbCategory = selectedCategory;
                dbType = "expense";
            }

            await createTransaction({
                description: formData.description,
                amount: parseFloat(formData.amount),
                type: dbType, // Use enforced type
                category: dbCategory,
                date: formData.date,
                projectId: formData.projectId || undefined,

                userId: formData.memberId || undefined,
                status: formData.status,
                taxType: formData.taxType ? formData.taxType as any : undefined,
                expenseType: formData.expenseType ? formData.expenseType as any : undefined
            });
            toast.success("Transaction created successfully");
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

                transferDirection: "to_member",
                status: "completed",
                taxType: "",
                expenseType: ""
            });
            router.refresh();
        } catch (error) {
            console.error("Failed to create transaction", error);
            toast.error("Failed to create transaction");
            setErrors(prev => ({ ...prev, global: "Failed to create transaction. Please try again." }));
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
            <DialogContent className="max-w-[95vw] sm:max-w-[600px] max-h-[85dvh] overflow-y-auto">
                <form onSubmit={handleSubmit}>
                    <DialogHeader>
                        <DialogTitle>
                            {isProjectScoped ? `Add Transaction — ${projectName || 'Project'}` : 'Add Transaction'}
                        </DialogTitle>
                        <DialogDescription>
                            {isProjectScoped
                                ? 'Create a transaction for this project.'
                                : 'Create a new transaction record.'
                            }
                        </DialogDescription>
                    </DialogHeader>

                    <div className="grid gap-4 py-4">
                        {/* 1. Category Selection */}
                        <div className="grid grid-cols-1 sm:grid-cols-4 items-start sm:items-center gap-2 sm:gap-4">
                            <Label className="sm:text-right">Category</Label>
                            <Select value={selectedCategory} onValueChange={handleCategoryChange}>
                                <SelectTrigger className="col-span-3">
                                    <SelectValue placeholder="Select Category" />
                                </SelectTrigger>
                                <SelectContent>
                                    {(isProjectScoped ? PROJECT_SCOPED_CATEGORIES : TRANSACTION_CATEGORIES).map(cat => (
                                        <SelectItem key={cat} value={cat}>
                                            {cat === 'Salary' ? 'Salary (Employee)' : cat}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* 2. Dynamic Fields based on Category */}

                        {/* --- PROJECT CATEGORY --- */}
                        {selectedCategory === "Project" && (
                            <>
                                <div className="grid grid-cols-1 sm:grid-cols-4 items-start sm:items-center gap-2 sm:gap-4">
                                    <Label className="sm:text-right">Project</Label>
                                    {isProjectScoped ? (
                                        <div className="col-span-3 flex items-center gap-2 h-10 px-3 rounded-md border border-input bg-muted/50">
                                            <Lock className="w-3.5 h-3.5 text-muted-foreground" />
                                            <span className="text-sm">{projectName || 'Current Project'}</span>
                                        </div>
                                    ) : (
                                        <Select
                                            value={formData.projectId}
                                            onValueChange={(val) => setFormData(prev => ({ ...prev, projectId: val }))}
                                        >
                                            <SelectTrigger className="col-span-3">
                                                <SelectValue placeholder="Select Project" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="" disabled>Select Project</SelectItem>
                                                {projects.map(p => (
                                                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    )}
                                    {errors.projectId && <p className="col-span-4 text-right text-xs text-red-500">{errors.projectId}</p>}
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-4 items-start sm:items-center gap-2 sm:gap-4">
                                    <Label className="sm:text-right">Payment Direction</Label>
                                    <Select
                                        value={formData.type === "income" ? "client_to_company" : "company_to_client"}
                                        onValueChange={(val) => setFormData(prev => ({ ...prev, type: val === "client_to_company" ? "income" : "expense" }))}
                                    >
                                        <SelectTrigger className="col-span-3">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="client_to_company">Client to Company (Income)</SelectItem>
                                            <SelectItem value="company_to_client">Company to Client (Expense/Refund)</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-4 items-start sm:items-center gap-2 sm:gap-4">
                                    <Label className="sm:text-right">Description</Label>
                                    <Input
                                        value={formData.description}
                                        onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                                        className="col-span-3"
                                        placeholder="e.g. Milestone Payment"
                                        required
                                    />
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-4 items-start sm:items-center gap-2 sm:gap-4">
                                    <Label className="sm:text-right">Amount</Label>
                                    <Input
                                        type="number"
                                        min="1"
                                        value={formData.amount}
                                        onChange={(e) => setFormData(prev => ({ ...prev, amount: e.target.value }))}
                                        className="col-span-3"
                                        required
                                    />
                                </div>
                            </>
                        )}

                        {/* --- REFUND CATEGORY --- */}
                        {selectedCategory === "Refund" && (
                            <>
                                <div className="grid grid-cols-1 sm:grid-cols-4 items-start sm:items-center gap-2 sm:gap-4">
                                    <Label className="sm:text-right">Project</Label>
                                    {isProjectScoped ? (
                                        <div className="col-span-3 flex items-center gap-2 h-10 px-3 rounded-md border border-input bg-muted/50">
                                            <Lock className="w-3.5 h-3.5 text-muted-foreground" />
                                            <span className="text-sm">{projectName || 'Current Project'}</span>
                                        </div>
                                    ) : (
                                        <Select
                                            value={formData.projectId}
                                            onValueChange={(val) => setFormData(prev => ({ ...prev, projectId: val }))}
                                        >
                                            <SelectTrigger className="col-span-3">
                                                <SelectValue placeholder="Select Project" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="" disabled>Select Project</SelectItem>
                                                {projects.map(p => (
                                                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    )}
                                    {errors.projectId && <p className="col-span-4 text-right text-xs text-red-500">{errors.projectId}</p>}
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-4 items-start sm:items-center gap-2 sm:gap-4">
                                    <Label className="sm:text-right">Refund Reason</Label>
                                    <Input
                                        value={formData.description}
                                        onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                                        className="col-span-3"
                                        placeholder="e.g. Partial refund for delayed delivery"
                                        required
                                    />
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-4 items-start sm:items-center gap-2 sm:gap-4">
                                    <Label className="sm:text-right">Refund Amount</Label>
                                    <Input
                                        type="number"
                                        min="1"
                                        value={formData.amount}
                                        onChange={(e) => setFormData(prev => ({ ...prev, amount: e.target.value }))}
                                        className="col-span-3"
                                        required
                                    />
                                </div>
                                <div className="text-sm text-muted-foreground bg-amber-50 dark:bg-amber-950 p-3 rounded-md border border-amber-200 dark:border-amber-800">
                                    <p className="font-medium text-amber-900 dark:text-amber-100">Note:</p>
                                    <p className="text-amber-800 dark:text-amber-200">This refund will reduce total revenue on admin dashboard and reduce client's total spent.</p>
                                </div>
                            </>
                        )}

                        {/* --- EMPLOYEE CATEGORY --- */}
                        {selectedCategory === "Salary" && (
                            <>
                                <div className="grid grid-cols-1 sm:grid-cols-4 items-start sm:items-center gap-2 sm:gap-4">
                                    <Label className="sm:text-right">Employee</Label>
                                    <Select value={formData.memberId} onValueChange={handleMemberChange}>
                                        <SelectTrigger className="col-span-3">
                                            <SelectValue placeholder="Select Employee" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="" disabled>Select Employee</SelectItem>
                                            {availableUsers.map(u => (
                                                <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    {errors.memberId && <p className="col-span-4 text-right text-xs text-red-500">{errors.memberId}</p>}
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-4 items-start sm:items-center gap-2 sm:gap-4">
                                    <Label className="sm:text-right">Base Salary</Label>
                                    <Input
                                        type="number"
                                        value={formData.baseSalary}
                                        disabled
                                        className="col-span-3 bg-muted"
                                    />
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-4 items-start sm:items-center gap-2 sm:gap-4">
                                    <Label className="sm:text-right">Bonus (+)</Label>
                                    <Input
                                        type="number"
                                        value={formData.bonus}
                                        placeholder="0"
                                        onChange={(e) => setFormData(prev => ({ ...prev, bonus: e.target.value }))}
                                        className="col-span-3"
                                    />
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-4 items-start sm:items-center gap-2 sm:gap-4">
                                    <Label className="sm:text-right">Deduction (-)</Label>
                                    <Input
                                        type="number"
                                        value={formData.deduction}
                                        placeholder="0"
                                        onChange={(e) => setFormData(prev => ({ ...prev, deduction: e.target.value }))}
                                        className="col-span-3"
                                    />
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-4 items-start sm:items-center gap-2 sm:gap-4">
                                    <Label className="sm:text-right font-bold">Total Pay</Label>
                                    <Input
                                        type="number"
                                        min="1"
                                        value={formData.amount}
                                        disabled
                                        className="col-span-3 font-bold"
                                    />
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-4 items-start sm:items-center gap-2 sm:gap-4">
                                    <Label className="sm:text-right">Description</Label>
                                    <Input
                                        value={formData.description}
                                        onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                                        className="col-span-3"
                                        required
                                    />
                                </div>
                            </>
                        )}

                        {/* --- INTERNAL TRANSFER CATEGORY --- */}
                        {selectedCategory === "Internal Transfer" && (
                            <>
                                <div className="grid grid-cols-1 sm:grid-cols-4 items-start sm:items-center gap-2 sm:gap-4">
                                    <Label className="sm:text-right">Direction</Label>
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
                                <div className="grid grid-cols-1 sm:grid-cols-4 items-start sm:items-center gap-2 sm:gap-4">
                                    <Label className="sm:text-right">Employee</Label>
                                    <Select value={formData.memberId} onValueChange={handleMemberChange}>
                                        <SelectTrigger className="col-span-3">
                                            <SelectValue placeholder="Select Employee" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="" disabled>Select Employee</SelectItem>
                                            {availableUsers.map(u => (
                                                <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    {errors.memberId && <p className="col-span-4 text-right text-xs text-red-500">{errors.memberId}</p>}
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-4 items-start sm:items-center gap-2 sm:gap-4">
                                    <Label className="sm:text-right">Amount</Label>
                                    <Input
                                        type="number"
                                        min="1"
                                        value={formData.amount}
                                        onChange={(e) => setFormData(prev => ({ ...prev, amount: e.target.value }))}
                                        className="col-span-3"
                                        required
                                    />
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-4 items-start sm:items-center gap-2 sm:gap-4">
                                    <Label className="sm:text-right">Description</Label>
                                    <Input
                                        value={formData.description}
                                        onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                                        className="col-span-3"
                                        required
                                    />
                                </div>
                            </>
                        )}
                        {/* --- INVESTOR CATEGORY --- */}
                        {selectedCategory === "Investor" && (
                            <>
                                <div className="grid grid-cols-1 sm:grid-cols-4 items-start sm:items-center gap-2 sm:gap-4">
                                    <Label className="sm:text-right">Investor / Source</Label>
                                    <Input
                                        value={formData.description}
                                        onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                                        className="col-span-3"
                                        placeholder="e.g. Investor Name or Funding Source"
                                        required
                                    />
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-4 items-start sm:items-center gap-2 sm:gap-4">
                                    <Label className="sm:text-right">Amount</Label>
                                    <Input
                                        type="number"
                                        min="1"
                                        value={formData.amount}
                                        onChange={(e) => setFormData(prev => ({ ...prev, amount: e.target.value }))}
                                        className="col-span-3"
                                        required
                                    />
                                </div>
                                <div className="text-sm text-muted-foreground bg-emerald-50 dark:bg-emerald-950 p-3 rounded-md border border-emerald-200 dark:border-emerald-800">
                                    <p className="font-medium text-emerald-900 dark:text-emerald-100">Note:</p>
                                    <p className="text-emerald-800 dark:text-emerald-200">This will be recorded as Income (investment into the company).</p>
                                </div>
                            </>
                        )}

                        {/* --- FREELANCER CATEGORY --- */}
                        {selectedCategory === "Freelancer" && (() => {
                            const freelancers = availableUsers.filter(u => u.employmentType === 'Freelancer');
                            return (
                                <>
                                    <div className="grid grid-cols-1 sm:grid-cols-4 items-start sm:items-center gap-2 sm:gap-4">
                                        <Label className="sm:text-right">Freelancer</Label>
                                        {freelancers.length > 0 ? (
                                            <Select
                                                value={formData.memberId || "none"}
                                                onValueChange={(val) => {
                                                    if (val === "none") {
                                                        setFormData(prev => ({ ...prev, memberId: "", description: "", amount: "" }));
                                                        return;
                                                    }
                                                    const member = freelancers.find(u => u.id === val);
                                                    if (member) {
                                                        setFormData(prev => ({
                                                            ...prev,
                                                            memberId: member.id,
                                                            description: `Freelancer Payment - ${member.name}`,
                                                            amount: member.salary ? member.salary.toString() : prev.amount,
                                                        }));
                                                    }
                                                }}
                                            >
                                                <SelectTrigger className="col-span-3">
                                                    <SelectValue placeholder="Select Freelancer" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="none">Select Freelancer</SelectItem>
                                                    {freelancers.map(u => (
                                                        <SelectItem key={u.id} value={u.id}>
                                                            {u.name} {u.jobTitle ? `(${u.jobTitle})` : ''} {u.salary ? `- ${formatMoney(u.salary)}` : ''}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        ) : (
                                            <div className="col-span-3 text-sm text-muted-foreground bg-muted p-3 rounded-md">
                                                No freelancers found. Add team members with &quot;Freelancer&quot; employment type in Settings → Team.
                                            </div>
                                        )}
                                    </div>
                                    {formData.memberId && (
                                        <>
                                            <div className="grid grid-cols-1 sm:grid-cols-4 items-start sm:items-center gap-2 sm:gap-4">
                                                <Label className="sm:text-right">Description</Label>
                                                <Input
                                                    value={formData.description}
                                                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                                                    className="col-span-3"
                                                    placeholder="e.g. Freelancer Payment - Web Development"
                                                    required
                                                />
                                            </div>
                                            {(projects.length > 0 && !isProjectScoped) && (
                                                <div className="grid grid-cols-1 sm:grid-cols-4 items-start sm:items-center gap-2 sm:gap-4">
                                                    <Label className="sm:text-right">Project <span className="text-xs text-muted-foreground">(Optional)</span></Label>
                                                    <Select value={formData.projectId || "none"} onValueChange={(val) => setFormData(prev => ({ ...prev, projectId: val === "none" ? "" : val }))}>
                                                        <SelectTrigger className="col-span-3">
                                                            <SelectValue placeholder="Link to Project (Optional)" />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="none">No Project</SelectItem>
                                                            {projects.map(p => (
                                                                <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                            )}
                                            {isProjectScoped && (
                                                <div className="grid grid-cols-1 sm:grid-cols-4 items-start sm:items-center gap-2 sm:gap-4">
                                                    <Label className="sm:text-right">Project</Label>
                                                    <div className="col-span-3 flex items-center gap-2 h-10 px-3 rounded-md border border-input bg-muted/50">
                                                        <Lock className="w-3.5 h-3.5 text-muted-foreground" />
                                                        <span className="text-sm">{projectName || 'Current Project'}</span>
                                                    </div>
                                                </div>
                                            )}
                                            <div className="grid grid-cols-1 sm:grid-cols-4 items-start sm:items-center gap-2 sm:gap-4">
                                                <Label className="sm:text-right">Amount</Label>
                                                <Input
                                                    type="number"
                                                    min="1"
                                                    value={formData.amount}
                                                    onChange={(e) => setFormData(prev => ({ ...prev, amount: e.target.value }))}
                                                    className="col-span-3"
                                                    required
                                                />
                                            </div>
                                        </>
                                    )}
                                    <div className="text-sm text-muted-foreground bg-orange-50 dark:bg-orange-950 p-3 rounded-md border border-orange-200 dark:border-orange-800">
                                        <p className="text-orange-800 dark:text-orange-200">Freelancer/Contractor payment — recorded as Expense.</p>
                                    </div>
                                </>
                            );
                        })()}
                        {/* --- TAX CATEGORY --- */}
                        {selectedCategory === "Tax" && (
                            <>
                                <div className="grid grid-cols-1 sm:grid-cols-4 items-start sm:items-center gap-2 sm:gap-4">
                                    <Label className="sm:text-right">Tax Type</Label>
                                    <Select
                                        value={formData.taxType || "none"}
                                        onValueChange={(val) => {
                                            const taxLabel = val === "none" ? "" : val;
                                            setFormData(prev => ({
                                                ...prev,
                                                taxType: taxLabel,
                                                description: taxLabel ? `${taxLabel} Payment - ${new Date().toLocaleString('default', { month: 'long', year: 'numeric' })}` : ""
                                            }));
                                        }}
                                    >
                                        <SelectTrigger className="col-span-3">
                                            <SelectValue placeholder="Select Tax Type" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="none">Select Tax Type</SelectItem>
                                            <SelectItem value="GST">GST</SelectItem>
                                            <SelectItem value="TDS">TDS</SelectItem>
                                            <SelectItem value="Income Tax">Income Tax</SelectItem>
                                            <SelectItem value="Professional Tax">Professional Tax</SelectItem>
                                            <SelectItem value="Other">Other Tax</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                {formData.taxType && (
                                    <>
                                        <div className="grid grid-cols-1 sm:grid-cols-4 items-start sm:items-center gap-2 sm:gap-4">
                                            <Label className="sm:text-right">Description</Label>
                                            <Input
                                                value={formData.description}
                                                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                                                className="col-span-3"
                                                placeholder="e.g. GST Payment - Q3 2026"
                                                required
                                            />
                                        </div>
                                        <div className="grid grid-cols-1 sm:grid-cols-4 items-start sm:items-center gap-2 sm:gap-4">
                                            <Label className="sm:text-right">Amount</Label>
                                            <Input
                                                type="number"
                                                min="1"
                                                value={formData.amount}
                                                onChange={(e) => setFormData(prev => ({ ...prev, amount: e.target.value }))}
                                                className="col-span-3"
                                                required
                                            />
                                        </div>
                                    </>
                                )}
                                <div className="text-sm text-muted-foreground bg-red-50 dark:bg-red-950 p-3 rounded-md border border-red-200 dark:border-red-800">
                                    <p className="text-red-800 dark:text-red-200">Tax payment — recorded as Expense.</p>
                                </div>
                            </>
                        )}

                        {/* --- REIMBURSEMENT CATEGORY --- */}
                        {selectedCategory === "Reimbursement" && (() => {
                            const employees = availableUsers.filter(u => u.role !== 'client');
                            return (
                                <>
                                    <div className="grid grid-cols-1 sm:grid-cols-4 items-start sm:items-center gap-2 sm:gap-4">
                                        <Label className="sm:text-right">Employee</Label>
                                        <Select
                                            value={formData.memberId || "none"}
                                            onValueChange={(val) => {
                                                if (val === "none") {
                                                    setFormData(prev => ({ ...prev, memberId: "", description: "" }));
                                                    return;
                                                }
                                                const member = employees.find(u => u.id === val);
                                                if (member) {
                                                    const expLabel = formData.expenseType || "Expense";
                                                    setFormData(prev => ({
                                                        ...prev,
                                                        memberId: member.id,
                                                        description: `${expLabel} Reimbursement - ${member.name}`
                                                    }));
                                                }
                                            }}
                                        >
                                            <SelectTrigger className="col-span-3">
                                                <SelectValue placeholder="Select Employee" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="none">Select Employee</SelectItem>
                                                {employees.map(u => (
                                                    <SelectItem key={u.id} value={u.id}>
                                                        {u.name} {u.jobTitle ? `(${u.jobTitle})` : ''}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    {formData.memberId && (
                                        <>
                                            <div className="grid grid-cols-1 sm:grid-cols-4 items-start sm:items-center gap-2 sm:gap-4">
                                                <Label className="sm:text-right">Expense Type</Label>
                                                <Select
                                                    value={formData.expenseType || "none"}
                                                    onValueChange={(val) => {
                                                        const expLabel = val === "none" ? "" : val;
                                                        const member = employees.find(u => u.id === formData.memberId);
                                                        setFormData(prev => ({
                                                            ...prev,
                                                            expenseType: expLabel,
                                                            description: expLabel && member ? `${expLabel} Reimbursement - ${member.name}` : prev.description
                                                        }));
                                                    }}
                                                >
                                                    <SelectTrigger className="col-span-3">
                                                        <SelectValue placeholder="Select Expense Type" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="none">Select Expense Type</SelectItem>
                                                        <SelectItem value="Travel">Travel</SelectItem>
                                                        <SelectItem value="Meals">Meals</SelectItem>
                                                        <SelectItem value="Client Meeting">Client Meeting</SelectItem>
                                                        <SelectItem value="Equipment">Equipment</SelectItem>
                                                        <SelectItem value="Other">Other</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                            <div className="grid grid-cols-1 sm:grid-cols-4 items-start sm:items-center gap-2 sm:gap-4">
                                                <Label className="sm:text-right">Description</Label>
                                                <Input
                                                    value={formData.description}
                                                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                                                    className="col-span-3"
                                                    placeholder="e.g. Travel Reimbursement - Client Visit"
                                                    required
                                                />
                                            </div>
                                            {projects.length > 0 && (
                                                <div className="grid grid-cols-1 sm:grid-cols-4 items-start sm:items-center gap-2 sm:gap-4">
                                                    <Label className="sm:text-right">Project <span className="text-xs text-muted-foreground">(Optional)</span></Label>
                                                    <Select value={formData.projectId || "none"} onValueChange={(val) => setFormData(prev => ({ ...prev, projectId: val === "none" ? "" : val }))}>
                                                        <SelectTrigger className="col-span-3">
                                                            <SelectValue placeholder="Link to Project (Optional)" />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="none">No Project</SelectItem>
                                                            {projects.map(p => (
                                                                <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                            )}
                                            <div className="grid grid-cols-1 sm:grid-cols-4 items-start sm:items-center gap-2 sm:gap-4">
                                                <Label className="sm:text-right">Amount</Label>
                                                <Input
                                                    type="number"
                                                    min="1"
                                                    value={formData.amount}
                                                    onChange={(e) => setFormData(prev => ({ ...prev, amount: e.target.value }))}
                                                    className="col-span-3"
                                                    required
                                                />
                                            </div>
                                        </>
                                    )}
                                    <div className="text-sm text-muted-foreground bg-violet-50 dark:bg-violet-950 p-3 rounded-md border border-violet-200 dark:border-violet-800">
                                        <p className="text-violet-800 dark:text-violet-200">Employee reimbursement — recorded as Expense.</p>
                                    </div>
                                </>
                            );
                        })()}

                        {/* --- RETAINER CATEGORY --- */}
                        {selectedCategory === "Retainer" && (
                            <>
                                <div className="grid grid-cols-1 sm:grid-cols-4 items-start sm:items-center gap-2 sm:gap-4">
                                    <Label className="sm:text-right">Project</Label>
                                    {isProjectScoped ? (
                                        <div className="col-span-3 flex items-center gap-2 h-10 px-3 rounded-md border border-input bg-muted/50">
                                            <Lock className="w-3.5 h-3.5 text-muted-foreground" />
                                            <span className="text-sm">{projectName || 'Current Project'}</span>
                                        </div>
                                    ) : (
                                        <Select
                                            value={formData.projectId || "none"}
                                            onValueChange={(val) => {
                                                if (val === "none") {
                                                    setFormData(prev => ({ ...prev, projectId: "", description: "" }));
                                                    return;
                                                }
                                                const project = projects.find(p => p.id === val);
                                                if (project) {
                                                    setFormData(prev => ({
                                                        ...prev,
                                                        projectId: project.id,
                                                        description: `Monthly Retainer - ${project.name} - ${new Date().toLocaleString('default', { month: 'long', year: 'numeric' })}`
                                                    }));
                                                }
                                            }}
                                        >
                                            <SelectTrigger className="col-span-3">
                                                <SelectValue placeholder="Select Project" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="none">Select Project</SelectItem>
                                                {projects.map(p => (
                                                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    )}
                                </div>
                                {formData.projectId && (
                                    <>
                                        <div className="grid grid-cols-1 sm:grid-cols-4 items-start sm:items-center gap-2 sm:gap-4">
                                            <Label className="sm:text-right">Description</Label>
                                            <Input
                                                value={formData.description}
                                                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                                                className="col-span-3"
                                                placeholder="e.g. Monthly Retainer - Feb 2026"
                                                required
                                            />
                                        </div>
                                        <div className="grid grid-cols-1 sm:grid-cols-4 items-start sm:items-center gap-2 sm:gap-4">
                                            <Label className="sm:text-right">Amount</Label>
                                            <Input
                                                type="number"
                                                min="1"
                                                value={formData.amount}
                                                onChange={(e) => setFormData(prev => ({ ...prev, amount: e.target.value }))}
                                                className="col-span-3"
                                                required
                                            />
                                        </div>
                                    </>
                                )}
                                <div className="text-sm text-muted-foreground bg-teal-50 dark:bg-teal-950 p-3 rounded-md border border-teal-200 dark:border-teal-800">
                                    <p className="text-teal-800 dark:text-teal-200">Client retainer payment — recorded as Income.</p>
                                </div>
                            </>
                        )}

                        {/* --- GENERIC CATEGORY (Other) --- */}
                        {selectedCategory !== "Project" && selectedCategory !== "Salary" && selectedCategory !== "Internal Transfer" && selectedCategory !== "Refund" && selectedCategory !== "Investor" && selectedCategory !== "Freelancer" && selectedCategory !== "Tax" && selectedCategory !== "Reimbursement" && selectedCategory !== "Retainer" && (
                            <>
                                <div className="grid grid-cols-1 sm:grid-cols-4 items-start sm:items-center gap-2 sm:gap-4">
                                    <Label className="sm:text-right">Description</Label>
                                    <Input
                                        value={formData.description}
                                        onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                                        className="col-span-3"
                                        placeholder="e.g. Office Rent"
                                        required
                                    />
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-4 items-start sm:items-center gap-2 sm:gap-4">
                                    <Label className="sm:text-right">Amount</Label>
                                    <Input
                                        type="number"
                                        min="1"
                                        value={formData.amount}
                                        onChange={(e) => setFormData(prev => ({ ...prev, amount: e.target.value }))}
                                        className="col-span-3"
                                        required
                                    />
                                </div>
                            </>
                        )}

                        <div className="grid grid-cols-1 sm:grid-cols-4 items-start sm:items-center gap-2 sm:gap-4">
                            <Label className="sm:text-right">Date</Label>
                            <div className="col-span-3">
                                <DateTimeInput
                                    type="date"
                                    value={formData.date}
                                    onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
                                    required
                                />
                            </div>
                        </div>

                        {/* Status Selection */}
                        <div className="grid grid-cols-1 sm:grid-cols-4 items-start sm:items-center gap-2 sm:gap-4">
                            <Label className="sm:text-right">Status</Label>
                            <Select
                                value={formData.status}
                                onValueChange={(val: "completed" | "pending") => setFormData(prev => ({ ...prev, status: val }))}
                            >
                                <SelectTrigger className="col-span-3">
                                    <SelectValue placeholder="Select Status" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="completed">Completed (Paid/Received)</SelectItem>
                                    <SelectItem value="pending">Pending (Future/Payable)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <DialogFooter className="flex-col items-end gap-2">
                        {errors.global && <p className="text-sm text-red-500">{errors.global}</p>}
                        <Button type="submit" disabled={loading}>
                            {loading ? "Saving..." : "Save Transaction"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}

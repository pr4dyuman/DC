"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { createTransaction, getUsers } from "@/lib/actions";
import { Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { TransactionCategory, TransactionType, User, Project, Transaction, TRANSACTION_CATEGORIES } from "@/lib/types";
import { toast } from "sonner";
import { DateTimeInput } from "@/components/ui/DateTimeInput";
import { useCurrency } from "@/context/CurrencyContext";
import {
    TransactionCategorySelector,
    TransactionDateStatusFields,
} from "@/components/finance/AddTransactionSimpleCategoryFields";
import {
    TransactionDynamicFields,
    type TransactionFieldsState,
} from "@/components/finance/AddTransactionDynamicFields";

// Categories shown when inside a specific project
const PROJECT_SCOPED_CATEGORIES: TransactionCategory[] = ["Project", "Refund", "Freelancer", "Retainer"];
type TransferDirection = "to_member" | "from_member";
type TaxType = NonNullable<Transaction["taxType"]>;
type ExpenseType = NonNullable<Transaction["expenseType"]>;

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
    const [formData, setFormData] = useState<TransactionFieldsState>({
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
        transferDirection: "to_member" as TransferDirection,
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

    const updateFormData = (updates: Partial<TransactionFieldsState>) => {
        setFormData((prev) => ({ ...prev, ...updates }));
    };

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
                taxType: formData.taxType ? formData.taxType as TaxType : undefined,
                expenseType: formData.expenseType ? formData.expenseType as ExpenseType : undefined
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
                        <TransactionCategorySelector
                            categories={isProjectScoped ? PROJECT_SCOPED_CATEGORIES : TRANSACTION_CATEGORIES}
                            selectedCategory={selectedCategory}
                            onCategoryChange={handleCategoryChange}
                        />

                        {/* 2. Dynamic Fields based on Category */}

                        <TransactionDynamicFields
                            selectedCategory={selectedCategory}
                            isProjectScoped={isProjectScoped}
                            projectName={projectName}
                            projects={projects}
                            availableUsers={availableUsers}
                            formData={formData}
                            errors={errors}
                            formatMoney={formatMoney}
                            onMemberChange={handleMemberChange}
                            onDirectionChange={handleDirectionChange}
                            onFormChange={updateFormData}
                        />

                        <TransactionDateStatusFields
                            date={formData.date}
                            status={formData.status}
                            onDateChange={(value) => setFormData((prev) => ({ ...prev, date: value }))}
                            onStatusChange={(value) => setFormData((prev) => ({ ...prev, status: value }))}
                            dateInput={(
                                <DateTimeInput
                                    type="date"
                                    value={formData.date}
                                    onChange={(event) => setFormData((prev) => ({ ...prev, date: event.target.value }))}
                                    required
                                />
                            )}
                        />
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

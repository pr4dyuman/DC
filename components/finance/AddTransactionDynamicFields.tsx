"use client";

import type { Project, TransactionCategory, TransactionType, User } from "@/lib/types";
import {
    FreelancerTransactionFields,
    GenericTransactionFields,
    InternalTransferTransactionFields,
    InvestorTransactionFields,
    ProjectTransactionFields,
    ReimbursementTransactionFields,
    RefundTransactionFields,
    RetainerTransactionFields,
    SalaryTransactionFields,
    TaxTransactionFields,
} from "@/components/finance/AddTransactionSimpleCategoryFields";

type TransferDirection = "to_member" | "from_member";

export interface TransactionFieldsState {
    description: string;
    amount: string;
    type: TransactionType;
    date: string;
    projectId: string;
    memberId: string;
    baseSalary: number;
    bonus: string;
    deduction: string;
    transferDirection: TransferDirection;
    status: "completed" | "pending";
    taxType: string;
    expenseType: string;
}

interface TransactionDynamicFieldsProps {
    selectedCategory: TransactionCategory;
    isProjectScoped: boolean;
    projectName?: string;
    projects: Project[];
    availableUsers: User[];
    formData: TransactionFieldsState;
    errors: Record<string, string>;
    formatMoney: (value: number) => string;
    onMemberChange: (value: string) => void;
    onDirectionChange: (value: TransferDirection) => void;
    onFormChange: (updates: Partial<TransactionFieldsState>) => void;
}

export function TransactionDynamicFields({
    selectedCategory,
    isProjectScoped,
    projectName,
    projects,
    availableUsers,
    formData,
    errors,
    formatMoney,
    onMemberChange,
    onDirectionChange,
    onFormChange,
}: TransactionDynamicFieldsProps) {
    if (selectedCategory === "Project") {
        return (
            <ProjectTransactionFields
                isProjectScoped={isProjectScoped}
                projectName={projectName}
                projects={projects}
                projectId={formData.projectId}
                type={formData.type}
                description={formData.description}
                amount={formData.amount}
                projectError={errors.projectId}
                onProjectChange={(value) => onFormChange({ projectId: value })}
                onTypeChange={(value) => onFormChange({ type: value })}
                onDescriptionChange={(value) => onFormChange({ description: value })}
                onAmountChange={(value) => onFormChange({ amount: value })}
            />
        );
    }

    if (selectedCategory === "Refund") {
        return (
            <RefundTransactionFields
                isProjectScoped={isProjectScoped}
                projectName={projectName}
                projects={projects}
                projectId={formData.projectId}
                description={formData.description}
                amount={formData.amount}
                projectError={errors.projectId}
                onProjectChange={(value) => onFormChange({ projectId: value })}
                onDescriptionChange={(value) => onFormChange({ description: value })}
                onAmountChange={(value) => onFormChange({ amount: value })}
            />
        );
    }

    if (selectedCategory === "Salary") {
        return (
            <SalaryTransactionFields
                availableUsers={availableUsers}
                memberId={formData.memberId}
                baseSalary={formData.baseSalary}
                bonus={formData.bonus}
                deduction={formData.deduction}
                amount={formData.amount}
                description={formData.description}
                memberError={errors.memberId}
                onMemberChange={onMemberChange}
                onBonusChange={(value) => onFormChange({ bonus: value })}
                onDeductionChange={(value) => onFormChange({ deduction: value })}
                onDescriptionChange={(value) => onFormChange({ description: value })}
            />
        );
    }

    if (selectedCategory === "Internal Transfer") {
        return (
            <InternalTransferTransactionFields
                availableUsers={availableUsers}
                transferDirection={formData.transferDirection}
                memberId={formData.memberId}
                amount={formData.amount}
                description={formData.description}
                memberError={errors.memberId}
                onDirectionChange={onDirectionChange}
                onMemberChange={onMemberChange}
                onAmountChange={(value) => onFormChange({ amount: value })}
                onDescriptionChange={(value) => onFormChange({ description: value })}
            />
        );
    }

    if (selectedCategory === "Investor") {
        return (
            <InvestorTransactionFields
                description={formData.description}
                amount={formData.amount}
                onDescriptionChange={(value) => onFormChange({ description: value })}
                onAmountChange={(value) => onFormChange({ amount: value })}
            />
        );
    }

    if (selectedCategory === "Freelancer") {
        return (
            <FreelancerTransactionFields
                freelancers={availableUsers.filter((user) => user.employmentType === "Freelancer")}
                projects={projects}
                isProjectScoped={isProjectScoped}
                projectName={projectName}
                memberId={formData.memberId}
                description={formData.description}
                projectId={formData.projectId}
                amount={formData.amount}
                formatMoney={formatMoney}
                onMemberChange={(value) => {
                    if (value === "none") {
                        onFormChange({ memberId: "", description: "", amount: "" });
                        return;
                    }

                    const member = availableUsers.find(
                        (user) => user.id === value && user.employmentType === "Freelancer"
                    );

                    if (member) {
                        onFormChange({
                            memberId: member.id,
                            description: `Freelancer Payment - ${member.name}`,
                            amount: member.salary ? member.salary.toString() : formData.amount,
                        });
                    }
                }}
                onDescriptionChange={(value) => onFormChange({ description: value })}
                onProjectChange={(value) => onFormChange({ projectId: value === "none" ? "" : value })}
                onAmountChange={(value) => onFormChange({ amount: value })}
            />
        );
    }

    if (selectedCategory === "Tax") {
        return (
            <TaxTransactionFields
                taxType={formData.taxType}
                description={formData.description}
                amount={formData.amount}
                onTaxTypeChange={(value) => {
                    const taxLabel = value === "none" ? "" : value;
                    onFormChange({
                        taxType: taxLabel,
                        description: taxLabel
                            ? `${taxLabel} Payment - ${new Date().toLocaleString("default", { month: "long", year: "numeric" })}`
                            : "",
                    });
                }}
                onDescriptionChange={(value) => onFormChange({ description: value })}
                onAmountChange={(value) => onFormChange({ amount: value })}
            />
        );
    }

    if (selectedCategory === "Reimbursement") {
        return (
            <ReimbursementTransactionFields
                employees={availableUsers.filter((user) => user.role !== "client")}
                projects={projects}
                memberId={formData.memberId}
                expenseType={formData.expenseType || ""}
                description={formData.description}
                projectId={formData.projectId}
                amount={formData.amount}
                onMemberChange={(value) => {
                    if (value === "none") {
                        onFormChange({ memberId: "", description: "" });
                        return;
                    }

                    const member = availableUsers.find(
                        (user) => user.id === value && user.role !== "client"
                    );

                    if (member) {
                        const expenseLabel = formData.expenseType || "Expense";
                        onFormChange({
                            memberId: member.id,
                            description: `${expenseLabel} Reimbursement - ${member.name}`,
                        });
                    }
                }}
                onExpenseTypeChange={(value) => {
                    const expenseLabel = value === "none" ? "" : value;
                    const member = availableUsers.find(
                        (user) => user.id === formData.memberId && user.role !== "client"
                    );

                    onFormChange({
                        expenseType: expenseLabel,
                        description:
                            expenseLabel && member
                                ? `${expenseLabel} Reimbursement - ${member.name}`
                                : formData.description,
                    });
                }}
                onDescriptionChange={(value) => onFormChange({ description: value })}
                onProjectChange={(value) => onFormChange({ projectId: value === "none" ? "" : value })}
                onAmountChange={(value) => onFormChange({ amount: value })}
            />
        );
    }

    if (selectedCategory === "Retainer") {
        return (
            <RetainerTransactionFields
                isProjectScoped={isProjectScoped}
                projectName={projectName}
                projects={projects}
                projectId={formData.projectId}
                description={formData.description}
                amount={formData.amount}
                onProjectChange={(value) => {
                    if (value === "none") {
                        onFormChange({ projectId: "", description: "" });
                        return;
                    }

                    const project = projects.find((item) => item.id === value);
                    if (project) {
                        onFormChange({
                            projectId: project.id,
                            description: `Monthly Retainer - ${project.name} - ${new Date().toLocaleString("default", { month: "long", year: "numeric" })}`,
                        });
                    }
                }}
                onDescriptionChange={(value) => onFormChange({ description: value })}
                onAmountChange={(value) => onFormChange({ amount: value })}
            />
        );
    }

    return (
        <GenericTransactionFields
            description={formData.description}
            amount={formData.amount}
            onDescriptionChange={(value) => onFormChange({ description: value })}
            onAmountChange={(value) => onFormChange({ amount: value })}
        />
    );
}

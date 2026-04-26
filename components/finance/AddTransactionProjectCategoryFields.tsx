"use client";

import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Project, TransactionType } from "@/lib/types";

import { FieldRow, InfoBox, LockedProjectDisplay } from "@/components/finance/AddTransactionFieldPrimitives";

interface ProjectTransactionFieldsProps {
    isProjectScoped: boolean;
    projectName?: string;
    projects: Project[];
    projectId: string;
    type: TransactionType;
    description: string;
    amount: string;
    projectError?: string;
    onProjectChange: (value: string) => void;
    onTypeChange: (value: TransactionType) => void;
    onDescriptionChange: (value: string) => void;
    onAmountChange: (value: string) => void;
}

export function ProjectTransactionFields({
    isProjectScoped,
    projectName,
    projects,
    projectId,
    type,
    description,
    amount,
    projectError,
    onProjectChange,
    onTypeChange,
    onDescriptionChange,
    onAmountChange,
}: ProjectTransactionFieldsProps) {
    return (
        <>
            <FieldRow label="Project" error={projectError}>
                {isProjectScoped ? (
                    <LockedProjectDisplay projectName={projectName} />
                ) : (
                    <Select value={projectId} onValueChange={onProjectChange}>
                        <SelectTrigger className="col-span-3">
                            <SelectValue placeholder="Select Project" />
                        </SelectTrigger>
                        <SelectContent>
                            {projects.map((project) => (
                                <SelectItem key={project.id} value={project.id}>
                                    {project.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                )}
            </FieldRow>
            <FieldRow label="Payment Direction">
                <Select
                    value={type === "income" ? "client_to_company" : "company_to_client"}
                    onValueChange={(value) => onTypeChange(value === "client_to_company" ? "income" : "expense")}
                >
                    <SelectTrigger className="col-span-3">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="client_to_company">Client to Company (Income)</SelectItem>
                        <SelectItem value="company_to_client">Company to Client (Expense/Refund)</SelectItem>
                    </SelectContent>
                </Select>
            </FieldRow>
            <FieldRow label="Description">
                <Input
                    value={description}
                    onChange={(event) => onDescriptionChange(event.target.value)}
                    className="col-span-3"
                    placeholder="e.g. Milestone Payment"
                    required
                />
            </FieldRow>
            <FieldRow label="Amount">
                <Input
                    type="number"
                    min="1"
                    value={amount}
                    onChange={(event) => onAmountChange(event.target.value)}
                    className="col-span-3"
                    required
                />
            </FieldRow>
        </>
    );
}

interface RefundTransactionFieldsProps {
    isProjectScoped: boolean;
    projectName?: string;
    projects: Project[];
    projectId: string;
    description: string;
    amount: string;
    projectError?: string;
    onProjectChange: (value: string) => void;
    onDescriptionChange: (value: string) => void;
    onAmountChange: (value: string) => void;
}

export function RefundTransactionFields({
    isProjectScoped,
    projectName,
    projects,
    projectId,
    description,
    amount,
    projectError,
    onProjectChange,
    onDescriptionChange,
    onAmountChange,
}: RefundTransactionFieldsProps) {
    return (
        <>
            <FieldRow label="Project" error={projectError}>
                {isProjectScoped ? (
                    <LockedProjectDisplay projectName={projectName} />
                ) : (
                    <Select value={projectId} onValueChange={onProjectChange}>
                        <SelectTrigger className="col-span-3">
                            <SelectValue placeholder="Select Project" />
                        </SelectTrigger>
                        <SelectContent>
                            {projects.map((project) => (
                                <SelectItem key={project.id} value={project.id}>
                                    {project.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                )}
            </FieldRow>
            <FieldRow label="Refund Reason">
                <Input
                    value={description}
                    onChange={(event) => onDescriptionChange(event.target.value)}
                    className="col-span-3"
                    placeholder="e.g. Partial refund for delayed delivery"
                    required
                />
            </FieldRow>
            <FieldRow label="Refund Amount">
                <Input
                    type="number"
                    min="1"
                    value={amount}
                    onChange={(event) => onAmountChange(event.target.value)}
                    className="col-span-3"
                    required
                />
            </FieldRow>
            <InfoBox className="bg-amber-50 dark:bg-amber-950 border-amber-200 dark:border-amber-800">
                <p className="font-medium text-amber-900 dark:text-amber-100">Note:</p>
                <p className="text-amber-800 dark:text-amber-200">This refund will reduce total revenue on admin dashboard and reduce client&apos;s total spent.</p>
            </InfoBox>
        </>
    );
}

interface RetainerTransactionFieldsProps {
    isProjectScoped: boolean;
    projectName?: string;
    projects: Project[];
    projectId: string;
    description: string;
    amount: string;
    onProjectChange: (value: string) => void;
    onDescriptionChange: (value: string) => void;
    onAmountChange: (value: string) => void;
}

export function RetainerTransactionFields({
    isProjectScoped,
    projectName,
    projects,
    projectId,
    description,
    amount,
    onProjectChange,
    onDescriptionChange,
    onAmountChange,
}: RetainerTransactionFieldsProps) {
    return (
        <>
            <FieldRow label="Project">
                {isProjectScoped ? (
                    <LockedProjectDisplay projectName={projectName} />
                ) : (
                    <Select value={projectId || "none"} onValueChange={onProjectChange}>
                        <SelectTrigger className="col-span-3">
                            <SelectValue placeholder="Select Project" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="none">Select Project</SelectItem>
                            {projects.map((project) => (
                                <SelectItem key={project.id} value={project.id}>
                                    {project.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                )}
            </FieldRow>
            {projectId && (
                <>
                    <FieldRow label="Description">
                        <Input
                            value={description}
                            onChange={(event) => onDescriptionChange(event.target.value)}
                            className="col-span-3"
                            placeholder="e.g. Monthly Retainer - Feb 2026"
                            required
                        />
                    </FieldRow>
                    <FieldRow label="Amount">
                        <Input
                            type="number"
                            min="1"
                            value={amount}
                            onChange={(event) => onAmountChange(event.target.value)}
                            className="col-span-3"
                            required
                        />
                    </FieldRow>
                </>
            )}
            <InfoBox className="bg-teal-50 dark:bg-teal-950 border-teal-200 dark:border-teal-800">
                <p className="text-teal-800 dark:text-teal-200">Client retainer payment - recorded as Income.</p>
            </InfoBox>
        </>
    );
}

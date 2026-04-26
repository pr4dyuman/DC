"use client";

import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { User } from "@/lib/types";

import { FieldRow } from "@/components/finance/AddTransactionFieldPrimitives";

interface SalaryTransactionFieldsProps {
    availableUsers: User[];
    memberId: string;
    baseSalary: number;
    bonus: string;
    deduction: string;
    amount: string;
    description: string;
    memberError?: string;
    onMemberChange: (value: string) => void;
    onBonusChange: (value: string) => void;
    onDeductionChange: (value: string) => void;
    onDescriptionChange: (value: string) => void;
}

export function SalaryTransactionFields({
    availableUsers,
    memberId,
    baseSalary,
    bonus,
    deduction,
    amount,
    description,
    memberError,
    onMemberChange,
    onBonusChange,
    onDeductionChange,
    onDescriptionChange,
}: SalaryTransactionFieldsProps) {
    return (
        <>
            <FieldRow label="Employee" error={memberError}>
                <Select value={memberId} onValueChange={onMemberChange}>
                    <SelectTrigger className="col-span-3">
                        <SelectValue placeholder="Select Employee" />
                    </SelectTrigger>
                    <SelectContent>
                        {availableUsers.map((user) => (
                            <SelectItem key={user.id} value={user.id}>
                                {user.name}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </FieldRow>
            <FieldRow label="Base Salary">
                <Input
                    type="number"
                    value={baseSalary}
                    disabled
                    className="col-span-3 bg-muted"
                />
            </FieldRow>
            <FieldRow label="Bonus (+)">
                <Input
                    type="number"
                    value={bonus}
                    placeholder="0"
                    onChange={(event) => onBonusChange(event.target.value)}
                    className="col-span-3"
                />
            </FieldRow>
            <FieldRow label="Deduction (-)">
                <Input
                    type="number"
                    value={deduction}
                    placeholder="0"
                    onChange={(event) => onDeductionChange(event.target.value)}
                    className="col-span-3"
                />
            </FieldRow>
            <FieldRow label={<span className="font-bold">Total Pay</span>}>
                <Input
                    type="number"
                    min="1"
                    value={amount}
                    disabled
                    className="col-span-3 font-bold"
                />
            </FieldRow>
            <FieldRow label="Description">
                <Input
                    value={description}
                    onChange={(event) => onDescriptionChange(event.target.value)}
                    className="col-span-3"
                    required
                />
            </FieldRow>
        </>
    );
}

type TransferDirection = "to_member" | "from_member";

interface InternalTransferTransactionFieldsProps {
    availableUsers: User[];
    transferDirection: TransferDirection;
    memberId: string;
    amount: string;
    description: string;
    memberError?: string;
    onDirectionChange: (value: TransferDirection) => void;
    onMemberChange: (value: string) => void;
    onAmountChange: (value: string) => void;
    onDescriptionChange: (value: string) => void;
}

export function InternalTransferTransactionFields({
    availableUsers,
    transferDirection,
    memberId,
    amount,
    description,
    memberError,
    onDirectionChange,
    onMemberChange,
    onAmountChange,
    onDescriptionChange,
}: InternalTransferTransactionFieldsProps) {
    return (
        <>
            <FieldRow label="Direction">
                <Select value={transferDirection} onValueChange={(value) => onDirectionChange(value as TransferDirection)}>
                    <SelectTrigger className="col-span-3">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="to_member">Company to Employee (Expense)</SelectItem>
                        <SelectItem value="from_member">Employee to Company (Income)</SelectItem>
                    </SelectContent>
                </Select>
            </FieldRow>
            <FieldRow label="Employee" error={memberError}>
                <Select value={memberId} onValueChange={onMemberChange}>
                    <SelectTrigger className="col-span-3">
                        <SelectValue placeholder="Select Employee" />
                    </SelectTrigger>
                    <SelectContent>
                        {availableUsers.map((user) => (
                            <SelectItem key={user.id} value={user.id}>
                                {user.name}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
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
            <FieldRow label="Description">
                <Input
                    value={description}
                    onChange={(event) => onDescriptionChange(event.target.value)}
                    className="col-span-3"
                    required
                />
            </FieldRow>
        </>
    );
}

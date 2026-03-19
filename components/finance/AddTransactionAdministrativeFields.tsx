"use client";

import type { ReactNode } from "react";

import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { TransactionCategory } from "@/lib/types";

import { FieldRow, InfoBox } from "@/components/finance/AddTransactionFieldPrimitives";

interface InvestorTransactionFieldsProps {
    description: string;
    amount: string;
    onDescriptionChange: (value: string) => void;
    onAmountChange: (value: string) => void;
}

export function InvestorTransactionFields({
    description,
    amount,
    onDescriptionChange,
    onAmountChange,
}: InvestorTransactionFieldsProps) {
    return (
        <>
            <FieldRow label="Investor / Source">
                <Input
                    value={description}
                    onChange={(event) => onDescriptionChange(event.target.value)}
                    className="col-span-3"
                    placeholder="e.g. Investor Name or Funding Source"
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
            <InfoBox className="bg-emerald-50 dark:bg-emerald-950 border-emerald-200 dark:border-emerald-800">
                <p className="font-medium text-emerald-900 dark:text-emerald-100">Note:</p>
                <p className="text-emerald-800 dark:text-emerald-200">This will be recorded as Income (investment into the company).</p>
            </InfoBox>
        </>
    );
}

interface TaxTransactionFieldsProps {
    taxType: string;
    description: string;
    amount: string;
    onTaxTypeChange: (value: string) => void;
    onDescriptionChange: (value: string) => void;
    onAmountChange: (value: string) => void;
}

export function TaxTransactionFields({
    taxType,
    description,
    amount,
    onTaxTypeChange,
    onDescriptionChange,
    onAmountChange,
}: TaxTransactionFieldsProps) {
    return (
        <>
            <FieldRow label="Tax Type">
                <Select value={taxType || "none"} onValueChange={onTaxTypeChange}>
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
            </FieldRow>
            {taxType && (
                <>
                    <FieldRow label="Description">
                        <Input
                            value={description}
                            onChange={(event) => onDescriptionChange(event.target.value)}
                            className="col-span-3"
                            placeholder="e.g. GST Payment - Q3 2026"
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
            <InfoBox className="bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800">
                <p className="text-red-800 dark:text-red-200">Tax payment - recorded as Expense.</p>
            </InfoBox>
        </>
    );
}

interface GenericTransactionFieldsProps {
    description: string;
    amount: string;
    onDescriptionChange: (value: string) => void;
    onAmountChange: (value: string) => void;
}

export function GenericTransactionFields({
    description,
    amount,
    onDescriptionChange,
    onAmountChange,
}: GenericTransactionFieldsProps) {
    return (
        <>
            <FieldRow label="Description">
                <Input
                    value={description}
                    onChange={(event) => onDescriptionChange(event.target.value)}
                    className="col-span-3"
                    placeholder="e.g. Office Rent"
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

interface CategorySelectorProps {
    categories: TransactionCategory[];
    selectedCategory: TransactionCategory;
    onCategoryChange: (value: string) => void;
}

export function TransactionCategorySelector({
    categories,
    selectedCategory,
    onCategoryChange,
}: CategorySelectorProps) {
    return (
        <FieldRow label="Category">
            <Select value={selectedCategory} onValueChange={onCategoryChange}>
                <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Select Category" />
                </SelectTrigger>
                <SelectContent>
                    {categories.map((category) => (
                        <SelectItem key={category} value={category}>
                            {category === "Salary" ? "Salary (Employee)" : category}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
        </FieldRow>
    );
}

interface DateStatusFieldsProps {
    date: string;
    status: "completed" | "pending";
    onDateChange: (value: string) => void;
    onStatusChange: (value: "completed" | "pending") => void;
    dateInput: ReactNode;
}

export function TransactionDateStatusFields({
    status,
    onStatusChange,
    dateInput,
}: DateStatusFieldsProps) {
    return (
        <>
            <FieldRow label="Date">
                <div className="col-span-3">
                    {dateInput}
                </div>
            </FieldRow>
            <FieldRow label="Status">
                <Select value={status} onValueChange={onStatusChange}>
                    <SelectTrigger className="col-span-3">
                        <SelectValue placeholder="Select Status" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="completed">Completed (Paid/Received)</SelectItem>
                        <SelectItem value="pending">Pending (Future/Payable)</SelectItem>
                    </SelectContent>
                </Select>
            </FieldRow>
        </>
    );
}

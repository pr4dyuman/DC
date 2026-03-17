"use client"

import * as React from "react"
export interface SelectProps<T extends string = string> {
    value: T;
    onValueChange: (value: T) => void;
    children: React.ReactNode;
}

type SelectTriggerProps = {
    className?: string;
    children?: React.ReactNode;
};

type SelectValueProps = {
    placeholder?: string;
    className?: string;
};

type SelectContentProps = {
    className?: string;
    children?: React.ReactNode;
};

type SelectItemProps = {
    value: string;
    className?: string;
    disabled?: boolean;
    children?: React.ReactNode;
};

export function Select<T extends string>({ value, onValueChange, children }: SelectProps<T>) {
    // Very simplified Select implementation
    // In a real app we'd use Radix UI Select or similar
    return (
        <div className="relative">
            <select
                className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 [&>span]:line-clamp-1"
                value={value}
                onChange={(e) => onValueChange(e.target.value as T)}
            >
                {children}
            </select>
        </div>
    )
}

export function SelectTrigger({ children }: SelectTriggerProps) {
    return <>{children}</>
}

export function SelectValue(props: SelectValueProps) {
    void props.placeholder
    void props.className
    return <></> // Placeholder handling in select
}

export function SelectContent({ children, className }: SelectContentProps) {
    void className
    return <>{children}</>
}

export function SelectItem({ value, children, className, disabled }: SelectItemProps) {
    void className
    return <option value={value} disabled={disabled}>{children}</option>
}

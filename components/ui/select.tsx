"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

export interface SelectProps {
    value: string;
    onValueChange: (value: any) => void;
    children: React.ReactNode;
}

export function Select({ value, onValueChange, children }: SelectProps) {
    // Very simplified Select implementation
    // In a real app we'd use Radix UI Select or similar
    const [open, setOpen] = React.useState(false);

    return (
        <div className="relative">
            <select
                className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 [&>span]:line-clamp-1"
                value={value}
                onChange={(e) => onValueChange(e.target.value)}
            >
                {children}
            </select>
        </div>
    )
}

export function SelectTrigger({ className, children }: any) {
    return <>{children}</>
}

export function SelectValue({ placeholder }: any) {
    return <></> // Placeholder handling in select
}

export function SelectContent({ children }: any) {
    return <>{children}</>
}

export function SelectItem({ value, children }: any) {
    return <option value={value}>{children}</option>
}

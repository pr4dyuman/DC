"use client";

import type { ReactNode } from "react";

import { Label } from "@/components/ui/label";
import { Lock } from "lucide-react";

interface RowProps {
    label: ReactNode;
    children: ReactNode;
    error?: string;
}

export function FieldRow({ label, children, error }: RowProps) {
    return (
        <div className="grid grid-cols-1 sm:grid-cols-4 items-start sm:items-center gap-2 sm:gap-4">
            <Label className="sm:text-right">{label}</Label>
            {children}
            {error && <p className="col-span-4 text-right text-xs text-red-500">{error}</p>}
        </div>
    );
}

export function LockedProjectDisplay({ projectName }: { projectName?: string }) {
    return (
        <div className="col-span-3 flex items-center gap-2 h-10 px-3 rounded-md border border-input bg-muted/50">
            <Lock className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="text-sm">{projectName || "Current Project"}</span>
        </div>
    );
}

export function InfoBox({ className, children }: { className: string; children: ReactNode }) {
    return (
        <div className={`text-sm text-muted-foreground p-3 rounded-md border ${className}`}>
            {children}
        </div>
    );
}

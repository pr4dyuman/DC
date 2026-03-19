"use client";

import type { ReactNode } from "react";
import { ArrowUpDown, ChevronDown, ChevronUp, Search } from "lucide-react";

import { PLAN_STYLES } from "./ai-usage-dashboard-shared";

export function PlanBadge({ plan }: { plan: string }) {
    return (
        <span className={`inline-flex text-[10px] font-semibold px-2 py-0.5 rounded-md capitalize border ${PLAN_STYLES[plan] || "bg-muted text-muted-foreground border-border"}`}>
            {plan || "—"}
        </span>
    );
}

export function SortHeader<T extends string>({ label, sortKey, currentKey, asc, onSort, align = "left" }: {
    label: string;
    sortKey: T;
    currentKey: T;
    asc: boolean;
    onSort: (key: T) => void;
    align?: "left" | "right";
}) {
    const active = currentKey === sortKey;
    return (
        <th
            className={`py-3 px-4 text-muted-foreground font-medium cursor-pointer hover:text-foreground transition-colors select-none text-[11px] uppercase tracking-wider ${align === "right" ? "text-right" : "text-left"}`}
            onClick={() => onSort(sortKey)}
        >
            <span className="inline-flex items-center gap-1">
                {label}
                {active
                    ? (asc ? <ChevronUp className="w-3 h-3 text-primary" /> : <ChevronDown className="w-3 h-3 text-primary" />)
                    : <ArrowUpDown className="w-3 h-3 opacity-20" />}
            </span>
        </th>
    );
}

export function SearchInput({ value, onChange, placeholder }: { value: string; onChange: (value: string) => void; placeholder: string }) {
    return (
        <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <input
                type="text"
                value={value}
                onChange={(event) => onChange(event.target.value)}
                placeholder={placeholder}
                className="pl-8 pr-3 py-2 text-xs border border-border/60 rounded-lg bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/40 w-48 transition-all"
            />
        </div>
    );
}

export function EmptyState({ icon, text }: { icon: ReactNode; text: string }) {
    return (
        <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <div className="opacity-30 mb-3">{icon}</div>
            <p className="text-sm">{text}</p>
        </div>
    );
}

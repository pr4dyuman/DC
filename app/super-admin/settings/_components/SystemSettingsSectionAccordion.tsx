"use client";

import type { ReactNode } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";

interface SystemSettingsSectionAccordionProps {
    id?: string;
    title: string;
    description: string;
    icon: ReactNode;
    iconBg: string;
    status?: string;
    isOpen: boolean;
    onToggle: () => void;
    children: ReactNode;
}

export function SystemSettingsSectionAccordion({
    id,
    title,
    description,
    icon,
    iconBg,
    status,
    isOpen,
    onToggle,
    children,
}: SystemSettingsSectionAccordionProps) {
    return (
        <section id={id} className="scroll-mt-6 rounded-2xl border border-border/70 bg-card text-card-foreground shadow-sm">
            <button
                type="button"
                onClick={onToggle}
                aria-expanded={isOpen}
                className="flex w-full flex-row items-start justify-between gap-4 rounded-2xl p-5 text-left transition-colors hover:bg-accent/40 sm:p-6"
            >
                <span className="flex min-w-0 items-start gap-4">
                    <span className={`inline-flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl ${iconBg}`}>
                        {icon}
                    </span>
                    <span className="min-w-0">
                        <span className="block text-lg font-semibold text-foreground">{title}</span>
                        <span className="mt-1 block text-sm leading-6 text-muted-foreground">{description}</span>
                    </span>
                </span>
                <span className="flex flex-shrink-0 items-center gap-3">
                    {status ? (
                        <span className="hidden rounded-full border border-border bg-background px-2.5 py-1 text-xs font-medium text-muted-foreground sm:inline-flex">
                            {status}
                        </span>
                    ) : null}
                    {isOpen ? (
                        <ChevronDown className="h-5 w-5 text-muted-foreground" />
                    ) : (
                        <ChevronRight className="h-5 w-5 text-muted-foreground" />
                    )}
                </span>
            </button>

            <div className={`grid transition-[grid-template-rows] duration-300 ease-in-out ${isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}>
                <div className="overflow-hidden">
                    <div className="border-t border-border/60 p-5 sm:p-6">
                        {children}
                    </div>
                </div>
            </div>
        </section>
    );
}

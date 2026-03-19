"use client";

import type { ReactNode } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";

interface SystemSettingsSectionAccordionProps {
    title: string;
    description: string;
    icon: ReactNode;
    iconBg: string;
    isOpen: boolean;
    onToggle: () => void;
    children: ReactNode;
}

export function SystemSettingsSectionAccordion({
    title,
    description,
    icon,
    iconBg,
    isOpen,
    onToggle,
    children,
}: SystemSettingsSectionAccordionProps) {
    return (
        <div className="border rounded-lg bg-card text-card-foreground shadow-sm">
            <button
                type="button"
                onClick={onToggle}
                aria-expanded={isOpen}
                className="w-full text-left flex flex-row items-center justify-between p-6 hover:bg-accent/50 transition-colors"
            >
                <span className="flex items-center gap-4">
                    <span className={`p-2 ${iconBg} rounded-full inline-flex`}>
                        {icon}
                    </span>
                    <span>
                        <span className="block text-lg font-semibold">{title}</span>
                        <span className="block text-sm text-muted-foreground">{description}</span>
                    </span>
                </span>
                {isOpen ? (
                    <ChevronDown className="h-5 w-5 text-muted-foreground" />
                ) : (
                    <ChevronRight className="h-5 w-5 text-muted-foreground" />
                )}
            </button>

            <div className={`grid transition-[grid-template-rows] duration-300 ease-in-out ${isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}>
                <div className="overflow-hidden">
                    <div className="p-6 pt-0">
                        {children}
                    </div>
                </div>
            </div>
        </div>
    );
}

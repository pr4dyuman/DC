"use client";

import { Bot, Sparkles } from "lucide-react";

import { cn } from "@/lib/utils";

import { SingularityTypingIndicator } from "./SingularityTypingIndicator";

type SingularityAssistantStatusProps = {
    isAgent: boolean;
    label?: string;
    className?: string;
};

export function SingularityAssistantStatus({
    isAgent,
    label,
    className,
}: SingularityAssistantStatusProps) {
    return (
        <div className={cn("flex gap-2 sm:gap-3", className)}>
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center shrink-0 bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-300">
                {isAgent ? <Bot className="w-4 h-4" /> : <Sparkles className="w-4 h-4" />}
            </div>
            <SingularityTypingIndicator label={label} className="pt-2" labelClassName={label ? "ml-1" : undefined} />
        </div>
    );
}

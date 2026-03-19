"use client";

import { cn } from "@/lib/utils";

type SingularityTypingIndicatorProps = {
    label?: string;
    className?: string;
    labelClassName?: string;
};

export function SingularityTypingIndicator({
    label,
    className,
    labelClassName,
}: SingularityTypingIndicatorProps) {
    return (
        <div className={cn("flex items-center gap-2", className)}>
            <div className="flex gap-1 text-neutral-400">
                <span className="singularity-typing-dot" />
                <span className="singularity-typing-dot" />
                <span className="singularity-typing-dot" />
            </div>
            {label && (
                <span className={cn("text-xs text-neutral-400", labelClassName)}>
                    {label}
                </span>
            )}
        </div>
    );
}

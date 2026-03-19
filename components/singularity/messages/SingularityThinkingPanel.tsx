"use client";

import { Brain, ChevronDown, ChevronRight } from "lucide-react";

type SingularityThinkingPanelProps = {
    content: string;
    isExpanded: boolean;
    onToggle: () => void;
};

export function SingularityThinkingPanel({
    content,
    isExpanded,
    onToggle,
}: SingularityThinkingPanelProps) {
    return (
        <div className="rounded-xl overflow-hidden border border-neutral-200 dark:border-neutral-700">
            <button
                onClick={onToggle}
                className="flex items-center gap-2 w-full px-3 py-2 text-xs font-medium text-neutral-500 hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors"
            >
                <Brain className="w-3.5 h-3.5" />
                <span>Thinking</span>
                {isExpanded ? (
                    <ChevronDown className="w-3.5 h-3.5 ml-auto" />
                ) : (
                    <ChevronRight className="w-3.5 h-3.5 ml-auto" />
                )}
            </button>
            {isExpanded && (
                <div className="px-3 pb-3 text-xs text-neutral-400 dark:text-neutral-500 leading-relaxed border-t border-neutral-200 dark:border-neutral-700 pt-2 max-h-60 overflow-y-auto whitespace-pre-wrap">
                    {content}
                </div>
            )}
        </div>
    );
}

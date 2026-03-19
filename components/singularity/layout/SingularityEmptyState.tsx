"use client";

import { Sparkles } from "lucide-react";

import { SingularityComposer, type SingularityComposerProps } from "./SingularityComposer";
import { SingularitySuggestionPills } from "./SingularitySuggestionPills";

type Suggestion = {
    emoji: string;
    label: string;
};

type SingularityEmptyStateProps = {
    composerProps: Omit<SingularityComposerProps, "variant">;
    suggestions: Suggestion[];
    onSelectSuggestion: (label: string) => void;
};

export function SingularityEmptyState({
    composerProps,
    suggestions,
    onSelectSuggestion,
}: SingularityEmptyStateProps) {
    return (
        <div className="flex-1 flex flex-col items-center justify-center px-4 sm:px-6">
            <div className="w-full max-w-3xl space-y-6 sm:space-y-8 animate-in fade-in duration-700">
                <div className="space-y-1">
                    <div className="flex items-center gap-2">
                        <Sparkles className="w-5 h-5 sm:w-6 sm:h-6 text-blue-500" />
                        <span className="text-lg sm:text-xl font-medium text-neutral-800 dark:text-neutral-200">
                            Hi there
                        </span>
                    </div>
                    <h2 className="text-2xl sm:text-4xl font-normal text-neutral-400 dark:text-neutral-500 tracking-tight">
                        Where should we start?
                    </h2>
                </div>

                <SingularityComposer
                    variant="large"
                    {...composerProps}
                />

                <SingularitySuggestionPills
                    suggestions={suggestions}
                    onSelect={onSelectSuggestion}
                />
            </div>
        </div>
    );
}

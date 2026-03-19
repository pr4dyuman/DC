"use client";

type Suggestion = {
    emoji: string;
    label: string;
};

type SingularitySuggestionPillsProps = {
    suggestions: Suggestion[];
    onSelect: (label: string) => void;
};

export function SingularitySuggestionPills({
    suggestions,
    onSelect,
}: SingularitySuggestionPillsProps) {
    return (
        <div className="flex flex-wrap justify-center gap-2">
            {suggestions.map((suggestion, index) => (
                <button
                    key={`${suggestion.label}-${index}`}
                    onClick={() => onSelect(suggestion.label)}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-full text-sm bg-neutral-100 dark:bg-neutral-900 text-neutral-700 dark:text-neutral-300 border border-neutral-200 dark:border-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-800 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
                >
                    <span>{suggestion.emoji}</span>
                    <span>{suggestion.label}</span>
                </button>
            ))}
        </div>
    );
}

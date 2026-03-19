"use client";

import { useRouter } from "next/navigation";
import { Search, Loader2, FileText, Briefcase, Users, User as UserIcon } from "lucide-react";
import type { SearchResult } from "@/lib/actions";

type TopbarDesktopSearchProps = {
    query: string;
    searchResults: SearchResult[];
    isSearching: boolean;
    showResults: boolean;
    searchRef: React.RefObject<HTMLDivElement | null>;
    onQueryChange: (value: string) => void;
    onShowResultsChange: (value: boolean) => void;
    onSelectResult: () => void;
};

function getIconForType(type: SearchResult["type"]) {
    switch (type) {
        case "project":
            return <Briefcase className="h-4 w-4 text-blue-500" />;
        case "client":
            return <Users className="h-4 w-4 text-green-500" />;
        case "task":
            return <FileText className="h-4 w-4 text-orange-500" />;
        case "user":
            return <UserIcon className="h-4 w-4 text-indigo-500" />;
        default:
            return <Search className="h-4 w-4" />;
    }
}

export function TopbarDesktopSearch({
    query,
    searchResults,
    isSearching,
    showResults,
    searchRef,
    onQueryChange,
    onShowResultsChange,
    onSelectResult,
}: TopbarDesktopSearchProps) {
    const router = useRouter();

    return (
        <div className="relative w-64 hidden sm:block" ref={searchRef}>
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <input
                type="text"
                placeholder="Search projects, tasks..."
                className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 pl-9 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                value={query}
                onChange={(event) => onQueryChange(event.target.value)}
                onFocus={() => query.length >= 2 && onShowResultsChange(true)}
            />
            {isSearching && (
                <div className="absolute right-2.5 top-2.5">
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                </div>
            )}

            {showResults && (
                <div className="absolute top-full mt-2 w-80 md:w-96 max-w-[calc(100vw-2rem)] right-0 bg-background rounded-md border shadow-lg overflow-hidden z-[100]">
                    <div className="p-2">
                        <h4 className="text-xs font-medium text-muted-foreground mb-2 px-2">
                            {searchResults.length > 0 ? "Results" : "No results found"}
                        </h4>
                        {searchResults.length > 0 && (
                            <div className="space-y-1">
                                {searchResults.map((result) => (
                                    <button
                                        type="button"
                                        key={result.id}
                                        className="w-full text-left flex items-start gap-3 p-2 rounded-sm hover:bg-accent transition-colors"
                                        onClick={() => {
                                            router.push(result.url);
                                            onSelectResult();
                                        }}
                                    >
                                        <div className="mt-1">
                                            {getIconForType(result.type)}
                                        </div>
                                        <div className="flex-1 overflow-hidden">
                                            <p className="text-sm font-medium truncate">{result.title}</p>
                                            {result.subtitle && (
                                                <p className="text-xs text-muted-foreground truncate">{result.subtitle}</p>
                                            )}
                                        </div>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

"use client";

type AgencyTableFiltersProps = {
    search: string;
    setSearch: (value: string) => void;
    filter: string;
    setFilter: (value: string) => void;
    filterCounts: Record<string, number>;
};

const filters = [
    { value: "all", label: "All" },
    { value: "active", label: "Active" },
    { value: "trial", label: "Trial" },
    { value: "suspended", label: "Suspended" },
    { value: "cancelled", label: "Cancelled" },
    { value: "free", label: "Free" },
    { value: "starter", label: "Starter" },
    { value: "pro", label: "Pro" },
    { value: "enterprise", label: "Enterprise" },
];

export function AgencyTableFilters({
    search,
    setSearch,
    filter,
    setFilter,
    filterCounts,
}: AgencyTableFiltersProps) {
    return (
        <div className="p-4 sm:p-6 border-b border-border space-y-3">
            <input
                type="text"
                placeholder="Search by name, slug, or email..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className="w-full px-4 py-2 border border-border rounded-lg bg-background text-foreground focus:ring-2 focus:ring-primary focus:border-transparent placeholder:text-muted-foreground"
            />
            <div className="flex flex-wrap gap-1.5">
                {filters.map((item) => (
                    <button
                        key={item.value}
                        onClick={() => setFilter(item.value)}
                        className={`px-3 py-1 text-xs font-medium rounded-full transition-colors ${filter === item.value
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted text-muted-foreground hover:bg-muted/80"
                            }`}
                    >
                        {item.label}
                        {item.value !== "all" && (
                            <span className="ml-1 opacity-60">{filterCounts[item.value] || 0}</span>
                        )}
                    </button>
                ))}
            </div>
        </div>
    );
}


export function TeamPageSkeleton() {
    return (
        <div className="space-y-6 animate-pulse">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between space-y-4 sm:space-y-0">
                <div className="h-8 w-20 bg-muted rounded" />
                <div className="h-10 w-32 bg-muted rounded-md" />
            </div>

            {/* Stats Bar */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[1, 2, 3, 4].map(i => (
                    <div key={i} className="rounded-xl border border-border bg-card p-4 flex items-center gap-3">
                        <div className="h-9 w-9 rounded-lg bg-muted" />
                        <div className="space-y-1.5">
                            <div className="h-6 w-8 bg-muted rounded" />
                            <div className="h-3 w-20 bg-muted/60 rounded" />
                        </div>
                    </div>
                ))}
            </div>

            {/* Search + Filter */}
            <div className="flex flex-col sm:flex-row gap-3">
                <div className="h-10 flex-1 bg-muted rounded-xl" />
                <div className="flex gap-1.5">
                    {[1, 2, 3, 4, 5].map(i => (
                        <div key={i} className="h-8 w-20 bg-muted rounded-lg" />
                    ))}
                </div>
            </div>

            {/* Cards Grid */}
            <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                {[1, 2, 3, 4, 5, 6].map(i => (
                    <div key={i} className="rounded-xl border border-border bg-card p-5 space-y-4">
                        <div className="flex items-center gap-4">
                            <div className="h-14 w-14 rounded-full bg-muted" />
                            <div className="flex-1 space-y-2">
                                <div className="h-4 w-3/4 bg-muted rounded" />
                                <div className="h-3 w-1/2 bg-muted/60 rounded" />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <div className="h-3 w-full bg-muted/50 rounded" />
                            <div className="h-3 w-2/3 bg-muted/50 rounded" />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

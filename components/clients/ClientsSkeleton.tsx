
export function ClientsSkeleton() {
    return (
        <div className="space-y-6 animate-pulse">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between space-y-4 sm:space-y-0">
                <div className="h-8 w-24 bg-muted rounded" />
                <div className="flex gap-2">
                    <div className="h-10 w-32 bg-muted rounded-md" />
                    <div className="h-10 w-28 bg-muted rounded-md" />
                </div>
            </div>

            {/* Search */}
            <div className="h-10 w-full max-w-md bg-muted rounded-lg" />

            {/* Card Grid */}
            <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                {[1, 2, 3, 4, 5, 6].map(i => (
                    <div key={i} className="rounded-xl border border-border bg-card p-5 space-y-4">
                        <div className="flex items-center gap-3">
                            <div className="h-12 w-12 rounded-full bg-muted" />
                            <div className="flex-1 space-y-2">
                                <div className="h-4 w-3/4 bg-muted rounded" />
                                <div className="h-3 w-1/2 bg-muted/60 rounded" />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <div className="h-3 w-full bg-muted/50 rounded" />
                            <div className="h-3 w-2/3 bg-muted/50 rounded" />
                        </div>
                        <div className="flex gap-2">
                            <div className="h-7 w-16 bg-muted/50 rounded-full" />
                            <div className="h-7 w-20 bg-muted/50 rounded-full" />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

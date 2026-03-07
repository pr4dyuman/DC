
export function ProjectDetailSkeleton() {
    return (
        <div className="space-y-6 animate-pulse">
            {/* Header */}
            <div className="flex items-center gap-4">
                <div className="h-9 w-9 rounded-full bg-muted" />
                <div className="flex-1 space-y-2">
                    <div className="h-7 w-64 bg-muted rounded" />
                    <div className="h-4 w-40 bg-muted/60 rounded" />
                </div>
                <div className="h-9 w-28 bg-muted rounded-md" />
            </div>

            {/* Info Cards Row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[1, 2, 3, 4].map(i => (
                    <div key={i} className="rounded-xl border border-border bg-card p-4 space-y-2">
                        <div className="h-3 w-16 bg-muted/60 rounded" />
                        <div className="h-6 w-20 bg-muted rounded" />
                    </div>
                ))}
            </div>

            {/* Tabs */}
            <div className="h-10 w-full bg-muted rounded-lg" />

            {/* Task List */}
            <div className="space-y-3">
                {[1, 2, 3, 4, 5].map(i => (
                    <div key={i} className="flex items-center gap-4 rounded-lg border border-border bg-card px-4 py-3">
                        <div className="h-4 w-4 bg-muted rounded" />
                        <div className="flex-1 space-y-1.5">
                            <div className="h-4 w-3/4 bg-muted rounded" />
                            <div className="h-3 w-1/3 bg-muted/50 rounded" />
                        </div>
                        <div className="h-5 w-16 bg-muted rounded-full" />
                        <div className="h-6 w-6 rounded-full bg-muted" />
                    </div>
                ))}
            </div>
        </div>
    );
}

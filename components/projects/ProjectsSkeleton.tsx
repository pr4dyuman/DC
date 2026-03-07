
export function ProjectsSkeleton() {
    return (
        <div className="space-y-5 animate-pulse">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <div className="h-8 w-32 bg-muted rounded" />
                    <div className="h-4 w-24 bg-muted/60 rounded mt-2" />
                </div>
                <div className="flex items-center gap-2">
                    <div className="h-9 w-9 bg-muted rounded-md" />
                    <div className="h-9 w-36 bg-muted rounded-md" />
                    <div className="h-9 w-20 bg-muted rounded-md" />
                    <div className="h-9 w-32 bg-muted rounded-md" />
                </div>
            </div>

            {/* Status Pills */}
            <div className="flex flex-wrap gap-2">
                {[1, 2, 3, 4].map(i => (
                    <div key={i} className="h-7 w-20 bg-muted rounded-full" />
                ))}
            </div>

            {/* Card Grid */}
            <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                {[1, 2, 3, 4, 5, 6].map(i => (
                    <div key={i} className="rounded-xl border border-border bg-card p-5 space-y-3">
                        {/* Card Header */}
                        <div className="flex justify-between items-start gap-2">
                            <div className="flex-1 min-w-0 space-y-2">
                                <div className="h-5 w-3/4 bg-muted rounded" />
                                <div className="flex gap-1.5">
                                    <div className="h-5 w-16 bg-muted/60 rounded-full" />
                                    <div className="h-5 w-20 bg-muted/60 rounded-full" />
                                </div>
                            </div>
                            <div className="h-5 w-16 bg-muted rounded-full" />
                        </div>

                        {/* Task Status */}
                        <div className="flex gap-2">
                            <div className="h-3 w-12 bg-muted/50 rounded" />
                            <div className="h-3 w-16 bg-muted/50 rounded" />
                        </div>

                        {/* Progress Bar */}
                        <div className="space-y-1.5">
                            <div className="flex justify-between">
                                <div className="h-3 w-16 bg-muted/50 rounded" />
                                <div className="h-3 w-8 bg-muted/50 rounded" />
                            </div>
                            <div className="h-1.5 w-full bg-muted rounded-full" />
                        </div>

                        {/* Footer */}
                        <div className="flex items-center justify-between pt-1">
                            <div className="flex -space-x-2">
                                {[1, 2, 3].map(j => (
                                    <div key={j} className="h-6 w-6 rounded-full bg-muted border-2 border-card" />
                                ))}
                            </div>
                            <div className="h-3 w-14 bg-muted/50 rounded" />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

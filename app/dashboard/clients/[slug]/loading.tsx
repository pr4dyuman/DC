export default function Loading() {
    return (
        <div className="flex-1 space-y-6 animate-pulse">
            <div className="flex items-center gap-3">
                <div className="h-6 w-6 bg-muted rounded" />
                <div className="h-7 w-48 bg-muted rounded" />
            </div>
            <div className="grid gap-6 grid-cols-1 lg:grid-cols-3">
                <div className="lg:col-span-2 space-y-4">
                    <div className="rounded-lg border bg-card p-6 space-y-4">
                        <div className="flex gap-4">
                            <div className="h-16 w-16 bg-muted rounded-full" />
                            <div className="space-y-2 flex-1">
                                <div className="h-5 w-40 bg-muted rounded" />
                                <div className="h-4 w-56 bg-muted rounded" />
                            </div>
                        </div>
                    </div>
                    <div className="rounded-lg border bg-card p-6 space-y-3">
                        <div className="h-5 w-28 bg-muted rounded" />
                        {[1, 2, 3].map((i) => (
                            <div key={i} className="flex items-center gap-4 p-3 rounded border bg-background">
                                <div className="h-4 w-48 bg-muted rounded flex-1" />
                                <div className="h-4 w-20 bg-muted rounded" />
                            </div>
                        ))}
                    </div>
                </div>
                <div className="space-y-4">
                    <div className="rounded-lg border bg-card p-6 h-40" />
                    <div className="rounded-lg border bg-card p-6 h-32" />
                </div>
            </div>
        </div>
    );
}

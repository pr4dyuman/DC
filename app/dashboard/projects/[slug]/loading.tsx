export default function Loading() {
    return (
        <div className="flex-1 space-y-6 animate-pulse">
            <div className="flex items-center gap-3">
                <div className="h-6 w-6 bg-muted rounded" />
                <div className="h-7 w-56 bg-muted rounded" />
                <div className="ml-auto h-9 w-24 bg-muted rounded" />
            </div>
            <div className="grid gap-4 grid-cols-1 md:grid-cols-3">
                {[1, 2, 3].map((i) => (
                    <div key={i} className="rounded-lg border bg-card p-5 space-y-2">
                        <div className="h-4 w-20 bg-muted rounded" />
                        <div className="h-6 w-16 bg-muted rounded" />
                    </div>
                ))}
            </div>
            <div className="rounded-lg border bg-card p-6 space-y-4">
                <div className="h-5 w-32 bg-muted rounded" />
                <div className="space-y-3">
                    {[1, 2, 3, 4].map((i) => (
                        <div key={i} className="flex items-center gap-4 p-3 rounded border bg-background">
                            <div className="h-4 w-4 bg-muted rounded" />
                            <div className="h-4 w-48 bg-muted rounded flex-1" />
                            <div className="h-6 w-20 bg-muted rounded-full" />
                            <div className="h-4 w-24 bg-muted rounded" />
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

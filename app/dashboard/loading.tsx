export default function Loading() {
    return (
        <div className="flex-1 space-y-6 animate-pulse">
            <div className="flex items-center gap-4">
                <div className="h-8 w-8 bg-muted rounded" />
                <div className="h-8 w-48 bg-muted rounded" />
            </div>
            <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-4">
                {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="rounded-lg border bg-card p-6 space-y-3">
                        <div className="h-4 w-24 bg-muted rounded" />
                        <div className="h-8 w-20 bg-muted rounded" />
                        <div className="h-3 w-32 bg-muted rounded" />
                    </div>
                ))}
            </div>
            <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
                <div className="rounded-lg border bg-card p-6 h-64" />
                <div className="rounded-lg border bg-card p-6 h-64" />
            </div>
        </div>
    );
}

export default function Loading() {
    return (
        <div className="flex-1 space-y-6 animate-pulse">
            <div className="h-8 w-32 bg-muted rounded" />
            <div className="flex gap-2 border-b pb-2">
                {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="h-9 w-28 bg-muted rounded" />
                ))}
            </div>
            <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                    <div key={i} className="h-32 bg-muted rounded-xl" />
                ))}
            </div>
        </div>
    );
}

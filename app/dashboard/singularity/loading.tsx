export default function Loading() {
    return (
        <div className="flex-1 flex items-center justify-center animate-pulse">
            <div className="text-center space-y-4">
                <div className="h-12 w-12 bg-muted rounded-full mx-auto" />
                <div className="h-5 w-48 bg-muted rounded mx-auto" />
                <div className="h-3 w-32 bg-muted rounded mx-auto" />
            </div>
        </div>
    );
}

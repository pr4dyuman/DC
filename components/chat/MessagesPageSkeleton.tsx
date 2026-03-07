
export function MessagesPageSkeleton() {
    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background p-4 md:p-8">
            <div className="w-full max-w-6xl h-[85vh] bg-card border border-border rounded-3xl overflow-hidden shadow-2xl flex flex-col md:flex-row ring-1 ring-border animate-pulse">
                {/* Sidebar */}
                <div className="w-full md:w-80 border-r border-border flex flex-col bg-secondary">
                    <div className="p-4 border-b border-border flex justify-between items-center">
                        <div className="flex items-center gap-3">
                            <div className="h-7 w-7 rounded-lg bg-muted" />
                            <div className="h-6 w-24 bg-muted rounded" />
                        </div>
                    </div>
                    <div className="p-4 pt-2 space-y-3">
                        <div className="h-9 w-full bg-muted rounded-xl" />
                        <div className="h-9 w-full bg-muted rounded-xl" />
                    </div>
                    <div className="flex-1 px-2 space-y-2">
                        {[1, 2, 3, 4, 5].map(i => (
                            <div key={i} className="flex items-center gap-3 p-3 rounded-xl">
                                <div className="h-10 w-10 rounded-full bg-muted" />
                                <div className="flex-1 space-y-1.5">
                                    <div className="h-3.5 w-24 bg-muted rounded" />
                                    <div className="h-3 w-36 bg-muted/60 rounded" />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Main Chat Area */}
                <div className="flex-1 flex flex-col bg-background hidden md:flex">
                    <div className="h-full flex flex-col items-center justify-center text-muted-foreground">
                        <div className="w-20 h-20 bg-muted/50 rounded-3xl" />
                        <div className="h-6 w-48 bg-muted rounded mt-6" />
                        <div className="h-4 w-64 bg-muted/60 rounded mt-2" />
                    </div>
                </div>
            </div>
        </div>
    );
}


export function SingularitySkeleton() {
    return (
        <div className="flex flex-col h-[calc(100vh-8rem)] animate-pulse">
            {/* Header */}
            <div className="flex items-center gap-3 pb-4 border-b border-border">
                <div className="h-9 w-9 rounded-full bg-muted" />
                <div className="space-y-1.5">
                    <div className="h-5 w-28 bg-muted rounded" />
                    <div className="h-3 w-20 bg-muted/60 rounded" />
                </div>
            </div>

            {/* Messages area */}
            <div className="flex-1 py-6 space-y-4">
                {[1, 2, 3].map(i => (
                    <div key={i} className={`flex ${i % 2 === 0 ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[60%] space-y-1.5 ${i % 2 === 0 ? 'items-end' : 'items-start'}`}>
                            <div className={`h-16 ${i % 2 === 0 ? 'w-48' : 'w-64'} bg-muted rounded-2xl`} />
                            <div className="h-3 w-12 bg-muted/40 rounded" />
                        </div>
                    </div>
                ))}
            </div>

            {/* Input area */}
            <div className="pt-4 border-t border-border">
                <div className="h-12 w-full bg-muted rounded-xl" />
            </div>
        </div>
    );
}

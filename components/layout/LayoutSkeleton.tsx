
export function LayoutSkeleton() {
    return (
        <div className="h-full relative flex">
            {/* Sidebar Skeleton */}
            <div className="hidden h-full md:flex md:w-72 md:flex-col md:fixed md:inset-y-0 z-[80] p-4 space-y-4" style={{ backgroundColor: 'var(--sidebar-bg)' }}>
                <div className="h-10 w-32 bg-muted rounded animate-pulse" />
                <div className="space-y-2 pt-10">
                    {[1, 2, 3, 4, 5, 6].map((i) => (
                        <div key={i} className="h-10 w-full bg-muted rounded animate-pulse" />
                    ))}
                </div>
            </div>

            {/* Main Content Skeleton */}
            <main className="flex-1 md:pl-72 min-h-screen pb-10" style={{ backgroundColor: 'var(--content-bg)', color: 'var(--foreground)' }}>
                {/* Topbar Skeleton */}
                <div className="h-16 border-b border-border flex items-center px-8 gap-4">
                    <div className="h-8 w-64 bg-muted rounded animate-pulse" />
                    <div className="ml-auto h-10 w-10 bg-muted rounded-full animate-pulse" />
                </div>

                <div className="p-8 space-y-4">
                    {/* Dashboard Content Placeholder - technically DashboardSkeleton handles this, but this is for layout loading */}
                    <div className="h-32 bg-muted rounded animate-pulse" />
                    <div className="grid grid-cols-3 gap-4">
                        <div className="h-32 bg-muted rounded animate-pulse" />
                        <div className="h-32 bg-muted rounded animate-pulse" />
                        <div className="h-32 bg-muted rounded animate-pulse" />
                    </div>
                </div>
            </main>
        </div>
    );
}

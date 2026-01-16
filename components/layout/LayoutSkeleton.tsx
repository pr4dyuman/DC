
export function LayoutSkeleton() {
    return (
        <div className="h-full relative flex">
            {/* Sidebar Skeleton */}
            <div className="hidden h-full md:flex md:w-72 md:flex-col md:fixed md:inset-y-0 z-[80] bg-gray-900 p-4 space-y-4">
                <div className="h-10 w-32 bg-gray-800 rounded animate-pulse" />
                <div className="space-y-2 pt-10">
                    {[1, 2, 3, 4, 5, 6].map((i) => (
                        <div key={i} className="h-10 w-full bg-gray-800 rounded animate-pulse" />
                    ))}
                </div>
            </div>

            {/* Main Content Skeleton */}
            <main className="flex-1 md:pl-72 min-h-screen bg-[#111827] text-gray-100 pb-10">
                {/* Topbar Skeleton */}
                <div className="h-16 border-b border-gray-800 flex items-center px-8 gap-4">
                     <div className="h-8 w-64 bg-gray-800 rounded animate-pulse" />
                     <div className="ml-auto h-10 w-10 bg-gray-800 rounded-full animate-pulse" />
                </div>
                
                <div className="p-8 space-y-4">
                     {/* Dashboard Content Placeholder - technically DashboardSkeleton handles this, but this is for layout loading */}
                     <div className="h-32 bg-gray-800 rounded animate-pulse" />
                     <div className="grid grid-cols-3 gap-4">
                        <div className="h-32 bg-gray-800 rounded animate-pulse" />
                        <div className="h-32 bg-gray-800 rounded animate-pulse" />
                        <div className="h-32 bg-gray-800 rounded animate-pulse" />
                     </div>
                </div>
            </main>
        </div>
    );
}


import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function DashboardSkeleton() {
    return (
        <div className="flex-1 space-y-4 animate-pulse">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between space-y-4 sm:space-y-0">
                <div className="space-y-2">
                    <div className="h-8 w-48 bg-gray-200 rounded"></div>
                    <div className="h-4 w-32 bg-gray-200 rounded hidden sm:block"></div>
                </div>
                <div className="h-9 w-32 bg-gray-200 rounded"></div>
            </div>

            <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
                {[1, 2, 3, 4].map((i) => (
                    <Card key={i}>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <div className="h-4 w-24 bg-gray-200 rounded"></div>
                            <div className="h-4 w-4 bg-gray-200 rounded"></div>
                        </CardHeader>
                        <CardContent>
                            <div className="h-8 w-16 bg-gray-200 rounded mb-2"></div>
                            <div className="h-3 w-32 bg-gray-200 rounded"></div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-7">
                <div className="col-span-4 h-[350px] bg-gray-200 rounded-xl"></div>
                <div className="col-span-3 h-[350px] bg-gray-200 rounded-xl"></div>
            </div>

            <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
                 <div className="h-[300px] bg-gray-200 rounded-xl"></div>
                 <div className="h-[300px] bg-gray-200 rounded-xl"></div>
            </div>
        </div>
    );
}

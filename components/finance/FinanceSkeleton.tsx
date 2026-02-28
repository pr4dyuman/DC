
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function FinanceSkeleton() {
    return (
        <div className="flex-1 space-y-4 animate-pulse">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between space-y-4 sm:space-y-0">
                <div className="h-8 w-32 bg-muted rounded"></div>
                <div className="flex flex-col items-end space-y-2">
                    <div className="flex items-center space-x-2">
                        <div className="h-9 w-32 bg-muted rounded"></div>
                    </div>
                    <div className="h-12 w-48 bg-muted rounded"></div>
                </div>
            </div>

            <div className="h-16 w-full bg-muted rounded"></div>

            <div className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    {[1, 2, 3, 4].map(i => (
                        <div key={i} className="h-24 bg-muted rounded-xl"></div>
                    ))}
                </div>

                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
                    <div className="col-span-4 h-[400px] bg-muted rounded-xl"></div>
                    <div className="col-span-3 h-[400px] bg-muted rounded-xl"></div>
                </div>
            </div>
        </div>
    );
}

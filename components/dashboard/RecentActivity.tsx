import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Activity } from "@/lib/types";

export function RecentActivity({ activities }: { activities: Activity[] }) {
    return (
        <Card className="min-w-0 lg:col-span-3">
            <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
                <CardDescription>
                    Latest actions performed by your team
                </CardDescription>
            </CardHeader>
            <CardContent>
                <div className="space-y-8">
                    {activities.length === 0 && <p className="text-sm text-muted-foreground">No recent activity.</p>}

                    {activities.map((activity) => (
                        <div key={activity.id} className="flex items-center">
                            <Avatar className="h-9 w-9">
                                <AvatarFallback className="bg-indigo-100 text-indigo-700 font-medium">
                                    {activity.user.charAt(0)}
                                </AvatarFallback>
                            </Avatar>
                            <div className="ml-4 space-y-1">
                                <p className="text-sm font-medium leading-none">
                                    <span className="font-bold text-foreground">{activity.user}</span>{" "}
                                    {activity.action}{" "}
                                    <span className="font-semibold text-foreground">{activity.target}</span>
                                </p>
                                <p className="text-xs text-muted-foreground">
                                    {format(new Date(activity.timestamp), "MMM d, yyyy")}
                                </p>
                            </div>
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    );
}

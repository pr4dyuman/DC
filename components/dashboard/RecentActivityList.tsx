"use client";

import { useState, useEffect } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useInView } from "react-intersection-observer";
import { getRecentActivity } from "@/lib/actions";
import { Loader2 } from "lucide-react";
import { format } from "date-fns";
import { Activity } from "@/lib/db";

interface RecentActivityListProps {
    initialActivities: Activity[];
}

export function RecentActivityList({ initialActivities }: RecentActivityListProps) {
    const [activities, setActivities] = useState<Activity[]>(initialActivities);
    const [offset, setOffset] = useState(initialActivities.length);
    const [hasMore, setHasMore] = useState(true);
    const [loading, setLoading] = useState(false);
    const { ref, inView } = useInView();

    const loadMore = async () => {
        if (loading || !hasMore) return;
        setLoading(true);
        try {
            const newActivities = await getRecentActivity(offset, 5);
            if (newActivities.length < 5) {
                setHasMore(false);
            }
            setActivities((prev) => [...prev, ...newActivities]);
            setOffset((prev) => prev + 5);
        } catch (error) {
            console.error("Failed to load more activities", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (inView) {
            loadMore();
        }
    }, [inView]);

    return (
        <Card className="col-span-3 transition-all duration-300 hover:shadow-md">
            <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
                <CardDescription>
                    Latest actions performed by your team
                </CardDescription>
            </CardHeader>
            <CardContent>
                <ScrollArea
                    className="h-[300px] group pr-4"
                    scrollBarClassName="opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                >
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
                        {hasMore && (
                            <div ref={ref} className="flex justify-center p-4">
                                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                            </div>
                        )}
                    </div>
                </ScrollArea>
            </CardContent>
        </Card>
    );
}

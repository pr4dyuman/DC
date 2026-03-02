"use client";

import { useState, useEffect } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useInView } from "react-intersection-observer";
import { getRecentActivity } from "@/lib/actions";
import { Loader2, ArrowUpRight } from "lucide-react";
import { format } from "date-fns";
import { Activity } from "@/lib/types";
import Link from "next/link";

interface RecentActivityListProps {
    initialActivities: Activity[];
}

function buildActivityLink(activity: Activity): string | null {
    // Use structured entityId/entityType if available (future activities)
    if (activity.entityId && activity.entityType) {
        switch (activity.entityType) {
            case 'task': return `/dashboard/projects/${activity.entityId}`;
            case 'project': return `/dashboard/projects/${activity.entityId}`;
            case 'invoice': return `/dashboard/finance`;
            case 'client': return `/dashboard/clients`;
            case 'user': return `/dashboard/team`;
        }
    }

    // Fallback: infer from action text for existing records
    const action = activity.action.toLowerCase();
    if (action.includes('task') || action.includes('assigned') || action.includes('completed')) {
        return `/dashboard/projects`;
    }
    if (action.includes('invoice') || action.includes('payment') || action.includes('transaction')) {
        return `/dashboard/finance`;
    }
    if (action.includes('project') || action.includes('created project')) {
        return `/dashboard/projects`;
    }
    if (action.includes('client')) {
        return `/dashboard/clients`;
    }
    if (action.includes('team') || action.includes('user') || action.includes('employee')) {
        return `/dashboard/team`;
    }
    return null;
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

                        {activities.map((activity) => {
                            const link = buildActivityLink(activity);
                            const content = (
                                <div className={`flex items-center gap-2 rounded-lg p-1 -m-1 transition-colors ${link ? 'hover:bg-muted/40 cursor-pointer group/row' : ''}`}>
                                    <Avatar className="h-9 w-9 shrink-0">
                                        <AvatarFallback className="bg-indigo-500/20 text-indigo-400 font-medium">
                                            {activity.user.charAt(0)}
                                        </AvatarFallback>
                                    </Avatar>
                                    <div className="ml-2 space-y-1 flex-1 min-w-0">
                                        <p className="text-sm font-medium leading-none">
                                            <span className="font-bold text-foreground">{activity.user}</span>{" "}
                                            {activity.action}{" "}
                                            <span className="font-semibold text-foreground">{activity.target}</span>
                                        </p>
                                        <p className="text-xs text-muted-foreground">
                                            {format(new Date(activity.timestamp), "MMM d, yyyy")}
                                        </p>
                                    </div>
                                    {link && (
                                        <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover/row:opacity-100 transition-opacity shrink-0" />
                                    )}
                                </div>
                            );

                            return (
                                <div key={activity.id}>
                                    {link ? (
                                        <Link href={link} className="block">
                                            {content}
                                        </Link>
                                    ) : content}
                                </div>
                            );
                        })}
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

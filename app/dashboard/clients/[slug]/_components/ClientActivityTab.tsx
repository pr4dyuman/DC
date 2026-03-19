"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity as ActivityType } from "@/lib/types";
import { Loader2 } from "lucide-react";

type ActivityGroup = {
    label: string;
    items: ActivityType[];
};

type ClientActivityTabProps = {
    activities: ActivityType[];
    groupedActivities: ActivityGroup[];
    hasMoreActivities: boolean;
    activitySentinelRef: (node: HTMLDivElement | null) => void;
    formatTime: (value?: string | Date) => string;
};

export function ClientActivityTab({
    activities,
    groupedActivities,
    hasMoreActivities,
    activitySentinelRef,
    formatTime,
}: ClientActivityTabProps) {
    return (
        <Card className="bg-card border-border">
            <CardHeader>
                <CardTitle>Activity Log</CardTitle>
                <CardDescription>All activities associated with this client.</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="space-y-6">
                    {activities.length === 0 ? (
                        <div className="text-center py-12 text-muted-foreground">No activity recorded for this client.</div>
                    ) : (
                        <>
                            {groupedActivities.map((group, groupIndex) => (
                                <div key={groupIndex}>
                                    <div className="flex items-center gap-3 mb-4">
                                        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{group.label}</span>
                                        <div className="flex-1 h-px bg-border" />
                                    </div>
                                    <div className="space-y-6 mb-6">
                                        {group.items.map((activity, activityIndex) => (
                                            <div key={activity.id || `${groupIndex}-${activityIndex}`} className="flex gap-4 relative">
                                                {activityIndex !== group.items.length - 1 && (
                                                    <div className="absolute left-2.5 top-8 bottom-[-24px] w-px bg-border" />
                                                )}
                                                <div className="h-5 w-5 rounded-full bg-muted border-2 border-primary z-10 flex-shrink-0 mt-1" />
                                                <div className="flex-1 pb-1">
                                                    <div className="flex justify-between items-start">
                                                        <p className="text-sm font-medium text-foreground">
                                                            <span className="text-yellow-500">{activity.action}</span> {activity.target}
                                                        </p>
                                                        <span className="text-xs text-muted-foreground ml-2 shrink-0">
                                                            {formatTime(activity.timestamp)}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}

                            {hasMoreActivities && (
                                <div ref={activitySentinelRef} className="flex justify-center py-4">
                                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                                </div>
                            )}
                        </>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}

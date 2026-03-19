"use client";

import { Activity } from "@/lib/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { TabsContent } from "@/components/ui/tabs";
import { Loader2 } from "lucide-react";

interface EmployeeProfileActivityTabProps {
    userName: string;
    groupedActivities: Array<{
        label: string;
        items: Activity[];
    }>;
    formatTime: (value: string | Date) => string;
    hasMoreActivities: boolean;
    activitySentinelRef: (node: HTMLDivElement | null) => void;
}

export function EmployeeProfileActivityTab({
    userName,
    groupedActivities,
    formatTime,
    hasMoreActivities,
    activitySentinelRef,
}: EmployeeProfileActivityTabProps) {
    return (
        <TabsContent value="activity" className="animate-in slide-in-from-bottom-2 duration-300">
            <Card className="bg-card border-border">
                <CardHeader>
                    <CardTitle>Recent Activity</CardTitle>
                    <CardDescription>Latest actions performed by {userName}</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="space-y-6">
                        {groupedActivities.length === 0 ? (
                            <div className="text-center py-10 text-muted-foreground">No recent activity found.</div>
                        ) : (
                            <>
                                {groupedActivities.map((group, groupIndex) => (
                                    <div key={groupIndex}>
                                        <div className="flex items-center gap-3 mb-4">
                                            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{group.label}</span>
                                            <div className="flex-1 h-px bg-border" />
                                        </div>
                                        <div className="space-y-6 mb-6">
                                            {group.items.map((activity, itemIndex) => (
                                                <div key={activity.id || `${groupIndex}-${itemIndex}`} className="flex gap-4 relative">
                                                    {itemIndex !== group.items.length - 1 && (
                                                        <div className="absolute left-2.5 top-8 bottom-[-24px] w-px bg-border" />
                                                    )}

                                                    <div className="h-5 w-5 rounded-full bg-muted border-2 border-primary z-10 flex-shrink-0 mt-1" />

                                                    <div className="flex-1 pb-1">
                                                        <div className="flex justify-between items-start">
                                                            <div>
                                                                <p className="text-sm font-medium text-foreground">
                                                                    <span className="text-primary">{activity.action}</span> {activity.target}
                                                                </p>
                                                                <p className="text-xs text-muted-foreground mt-1">
                                                                    {formatTime(activity.timestamp)}
                                                                </p>
                                                            </div>
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
        </TabsContent>
    );
}

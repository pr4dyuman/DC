"use client";

import { useState, useEffect } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useInView } from "react-intersection-observer";
import { getNotifications } from "@/lib/actions";
import { Loader2, Activity } from "lucide-react";
import { Notification } from "@/lib/db";

interface ClientNotificationsListProps {
    initialNotifications: Notification[];
    userId: string;
}

export function ClientNotificationsList({ initialNotifications, userId }: ClientNotificationsListProps) {
    const [notifications, setNotifications] = useState<Notification[]>(initialNotifications);
    const [offset, setOffset] = useState(initialNotifications.length);
    const [hasMore, setHasMore] = useState(true);
    const [loading, setLoading] = useState(false);
    const { ref, inView } = useInView();

    const loadMore = async () => {
        if (loading || !hasMore) return;
        setLoading(true);
        try {
            const newNotifications = await getNotifications(userId, offset, 5);
            if (newNotifications.length < 5) {
                setHasMore(false);
            }
            setNotifications((prev) => [...prev, ...newNotifications]);
            setOffset((prev) => prev + 5);
        } catch (error) {
            console.error("Failed to load more notifications", error);
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
        <Card className="col-span-1 h-full transition-all duration-300 hover:shadow-md">
            <CardHeader>
                <CardTitle>Recent Updates</CardTitle>
            </CardHeader>
            <CardContent>
                <ScrollArea
                    className="h-[300px] group pr-4"
                    scrollBarClassName="opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                >
                    {notifications.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">No new notifications.</div>
                    ) : (
                        <div className="space-y-4">
                            {notifications.map((n, i) => (
                                <div key={i} className="flex gap-4 items-start p-3 rounded-lg hover:bg-white/5 transition">
                                    <div className="bg-indigo-500/10 p-2 rounded-full mt-1">
                                        <Activity className="w-4 h-4 text-indigo-400" />
                                    </div>
                                    <div>
                                        <p className="text-sm text-zinc-200">{n.message}</p>
                                        <p className="text-xs text-muted-foreground mt-1">
                                            {new Date(n.timestamp).toLocaleDateString()}
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
                    )}
                </ScrollArea>
            </CardContent>
        </Card>
    );
}

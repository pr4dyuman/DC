"use client";

import { useRouter } from "next/navigation";
import { Bell } from "lucide-react";
import { useDateFormat } from "@/context/TimezoneContext";
import type { Notification } from "@/lib/types";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";

type TopbarNotificationsMenuProps = {
    mounted: boolean;
    notifications: Notification[];
    unreadCount: number;
    onNotificationRead: (id: string) => Promise<void> | void;
};

export function TopbarNotificationsMenu({
    mounted,
    notifications,
    unreadCount,
    onNotificationRead,
}: TopbarNotificationsMenuProps) {
    const fmt = useDateFormat();
    const router = useRouter();

    if (!mounted) {
        return (
            <button aria-label="Notifications" className="relative p-2 rounded-full hover:bg-accent transition-colors outline-none">
                <Bell className="h-5 w-5 text-muted-foreground" />
            </button>
        );
    }

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <button aria-label="Notifications" className="relative p-2 rounded-full hover:bg-accent transition-colors outline-none">
                    <Bell className="h-5 w-5 text-muted-foreground" />
                    {unreadCount > 0 && (
                        <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-red-600 border border-background" />
                    )}
                </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80">
                <DropdownMenuLabel className="flex items-center justify-between">
                    <span>Notifications</span>
                    {unreadCount > 0 && (
                        <span className="bg-red-100 text-red-600 text-xs px-2 py-0.5 rounded-full">
                            {unreadCount} New
                        </span>
                    )}
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <ScrollArea className="h-[300px]">
                    {notifications.length === 0 ? (
                        <div className="p-4 text-center text-sm text-muted-foreground">
                            No notifications yet.
                        </div>
                    ) : (
                        <div className="flex flex-col">
                            {notifications.map((notification) => (
                                <button
                                    type="button"
                                    key={notification.id}
                                    className={`w-full text-left p-4 border-b last:border-0 hover:bg-muted/50 transition-colors ${!notification.read ? "bg-muted/20" : ""}`}
                                    onClick={() => {
                                        if (!notification.read) onNotificationRead(notification.id);
                                        if (notification.link) {
                                            router.push(notification.link);
                                        }
                                    }}
                                >
                                    <div className="flex items-start justify-between gap-2">
                                        <p className={`text-sm ${!notification.read ? "font-medium" : "text-muted-foreground"}`}>
                                            {notification.message}
                                        </p>
                                        {!notification.read && (
                                            <div className="h-2 w-2 shrink-0 rounded-full bg-blue-500 mt-1.5" />
                                        )}
                                    </div>
                                    <p className="text-xs text-muted-foreground mt-1">
                                        {fmt.dateTime(notification.timestamp)}
                                    </p>
                                </button>
                            ))}
                        </div>
                    )}
                </ScrollArea>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}

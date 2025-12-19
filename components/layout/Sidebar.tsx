"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { LayoutDashboard, FolderKanban, Banknote, Users, Settings, LogOut, Briefcase, User, MessageCircle } from "lucide-react";
import { ChatOverlay } from "@/components/chat/ChatOverlay";
import Cookies from "js-cookie";

// Define routes
type Route = {
    label: string;
    icon: any;
    href: string;
    color: string;
    onClick?: () => void;
};

const baseRoutes: Route[] = [
    { label: "Dashboard", icon: LayoutDashboard, href: "/dashboard", color: "text-sky-500" },
    { label: "Projects", icon: FolderKanban, href: "/dashboard/projects", color: "text-violet-500" },
    { label: "Finance", icon: Banknote, href: "/dashboard/finance", color: "text-emerald-500" },
    { label: "Team", icon: Users, href: "/dashboard/team", color: "text-orange-700" },
    { label: "Settings", icon: Settings, href: "/dashboard/settings", color: "text-gray-500" },
];

import { getSystemSettings } from "@/lib/actions";
import { getTotalUnreadCount, heartbeat } from "@/lib/chat";
import { useActivePolling } from "@/hooks/use-active-polling";
import { useChat } from "@/context/ChatContext";

interface SidebarProps {
    currentUserId?: string;
    currentUserRole?: string; // Passed from layout
}

export function Sidebar({ currentUserId, currentUserRole = 'admin' }: SidebarProps) {
    const pathname = usePathname();
    const router = useRouter();
    const [mounted, setMounted] = useState(false);
    const [settings, setSettings] = useState({ systemName: "AgencyOS", logo: "" });
    const { isOpen: isChatOpen, openChat, closeChat, targetContactId } = useChat();
    const [unreadCount, setUnreadCount] = useState(0);

    useEffect(() => {
        setMounted(true);
        getSystemSettings().then(v => {
            if (v) setSettings(v);
        });
    }, []);

    // Initial fetch on mount
    useEffect(() => {
        if (currentUserId) {
            getTotalUnreadCount(currentUserId).then(setUnreadCount);
            heartbeat(currentUserId);
        }
    }, [currentUserId]);

    // Smart polling: every 60s, but only if visible
    useActivePolling(() => {
        if (currentUserId) {
            getTotalUnreadCount(currentUserId).then(setUnreadCount);
            heartbeat(currentUserId);
        }
    }, 60000, !!currentUserId);

    const handleLogout = () => {
        Cookies.remove("userId");
        router.push("/login");
        router.refresh();
    };

    // Construct routes dynamically based on Role
    let visibleRoutes = [...baseRoutes];

    if (currentUserRole === 'employee') {
        const allowedLabels = ['Dashboard', 'Projects', 'Team']; // Employee Access
        visibleRoutes = baseRoutes.filter(r => allowedLabels.includes(r.label));
    }

    const routes = [
        visibleRoutes[0], // Dashboard
        ...(currentUserId ? [{ label: "Profile", icon: User, href: `/dashboard/team/${currentUserId}`, color: "text-amber-500" }] : []),
        { label: "Messages", icon: MessageCircle, href: "#", color: "text-blue-500", onClick: () => openChat() },
        ...visibleRoutes.slice(1)
    ];

    return (
        <>
            <div className="space-y-4 py-4 flex flex-col h-full bg-slate-900 text-white">
                <div className="px-3 py-2 flex-1">
                    <Link href="/dashboard" className="flex items-center pl-3 mb-14">
                        {settings.logo ? (
                            <img src={settings.logo} alt="Logo" className="w-8 h-8 mr-4 rounded-lg object-cover bg-white" />
                        ) : (
                            <div className="relative w-8 h-8 mr-4">
                                <div className="absolute inset-0 bg-gradient-to-tr from-indigo-500 to-purple-500 rounded-lg" />
                            </div>
                        )}
                        <h1 className="text-2xl font-bold truncate">{settings.systemName}</h1>
                    </Link>
                    <div className="space-y-1">
                        {routes.map((route) => (
                            <div key={route.href}>
                                {route.onClick ? (
                                    <button
                                        onClick={route.onClick}
                                        className={cn(
                                            "text-sm group flex p-3 w-full justify-start font-medium cursor-pointer hover:text-white hover:bg-white/10 rounded-lg transition",
                                            (isChatOpen && route.label === "Messages") ? "text-white bg-white/10" : "text-zinc-300"
                                        )}
                                    >
                                        <div className="flex items-center flex-1 justify-between">
                                            <div className="flex items-center">
                                                <route.icon className={cn("h-5 w-5 mr-3", route.color)} />
                                                {route.label}
                                            </div>
                                            {route.label === "Messages" && unreadCount > 0 && (
                                                <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                                                    {unreadCount}
                                                </span>
                                            )}
                                        </div>
                                    </button>
                                ) : (
                                    <Link
                                        href={route.href}
                                        className={cn(
                                            "text-sm group flex p-3 w-full justify-start font-medium cursor-pointer hover:text-white hover:bg-white/10 rounded-lg transition",
                                            (mounted && pathname === route.href) ? "text-white bg-white/10" : "text-zinc-300"
                                        )}
                                    >
                                        <div className="flex items-center flex-1">
                                            <route.icon className={cn("h-5 w-5 mr-3", route.color)} />
                                            {route.label}
                                        </div>
                                    </Link>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
                <div className="px-3 py-2">
                    <button onClick={handleLogout} className="text-sm group flex p-3 w-full justify-start font-medium cursor-pointer hover:text-white hover:bg-white/10 rounded-lg transition text-zinc-400">
                        <div className="flex items-center flex-1">
                            <LogOut className="h-5 w-5 mr-3 text-red-500" />
                            Logout
                        </div>
                    </button>
                </div>
            </div>

            <ChatOverlay
                isOpen={isChatOpen}
                onClose={closeChat}
                currentUserId={currentUserId}
                initialActiveId={targetContactId}
            />
        </>
    );
}

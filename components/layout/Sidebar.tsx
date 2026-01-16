"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
    LayoutDashboard, 
    Users, 
    Briefcase, 
    DollarSign, 
    Settings, 
    CheckSquare, 
    FileText,
    PieChart,
    Building2,
    MessageCircle
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useChat } from "@/context/ChatContext";

interface SidebarProps {
    currentUserId?: string;
    currentUserUsername?: string;
    currentUserRole?: string;
}

export function Sidebar({ currentUserId, currentUserUsername, currentUserRole }: SidebarProps) {
    const pathname = usePathname();
    const { openChat } = useChat();

    const routes = [
        {
            label: "Dashboard",
            icon: LayoutDashboard,
            href: "/dashboard",
            color: "text-sky-500",
        },
        {
            label: "Projects",
            icon: Briefcase,
            href: "/dashboard/projects",
            color: "text-violet-500",
        },

        {
            label: "Messages",
            icon: MessageCircle,
            href: "#", 
            color: "text-green-500",
            isAction: true,
            onClick: () => openChat(),
        },
        {
            label: "Team",
            icon: Users,
            href: "/dashboard/team",
            color: "text-orange-700",
        },
        {
            label: "Finance",
            icon: DollarSign,
            href: "/dashboard/finance",
            color: "text-emerald-500",
        },
        {
            label: "Clients",
            icon: Building2,
            href: "/dashboard/clients",
            color: "text-blue-500",
        },
        {
            label: "Settings",
            icon: Settings,
            href: "/dashboard/settings",
            color: "text-gray-500",
        }
    ].filter(route => {
        if (route.href === "/dashboard/clients") {
            return currentUserRole === 'admin';
        }
        if (route.href === "/dashboard/team" && currentUserRole === 'client') {
            return false;
        }
        if (route.href === "/dashboard/finance" && currentUserRole === 'client') {
             // Keep finance explicitly enabled or disabled based on preference, but usually enabled.
             return true; 
        }
        if (route.href === "/dashboard/settings" && currentUserRole === 'client') {
            return false;
        }
        return true;
    });

    return (
        <div className="space-y-4 py-4 flex flex-col h-full bg-[#111827] text-white">
            <div className="px-3 py-2 flex-1">
                <Link href="/dashboard" className="flex items-center pl-3 mb-14">
                    <div className="relative w-8 h-8 mr-4">
                        <div className="w-8 h-8 bg-indigo-500 rounded-lg flex items-center justify-center font-bold text-white">
                            A
                        </div>
                    </div>
                    <h1 className="text-2xl font-bold">Agency OS</h1>
                </Link>
                <div className="space-y-1">
                    {routes.map((route) => (
                        route.isAction ? (
                            <button
                                key={route.label}
                                onClick={route.onClick}
                                className={cn(
                                    "text-sm group flex p-3 w-full justify-start font-medium cursor-pointer hover:text-white hover:bg-white/10 rounded-lg transition",
                                    "text-zinc-400"
                                )}
                            >
                                <div className="flex items-center flex-1">
                                    <route.icon className={cn("h-5 w-5 mr-3", route.color)} />
                                    {route.label}
                                </div>
                            </button>
                        ) : (
                            <Link
                                key={route.href}
                                href={route.href}
                                className={cn(
                                    "text-sm group flex p-3 w-full justify-start font-medium cursor-pointer hover:text-white hover:bg-white/10 rounded-lg transition",
                                    pathname === route.href ? "text-white bg-white/10" : "text-zinc-400"
                                )}
                            >
                                <div className="flex items-center flex-1">
                                    <route.icon className={cn("h-5 w-5 mr-3", route.color)} />
                                    {route.label}
                                </div>
                            </Link>
                        )
                    ))}
                </div>
            </div>
            
            {/* User Info / Role Badge */}
            <div className="px-3 py-2">
                <div className="bg-white/5 rounded-lg p-3 text-xs text-zinc-400">
                    <p className="font-semibold text-white">{currentUserUsername || "User"}</p>
                    <p className="capitalize">{currentUserRole || "Guest"}</p>
                </div>
            </div>
        </div>
    );
}

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
    MessageCircle,
    Sparkles
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useChat } from "@/context/ChatContext";

interface SidebarProps {
    currentUserId?: string;
    currentUserUsername?: string;
    currentUserRole?: string;
    agencyName?: string;
    agencyLogo?: string;
}

export function Sidebar({ currentUserId, currentUserUsername, currentUserRole, agencyName = "Agency OS", agencyLogo }: SidebarProps) {
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
            label: "Singularity",
            icon: Sparkles,
            href: "/dashboard/singularity",
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
            color: "text-pink-700",
        },
        {
            label: "Finance",
            icon: DollarSign,
            href: "/dashboard/finance",
            color: "text-orange-700",
        },
        {
            label: "Clients",
            icon: Building2,
            href: "/dashboard/clients",
            color: "text-yellow-600",
        },
        {
            label: "Settings",
            icon: Settings,
            href: "/dashboard/settings",
            isSettings: true, // Marker for filtering
        },
    ];

    // Filter routes based on role logic...
    const filteredRoutes = routes.filter(route => {
        if (currentUserRole === 'client') {
            if (route.isSettings) return false;
            if (route.label === 'Team') return false;
            if (route.label === 'Clients') return false;
        }
        return true;
    });

    return (
        <div className="space-y-4 py-4 flex flex-col h-full overflow-y-auto no-scrollbar" style={{ backgroundColor: 'var(--sidebar-bg)', color: 'var(--sidebar-text)' }}>
            <div className="px-3 py-2 flex-1">
                <Link href="/dashboard" className="flex items-center pl-3 mb-14 transition hover:opacity-75">
                    <div className="relative w-8 h-8 mr-4">
                        {agencyLogo ? (
                            <img src={agencyLogo} alt="Logo" className="w-8 h-8 rounded-md object-cover" />
                        ) : (
                            <div className="w-10 h-10 bg-indigo-600 rounded-lg flex items-center justify-center font-bold text-xl">
                                A
                            </div>
                        )}
                    </div>
                    <h1 className="text-xl font-bold truncate max-w-[180px]" title={agencyName}>
                        {agencyName}
                    </h1>
                </Link>
                <div className="space-y-1">
                    {filteredRoutes.map((route) => (
                        route.isAction ? (
                            <button
                                key={route.label}
                                onClick={route.onClick}
                                className={cn(
                                    "text-sm group flex p-3 w-full justify-start font-medium cursor-pointer rounded-lg transition",
                                    "text-[var(--sidebar-muted)] hover:text-[var(--sidebar-text)] hover:bg-[var(--sidebar-hover-bg)]"
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
                                    "text-sm group flex p-3 w-full justify-start font-medium cursor-pointer rounded-lg transition",
                                    "hover:text-[var(--sidebar-text)] hover:bg-[var(--sidebar-hover-bg)]",
                                    pathname === route.href ? "text-[var(--sidebar-text)] bg-[var(--sidebar-active-bg)]" : "text-[var(--sidebar-muted)]"
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
                <div className="rounded-lg p-3 text-xs border" style={{ backgroundColor: 'var(--sidebar-hover-bg)', borderColor: 'var(--sidebar-border)', color: 'var(--sidebar-muted)' }}>
                    <p className="font-semibold" style={{ color: 'var(--sidebar-text)' }}>{currentUserUsername || "User"}</p>
                    <p className="capitalize">{currentUserRole || "Guest"}</p>
                </div>
            </div>
        </div>
    );
}

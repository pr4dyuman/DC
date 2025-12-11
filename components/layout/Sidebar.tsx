"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { LayoutDashboard, FolderKanban, Banknote, Users, Settings, LogOut, Briefcase, BarChart3, CreditCard } from "lucide-react";

const routes = [
    { label: "Dashboard", icon: LayoutDashboard, href: "/dashboard", color: "text-sky-500" },
    { label: "Projects", icon: FolderKanban, href: "/dashboard/projects", color: "text-violet-500" },
    { label: "Finance", icon: Banknote, href: "/dashboard/finance", color: "text-emerald-500" },
    { label: "Team", icon: Users, href: "/dashboard/team", color: "text-orange-700" },
    { label: "Settings", icon: Settings, href: "/dashboard/settings", color: "text-gray-500" },
];

import { getSystemSettings } from "@/lib/actions";

export function Sidebar() {
    const pathname = usePathname();
    const [mounted, setMounted] = useState(false);
    const [settings, setSettings] = useState({ systemName: "AgencyOS", logo: "" });

    useEffect(() => {
        setMounted(true);
        getSystemSettings().then(v => {
            if (v) setSettings(v);
        });
    }, []);

    return (
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
                        <Link
                            key={route.href}
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
                    ))}
                </div>
            </div>
            <div className="px-3 py-2">
                <Link href="/login" className="text-sm group flex p-3 w-full justify-start font-medium cursor-pointer hover:text-white hover:bg-white/10 rounded-lg transition text-zinc-400">
                    <div className="flex items-center flex-1">
                        <LogOut className="h-5 w-5 mr-3 text-red-500" />
                        Logout
                    </div>
                </Link>
            </div>
        </div>
    );
}

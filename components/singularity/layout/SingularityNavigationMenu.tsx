"use client";

import Link from "next/link";
import {
    DollarSign,
    FolderKanban,
    LayoutDashboard,
    Mail,
    Settings,
    Sparkles,
    UserCircle,
    Users,
} from "lucide-react";

import { cn } from "@/lib/utils";

type SingularityNavigationMenuProps = {
    showNavMenu: boolean;
    agencyName: string;
    onClose: () => void;
};

type NavigationItem = {
    icon: typeof LayoutDashboard;
    label: string;
    href: string;
    active?: boolean;
};

const PRIMARY_NAV_ITEMS: NavigationItem[] = [
    { icon: LayoutDashboard, label: "Dashboard", href: "/dashboard" },
    { icon: FolderKanban, label: "Projects", href: "/dashboard/projects" },
    { icon: Sparkles, label: "Singularity", href: "/dashboard/singularity", active: true },
] as const;

const SECONDARY_NAV_ITEMS: NavigationItem[] = [
    { icon: Mail, label: "Messages", href: "/dashboard/messages" },
    { icon: Users, label: "Team", href: "/dashboard/team" },
    { icon: DollarSign, label: "Finance", href: "/dashboard/finance" },
    { icon: UserCircle, label: "Clients", href: "/dashboard/clients" },
] as const;

export function SingularityNavigationMenu({
    showNavMenu,
    agencyName,
    onClose,
}: SingularityNavigationMenuProps) {
    return (
        <>
            <div
                className={cn(
                    "fixed inset-0 z-40 bg-black/40 backdrop-blur-sm transition-all duration-300",
                    showNavMenu ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none",
                )}
                onClick={onClose}
            />
            <div
                className={cn(
                    "fixed top-0 left-0 w-72 sm:w-80 h-full z-50 bg-white dark:bg-neutral-950 border-r border-neutral-200 dark:border-neutral-800 shadow-2xl flex flex-col transition-transform duration-300 ease-in-out",
                    showNavMenu ? "translate-x-0" : "-translate-x-full",
                )}
            >
                <div className="flex items-center px-5 py-4 border-b border-neutral-200 dark:border-neutral-800">
                    <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-cyan-500 flex items-center justify-center">
                            <Sparkles className="w-4 h-4 text-white" />
                        </div>
                        <span className="text-sm font-semibold text-neutral-800 dark:text-neutral-200">{agencyName}</span>
                    </div>
                </div>

                <nav className="flex-1 overflow-y-auto no-scrollbar py-3 px-3">
                    <div className="space-y-0.5">
                        {PRIMARY_NAV_ITEMS.map((item) => (
                            <Link
                                key={item.label}
                                href={item.href}
                                onClick={onClose}
                                className={cn(
                                    "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all duration-200",
                                    item.active
                                        ? "bg-neutral-100 dark:bg-neutral-800/80 text-neutral-900 dark:text-white font-medium"
                                        : "text-neutral-600 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-900 hover:text-neutral-900 dark:hover:text-neutral-200",
                                )}
                            >
                                <item.icon className="w-[18px] h-[18px]" />
                                <span>{item.label}</span>
                            </Link>
                        ))}
                    </div>

                    <div className="my-3 border-t border-neutral-200 dark:border-neutral-800" />

                    <div className="space-y-0.5">
                        {SECONDARY_NAV_ITEMS.map((item) => (
                            <Link
                                key={item.label}
                                href={item.href}
                                onClick={onClose}
                                className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-neutral-600 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-900 hover:text-neutral-900 dark:hover:text-neutral-200 transition-all duration-200"
                            >
                                <item.icon className="w-[18px] h-[18px]" />
                                <span>{item.label}</span>
                            </Link>
                        ))}
                    </div>

                    <div className="my-3 border-t border-neutral-200 dark:border-neutral-800" />

                    <Link
                        href="/dashboard/settings"
                        onClick={onClose}
                        className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-neutral-600 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-900 hover:text-neutral-900 dark:hover:text-neutral-200 transition-all duration-200"
                    >
                        <Settings className="w-[18px] h-[18px]" />
                        <span>Settings</span>
                    </Link>
                </nav>
            </div>
        </>
    );
}

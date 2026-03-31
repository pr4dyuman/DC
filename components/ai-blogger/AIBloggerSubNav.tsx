"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
    BarChart3,
    FilePenLine,
    Gauge,
    RefreshCw,
    Settings,
    Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface NavItem {
    label: string;
    href: string;
    icon: React.ComponentType<{ className?: string }>;
}

const navItems: NavItem[] = [
    { label: "Overview", href: "/dashboard/ai-blogger", icon: Gauge },
    { label: "Generate", href: "/dashboard/ai-blogger/generate", icon: Sparkles },
    { label: "Posts", href: "/dashboard/ai-blogger/posts", icon: FilePenLine },
    { label: "Refresh Queue", href: "/dashboard/ai-blogger/refresh-queue", icon: RefreshCw },
    { label: "Clusters", href: "/dashboard/ai-blogger/clusters", icon: BarChart3 },
    { label: "Settings", href: "/dashboard/ai-blogger/settings", icon: Settings },
];

export function AIBloggerSubNav() {
    const pathname = usePathname();

    const isActive = (href: string) => {
        // Handle exact matches and nested routes
        if (href === "/dashboard/ai-blogger" && pathname === "/dashboard/ai-blogger") {
            return true;
        }
        if (href !== "/dashboard/ai-blogger" && pathname.startsWith(href)) {
            return true;
        }
        return false;
    };

    return (
        <div className="flex overflow-x-auto border-b border-border/40 bg-background/40 backdrop-blur-sm">
            <div className="flex gap-1 px-4 sm:px-6">
                {navItems.map((item) => {
                    const Icon = item.icon;
                    const active = isActive(item.href);

                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={cn(
                                "flex items-center gap-2 whitespace-nowrap border-b-2 px-3 py-3 text-sm font-medium transition-colors duration-200",
                                active
                                    ? "border-primary text-primary"
                                    : "border-transparent text-muted-foreground hover:text-foreground"
                            )}
                        >
                            <Icon className="h-4 w-4" />
                            <span className="hidden sm:inline">{item.label}</span>
                        </Link>
                    );
                })}
            </div>
        </div>
    );
}

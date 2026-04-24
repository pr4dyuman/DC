"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Building2, LayoutDashboard } from "lucide-react";

import { cn } from "@/lib/utils";

type AIBloggerSuperAdminNavProps = {
    selectedAgencyId?: string;
};

export function AIBloggerSuperAdminNav({ selectedAgencyId }: AIBloggerSuperAdminNavProps) {
    const pathname = usePathname();
    const navItems = [
        {
            label: "Overview",
            href: "/super-admin/ai-blogger",
            icon: LayoutDashboard,
        },
        ...(selectedAgencyId
            ? [
                {
                    label: "Agency Config",
                    href: `/super-admin/ai-blogger/agency/${selectedAgencyId}`,
                    icon: Building2,
                },
            ]
            : []),
    ];

    return (
        <nav className="overflow-x-auto rounded-xl border border-border/70 bg-card p-2" aria-label="Super-admin AI Blogger sections">
            <div className="flex min-w-max gap-2">
                {navItems.map((item) => {
                    const active = pathname === item.href || pathname.startsWith(`${item.href}/`);

                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            aria-current={active ? "page" : undefined}
                            className={cn(
                                "inline-flex items-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-medium transition",
                                active
                                    ? "border-primary/30 bg-primary/10 text-primary"
                                    : "border-transparent text-muted-foreground hover:border-border hover:bg-muted hover:text-foreground",
                            )}
                        >
                            <item.icon className="h-4 w-4" />
                            {item.label}
                        </Link>
                    );
                })}
            </div>
        </nav>
    );
}

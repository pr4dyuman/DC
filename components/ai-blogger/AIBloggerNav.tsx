"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { FilePenLine, LayoutDashboard, Settings2, Sparkles } from "lucide-react";

import { cn } from "@/lib/utils";
import { AIBloggerGlassCard, AIBloggerGradientButton } from "@/components/ai-blogger/AIBloggerPrimitives";

type AIBloggerNavProps = {
    basePath?: string;
};

export function AIBloggerNav({ basePath = "/dashboard/ai-blogger" }: AIBloggerNavProps) {
    const pathname = usePathname();
    const navItems = [
        { label: "Overview", href: basePath, icon: LayoutDashboard },
        { label: "Generate", href: `${basePath}/generate`, icon: Sparkles },
        { label: "Posts", href: `${basePath}/posts`, icon: FilePenLine },
        { label: "Settings", href: `${basePath}/settings`, icon: Settings2 },
    ];

    const isActive = (href: string) => {
        if (href === basePath) {
            return pathname === href;
        }

        return pathname === href || pathname.startsWith(`${href}/`);
    };

    const onGeneratePage = pathname === `${basePath}/generate` || pathname.startsWith(`${basePath}/generate/`);

    return (
        <div className="sticky top-4 z-20">
            <AIBloggerGlassCard className="p-2 sm:p-3">
                <div className="flex items-center gap-2">
                    {/* Nav items with horizontal scroll on mobile, faded edges */}
                    <div className="relative min-w-0 flex-1">
                        {/* Left/right fade indicators for mobile scroll */}
                        <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-4 bg-gradient-to-r from-card to-transparent sm:hidden" />
                        <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-4 bg-gradient-to-l from-card to-transparent sm:hidden" />
                        <div className="flex gap-2 overflow-x-auto no-scrollbar scroll-smooth px-1">
                            {navItems.map((item) => {
                                const active = isActive(item.href);
                                return (
                                    <Link
                                        key={item.href}
                                        href={item.href}
                                        className={cn(
                                            "group relative inline-flex min-w-fit items-center gap-2 rounded-2xl border px-4 py-3 text-sm font-semibold transition-all duration-300",
                                            active
                                                ? "border-primary/35 bg-primary/12 text-primary shadow-[0_14px_28px_rgba(212,160,10,0.16)]"
                                                : "border-border/60 bg-background/50 text-muted-foreground hover:border-primary/20 hover:bg-background/80 hover:text-foreground"
                                        )}
                                    >
                                        <div
                                            className={cn(
                                                "flex h-9 w-9 items-center justify-center rounded-2xl border transition-colors",
                                                active
                                                    ? "border-primary/30 bg-primary/15 text-primary"
                                                    : "border-border/60 bg-background/80 text-muted-foreground group-hover:text-primary"
                                            )}
                                        >
                                            <item.icon className="h-4 w-4" />
                                        </div>
                                        <span>{item.label}</span>

                                    </Link>
                                );
                            })}
                        </div>
                    </div>

                    {/* Generate CTA — only shown when NOT on generate page */}
                    {!onGeneratePage && (
                        <div className="hidden shrink-0 sm:block">
                            <AIBloggerGradientButton asChild size="sm">
                                <Link href={`${basePath}/generate`}>
                                    <Sparkles className="h-4 w-4" />
                                    Generate
                                </Link>
                            </AIBloggerGradientButton>
                        </div>
                    )}
                </div>
            </AIBloggerGlassCard>
        </div>
    );
}

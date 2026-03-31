"use client";

import { FilePenLine, CheckCircle2, CalendarClock, TrendingUp } from "lucide-react";
import type { BlogStudioOverviewMetrics } from "@/lib/types-ai-blogger";

interface AIBloggerMetricsBarProps {
    metrics: BlogStudioOverviewMetrics;
}

function formatCompactNumber(value: number) {
    return new Intl.NumberFormat("en", {
        notation: value >= 1000 ? "compact" : "standard",
        maximumFractionDigits: value >= 1000 ? 1 : 0,
    }).format(Math.round(value));
}

export function AIBloggerMetricsBar({ metrics }: AIBloggerMetricsBarProps) {
    const items = [
        {
            label: "Drafts",
            value: metrics.draftsInQueue,
            icon: FilePenLine,
            color: "text-blue-500",
        },
        {
            label: "Schedules",
            value: metrics.scheduledRuns,
            icon: CalendarClock,
            color: "text-amber-500",
        },
        {
            label: "Published",
            value: metrics.publishedPosts,
            icon: CheckCircle2,
            color: "text-emerald-500",
        },
        {
            label: "Refresh",
            value: metrics.refreshCandidates,
            icon: TrendingUp,
            color: "text-sky-500",
        },
    ];

    return (
        <div className="sticky top-0 z-40 flex gap-2 overflow-x-auto border-b border-border/40 bg-background/80 backdrop-blur-sm px-4 sm:px-6 py-3">
            {items.map((item) => {
                const Icon = item.icon;
                return (
                    <div
                        key={item.label}
                        className="flex flex-shrink-0 items-center gap-2 rounded-lg border border-border/40 bg-card px-3 py-2"
                    >
                        <Icon className={`h-4 w-4 ${item.color}`} />
                        <div className="whitespace-nowrap">
                            <p className="text-xs text-muted-foreground">{item.label}</p>
                            <p className="text-sm font-semibold">{formatCompactNumber(item.value)}</p>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

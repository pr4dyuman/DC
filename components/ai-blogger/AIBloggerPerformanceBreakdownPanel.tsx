import type { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import type { BlogStudioPerformanceBreakdownSnapshot } from "@/lib/types-ai-blogger";

function formatPerformanceNumber(value: number) {
    return new Intl.NumberFormat("en-US").format(Math.round(value));
}

function formatPerformancePercent(value: number) {
    return `${(value * 100).toFixed(value >= 0.1 ? 1 : 2).replace(/\.0$/, "")}%`;
}

export function AIBloggerPerformanceBreakdownPanel({
    icon,
    items,
    title,
    emptyLabel,
    compact = false,
}: {
    icon: ReactNode;
    items: BlogStudioPerformanceBreakdownSnapshot[];
    title: string;
    emptyLabel: string;
    compact?: boolean;
}) {
    return (
        <div className="rounded-xl border border-border/60 bg-background/55 p-4">
            <div className="flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                    {icon}
                </div>
                <div>
                    <p className="font-semibold text-foreground">{title}</p>
                    <p className="text-xs text-muted-foreground">
                        {compact ? "Latest Search Console breakdown." : "Latest Search Console breakdown for this page."}
                    </p>
                </div>
            </div>

            <div className="mt-4 space-y-3">
                {items.length > 0 ? items.map((item) => (
                    <div
                        key={`${title}-${item.label}`}
                        className="rounded-[20px] border border-border/60 bg-background/60 px-4 py-3"
                    >
                        <div className="flex items-center justify-between gap-3">
                            <p className="text-sm font-medium text-foreground">{item.label}</p>
                            <Badge variant="outline" className="rounded-full">
                                {formatPerformancePercent(item.ctr)}
                            </Badge>
                        </div>
                        <div className="mt-2 flex flex-wrap gap-2 text-xs text-muted-foreground">
                            <span>Impressions {formatPerformanceNumber(item.impressions)}</span>
                            <span>|</span>
                            <span>Clicks {formatPerformanceNumber(item.clicks)}</span>
                            <span>|</span>
                            <span>Position {item.position > 0 ? item.position.toFixed(1) : "-"}</span>
                        </div>
                    </div>
                )) : (
                    <div className="rounded-[20px] border border-dashed border-border/60 bg-background/40 px-4 py-5 text-sm text-muted-foreground">
                        {emptyLabel}
                    </div>
                )}
            </div>
        </div>
    );
}

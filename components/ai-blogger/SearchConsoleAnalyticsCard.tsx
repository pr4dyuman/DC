"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, BarChart3, Globe, MonitorSmartphone, Search } from "lucide-react";
import { AIBloggerGlassCard, AIBloggerSectionEyebrow } from "@/components/ai-blogger/AIBloggerPrimitives";
import { QuerySparkline } from "@/components/ai-blogger/QuerySparkline";
import { Badge } from "@/components/ui/badge";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import type { SearchConsoleAnalyticsData } from "@/lib/actions/ai-blogger";
import type { BlogStudioPerformanceSnapshot } from "@/lib/types-ai-blogger";

type SearchConsoleAnalyticsCardProps = {
    initialData: SearchConsoleAnalyticsData;
    history?: BlogStudioPerformanceSnapshot[];
    onPeriodChange?: (period: 7 | 14 | 28) => void;
};

function formatPerformanceNumber(value: number) {
    return new Intl.NumberFormat("en-US").format(Math.round(value));
}

function formatPerformancePercent(value: number) {
    return `${(value * 100).toFixed(value >= 0.1 ? 1 : 2).replace(/\.0$/, "")}%`;
}

function QueryCard({ query, clicks, impressions, ctr, position, history }: {
    query: string;
    clicks: number;
    impressions: number;
    ctr: number;
    position: number;
    history?: BlogStudioPerformanceSnapshot[];
}) {
    return (
        <div className="rounded-[20px] border border-border/60 bg-background/60 px-4 py-3">
            <div className="flex items-start justify-between gap-3">
                <p className="truncate text-sm font-medium text-foreground">{query}</p>
                <div className="flex items-center gap-2">
                    {history && history.length > 0 && (
                        <QuerySparkline query={query} history={history} />
                    )}
                    <Badge variant="outline" className="rounded-full whitespace-nowrap">
                        {formatPerformancePercent(ctr)}
                    </Badge>
                </div>
            </div>
            <div className="mt-2 flex flex-wrap gap-2 text-xs text-muted-foreground">
                <span>{formatPerformanceNumber(clicks)} clicks</span>
                <span>•</span>
                <span>{formatPerformancePercent(ctr)} CTR</span>
            </div>
        </div>
    );
}

function BreakdownItem({
    label,
    impressions,
    clicks,
    ctr,
    position,
}: {
    label: string;
    impressions: number;
    clicks: number;
    ctr: number;
    position: number;
}) {
    return (
        <div className="flex items-center justify-between gap-2 rounded-lg border border-border/40 bg-background/50 px-3 py-2.5">
            <p className="text-sm font-medium text-foreground">{label}</p>
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span>{formatPerformanceNumber(impressions)} impr.</span>
                <span>•</span>
                <span>{formatPerformancePercent(ctr)} CTR</span>
            </div>
        </div>
    );
}

export function SearchConsoleAnalyticsCard({
    initialData,
    history = [],
    onPeriodChange,
}: SearchConsoleAnalyticsCardProps) {
    const [period, setPeriod] = useState<7 | 14 | 28>(7);
    // In a real implementation, you'd refetch data when period changes
    // For now, showing initial data
    const data = initialData;

    const handlePeriodChange = (value: string) => {
        const periodValue = parseInt(value, 10) as 7 | 14 | 28;
        setPeriod(periodValue);
        onPeriodChange?.(periodValue);
    };

    return (
        <AIBloggerGlassCard className="space-y-6 p-6">
            {/* Header */}
            <div className="space-y-2">
                <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-[20px] bg-primary/12 text-primary">
                        <BarChart3 className="h-5 w-5" />
                    </div>
                    <div>
                        <h3 className="text-lg font-semibold">Search Console Analytics</h3>
                        <p className="text-sm text-muted-foreground">
                            Aggregated performance metrics across all published posts.
                        </p>
                    </div>
                </div>

                {/* Period selector */}
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-xs text-muted-foreground">
                        Showing last <strong>{period} days</strong>
                    </p>
                    <Select value={period.toString()} onValueChange={handlePeriodChange}>
                        <SelectTrigger className="w-full sm:w-[180px] bg-background/50">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="7">Last 7 days</SelectItem>
                            <SelectItem value="14">Last 14 days</SelectItem>
                            <SelectItem value="28">Last 28 days</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>

            {/* Summary metrics */}
            {data.summary && (
                <div className="grid gap-3 sm:grid-cols-4">
                    <div className="rounded-[22px] border border-border/60 bg-background/60 px-4 py-4">
                        <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Total Clicks</p>
                        <p className="mt-2 text-2xl font-semibold">{formatPerformanceNumber(data.summary.totalClicks)}</p>
                    </div>
                    <div className="rounded-[22px] border border-border/60 bg-background/60 px-4 py-4">
                        <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Impressions</p>
                        <p className="mt-2 text-2xl font-semibold">{formatPerformanceNumber(data.summary.totalImpressions)}</p>
                    </div>
                    <div className="rounded-[22px] border border-border/60 bg-background/60 px-4 py-4">
                        <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Avg CTR</p>
                        <p className="mt-2 text-2xl font-semibold">{formatPerformancePercent(data.summary.avgCTR)}</p>
                    </div>
                    <div className="rounded-[22px] border border-border/60 bg-background/60 px-4 py-4">
                        <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Avg Position</p>
                        <p className="mt-2 text-2xl font-semibold">
                            {data.summary.avgPosition > 0 ? data.summary.avgPosition.toFixed(1) : "-"}
                        </p>
                    </div>
                </div>
            )}

            {/* Three-column breakdown */}
            <div className="grid gap-4 lg:grid-cols-3">
                {/* Top Queries */}
                <div>
                    <div className="mb-4 flex items-center gap-2">
                        <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                            <Search className="h-4 w-4" />
                        </div>
                        <h4 className="font-semibold">Top Queries</h4>
                    </div>
                    <div className="space-y-3">
                        {data.topQueries && data.topQueries.length > 0 ? (
                            data.topQueries.map((q) => (
                                <QueryCard
                                    key={q.query}
                                    query={q.query}
                                    clicks={q.clicks}
                                    impressions={q.impressions}
                                    ctr={q.ctr}
                                    position={q.position}
                                    history={history}
                                />
                            ))
                        ) : (
                            <div className="rounded-[20px] border border-dashed border-border/60 bg-background/40 px-4 py-5 text-sm text-muted-foreground">
                                No query data available
                            </div>
                        )}
                    </div>
                </div>

                {/* Top Countries */}
                <div>
                    <div className="mb-4 flex items-center gap-2">
                        <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                            <Globe className="h-4 w-4" />
                        </div>
                        <h4 className="font-semibold">Top Countries</h4>
                    </div>
                    <div className="space-y-2">
                        {data.topCountries && data.topCountries.length > 0 ? (
                            data.topCountries.map((c) => (
                                <BreakdownItem
                                    key={c.label}
                                    label={c.label}
                                    impressions={c.impressions}
                                    clicks={c.clicks}
                                    ctr={c.ctr}
                                    position={c.position}
                                />
                            ))
                        ) : (
                            <div className="rounded-lg border border-dashed border-border/40 bg-background/30 px-3 py-4 text-xs text-muted-foreground">
                                No country data
                            </div>
                        )}
                    </div>
                </div>

                {/* Top Devices */}
                <div>
                    <div className="mb-4 flex items-center gap-2">
                        <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                            <MonitorSmartphone className="h-4 w-4" />
                        </div>
                        <h4 className="font-semibold">Top Devices</h4>
                    </div>
                    <div className="space-y-2">
                        {data.topDevices && data.topDevices.length > 0 ? (
                            data.topDevices.map((d) => (
                                <BreakdownItem
                                    key={d.label}
                                    label={d.label}
                                    impressions={d.impressions}
                                    clicks={d.clicks}
                                    ctr={d.ctr}
                                    position={d.position}
                                />
                            ))
                        ) : (
                            <div className="rounded-lg border border-dashed border-border/40 bg-background/30 px-3 py-4 text-xs text-muted-foreground">
                                No device data
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Footer link to detailed analytics */}
            <div className="border-t border-border/40 pt-4">
                <Link
                    href="/dashboard/ai-blogger/search-console-analytics"
                    className="inline-flex items-center gap-2 rounded-lg border border-border/40 bg-background/50 px-4 py-2 text-sm font-medium transition-colors hover:bg-background/70"
                >
                    View detailed Report
                    <ArrowUpRight className="h-4 w-4" />
                </Link>
            </div>
        </AIBloggerGlassCard>
    );
}

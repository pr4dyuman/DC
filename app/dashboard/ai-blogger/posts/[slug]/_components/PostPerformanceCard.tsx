"use client";

import { useState } from "react";
import {
    BarChart3,
    Globe,
    MonitorSmartphone,
    Search,
    TrendingUp,
} from "lucide-react";

import { AIBloggerPerformanceSyncCard } from "@/components/ai-blogger/AIBloggerPerformanceSyncCard";
import { AIBloggerPerformanceTrendChart } from "@/components/ai-blogger/AIBloggerPerformanceTrendChart";
import { AIBloggerPerformanceBreakdownPanel } from "@/components/ai-blogger/AIBloggerPerformanceBreakdownPanel";
import { AIBloggerGlassCard } from "@/components/ai-blogger/AIBloggerPrimitives";
import { Badge } from "@/components/ui/badge";
import type {
    BlogStudioPerformanceSnapshot,
    BlogStudioPerformanceSyncStatus,
    BlogStudioRefreshOpportunity,
} from "@/lib/types-ai-blogger";

function formatPerformanceNumber(value: number) {
    return new Intl.NumberFormat("en-US").format(Math.round(value));
}

function formatPerformancePercent(value: number) {
    return `${(value * 100).toFixed(value >= 0.1 ? 1 : 2).replace(/\.0$/, "")}%`;
}

function formatSnapshotDateRange(startDate: string, endDate: string) {
    const start = new Date(startDate);
    const end = new Date(endDate);

    if (!Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime())) {
        return `${startDate} -> ${endDate}`;
    }

    return `${start.toLocaleDateString()} -> ${end.toLocaleDateString()}`;
}

function formatMetricDelta(current: number, previous: number, options?: { percent?: boolean; invert?: boolean }) {
    if (!Number.isFinite(previous)) {
        return "";
    }

    const delta = current - previous;
    if (Math.abs(delta) < 0.0001) {
        return "No change from prior window";
    }

    const positive = options?.invert ? delta < 0 : delta > 0;
    const prefix = positive ? "+" : "";
    const value = options?.percent
        ? `${prefix}${(delta * 100).toFixed(Math.abs(delta) >= 0.1 ? 1 : 2).replace(/\.0$/, "")}%`
        : `${prefix}${delta.toFixed(Math.abs(delta) >= 10 ? 0 : 1).replace(/\.0$/, "")}`;

    return `${value} vs prior window`;
}

function getDeltaClasses(current: number, previous: number, invert = false) {
    const delta = current - previous;
    if (Math.abs(delta) < 0.0001) {
        return "text-muted-foreground";
    }

    const positive = invert ? delta < 0 : delta > 0;
    return positive ? "text-emerald-600 dark:text-emerald-300" : "text-amber-700 dark:text-amber-300";
}

function getRefreshClasses(refreshOpportunity: BlogStudioRefreshOpportunity) {
    if (refreshOpportunity.needsRefresh) {
        return "border-amber-500/30 bg-amber-500/8";
    }

    return "border-emerald-500/25 bg-emerald-500/8";
}

export function PostPerformanceCard({
    syncStatus,
    pagePerformanceNote,
    latestSnapshot,
    previousSnapshot,
    refreshOpportunity,
    performanceReport,
}: {
    syncStatus: BlogStudioPerformanceSyncStatus | null;
    pagePerformanceNote: string;
    latestSnapshot: BlogStudioPerformanceSnapshot | null;
    previousSnapshot: BlogStudioPerformanceSnapshot | null;
    refreshOpportunity: BlogStudioRefreshOpportunity | null;
    performanceReport: {
        isPublished?: boolean;
        hasSearchConsoleConfig?: boolean;
        history?: BlogStudioPerformanceSnapshot[];
    } | null;
}) {
    const history = performanceReport?.history || [];
    const [showComparison, setShowComparison] = useState(false);

    return (
        <AIBloggerGlassCard className="p-6">
            <div className="space-y-6">
                <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-[20px] bg-primary/12 text-primary">
                        <BarChart3 className="h-5 w-5" />
                    </div>
                    <div>
                        <h3 className="text-lg font-semibold">Performance Loop</h3>
                        <p className="text-sm text-muted-foreground">
                            Search Console snapshots, trend history, and refresh signals for this post.
                        </p>
                    </div>
                </div>

                {syncStatus ? (
                    <AIBloggerPerformanceSyncCard syncStatus={syncStatus} compact />
                ) : null}

                <div className="rounded-xl border border-border/60 bg-background/60 px-4 py-4 text-sm leading-6 text-muted-foreground">
                    {pagePerformanceNote}
                </div>

                {latestSnapshot ? (
                    <div className="space-y-5">
                        <div className="flex flex-wrap gap-2">
                            <Badge variant="outline" className="rounded-full">
                                {formatSnapshotDateRange(latestSnapshot.startDate, latestSnapshot.endDate)}
                            </Badge>
                            <Badge variant="outline" className="rounded-full">
                                Synced {new Date(latestSnapshot.refreshedAt).toLocaleString()}
                            </Badge>
                            <Badge variant="outline" className="max-w-full rounded-full">
                                {latestSnapshot.pageUrl}
                            </Badge>
                        </div>

                        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                            <div className="rounded-xl border border-border/60 bg-background/60 px-4 py-4">
                                <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Clicks</p>
                                <p className="mt-2 text-2xl font-semibold">{formatPerformanceNumber(latestSnapshot.clicks)}</p>
                                {previousSnapshot ? (
                                    <p className={`mt-2 text-xs ${getDeltaClasses(latestSnapshot.clicks, previousSnapshot.clicks)}`}>
                                        {formatMetricDelta(latestSnapshot.clicks, previousSnapshot.clicks)}
                                    </p>
                                ) : null}
                            </div>
                            <div className="rounded-xl border border-border/60 bg-background/60 px-4 py-4">
                                <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Impressions</p>
                                <p className="mt-2 text-2xl font-semibold">{formatPerformanceNumber(latestSnapshot.impressions)}</p>
                                {previousSnapshot ? (
                                    <p className={`mt-2 text-xs ${getDeltaClasses(latestSnapshot.impressions, previousSnapshot.impressions)}`}>
                                        {formatMetricDelta(latestSnapshot.impressions, previousSnapshot.impressions)}
                                    </p>
                                ) : null}
                            </div>
                            <div className="rounded-xl border border-border/60 bg-background/60 px-4 py-4">
                                <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">CTR</p>
                                <p className="mt-2 text-2xl font-semibold">{formatPerformancePercent(latestSnapshot.ctr)}</p>
                                {previousSnapshot ? (
                                    <p className={`mt-2 text-xs ${getDeltaClasses(latestSnapshot.ctr, previousSnapshot.ctr)}`}>
                                        {formatMetricDelta(latestSnapshot.ctr, previousSnapshot.ctr, { percent: true })}
                                    </p>
                                ) : null}
                            </div>
                            <div className="rounded-xl border border-border/60 bg-background/60 px-4 py-4">
                                <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Avg Position</p>
                                <p className="mt-2 text-2xl font-semibold">
                                    {latestSnapshot.position > 0 ? latestSnapshot.position.toFixed(1) : "-"}
                                </p>
                                {previousSnapshot ? (
                                    <p className={`mt-2 text-xs ${getDeltaClasses(latestSnapshot.position, previousSnapshot.position, true)}`}>
                                        {formatMetricDelta(latestSnapshot.position, previousSnapshot.position, { invert: true })}
                                    </p>
                                ) : null}
                            </div>
                        </div>

                        <AIBloggerPerformanceTrendChart history={history} />

                        {refreshOpportunity ? (
                            <div className={`rounded-xl border px-4 py-4 ${getRefreshClasses(refreshOpportunity)}`}>
                                <div className="flex flex-wrap items-center gap-2">
                                    <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-background/65 text-primary">
                                        <TrendingUp className="h-4 w-4" />
                                    </div>
                                    <Badge variant="outline" className="rounded-full">
                                        {refreshOpportunity.needsRefresh ? "Refresh recommended" : "Stable"}
                                    </Badge>
                                    <Badge variant="outline" className="rounded-full">
                                        Opportunity {refreshOpportunity.score}/100
                                    </Badge>
                                    <Badge variant="outline" className="rounded-full capitalize">
                                        {refreshOpportunity.urgency}
                                    </Badge>
                                </div>
                                <p className="mt-3 text-sm leading-6 text-muted-foreground">
                                    {refreshOpportunity.summary}
                                </p>
                                {refreshOpportunity.reasons.length > 0 ? (
                                    <div className="mt-3 flex flex-wrap gap-2">
                                        {refreshOpportunity.reasons.map((reason) => (
                                            <div
                                                key={reason}
                                                className="rounded-full border border-border/50 bg-background/50 px-3 py-1 text-xs text-muted-foreground"
                                            >
                                                {reason}
                                            </div>
                                        ))}
                                    </div>
                                ) : null}
                            </div>
                        ) : null}

                        <div className="grid gap-4 xl:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)]">
                            <div className="rounded-xl border border-border/60 bg-background/55 p-4">
                                <div className="flex items-center justify-between gap-3">
                                    <div className="flex items-center gap-2">
                                        <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                                            <Search className="h-4 w-4" />
                                        </div>
                                        <div>
                                            <h4 className="font-semibold">Top Queries</h4>
                                            <p className="text-xs text-muted-foreground">
                                                {showComparison && previousSnapshot
                                                    ? "Comparison between current and prior period"
                                                    : "Terms Google associated with this page in the latest sync window."}
                                            </p>
                                        </div>
                                    </div>
                                    {previousSnapshot && (
                                        <button
                                            onClick={() => setShowComparison(!showComparison)}
                                            className="rounded-full border border-border/40 bg-background/50 px-3 py-1 text-xs font-medium transition-colors hover:bg-background/70"
                                        >
                                            {showComparison ? "View Current" : "Compare Periods"}
                                        </button>
                                    )}
                                </div>

                                <div className="mt-4 space-y-3">
                                    {latestSnapshot.topQueries.length > 0 ? (
                                        latestSnapshot.topQueries.map((query) => {
                                            const priorQuery = showComparison && previousSnapshot
                                                ? previousSnapshot.topQueries.find(q => q.query.toLowerCase() === query.query.toLowerCase())
                                                : null;

                                            const clicksDelta = priorQuery ? query.clicks - priorQuery.clicks : 0;
                                            const clicksDeltaPct = priorQuery && priorQuery.clicks > 0 ? (clicksDelta / priorQuery.clicks) * 100 : 0;
                                            const positionDelta = priorQuery ? priorQuery.position - query.position : 0;

                                            return (
                                                <div
                                                    key={query.query}
                                                    className="rounded-[20px] border border-border/60 bg-background/60 px-4 py-4"
                                                >
                                                    <div className="flex items-start justify-between gap-3">
                                                        <p className="text-sm font-medium text-foreground">{query.query}</p>
                                                        <div className="flex items-center gap-2">
                                                            <Badge variant="outline" className="rounded-full">
                                                                {formatPerformancePercent(query.ctr)}
                                                            </Badge>
                                                            {showComparison && priorQuery && clicksDelta !== 0 ? (
                                                                <Badge
                                                                    variant="outline"
                                                                    className={`rounded-full text-xs ${clicksDelta > 0 ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-300" : "border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-300"}`}
                                                                >
                                                                    {clicksDelta > 0 ? "+" : ""}{clicksDelta.toFixed(0)} clicks ({clicksDeltaPct > 0 ? "+" : ""}{clicksDeltaPct.toFixed(0)}%)
                                                                </Badge>
                                                            ) : null}
                                                        </div>
                                                    </div>
                                                    <div className="mt-2 flex flex-wrap gap-2 text-xs text-muted-foreground">
                                                        <span>Clicks {formatPerformanceNumber(query.clicks)}</span>
                                                        <span>|</span>
                                                        <span>Impressions {formatPerformanceNumber(query.impressions)}</span>
                                                        <span>|</span>
                                                        <span>Position {query.position > 0 ? query.position.toFixed(1) : "-"}</span>
                                                        {showComparison && priorQuery && (
                                                            <>
                                                                <span className="border-l border-border/40 pl-2">Prior: {priorQuery.clicks} clicks</span>
                                                                {positionDelta !== 0 && (
                                                                    <span className={positionDelta > 0 ? "text-emerald-600 dark:text-emerald-300" : "text-amber-600 dark:text-amber-300"}>
                                                                        Position {positionDelta > 0 ? "↑" : "↓"} {Math.abs(positionDelta).toFixed(1)}
                                                                    </span>
                                                                )}
                                                            </>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })
                                    ) : (
                                        <div className="rounded-[20px] border border-dashed border-border/60 bg-background/40 px-5 py-6 text-sm text-muted-foreground">
                                            No query-level rows were stored for the latest performance window.
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="space-y-4">
                                <AIBloggerPerformanceBreakdownPanel
                                    icon={<Globe className="h-4 w-4" />}
                                    title="Top Countries"
                                    items={latestSnapshot.topCountries}
                                    emptyLabel="Country-level breakdowns have not been stored yet for this page."
                                />
                                <AIBloggerPerformanceBreakdownPanel
                                    icon={<MonitorSmartphone className="h-4 w-4" />}
                                    title="Top Devices"
                                    items={latestSnapshot.topDevices}
                                    emptyLabel="Device-level breakdowns have not been stored yet for this page."
                                />
                            </div>
                        </div>
                    </div>
                ) : performanceReport?.isPublished ? (
                    <div className="rounded-xl border border-dashed border-border/60 bg-background/40 px-5 py-6 text-sm text-muted-foreground">
                        {performanceReport.hasSearchConsoleConfig
                            ? "This post is published, but no Search Console snapshot has been stored yet."
                            : "Search Console is not configured for this workspace yet, so post-publish performance tracking is still inactive."}
                    </div>
                ) : (
                    <div className="rounded-xl border border-dashed border-border/60 bg-background/40 px-5 py-6 text-sm text-muted-foreground">
                        Publish this post first to start the Search Console performance loop.
                    </div>
                )}
            </div>
        </AIBloggerGlassCard>
    );
}

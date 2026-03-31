"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, ChevronDown } from "lucide-react";
import { AIBloggerGlassCard, AIBloggerGradientButton, AIBloggerSectionEyebrow } from "@/components/ai-blogger/AIBloggerPrimitives";
import { AIBloggerPerformanceBreakdownPanel } from "@/components/ai-blogger/AIBloggerPerformanceBreakdownPanel";
import { Badge } from "@/components/ui/badge";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import type { BlogStudioRefreshQueue } from "@/lib/types-ai-blogger";
import {
    formatBlogStudioDate,
    humanizeBlogStudioValue,
} from "@/lib/ai-blogger-presentation";

function formatCompactNumber(value: number) {
    return new Intl.NumberFormat("en", {
        notation: value >= 1000 ? "compact" : "standard",
        maximumFractionDigits: value >= 1000 ? 1 : 0,
    }).format(Math.round(value));
}

function getRefreshUrgencyClasses(urgency: "critical" | "high" | "medium" | "low") {
    if (urgency === "critical") {
        return "border-red-500/20 bg-red-500/10 text-red-600 dark:text-red-300";
    }

    if (urgency === "high") {
        return "border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-300";
    }

    if (urgency === "medium") {
        return "border-blue-500/20 bg-blue-500/10 text-blue-600 dark:text-blue-300";
    }

    return "border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-300";
}

interface RefreshQueuePageProps {
    refreshQueue: BlogStudioRefreshQueue;
    onFilterChange?: (filters: { urgency?: string; reason?: string; sort?: string }) => void;
}

export function RefreshQueuePage({ refreshQueue, onFilterChange }: RefreshQueuePageProps) {
    const { items, totalCandidates, summary, reporting } = refreshQueue;
    const [filters, setFilters] = useState({
        urgency: "all",
        reason: "all",
        sort: "refresh-score",
    });
    const [expandedItemIds, setExpandedItemIds] = useState<Set<string>>(new Set());

    const hasActiveFilters =
        filters.urgency !== "all" ||
        filters.reason !== "all" ||
        filters.sort !== "refresh-score";

    const filteredItems = useMemo(() => {
        const nextItems = items.filter((item) => {
            const matchesUrgency =
                filters.urgency === "all" ||
                item.refreshOpportunity.urgency === filters.urgency;
            const matchesReason =
                filters.reason === "all" ||
                item.refreshOpportunity.signalKeys.includes(
                    filters.reason as
                        | "low-ctr"
                        | "position-opportunity"
                        | "visibility-decay"
                        | "stale-content"
                        | "no-recent-sync"
                        | "no-snapshot",
                );

            return matchesUrgency && matchesReason;
        });

        nextItems.sort((left, right) => {
            if (filters.sort === "click-loss") {
                return (left.refreshOpportunity.clickChangePct ?? 0) - (right.refreshOpportunity.clickChangePct ?? 0);
            }

            if (filters.sort === "impression-loss") {
                return (left.refreshOpportunity.impressionChangePct ?? 0) - (right.refreshOpportunity.impressionChangePct ?? 0);
            }

            if (filters.sort === "sync-lag") {
                return (right.refreshOpportunity.snapshotAgeHours ?? 0) - (left.refreshOpportunity.snapshotAgeHours ?? 0);
            }

            return right.refreshOpportunity.score - left.refreshOpportunity.score;
        });

        return nextItems;
    }, [filters.reason, filters.sort, filters.urgency, items]);

    const handleFilterChange = (key: string, value: string) => {
        setFilters((current) => ({
            ...current,
            [key]: value,
        }));
        onFilterChange?.({ [key]: value });
    };

    const toggleExpanded = (postId: string) => {
        setExpandedItemIds((current) => {
            const next = new Set(current);
            if (next.has(postId)) {
                next.delete(postId);
            } else {
                next.add(postId);
            }
            return next;
        });
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="space-y-2">
                <AIBloggerSectionEyebrow>Performance Refresh Queue</AIBloggerSectionEyebrow>
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                        <h1 className="text-3xl font-bold">Refresh Candidates</h1>
                        <p className="mt-2 text-muted-foreground">
                            Published posts with performance signals suggesting optimization opportunities.
                        </p>
                        {hasActiveFilters ? (
                            <p className="mt-1 text-sm text-muted-foreground">
                                Showing {filteredItems.length} of {totalCandidates} candidate{totalCandidates === 1 ? "" : "s"} with the current filters.
                            </p>
                        ) : null}
                    </div>
                    <Badge variant="outline" className="w-fit rounded-full text-lg">
                        {totalCandidates} candidate{totalCandidates === 1 ? "" : "s"}
                    </Badge>
                </div>
            </div>

            {/* Summary Metrics */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
                <AIBloggerGlassCard className="p-5">
                    <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">Critical / High</p>
                    <p className="mt-3 text-3xl font-bold">
                        {summary.criticalCount + summary.highCount}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                        {summary.criticalCount} critical, {summary.highCount} high
                    </p>
                </AIBloggerGlassCard>

                <AIBloggerGlassCard className="p-5">
                    <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">CTR / Decay</p>
                    <p className="mt-3 text-3xl font-bold">
                        {summary.lowCtrCount + summary.visibilityDecayCount}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                        {summary.lowCtrCount} low CTR, {summary.visibilityDecayCount} decay
                    </p>
                </AIBloggerGlassCard>

                <AIBloggerGlassCard className="p-5">
                    <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">Sync Gaps</p>
                    <p className="mt-3 text-3xl font-bold">
                        {summary.noRecentSyncCount + summary.noSnapshotCount}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                        {summary.noRecentSyncCount} stale, {summary.noSnapshotCount} new
                    </p>
                </AIBloggerGlassCard>

                <AIBloggerGlassCard className="p-5">
                    <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">Improved</p>
                    <p className="mt-3 text-3xl font-bold text-emerald-600 dark:text-emerald-300">
                        {reporting.improvedCount}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">Posts gaining performance</p>
                </AIBloggerGlassCard>

                <AIBloggerGlassCard className="p-5">
                    <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">Declined</p>
                    <p className="mt-3 text-3xl font-bold text-red-600 dark:text-red-300">
                        {reporting.declinedCount}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">Posts losing visibility</p>
                </AIBloggerGlassCard>
            </div>

            {/* Filters */}
            <AIBloggerGlassCard className="p-5">
                <div className="grid gap-3 sm:grid-cols-3">
                    <div className="space-y-2">
                        <label className="text-xs font-medium">Filter by Urgency</label>
                        <Select value={filters.urgency} onValueChange={(v) => handleFilterChange("urgency", v)}>
                            <SelectTrigger className="bg-background/50">
                                <SelectValue placeholder="All urgency levels" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All urgency levels</SelectItem>
                                <SelectItem value="critical">Critical</SelectItem>
                                <SelectItem value="high">High</SelectItem>
                                <SelectItem value="medium">Medium</SelectItem>
                                <SelectItem value="low">Low</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs font-medium">Filter by Reason</label>
                        <Select value={filters.reason} onValueChange={(v) => handleFilterChange("reason", v)}>
                            <SelectTrigger className="bg-background/50">
                                <SelectValue placeholder="All reasons" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All reasons</SelectItem>
                                <SelectItem value="low-ctr">Low CTR</SelectItem>
                                <SelectItem value="position-opportunity">Position Opportunity</SelectItem>
                                <SelectItem value="visibility-decay">Visibility Decay</SelectItem>
                                <SelectItem value="stale-content">Stale Content</SelectItem>
                                <SelectItem value="no-recent-sync">No Recent Sync</SelectItem>
                                <SelectItem value="no-snapshot">No Snapshot</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs font-medium">Sort by</label>
                        <Select value={filters.sort} onValueChange={(v) => handleFilterChange("sort", v)}>
                            <SelectTrigger className="bg-background/50">
                                <SelectValue placeholder="Refresh score" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="refresh-score">Refresh Score</SelectItem>
                                <SelectItem value="click-loss">Click Loss</SelectItem>
                                <SelectItem value="impression-loss">Impression Loss</SelectItem>
                                <SelectItem value="sync-lag">Sync Lag</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>
            </AIBloggerGlassCard>

            {/* Candidates List */}
            {filteredItems.length > 0 ? (
                <div className="space-y-4">
                    {filteredItems.map((item) => {
                        const isExpanded = expandedItemIds.has(item.post.id);
                        return (
                            <AIBloggerGlassCard key={item.post.id} className="transition-colors hover:bg-background/40">
                                <div className="space-y-4">
                                    {/* Main content */}
                                    <div className="p-5">
                                        <div className="grid gap-4 lg:grid-cols-[1fr_auto]">
                                            {/* Left: Post details */}
                                            <div className="space-y-3">
                                                <div className="flex flex-wrap items-start justify-between gap-3">
                                                    <div className="space-y-2 flex-1">
                                                        <Link
                                                            href={`/dashboard/ai-blogger/posts/${item.post.slug}`}
                                                            className="text-lg font-semibold transition-colors hover:text-primary"
                                                        >
                                                            {item.post.title}
                                                        </Link>
                                                        <p className="text-sm leading-6 text-muted-foreground">
                                                            {item.refreshOpportunity.summary}
                                                        </p>
                                                    </div>

                                                    <div className="flex flex-wrap items-center gap-2">
                                                        <Badge variant="outline" className="rounded-full">
                                                            Score: {item.refreshOpportunity.score}/100
                                                        </Badge>
                                                        <Badge
                                                            variant="outline"
                                                            className={`rounded-full ${getRefreshUrgencyClasses(item.refreshOpportunity.urgency)}`}
                                                        >
                                                            {humanizeBlogStudioValue(item.refreshOpportunity.urgency)}
                                                        </Badge>
                                                    </div>
                                                </div>

                                                {/* Performance metrics */}
                                                <div className="grid gap-3 sm:grid-cols-4">
                                                    <div className="rounded-lg border border-border/40 bg-background/50 px-3 py-2">
                                                        <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Clicks</p>
                                                        <p className="mt-1 text-sm font-semibold">
                                                            {item.latestSnapshot ? formatCompactNumber(item.latestSnapshot.clicks) : "—"}
                                                        </p>
                                                    </div>
                                                    <div className="rounded-lg border border-border/40 bg-background/50 px-3 py-2">
                                                        <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Impressions</p>
                                                        <p className="mt-1 text-sm font-semibold">
                                                            {item.latestSnapshot ? formatCompactNumber(item.latestSnapshot.impressions) : "—"}
                                                        </p>
                                                    </div>
                                                    <div className="rounded-lg border border-border/40 bg-background/50 px-3 py-2">
                                                        <p className="text-[10px] uppercase tracking-wide text-muted-foreground">CTR</p>
                                                        <p className="mt-1 text-sm font-semibold">
                                                            {item.latestSnapshot ? `${(item.latestSnapshot.ctr * 100).toFixed(1)}%` : "—"}
                                                        </p>
                                                    </div>
                                                    <div className="rounded-lg border border-border/40 bg-background/50 px-3 py-2">
                                                        <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Position</p>
                                                        <p className="mt-1 text-sm font-semibold">
                                                            {item.latestSnapshot && item.latestSnapshot.position > 0
                                                                ? item.latestSnapshot.position.toFixed(1)
                                                                : "—"}
                                                        </p>
                                                    </div>
                                                </div>

                                                {/* Reasons tags */}
                                                <div className="flex flex-wrap gap-2 pt-1">
                                                    {item.refreshOpportunity.reasons.map((reason) => (
                                                        <span
                                                            key={`${item.post.id}-${reason}`}
                                                            className="rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-xs text-amber-700 dark:text-amber-300"
                                                        >
                                                            {reason}
                                                        </span>
                                                    ))}
                                                </div>

                                                {/* Sync info and expand button */}
                                                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between pt-1">
                                                    <p className="text-xs text-muted-foreground">
                                                        {item.latestSnapshot
                                                            ? `Last synced ${formatBlogStudioDate(item.latestSnapshot.refreshedAt, true)}`
                                                            : "Awaiting Search Console data"}
                                                    </p>
                                                    {item.latestSnapshot && (
                                                        <button
                                                            onClick={() => toggleExpanded(item.post.id)}
                                                            className="inline-flex items-center gap-1 rounded-full border border-border/40 bg-background/50 px-3 py-1 text-xs font-medium transition-colors hover:bg-background/70"
                                                        >
                                                            <ChevronDown
                                                                className={`h-3 w-3 transition-transform ${isExpanded ? "rotate-180" : ""}`}
                                                            />
                                                            {isExpanded ? "Hide" : "Show"} Details
                                                        </button>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Right: Action buttons */}
                                            <div className="flex flex-col gap-2 lg:justify-start">
                                                <AIBloggerGradientButton asChild size="sm">
                                                    <Link href={`/dashboard/ai-blogger/posts/${item.post.slug}`}>
                                                        Open Post
                                                        <ArrowUpRight className="h-4 w-4" />
                                                    </Link>
                                                </AIBloggerGradientButton>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Expandable breakdown section */}
                                    {isExpanded && item.latestSnapshot ? (
                                        <div className="border-t border-border/40 bg-background/40 p-5">
                                            <div className="space-y-4">
                                                <div className="grid gap-4 md:grid-cols-3">
                                                    {/* Top Queries preview */}
                                                    <div className="rounded-[24px] border border-border/60 bg-background/55 p-4">
                                                        <div className="mb-4 flex items-center gap-2">
                                                            <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                                                                <em className="text-sm">🔍</em>
                                                            </div>
                                                            <div>
                                                                <p className="font-semibold text-foreground">Top Queries</p>
                                                                <p className="text-xs text-muted-foreground">Latest breakdown</p>
                                                            </div>
                                                        </div>
                                                        <div className="space-y-2">
                                                            {item.latestSnapshot.topQueries.slice(0, 3).length > 0 ? (
                                                                item.latestSnapshot.topQueries.slice(0, 3).map((query) => (
                                                                    <div
                                                                        key={query.query}
                                                                        className="rounded-lg border border-border/40 bg-background/50 px-3 py-2 text-xs"
                                                                    >
                                                                        <p className="font-medium text-foreground truncate">{query.query}</p>
                                                                        <p className="mt-1 text-muted-foreground">
                                                                            {formatCompactNumber(query.clicks)} clicks • {(query.ctr * 100).toFixed(1)}% CTR
                                                                        </p>
                                                                    </div>
                                                                ))
                                                            ) : (
                                                                <p className="rounded-lg border border-dashed border-border/40 bg-background/40 px-3 py-2 text-xs text-muted-foreground">
                                                                    No query data
                                                                </p>
                                                            )}
                                                        </div>
                                                    </div>

                                                    {/* Full breakdown panels */}
                                                    <AIBloggerPerformanceBreakdownPanel
                                                        icon={<span>🌍</span>}
                                                        title="Top Countries"
                                                        items={item.latestSnapshot.topCountries}
                                                        emptyLabel="No country data"
                                                        compact
                                                    />
                                                    <AIBloggerPerformanceBreakdownPanel
                                                        icon={<span>📱</span>}
                                                        title="Top Devices"
                                                        items={item.latestSnapshot.topDevices}
                                                        emptyLabel="No device data"
                                                        compact
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    ) : null}
                                </div>
                            </AIBloggerGlassCard>
                        );
                    })}
                </div>
            ) : (
                <AIBloggerGlassCard className="rounded-[24px] border-dashed border-border/60 bg-background/40 px-6 py-12 text-center">
                    <div className="space-y-2">
                        <p className="text-base font-medium">
                            {hasActiveFilters ? "No candidates match these filters" : "No refresh candidates"}
                        </p>
                        <p className="text-sm text-muted-foreground">
                            {hasActiveFilters
                                ? "Try a different urgency, reason, or sort order to see more published posts."
                                : "Once Search Console performance data shows decay or CTR gaps, published posts will appear here for optimization."}
                        </p>
                    </div>
                </AIBloggerGlassCard>
            )}
        </div>
    );
}

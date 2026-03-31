"use client";

import { BarChart3, CheckCircle2, Clock, TrendingUp } from "lucide-react";
import { AIBloggerGlassCard } from "@/components/ai-blogger/AIBloggerPrimitives";
import { Badge } from "@/components/ui/badge";

export type SearchConsoleMetricsData = {
    totalPosts: number;
    publishedPosts: number;
    snapshotsCoverage: number;
    avgClicks: number;
    avgImpressions: number;
    avgCTR: number;
    avgPosition: number;
    lastSyncAt: string | null;
    lastSyncStatus: "success" | "failed" | null;
    syncRunsSample: Array<{
        id: string;
        status: "synced" | "failed" | "skipped";
        postsEvaluated: number;
        snapshotsStored: number;
        completedAt: string;
        summary: string;
    }>;
};

function formatCompactNumber(value: number) {
    return new Intl.NumberFormat("en", {
        notation: value >= 1000 ? "compact" : "standard",
        maximumFractionDigits: value >= 1000 ? 1 : 0,
    }).format(Math.round(value));
}

function formatPercent(value: number) {
    return `${(value * 100).toFixed(value >= 0.1 ? 1 : 2).replace(/\.0$/, "")}%`;
}

export function SearchConsoleMetricsDashboard({
    data,
}: {
    data: SearchConsoleMetricsData;
}) {
    const healthPercentage = data.totalPosts > 0 ? Math.round((data.snapshotsCoverage / data.totalPosts) * 100) : 0;
    const lastSyncDate = data.lastSyncAt ? new Date(data.lastSyncAt) : null;

    return (
        <AIBloggerGlassCard className="space-y-6 p-6">
            {/* Header */}
            <div className="space-y-2">
                <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-[20px] bg-primary/12 text-primary">
                        <BarChart3 className="h-5 w-5" />
                    </div>
                    <div>
                        <h3 className="text-lg font-semibold">Search Console Metrics</h3>
                        <p className="text-sm text-muted-foreground">
                            Agency-level performance tracking and sync health status.
                        </p>
                    </div>
                </div>
            </div>

            {/* Key Health Indicators */}
            <div className="grid gap-3 sm:grid-cols-4">
                <div className="rounded-[22px] border border-border/60 bg-background/60 px-4 py-4">
                    <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Published Posts</p>
                    <p className="mt-2 text-2xl font-semibold">{data.publishedPosts}</p>
                    <p className="mt-1 text-xs text-muted-foreground">of {data.totalPosts} total</p>
                </div>
                <div className="rounded-[22px] border border-border/60 bg-background/60 px-4 py-4">
                    <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Avg Clicks</p>
                    <p className="mt-2 text-2xl font-semibold">{formatCompactNumber(data.avgClicks)}</p>
                    <p className="mt-1 text-xs text-muted-foreground">per post</p>
                </div>
                <div className="rounded-[22px] border border-border/60 bg-background/60 px-4 py-4">
                    <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Avg CTR</p>
                    <p className="mt-2 text-2xl font-semibold">{formatPercent(data.avgCTR)}</p>
                    <p className="mt-1 text-xs text-muted-foreground">across posts</p>
                </div>
                <div className="rounded-[22px] border border-border/60 bg-background/60 px-4 py-4">
                    <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Avg Position</p>
                    <p className="mt-2 text-2xl font-semibold">
                        {data.avgPosition > 0 ? data.avgPosition.toFixed(1) : "-"}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">in SERP</p>
                </div>
            </div>

            {/* Health Status */}
            <div className="space-y-3 rounded-[24px] border border-border/60 bg-background/55 p-4">
                <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                        <CheckCircle2 className="h-4 w-4" />
                    </div>
                    <div>
                        <h4 className="font-semibold">Snapshot Coverage</h4>
                        <p className="text-xs text-muted-foreground">Posts with recent performance data</p>
                    </div>
                </div>

                <div className="space-y-2">
                    <div className="relative h-2 w-full rounded-full bg-background/40">
                        <div
                            className="absolute h-full rounded-full bg-emerald-500 transition-all"
                            style={{ width: `${healthPercentage}%` }}
                        />
                    </div>
                    <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">
                            {data.snapshotsCoverage} of {data.totalPosts} posts tracked
                        </span>
                        <Badge variant="outline" className="rounded-full">
                            {healthPercentage}% coverage
                        </Badge>
                    </div>
                </div>
            </div>

            {/* Last Sync Status */}
            {lastSyncDate && (
                <div className="space-y-3 rounded-[24px] border border-border/60 bg-background/55 p-4">
                    <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                            <Clock className="h-4 w-4" />
                        </div>
                        <div>
                            <h4 className="font-semibold">Last Sync</h4>
                            <p className="text-xs text-muted-foreground">{lastSyncDate.toLocaleString()}</p>
                        </div>
                        {data.lastSyncStatus && (
                            <Badge
                                variant="outline"
                                className={
                                    data.lastSyncStatus === "success"
                                        ? "rounded-full border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-300"
                                        : "rounded-full border-red-500/30 bg-red-500/10 text-red-600 dark:text-red-300"
                                }
                            >
                                {data.lastSyncStatus === "success" ? "Success" : "Failed"}
                            </Badge>
                        )}
                    </div>
                </div>
            )}

            {/* Recent Sync Runs */}
            {data.syncRunsSample && data.syncRunsSample.length > 0 && (
                <div className="space-y-3">
                    <div className="flex items-center gap-2">
                        <TrendingUp className="h-4 w-4 text-primary" />
                        <h4 className="font-semibold">Recent Sync Runs</h4>
                    </div>
                    <div className="space-y-2">
                        {data.syncRunsSample.slice(0, 5).map((run) => (
                            <div key={run.id} className="rounded-lg border border-border/40 bg-background/50 px-3 py-2">
                                <div className="flex items-start justify-between gap-2 text-xs">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2">
                                            <Badge
                                                variant="outline"
                                                className={
                                                    run.status === "synced"
                                                        ? "rounded-full border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-300 text-[10px]"
                                                        : run.status === "failed"
                                                          ? "rounded-full border-red-500/30 bg-red-500/10 text-red-600 dark:text-red-300 text-[10px]"
                                                          : "rounded-full text-[10px]"
                                                }
                                            >
                                                {run.status}
                                            </Badge>
                                            <span className="text-muted-foreground">
                                                {new Date(run.completedAt).toLocaleString()}
                                            </span>
                                        </div>
                                        <p className="mt-1 text-muted-foreground">{run.summary}</p>
                                    </div>
                                </div>
                                <div className="mt-1 flex gap-2 text-[10px] text-muted-foreground">
                                    <span>{run.postsEvaluated} posts evaluated</span>
                                    <span>•</span>
                                    <span>{run.snapshotsStored} snapshots stored</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </AIBloggerGlassCard>
    );
}

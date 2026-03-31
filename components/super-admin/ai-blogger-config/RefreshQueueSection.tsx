"use client";

import { TrendingUp } from "lucide-react";
import type { getAgencyAIBloggerOverviewSuperAdmin } from "@/lib/actions/super-admin";
import type { AIBloggerConfig } from "@/lib/types";
import { formatCompactNumber } from "./shared";

interface RefreshQueueSectionProps {
    config: AIBloggerConfig;
    overview: Awaited<ReturnType<typeof getAgencyAIBloggerOverviewSuperAdmin>> | null;
}

export default function RefreshQueueSection({ config, overview }: RefreshQueueSectionProps) {
    return (
        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
            <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
                <div className="space-y-3">
                    <div className="flex items-center gap-3">
                        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-500/15 text-amber-300">
                            <TrendingUp className="h-5 w-5" />
                        </div>
                        <div>
                            <h2 className="text-lg font-semibold text-foreground">Performance Refresh Queue</h2>
                            <p className="text-sm text-muted-foreground">
                                Super-admin view of the agency&apos;s published posts that show refresh signals from stored Search Console performance.
                            </p>
                        </div>
                    </div>
                </div>

                <div className="flex flex-wrap gap-3">
                    <div className="rounded-xl border border-border bg-background/70 px-4 py-3">
                        <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Published posts</p>
                        <p className="mt-1 text-lg font-semibold text-foreground">{overview?.metrics.publishedPosts ?? 0}</p>
                    </div>
                    <div className="rounded-xl border border-border bg-background/70 px-4 py-3">
                        <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Refresh candidates</p>
                        <p className="mt-1 text-lg font-semibold text-foreground">{overview?.metrics.refreshCandidates ?? 0}</p>
                    </div>
                    <div className="rounded-xl border border-border bg-background/70 px-4 py-3">
                        <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Average SEO</p>
                        <p className="mt-1 text-lg font-semibold text-foreground">{overview?.metrics.averageSeoScore ?? 0}/100</p>
                    </div>
                </div>
            </div>

            {overview?.refreshQueue.items?.length ? (
                <div className="mt-5 grid gap-4 xl:grid-cols-2">
                    {overview.refreshQueue.items.map((item) => (
                        <div
                            key={item.post.id}
                            className="rounded-2xl border border-border bg-background/60 p-4"
                        >
                            <div className="flex flex-wrap items-start justify-between gap-3">
                                <div className="space-y-2">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <p className="text-sm font-semibold text-foreground">{item.post.title}</p>
                                        <span className="rounded-full border border-amber-500/20 bg-amber-500/10 px-2.5 py-0.5 text-[11px] font-medium text-amber-300">
                                            Refresh {item.refreshOpportunity.score}/100
                                        </span>
                                    </div>
                                    <p className="text-sm leading-6 text-muted-foreground">
                                        {item.refreshOpportunity.summary}
                                    </p>
                                </div>
                                <span className="rounded-full border border-border bg-background px-2.5 py-0.5 text-[11px] text-muted-foreground">
                                    {item.latestSnapshot
                                        ? `${item.latestSnapshot.startDate} → ${item.latestSnapshot.endDate}`
                                        : "Awaiting first snapshot"}
                                </span>
                            </div>

                            <div className="mt-4 grid gap-3 sm:grid-cols-3">
                                <div className="rounded-xl border border-border bg-background/70 px-4 py-3">
                                    <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Clicks</p>
                                    <p className="mt-1 text-base font-semibold text-foreground">
                                        {item.latestSnapshot ? formatCompactNumber(item.latestSnapshot.clicks) : "—"}
                                    </p>
                                </div>
                                <div className="rounded-xl border border-border bg-background/70 px-4 py-3">
                                    <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Impressions</p>
                                    <p className="mt-1 text-base font-semibold text-foreground">
                                        {item.latestSnapshot ? formatCompactNumber(item.latestSnapshot.impressions) : "—"}
                                    </p>
                                </div>
                                <div className="rounded-xl border border-border bg-background/70 px-4 py-3">
                                    <p className="text-[11px] uppercase tracking-wide text-muted-foreground">CTR / position</p>
                                    <p className="mt-1 text-base font-semibold text-foreground">
                                        {item.latestSnapshot
                                            ? `${(item.latestSnapshot.ctr * 100).toFixed(1)}% · ${item.latestSnapshot.position > 0 ? item.latestSnapshot.position.toFixed(1) : "—"}`
                                            : "Awaiting coverage"}
                                    </p>
                                </div>
                            </div>

                            <div className="mt-4 flex flex-wrap gap-2">
                                {item.refreshOpportunity.reasons.map((reason) => (
                                    <span
                                        key={`${item.post.id}-${reason}`}
                                        className="rounded-full border border-amber-500/20 bg-amber-500/10 px-3 py-1 text-xs text-amber-300"
                                    >
                                        {reason}
                                    </span>
                                ))}
                            </div>

                            <p className="mt-4 text-xs text-muted-foreground">
                                {item.latestSnapshot
                                    ? `Last synced ${new Date(item.latestSnapshot.refreshedAt).toLocaleString()}`
                                    : "Search Console coverage has not been captured yet."}
                            </p>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="mt-5 rounded-2xl border border-dashed border-border bg-background/40 px-4 py-6 text-sm text-muted-foreground">
                    {config.searchConsole.enabled
                        ? "No posts are currently flagged for a refresh. Once performance snapshots show CTR gaps or visibility decay, they will appear here."
                        : "Search Console is currently off for this agency, so no refresh queue candidates can be surfaced yet."}
                </div>
            )}
        </div>
    );
}

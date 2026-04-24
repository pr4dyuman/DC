"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import {
    AlertCircle,
    CheckCircle2,
    Clock3,
    Loader2,
    RefreshCcw,
    ShieldCheck,
} from "lucide-react";
import { toast } from "sonner";

import { runBlogStudioPerformanceSync } from "@/lib/actions";
import type { BlogStudioPerformanceSyncStatus } from "@/lib/types";
import {
    AIBloggerGlassCard,
    AIBloggerGradientButton,
} from "@/components/ai-blogger/AIBloggerPrimitives";
import { Badge } from "@/components/ui/badge";

type AIBloggerPerformanceSyncCardProps = {
    syncStatus: BlogStudioPerformanceSyncStatus;
    compact?: boolean;
    className?: string;
};

function formatSyncDate(value: string | null, includeTime = true) {
    if (!value) {
        return "Not available yet";
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
        return value;
    }

    return includeTime ? date.toLocaleString() : date.toLocaleDateString();
}

function getStatusTone(syncStatus: BlogStudioPerformanceSyncStatus) {
    if (!syncStatus.enabled || !syncStatus.hasValidConfig) {
        return "amber";
    }

    if (syncStatus.lastRun?.status === "failed") {
        return "destructive";
    }

    if (syncStatus.stale) {
        return "blue";
    }

    return "emerald";
}

function getStatusLabel(syncStatus: BlogStudioPerformanceSyncStatus) {
    if (!syncStatus.enabled) {
        return "Disabled";
    }

    if (!syncStatus.hasValidConfig) {
        return "Needs Setup";
    }

    if (syncStatus.lastRun?.status === "failed") {
        return "Failed";
    }

    if (syncStatus.stale) {
        return "Stale";
    }

    return "Healthy";
}

function getStatusSummary(syncStatus: BlogStudioPerformanceSyncStatus) {
    if (!syncStatus.enabled) {
        return "Search Console sync is turned off for this workspace.";
    }

    if (!syncStatus.hasValidConfig) {
        return "Search Console is enabled but still needs a valid property URL and configured credentials.";
    }

    if (syncStatus.publishedPosts === 0) {
        return "Sync is ready, but there are no published AI Blogger posts to evaluate yet.";
    }

    if (syncStatus.lastRun?.status === "failed") {
        return syncStatus.lastRun.summary || "The last Search Console sync failed.";
    }

    if (syncStatus.stale) {
        return "The latest stored snapshot is older than the configured sync window.";
    }

    return "Search Console sync is configured and the latest performance snapshots are current.";
}

function getCapabilityBadges(syncStatus: BlogStudioPerformanceSyncStatus) {
    const badges = ["Page metrics", "Refresh scoring"];

    if (syncStatus.hasValidConfig) {
        badges.push("Query insights", "Country/device breakdowns");
    }

    return badges;
}

function renderStatusIcon(syncStatus: BlogStudioPerformanceSyncStatus) {
    if (!syncStatus.enabled || !syncStatus.hasValidConfig) {
        return <ShieldCheck className="h-4 w-4" />;
    }

    if (syncStatus.lastRun?.status === "failed") {
        return <AlertCircle className="h-4 w-4" />;
    }

    if (syncStatus.stale) {
        return <Clock3 className="h-4 w-4" />;
    }

    return <CheckCircle2 className="h-4 w-4" />;
}

function getBadgeClasses(tone: ReturnType<typeof getStatusTone>) {
    if (tone === "emerald") {
        return "border-emerald-500/25 bg-emerald-500/10 text-emerald-600 dark:text-emerald-300";
    }

    if (tone === "blue") {
        return "border-blue-500/25 bg-blue-500/10 text-blue-600 dark:text-blue-300";
    }

    if (tone === "destructive") {
        return "border-destructive/25 bg-destructive/10 text-destructive";
    }

    return "border-amber-500/25 bg-amber-500/10 text-amber-700 dark:text-amber-300";
}

export function AIBloggerPerformanceSyncCard({
    syncStatus,
    compact = false,
    className,
}: AIBloggerPerformanceSyncCardProps) {
    const router = useRouter();
    const [isPending, startTransition] = useTransition();
    const tone = getStatusTone(syncStatus);
    const label = getStatusLabel(syncStatus);
    const summary = getStatusSummary(syncStatus);
    const canRunSync = syncStatus.hasValidConfig && syncStatus.publishedPosts > 0;
    const capabilityBadges = getCapabilityBadges(syncStatus);

    const handleSync = () => {
        startTransition(async () => {
            try {
                const result = await runBlogStudioPerformanceSync(true);
                const message = result.summaries[0] || "Performance sync finished.";

                if (result.failedAgencies > 0) {
                    toast.error(message);
                } else if (result.syncedAgencies > 0) {
                    toast.success(message);
                } else {
                    toast(message);
                }

                router.refresh();
            } catch (error) {
                toast.error(error instanceof Error ? error.message : "Unable to run performance sync.");
            }
        });
    };

    const content = (
        <div className="space-y-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                        <div className={`flex h-10 w-10 items-center justify-center rounded-2xl border ${getBadgeClasses(tone)}`}>
                            {renderStatusIcon(syncStatus)}
                        </div>
                        <div>
                            <h3 className="text-lg font-semibold">Performance Sync</h3>
                            <p className="text-sm text-muted-foreground">Search Console sync health and latest run state.</p>
                        </div>
                    </div>
                </div>

                <Badge variant="outline" className={`rounded-full ${getBadgeClasses(tone)}`}>
                    {label}
                </Badge>
            </div>

            <div className="rounded-xl border border-border/60 bg-background/55 px-4 py-4 text-sm leading-6 text-muted-foreground">
                {summary}
            </div>

            <div className="flex flex-wrap gap-2">
                {capabilityBadges.map((badge) => (
                    <Badge key={badge} variant="outline" className="rounded-full border-border/60 bg-background/55">
                        {badge}
                    </Badge>
                ))}
            </div>

            <div className={`grid gap-3 ${compact ? "sm:grid-cols-2 xl:grid-cols-4" : "md:grid-cols-2 xl:grid-cols-4"}`}>
                <div className="rounded-2xl border border-border/60 bg-background/55 px-4 py-3">
                    <p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">Last success</p>
                    <p className="mt-2 text-sm font-medium">{formatSyncDate(syncStatus.lastSuccessAt)}</p>
                </div>
                <div className="rounded-2xl border border-border/60 bg-background/55 px-4 py-3">
                    <p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">Last failure</p>
                    <p className="mt-2 text-sm font-medium">{formatSyncDate(syncStatus.lastFailureAt)}</p>
                </div>
                <div className="rounded-2xl border border-border/60 bg-background/55 px-4 py-3">
                    <p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">Latest snapshot</p>
                    <p className="mt-2 text-sm font-medium">{formatSyncDate(syncStatus.latestSnapshotAt)}</p>
                </div>
                <div className="rounded-2xl border border-border/60 bg-background/55 px-4 py-3">
                    <p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">Coverage</p>
                    <p className="mt-2 text-sm font-medium">
                        {syncStatus.publishedPosts} published | {syncStatus.lookbackDays}d window
                    </p>
                </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="space-y-1 text-xs text-muted-foreground">
                    <p>Property: {syncStatus.propertyUrl || "Not configured"}</p>
                    <p>
                        Frequency: every {syncStatus.syncFrequencyHours} hour{syncStatus.syncFrequencyHours === 1 ? "" : "s"} | Lookback {syncStatus.lookbackDays} days
                    </p>
                    <p>Manual sync only runs for this workspace and stores the latest Search Console page, query, country, and device snapshots.</p>
                    {syncStatus.lastFailureSummary ? (
                        <p>{syncStatus.lastFailureSummary}</p>
                    ) : null}
                </div>

                <AIBloggerGradientButton
                    type="button"
                    variant={compact ? "outline" : "primary"}
                    size={compact ? "sm" : "default"}
                    onClick={handleSync}
                    disabled={isPending || !canRunSync}
                >
                    {isPending ? (
                        <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Syncing
                        </>
                    ) : (
                        <>
                            <RefreshCcw className="h-4 w-4" />
                            Sync Performance Now
                        </>
                    )}
                </AIBloggerGradientButton>
            </div>
        </div>
    );

    if (compact) {
        return (
            <AIBloggerGlassCard className={className ? className : "p-5"}>
                {content}
            </AIBloggerGlassCard>
        );
    }

    return (
        <AIBloggerGlassCard className={className ? className : "p-6"}>
            {content}
        </AIBloggerGlassCard>
    );
}

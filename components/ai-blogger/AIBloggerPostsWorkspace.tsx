"use client";

import Link from "next/link";
import Image from "next/image";
import { useCallback, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
    AlertCircle,
    ArrowLeft,
    ArrowRight,
    ArrowUpDown,
    ArrowUpRight,
    CheckCircle2,
    CheckSquare,
    ChevronDown,
    ChevronUp,
    Clock3,
    FileText,
    Filter,
    Globe,
    Layout,
    Link2,
    ListChecks,
    Search,
    Sparkles,
    Square,
    Tag,
    Target,
    TrendingUp,
    X,
} from "lucide-react";
import { toast } from "sonner";

import { bulkUpdateBlogStudioPostStatus, refreshBlogStudioPostFromPerformance } from "@/lib/actions";
import type { BlogStudioPostListFilter, BlogStudioPostSortBy, BlogStudioPostsPage, BlogStudioPostStatus } from "@/lib/types";
import {
    getBlogStudioBlockerSummary,
    getBlogStudioPublishPackageItems,
    formatBlogStudioDate,
    getBlogStudioTrendBadgeLabel,
    getBlogStudioReadinessLabel,
    getBlogStudioReadinessSummary,
    getBlogStudioReadinessTone,
    getBlogStudioSeoScoreTone,
    getBlogStudioSourceLabel,
    humanizeBlogStudioValue,
    isBlogStudioTrendLed,
} from "@/lib/ai-blogger-presentation";
import {
    AIBloggerGlassCard,
    AIBloggerGradientButton,
    AIBloggerMetricCard,
    AIBloggerSectionEyebrow,
} from "@/components/ai-blogger/AIBloggerPrimitives";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

type StatusSummaryItem = {
    label: string;
    value: number;
    status: BlogStudioPostStatus;
    tone: "primary" | "emerald" | "blue" | "violet";
};

type AIBloggerPostsWorkspaceProps = {
    postsPage: BlogStudioPostsPage;
    statusSummary: StatusSummaryItem[];
    basePath?: string;
};

const filterOptions: Array<{ value: BlogStudioPostListFilter; label: string }> = [
    { value: "all", label: "All" },
    { value: "draft", label: "Draft" },
    { value: "review", label: "Review" },
    { value: "approved", label: "Approved" },
    { value: "scheduled", label: "Scheduled" },
    { value: "published", label: "Published" },
];

function formatCompactNumber(value: number) {
    return new Intl.NumberFormat("en", {
        notation: value >= 1000 ? "compact" : "standard",
        maximumFractionDigits: value >= 1000 ? 1 : 0,
    }).format(Math.round(value));
}

function hasEditorialFiltersApplied(postsPage: BlogStudioPostsPage) {
    return Boolean(
        postsPage.query ||
        postsPage.filter !== "all" ||
        postsPage.targetType ||
        postsPage.sourceMode ||
        postsPage.searchIntent ||
        postsPage.contentType ||
        postsPage.needsAttention ||
        postsPage.refreshReason ||
        (postsPage.refreshSort && postsPage.refreshSort !== "refresh-score") ||
        (postsPage.sortBy && postsPage.sortBy !== "updatedAt") ||
        (postsPage.sortOrder && postsPage.sortOrder !== "desc"),
    );
}

const sortByOptions: Array<{ value: BlogStudioPostSortBy; label: string }> = [
    { value: "updatedAt", label: "Last Updated" },
    { value: "createdAt", label: "Date Created" },
    { value: "seoScore", label: "SEO Score" },
    { value: "wordCount", label: "Word Count" },
    { value: "title", label: "Title (A-Z)" },
];

const bulkStatusOptions: Array<{ value: BlogStudioPostStatus; label: string }> = [
    { value: "Draft", label: "Draft" },
    { value: "SEO Review", label: "SEO Review" },
    { value: "Approved", label: "Approved" },
];

const POSTS_ACTION_REFRESH_LOCK_MS = 2500;

const refreshReasonOptions = [
    { value: "all", label: "All signals" },
    { value: "low-ctr", label: "Low CTR" },
    { value: "visibility-decay", label: "Visibility Decay" },
    { value: "position-opportunity", label: "Position Opportunity" },
    { value: "stale-content", label: "Stale Content" },
    { value: "no-recent-sync", label: "No Recent Sync" },
    { value: "no-snapshot", label: "No Snapshot Yet" },
] as const;

const refreshSortOptions = [
    { value: "refresh-score", label: "Refresh Score" },
    { value: "click-loss", label: "Click Loss" },
    { value: "impression-loss", label: "Impression Loss" },
    { value: "sync-lag", label: "Sync Lag" },
] as const;

function getRefreshUrgencyClasses(urgency: BlogStudioPostsPage["refreshQueue"]["items"][number]["refreshOpportunity"]["urgency"]) {
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

function formatSignedPercent(value?: number) {
    if (typeof value !== "number" || !Number.isFinite(value)) {
        return "—";
    }

    const percentage = value * 100;
    const prefix = percentage > 0 ? "+" : "";
    return `${prefix}${percentage.toFixed(Math.abs(percentage) >= 10 ? 0 : 1)}%`;
}

export function AIBloggerPostsWorkspace({
    postsPage,
    statusSummary,
    basePath = "/dashboard/ai-blogger",
}: AIBloggerPostsWorkspaceProps) {
    const pathname = usePathname();
    const router = useRouter();
    const searchParams = useSearchParams();
    const [isPending, startTransition] = useTransition();
    const [isRefreshPending, startRefreshTransition] = useTransition();
    const [refreshingSlug, setRefreshingSlug] = useState<string | null>(null);
    const [selectedSlugs, setSelectedSlugs] = useState<Set<string>>(new Set());
    const [isBulkPending, startBulkTransition] = useTransition();
    const [bulkActionStatus, setBulkActionStatus] = useState<BlogStudioPostStatus | null>(null);
    const [isRefreshQueueOpen, setIsRefreshQueueOpen] = useState(
        postsPage.refreshQueue.totalCandidates > 0,
    );
    const [isFilterOpen, setIsFilterOpen] = useState(hasEditorialFiltersApplied(postsPage));
    const refreshFromPerformanceBusy = isRefreshPending || refreshingSlug !== null;
    const bulkBusy = isBulkPending || bulkActionStatus !== null;

    const pushWithParams = (updates: Record<string, string | null>) => {
        const params = new URLSearchParams(searchParams.toString());

        Object.entries(updates).forEach(([key, value]) => {
            if (!value) {
                params.delete(key);
            } else {
                params.set(key, value);
            }
        });

        const nextQuery = params.toString();

        startTransition(() => {
            router.push(nextQuery ? `${pathname}?${nextQuery}` : pathname);
        });
    };

    const handleSearchSubmit = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const formData = new FormData(event.currentTarget);
        const nextQuery = typeof formData.get("query") === "string"
            ? String(formData.get("query")).trim()
            : "";

        pushWithParams({
            q: nextQuery || null,
            page: "1",
        });
    };

    const showingFrom = postsPage.total === 0 ? 0 : (postsPage.page - 1) * postsPage.pageSize + 1;
    const showingTo = postsPage.total === 0
        ? 0
        : Math.min(postsPage.page * postsPage.pageSize, postsPage.total);

    const handleRefreshFromPerformance = (slug: string) => {
        if (refreshFromPerformanceBusy) {
            return;
        }

        setRefreshingSlug(slug);

        startRefreshTransition(async () => {
            let waitingForRefresh = false;
            try {
                const refreshed = await refreshBlogStudioPostFromPerformance(slug);
                toast.success(`Refresh draft ready: ${refreshed.title}`);
                waitingForRefresh = true;
                router.refresh();
            } catch (error) {
                toast.error(error instanceof Error ? error.message : "Unable to refresh this post from performance.");
                setRefreshingSlug(null);
            } finally {
                if (waitingForRefresh) {
                    window.setTimeout(() => setRefreshingSlug(null), POSTS_ACTION_REFRESH_LOCK_MS);
                } else {
                    setRefreshingSlug(null);
                }
            }
        });
    };

    const toggleSlug = useCallback((slug: string) => {
        setSelectedSlugs((prev) => {
            const next = new Set(prev);
            if (next.has(slug)) {
                next.delete(slug);
            } else {
                next.add(slug);
            }
            return next;
        });
    }, []);

    const toggleAll = useCallback(() => {
        setSelectedSlugs((prev) => {
            if (prev.size === postsPage.posts.length) {
                return new Set();
            }
            return new Set(postsPage.posts.map((p) => p.slug));
        });
    }, [postsPage.posts]);

    const clearSelection = useCallback(() => {
        setSelectedSlugs(new Set());
    }, []);

    const handleBulkStatusChange = (nextStatus: BlogStudioPostStatus) => {
        if (selectedSlugs.size === 0 || bulkBusy) return;

        setBulkActionStatus(nextStatus);
        startBulkTransition(async () => {
            let waitingForRefresh = false;
            try {
                const result = await bulkUpdateBlogStudioPostStatus({
                    slugs: Array.from(selectedSlugs),
                    status: nextStatus,
                });

                if (result.succeeded.length > 0) {
                    toast.success(`${result.succeeded.length} post${result.succeeded.length === 1 ? "" : "s"} moved to ${nextStatus}.`);
                }

                if (result.failed.length > 0) {
                    toast.error(`${result.failed.length} post${result.failed.length === 1 ? "" : "s"} could not be updated.`);
                }

                setSelectedSlugs(new Set());
                waitingForRefresh = true;
                router.refresh();
            } catch (error) {
                toast.error(error instanceof Error ? error.message : "Bulk update failed.");
                setBulkActionStatus(null);
            } finally {
                if (waitingForRefresh) {
                    window.setTimeout(() => setBulkActionStatus(null), POSTS_ACTION_REFRESH_LOCK_MS);
                } else {
                    setBulkActionStatus(null);
                }
            }
        });
    };

    return (
        <div className="space-y-8">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                <div className="space-y-3">
                    <AIBloggerSectionEyebrow>Posts</AIBloggerSectionEyebrow>
                    <div className="space-y-2">
                        <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Content Queue</h2>
                        <p className="max-w-3xl text-sm leading-7 text-muted-foreground sm:text-base">
                            Search, filter, and open your drafts, review items, scheduled posts, and published content.
                        </p>
                    </div>
                </div>

                <AIBloggerGradientButton asChild size="lg">
                    <Link href={`${basePath}/generate`}>
                        <Sparkles className="h-4 w-4" />
                        Generate New
                    </Link>
                </AIBloggerGradientButton>
            </div>

            <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-4">
                {statusSummary.map((item) => (
                    <button
                        key={item.label}
                        type="button"
                        onClick={() => pushWithParams({ filter: item.status === "SEO Review" ? "review" : item.status.toLowerCase(), page: "1" })}
                        className="cursor-pointer text-left transition-transform hover:scale-[1.01] active:scale-[0.99]"
                        aria-label={`Filter by ${item.label}`}
                    >
                        <AIBloggerMetricCard
                            icon={
                                item.status === "Draft"
                                    ? FileText
                                    : item.status === "SEO Review"
                                        ? Sparkles
                                        : item.status === "Approved"
                                            ? CheckCircle2
                                            : Clock3
                            }
                            label={item.label}
                            value={item.value}
                            note={
                                item.status === "Draft"
                                    ? "Click to filter by drafts."
                                    : item.status === "SEO Review"
                                        ? "Click to filter by SEO Review."
                                        : item.status === "Approved"
                                            ? "Click to filter by approved."
                                            : "Click to filter by scheduled."
                            }
                            tone={item.tone}
                        />
                    </button>
                ))}
            </div>

            <AIBloggerGlassCard className="p-6">
                <div className="space-y-5">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                        <div className="space-y-2">
                            <div className="flex flex-wrap items-center gap-2">
                                <button
                                    type="button"
                                    onClick={() => setIsRefreshQueueOpen((o) => !o)}
                                    className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors"
                                    aria-label={isRefreshQueueOpen ? "Collapse refresh queue" : "Expand refresh queue"}
                                >
                                        <h3 className="text-xl font-semibold">Refresh Queue</h3>
                                    <Badge variant="outline" className="rounded-full">
                                        {postsPage.refreshQueue.totalCandidates} candidate{postsPage.refreshQueue.totalCandidates === 1 ? "" : "s"}
                                    </Badge>
                                    {isRefreshQueueOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                                </button>
                            </div>
                            <p className="max-w-3xl text-sm leading-6 text-muted-foreground">
                                Published posts with live Search Console signals that suggest a refresh.
                            </p>
                        </div>
                        <div className="flex flex-wrap gap-3">
                            <AIBloggerGradientButton
                                type="button"
                                variant="outline"
                                size="sm"
                                disabled={isPending}
                                onClick={() => pushWithParams({
                                    filter: "published",
                                    page: "1",
                                })}
                            >
                                Filter Published Posts
                            </AIBloggerGradientButton>
                        </div>
                    </div>

                    <button
                        type="button"
                        onClick={() => setIsRefreshQueueOpen((v) => !v)}
                        className="w-full"
                    >
                        <div className="rounded-xl border border-border/60 bg-background/50 p-4 transition-all hover:bg-background/60">
                            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                                <div>
                                    <p className="text-sm font-semibold text-foreground">Refresh Queue</p>
                                    <p className="mt-1 text-xs text-muted-foreground">Posts needing updates based on performance data</p>
                                </div>
                                <div className="grid gap-2 grid-cols-2 sm:grid-cols-4">
                                    <div className="rounded-xl border border-border/60 bg-background/60 px-3 py-2">
                                        <p className="text-[9px] uppercase tracking-[0.14em] text-muted-foreground">Critical/High</p>
                                        <p className="mt-1 text-sm font-semibold text-foreground">
                                            {postsPage.refreshQueue.summary.criticalCount + postsPage.refreshQueue.summary.highCount}
                                        </p>
                                    </div>
                                    <div className="rounded-xl border border-border/60 bg-background/60 px-3 py-2">
                                        <p className="text-[9px] uppercase tracking-[0.14em] text-muted-foreground">Low CTR</p>
                                        <p className="mt-1 text-sm font-semibold text-foreground">
                                            {postsPage.refreshQueue.summary.lowCtrCount + postsPage.refreshQueue.summary.visibilityDecayCount}
                                        </p>
                                    </div>
                                    <div className="rounded-xl border border-border/60 bg-background/60 px-3 py-2">
                                        <p className="text-[9px] uppercase tracking-[0.14em] text-muted-foreground">Sync Gaps</p>
                                        <p className="mt-1 text-sm font-semibold text-foreground">
                                            {postsPage.refreshQueue.summary.noRecentSyncCount + postsPage.refreshQueue.summary.noSnapshotCount}
                                        </p>
                                    </div>
                                    <div className="rounded-xl border border-border/60 bg-background/60 px-3 py-2">
                                        <p className="text-[9px] uppercase tracking-[0.14em] text-muted-foreground">Avg Score</p>
                                        <p className="mt-1 text-sm font-semibold text-foreground">
                                            {postsPage.refreshQueue.summary.averageScore}/100
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 text-muted-foreground">
                                    {isRefreshQueueOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                                </div>
                            </div>
                        </div>
                    </button>

                    {isRefreshQueueOpen && <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(260px,0.9fr)]">
                        <div className="rounded-xl border border-border/60 bg-background/50 p-4">
                            <div className="flex flex-col gap-4 lg:flex-row">
                                <div className="space-y-2 lg:min-w-[220px]">
                                    <p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">Refresh Filters</p>
                                    <p className="text-sm text-muted-foreground">
                                        Focus the queue by signal type or sort it by the strongest loss pattern.
                                    </p>
                                </div>
                                <div className="grid flex-1 gap-4 sm:grid-cols-2">
                                    <div className="space-y-2">
                                        <Label className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">Signal</Label>
                                        <Select
                                            value={postsPage.refreshReason || "all"}
                                            onValueChange={(value) => pushWithParams({ refreshReason: value === "all" ? null : value, page: "1" })}
                                        >
                                            <SelectTrigger className="h-10 rounded-xl border-border/60 bg-background/60">
                                                <SelectValue placeholder="All signals" />
                                            </SelectTrigger>
                                            <SelectContent className="rounded-xl">
                                                {refreshReasonOptions.map((option) => (
                                                    <SelectItem key={option.value} value={option.value}>
                                                        {option.label}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">Sort</Label>
                                        <Select
                                            value={postsPage.refreshSort || "refresh-score"}
                                            onValueChange={(value) => pushWithParams({ refreshSort: value, page: "1" })}
                                        >
                                            <SelectTrigger className="h-10 rounded-xl border-border/60 bg-background/60">
                                                <SelectValue placeholder="Refresh score" />
                                            </SelectTrigger>
                                            <SelectContent className="rounded-xl">
                                                {refreshSortOptions.map((option) => (
                                                    <SelectItem key={option.value} value={option.value}>
                                                        {option.label}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="rounded-xl border border-border/60 bg-background/50 p-4">
                            <div className="space-y-3">
                                <div>
                                    <p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">Outcome Reporting</p>
                                    <p className="mt-1 text-sm text-muted-foreground">
                                        Latest snapshot deltas across published posts that already have comparison windows.
                                    </p>
                                </div>
                                <div className="grid gap-3 sm:grid-cols-3">
                                    <div className="rounded-2xl border border-border/60 bg-background/60 px-3 py-3">
                                        <p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">Improved</p>
                                        <p className="mt-2 text-lg font-semibold">{postsPage.refreshQueue.reporting.improvedCount}</p>
                                    </div>
                                    <div className="rounded-2xl border border-border/60 bg-background/60 px-3 py-3">
                                        <p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">Declined</p>
                                        <p className="mt-2 text-lg font-semibold">{postsPage.refreshQueue.reporting.declinedCount}</p>
                                    </div>
                                    <div className="rounded-2xl border border-border/60 bg-background/60 px-3 py-3">
                                        <p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">Stable</p>
                                        <p className="mt-2 text-lg font-semibold">{postsPage.refreshQueue.reporting.stableCount}</p>
                                    </div>
                                </div>
                                {postsPage.refreshQueue.reporting.topMovers.length > 0 ? (
                                    <div className="space-y-2">
                                        <p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">Top Movers</p>
                                        {postsPage.refreshQueue.reporting.topMovers.slice(0, 3).map((item) => (
                                            <Link
                                                key={item.postId}
                                                href={`${basePath}/posts/${item.postSlug}`}
                                                className="flex items-center justify-between gap-3 rounded-2xl border border-border/60 bg-background/60 px-3 py-3 text-sm"
                                            >
                                                <span className="line-clamp-1 font-medium">{item.postTitle}</span>
                                                <Badge variant="outline" className="rounded-full capitalize">
                                                    {item.bucket}
                                                </Badge>
                                            </Link>
                                        ))}
                                    </div>
                                ) : null}
                            </div>
                        </div>
                    </div>}

                    {isRefreshQueueOpen && postsPage.refreshQueue.items.length > 0 ? (
                        <div className="grid gap-4 xl:grid-cols-2">
                            {postsPage.refreshQueue.items.map((item) => (
                                <div
                                    key={item.post.id}
                                    className="rounded-xl border border-border/60 bg-background/55 p-5"
                                >
                                    <div className="flex flex-wrap items-start justify-between gap-3">
                                        <div className="space-y-2">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <Link
                                                    href={`${basePath}/posts/${item.post.slug}`}
                                                    className="text-base font-semibold transition-colors hover:text-primary"
                                                >
                                                    {item.post.title}
                                                </Link>
                                                <Badge variant="outline" className="rounded-full">
                                                    Refresh {item.refreshOpportunity.score}/100
                                                </Badge>
                                                <Badge
                                                    variant="outline"
                                                    className={`rounded-full ${getRefreshUrgencyClasses(item.refreshOpportunity.urgency)}`}
                                                >
                                                    {humanizeBlogStudioValue(item.refreshOpportunity.urgency)}
                                                </Badge>
                                            </div>
                                            <p className="text-sm leading-6 text-muted-foreground">
                                                {item.refreshOpportunity.summary}
                                            </p>
                                        </div>
                                        <Badge variant="outline" className="rounded-full">
                                            {item.latestSnapshot
                                                ? formatBlogStudioDate(item.latestSnapshot.refreshedAt, true)
                                                : "Waiting for first snapshot"}
                                        </Badge>
                                    </div>

                                    <div className="mt-4 grid gap-3 sm:grid-cols-3">
                                        <div className="rounded-2xl border border-border/60 bg-background/70 px-4 py-3">
                                            <p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">Clicks</p>
                                            <p className="mt-2 text-lg font-semibold">
                                                {item.latestSnapshot ? formatCompactNumber(item.latestSnapshot.clicks) : "—"}
                                            </p>
                                        </div>
                                        <div className="rounded-2xl border border-border/60 bg-background/70 px-4 py-3">
                                            <p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">Impressions</p>
                                            <p className="mt-2 text-lg font-semibold">
                                                {item.latestSnapshot ? formatCompactNumber(item.latestSnapshot.impressions) : "—"}
                                            </p>
                                        </div>
                                        <div className="rounded-2xl border border-border/60 bg-background/70 px-4 py-3">
                                            <p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">CTR / Position</p>
                                            <p className="mt-2 text-lg font-semibold">
                                                {item.latestSnapshot
                                                    ? `${(item.latestSnapshot.ctr * 100).toFixed(1)}% | ${item.latestSnapshot.position > 0 ? item.latestSnapshot.position.toFixed(1) : "-"}`
                                                    : "Awaiting Search Console data"}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="mt-4 grid gap-3 sm:grid-cols-3">
                                        <div className="rounded-2xl border border-border/60 bg-background/70 px-4 py-3">
                                            <p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">Clicks Delta</p>
                                            <p className="mt-2 text-lg font-semibold">
                                                {formatSignedPercent(item.refreshOpportunity.clickChangePct)}
                                            </p>
                                        </div>
                                        <div className="rounded-2xl border border-border/60 bg-background/70 px-4 py-3">
                                            <p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">CTR Delta</p>
                                            <p className="mt-2 text-lg font-semibold">
                                                {typeof item.refreshOpportunity.ctrDelta === "number"
                                                    ? `${item.refreshOpportunity.ctrDelta > 0 ? "+" : ""}${(item.refreshOpportunity.ctrDelta * 100).toFixed(2)} pts`
                                                    : "-"}
                                            </p>
                                        </div>
                                        <div className="rounded-2xl border border-border/60 bg-background/70 px-4 py-3">
                                            <p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">Sync Coverage</p>
                                            <p className="mt-2 text-lg font-semibold">
                                                {humanizeBlogStudioValue(item.syncCoverage)}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="mt-4 flex flex-wrap gap-2">
                                        {item.refreshOpportunity.reasons.map((reason) => (
                                            <div
                                                key={`${item.post.id}-${reason}`}
                                                className="rounded-full border border-amber-500/15 bg-amber-500/8 px-3 py-1 text-xs text-amber-700 dark:text-amber-300"
                                            >
                                                {reason}
                                            </div>
                                        ))}
                                    </div>

                                    <div className="mt-4 flex flex-wrap gap-2">
                                        {item.refreshOpportunity.signalKeys.map((signal) => (
                                            <Badge key={`${item.post.id}-${signal}`} variant="outline" className="rounded-full capitalize">
                                                {humanizeBlogStudioValue(signal)}
                                            </Badge>
                                        ))}
                                    </div>

                                    <div className="mt-4 flex flex-wrap gap-3">
                                        <AIBloggerGradientButton
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            disabled={refreshFromPerformanceBusy}
                                            onClick={() => handleRefreshFromPerformance(item.post.slug)}
                                        >
                                            {refreshFromPerformanceBusy && refreshingSlug === item.post.slug ? "Refreshing..." : "Refresh From Performance"}
                                        </AIBloggerGradientButton>
                                        <AIBloggerGradientButton asChild size="sm">
                                            <Link href={`${basePath}/posts/${item.post.slug}`}>
                                                Open Post
                                                <ArrowUpRight className="h-4 w-4" />
                                            </Link>
                                        </AIBloggerGradientButton>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : isRefreshQueueOpen ? (
                        <div className="rounded-xl border border-dashed border-border/60 bg-background/40 px-6 py-8 text-sm text-muted-foreground">
                            No published posts match the current refresh queue filter. Try a different signal view or wait for newer Search Console coverage.
                        </div>
                    ) : null}
                </div>
            </AIBloggerGlassCard>

            <div className="space-y-6">
                <form onSubmit={handleSearchSubmit} className="flex flex-col gap-4">
                    <div className="flex flex-col gap-4 sm:flex-row">
                        <div className="relative flex-1">
                            <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                            <Input
                                name="query"
                                placeholder="Search posts by title, keyword, tag, or slug..."
                                defaultValue={postsPage.query}
                                className="h-12 rounded-2xl border-border/60 bg-background/60 pl-11"
                            />
                        </div>
                        <div className="flex gap-2">
                            <AIBloggerGradientButton type="submit" variant="outline" disabled={isPending} className="h-12">
                                Search
                            </AIBloggerGradientButton>
                            {hasEditorialFiltersApplied(postsPage) ? (
                                <AIBloggerGradientButton
                                    type="button"
                                    variant="ghost"
                                    disabled={isPending}
                                    onClick={() => pushWithParams({
                                        q: null,
                                        filter: null,
                                        page: "1",
                                        targetType: null,
                                        sourceMode: null,
                                        searchIntent: null,
                                        contentType: null,
                                        needsAttention: null,
                                        refreshReason: null,
                                        refreshSort: null,
                                        sortBy: null,
                                        sortOrder: null,
                                    })}
                                    className="h-12"
                                >
                                    Clear All
                                </AIBloggerGradientButton>
                            ) : null}
                        </div>
                    </div>

                    <AIBloggerGlassCard className="border-border/40 bg-background/40 p-5">
                        <div className="space-y-5">
                            <div className="flex items-center justify-between">
                                <button
                                    type="button"
                                    onClick={() => setIsFilterOpen((o) => !o)}
                                    className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.12em] text-muted-foreground hover:text-foreground transition-colors"
                                >
                                    <Filter className="h-4 w-4" />
                                    Editorial Filters
                                    {hasEditorialFiltersApplied(postsPage) && (
                                        <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-bold text-primary-foreground">
                                            {[
                                                postsPage.filter !== "all" ? 1 : 0,
                                                postsPage.targetType ? 1 : 0,
                                                postsPage.sourceMode ? 1 : 0,
                                                postsPage.searchIntent ? 1 : 0,
                                                postsPage.contentType ? 1 : 0,
                                            ].reduce((a, b) => a + b, 0)}
                                        </span>
                                    )}
                                    {isFilterOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                                </button>
                                <div className="flex items-center gap-3">
                                    <Label htmlFor="needs-attention-toggle" className="flex cursor-pointer items-center gap-2 text-sm text-muted-foreground">
                                        <AlertCircle className={`h-4 w-4 ${postsPage.needsAttention ? "text-amber-500" : ""}`} />
                                        Needs Attention
                                    </Label>
                                    <Switch
                                        id="needs-attention-toggle"
                                        checked={postsPage.needsAttention}
                                        onCheckedChange={(checked) => pushWithParams({ needsAttention: checked ? "true" : null, page: "1" })}
                                    />
                                </div>
                            </div>

                            {isFilterOpen && <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
                                <div className="space-y-2">
                                    <Label className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">Status</Label>
                                    <Select
                                        value={postsPage.filter}
                                        onValueChange={(value) => pushWithParams({ filter: value === "all" ? null : value, page: "1" })}
                                    >
                                        <SelectTrigger className="h-10 rounded-xl border-border/60 bg-background/60">
                                            <SelectValue placeholder="All Statuses" />
                                        </SelectTrigger>
                                        <SelectContent className="rounded-xl">
                                            {filterOptions.map((option) => (
                                                <SelectItem key={option.value} value={option.value}>
                                                    {option.label}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-2">
                                    <Label className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">Target</Label>
                                    <Select
                                        value={postsPage.targetType || "all"}
                                        onValueChange={(value) => pushWithParams({ targetType: value === "all" ? null : value, page: "1" })}
                                    >
                                        <SelectTrigger className="h-10 rounded-xl border-border/60 bg-background/60">
                                            <SelectValue placeholder="All Targets" />
                                        </SelectTrigger>
                                        <SelectContent className="rounded-xl">
                                            <SelectItem value="all">All Targets</SelectItem>
                                            <SelectItem value="webhook">Webhook Publishing</SelectItem>
                                            <SelectItem value="manual-export">Manual Export</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-2">
                                    <Label className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">Source</Label>
                                    <Select
                                        value={postsPage.sourceMode || "all"}
                                        onValueChange={(value) => pushWithParams({ sourceMode: value === "all" ? null : value, page: "1" })}
                                    >
                                        <SelectTrigger className="h-10 rounded-xl border-border/60 bg-background/60">
                                            <SelectValue placeholder="All Sources" />
                                        </SelectTrigger>
                                        <SelectContent className="rounded-xl">
                                            <SelectItem value="all">All Sources</SelectItem>
                                            <SelectItem value="website">Website URL</SelectItem>
                                            <SelectItem value="trending">Google Trends</SelectItem>
                                            <SelectItem value="keywords">Keywords</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-2">
                                    <Label className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">Intent</Label>
                                    <Select
                                        value={postsPage.searchIntent || "all"}
                                        onValueChange={(value) => pushWithParams({ searchIntent: value === "all" ? null : value, page: "1" })}
                                    >
                                        <SelectTrigger className="h-10 rounded-xl border-border/60 bg-background/60">
                                            <SelectValue placeholder="All Intents" />
                                        </SelectTrigger>
                                        <SelectContent className="rounded-xl">
                                            <SelectItem value="all">All Intents</SelectItem>
                                            <SelectItem value="informational">Informational</SelectItem>
                                            <SelectItem value="commercial">Commercial</SelectItem>
                                            <SelectItem value="transactional">Transactional</SelectItem>
                                            <SelectItem value="navigational">Navigational</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-2">
                                    <Label className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">Type</Label>
                                    <Select
                                        value={postsPage.contentType || "all"}
                                        onValueChange={(value) => pushWithParams({ contentType: value === "all" ? null : value, page: "1" })}
                                    >
                                        <SelectTrigger className="h-10 rounded-xl border-border/60 bg-background/60">
                                            <SelectValue placeholder="All Types" />
                                        </SelectTrigger>
                                        <SelectContent className="rounded-xl">
                                            <SelectItem value="all">All Types</SelectItem>
                                            <SelectItem value="evergreen-guide">Evergreen Guide</SelectItem>
                                            <SelectItem value="trend-reaction">Trend Reaction</SelectItem>
                                            <SelectItem value="how-to">How-to Guide</SelectItem>
                                            <SelectItem value="comparison">Comparison</SelectItem>
                                            <SelectItem value="solution-explainer">Solution Explainer</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>}
                        </div>
                    </AIBloggerGlassCard>
                </form>

                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-3 text-sm text-muted-foreground">
                        <button
                            type="button"
                            onClick={toggleAll}
                            className="flex items-center gap-1.5 rounded-xl border border-border/60 bg-background/60 px-3 py-1.5 text-xs font-medium transition-colors hover:bg-primary/5 hover:text-primary"
                            aria-label={selectedSlugs.size === postsPage.posts.length ? "Deselect all posts" : "Select all posts"}
                        >
                            {selectedSlugs.size === postsPage.posts.length && postsPage.posts.length > 0 ? (
                                <CheckSquare className="h-3.5 w-3.5 text-primary" />
                            ) : (
                                <Square className="h-3.5 w-3.5" />
                            )}
                            {selectedSlugs.size > 0 ? `${selectedSlugs.size} selected` : "Select all"}
                        </button>
                        <p>
                            Showing <span className="font-medium text-foreground">{showingFrom}-{showingTo}</span> of <span className="font-medium text-foreground">{postsPage.total}</span> posts
                        </p>
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2">
                            <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground" />
                            <Select
                                value={postsPage.sortBy}
                                onValueChange={(value) => pushWithParams({ sortBy: value === "updatedAt" ? null : value, sortOrder: null, page: "1" })}
                            >
                                <SelectTrigger className="h-9 w-[160px] rounded-xl border-border/60 bg-background/60 text-xs">
                                    <SelectValue placeholder="Sort by" />
                                </SelectTrigger>
                                <SelectContent className="rounded-xl">
                                    {sortByOptions.map((option) => (
                                        <SelectItem key={option.value} value={option.value}>
                                            {option.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <button
                            type="button"
                            onClick={() => pushWithParams({ sortOrder: postsPage.sortOrder === "asc" ? "desc" : "asc", page: "1" })}
                            className="flex h-9 w-9 items-center justify-center rounded-xl border border-border/60 bg-background/60 text-muted-foreground transition-colors hover:bg-primary/5 hover:text-primary"
                            aria-label={postsPage.sortOrder === "asc" ? "Sort descending" : "Sort ascending"}
                        >
                            <ArrowUpDown className={`h-3.5 w-3.5 transition-transform ${postsPage.sortOrder === "asc" ? "rotate-180" : ""}`} />
                        </button>
                    </div>
                </div>
            </div>

            {/* Sticky pagination header — always visible */}
            {postsPage.posts.length > 0 && (
                <div className="sticky top-0 z-40 flex flex-col gap-3 rounded-xl border border-border/60 bg-background/40 backdrop-blur-sm p-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex flex-col gap-1">
                        <p className="text-sm font-semibold text-foreground">
                            Page {postsPage.page} of {postsPage.totalPages}
                        </p>
                        <p className="text-xs text-muted-foreground">
                            {postsPage.totalCount} total {postsPage.totalCount === 1 ? "post" : "posts"}
                        </p>
                    </div>
                    <div className="flex flex-wrap gap-3">
                        <AIBloggerGradientButton
                            type="button"
                            variant="outline"
                            disabled={!postsPage.hasPreviousPage || isPending}
                            onClick={() => {
                                pushWithParams({ page: String(postsPage.page - 1) });
                                // Scroll to top
                                window.scrollTo({ top: 0, behavior: "smooth" });
                            }}
                            title={!postsPage.hasPreviousPage ? "Already on first page" : "Go to previous page"}
                        >
                            <ArrowLeft className="h-4 w-4" />
                            Previous
                        </AIBloggerGradientButton>
                        <AIBloggerGradientButton
                            type="button"
                            disabled={!postsPage.hasNextPage || isPending}
                            onClick={() => {
                                pushWithParams({ page: String(postsPage.page + 1) });
                                // Scroll to top
                                window.scrollTo({ top: 0, behavior: "smooth" });
                            }}
                            title={!postsPage.hasNextPage ? "Already on last page" : "Go to next page"}
                        >
                            Next
                            <ArrowRight className="h-4 w-4" />
                        </AIBloggerGradientButton>
                    </div>
                </div>
            )}

            <div className="grid gap-4 lg:grid-cols-2">
                {postsPage.posts.map((post) => {
                    const queueReadiness = post.queueReadiness;
                    const needsAttention = queueReadiness?.needsAttention ?? false;
                    const hasGroundedResearch = queueReadiness?.hasGroundedSources ?? false;
                    const hasFaqPack = queueReadiness?.hasFaqPack ?? false;
                    const hasInternalLinks = queueReadiness?.hasInternalLinks ?? false;
                    const internalLinkHealth = queueReadiness?.internalLinkHealth;
                    const canonicalReady = queueReadiness?.canonicalReady ?? false;
                    const blockerCount = queueReadiness?.blockersCount ?? 0;
                    const seoScore = queueReadiness?.auditScore ?? post.seoScore;
                    const seoScoreTone = getBlogStudioSeoScoreTone(seoScore);
                    const readinessTone = getBlogStudioReadinessTone({
                        readyForApproval: queueReadiness?.readyForApproval ?? false,
                        blockersCount: blockerCount,
                        needsAttention,
                    });
                    const readinessLabel = getBlogStudioReadinessLabel({
                        readyForApproval: queueReadiness?.readyForApproval ?? false,
                        blockersCount: blockerCount,
                        needsAttention,
                    });
                    const readinessSummary = getBlogStudioReadinessSummary({
                        readyForApproval: queueReadiness?.readyForApproval ?? false,
                        blockersCount: blockerCount,
                        needsAttention,
                    });
                    const publishPackageItems = getBlogStudioPublishPackageItems({
                        metaDescriptionReady: queueReadiness?.metaDescriptionReady ?? false,
                        canonicalReady: queueReadiness?.canonicalReady ?? false,
                        featuredImageAltReady: queueReadiness?.featuredImageAltReady ?? false,
                        schemaReady: queueReadiness?.schemaReady ?? false,
                    });
                    return (
                        <Link
                            key={post.id}
                            href={`${basePath}/posts/${post.slug}`}
                            className="group block"
                        >
                            <AIBloggerGlassCard className={`relative p-4 transition-all group-hover:border-primary/40 group-hover:shadow-[0_8px_32px_rgba(212,160,10,0.08)] cursor-pointer ${needsAttention ? "border-amber-500/30 bg-amber-500/[0.02]" : ""} ${selectedSlugs.has(post.slug) ? "ring-2 ring-primary/40" : ""}`}>
                                <div className="flex h-full flex-col gap-4">
                                <div className="relative aspect-[2.4/1] overflow-hidden rounded-xl border border-border/60 bg-muted/20">
                                    {post.featuredImageUrl ? (
                                        <Image
                                            src={post.featuredImageUrl}
                                            alt={post.featuredImageAlt || post.title}
                                            fill
                                            className="object-cover"
                                            sizes="(max-width: 640px) 100vw, (max-width: 1280px) 50vw, 33vw"
                                        />
                                    ) : (
                                        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-muted-foreground">
                                            <FileText className="h-7 w-7" />
                                            {post.contentType && (
                                                <span className="max-w-[80%] truncate text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
                                                    {post.contentType.replace(/-/g, " ")}
                                                </span>
                                            )}
                                        </div>
                                    )}
                                    {/* Select checkbox */}
                                    <button
                                        type="button"
                                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggleSlug(post.slug); }}
                                        className="absolute left-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-lg border border-border/70 bg-background/90 backdrop-blur-sm transition-colors hover:bg-primary/10 hover:border-primary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
                                        aria-label={selectedSlugs.has(post.slug) ? "Deselect post" : "Select post"}
                                    >
                                        {selectedSlugs.has(post.slug) ? (
                                            <CheckSquare className="h-5 w-5 text-primary" />
                                        ) : (
                                            <Square className="h-5 w-5 text-muted-foreground" />
                                        )}
                                    </button>
                                    <div className="absolute right-3 top-3 flex max-w-[calc(100%-4.5rem)] flex-wrap justify-end gap-1.5">
                                        <Badge variant="outline" className={`max-w-full rounded-lg border bg-background/90 py-1 text-[10px] font-bold uppercase tracking-[0.1em] backdrop-blur-md ${
                                            post.status === "Published" ? "text-emerald-500" :
                                            post.status === "Scheduled" ? "text-blue-500" :
                                            post.status === "Approved" ? "text-violet-500" :
                                            "text-primary"
                                        }`}>
                                            {post.status}
                                        </Badge>
                                        <Badge
                                            variant="outline"
                                            className={`max-w-full rounded-lg border py-1 text-[10px] font-bold uppercase tracking-[0.1em] backdrop-blur-md ${
                                                readinessTone === "emerald"
                                                    ? "bg-emerald-500/90 text-white"
                                                    : readinessTone === "amber"
                                                        ? "bg-amber-500/90 text-white"
                                                        : "bg-blue-500/90 text-white"
                                            }`}
                                        >
                                            {readinessLabel}
                                        </Badge>
                                        {isBlogStudioTrendLed({
                                            sourceMode: post.brief.sourceMode,
                                            trendFocus: post.brief.trendFocus,
                                            contentType: post.contentType,
                                        }) ? (
                                            <Badge variant="outline" className="max-w-full rounded-lg border-none bg-primary/90 py-1 text-[10px] font-bold uppercase tracking-[0.1em] text-black backdrop-blur-md">
                                                {getBlogStudioTrendBadgeLabel(post.brief, post.contentType)}
                                            </Badge>
                                        ) : null}
                                    </div>
                                    {post.searchIntent && (
                                        <div className="absolute bottom-3 right-3 flex max-w-[80%] flex-wrap justify-end gap-1.5">
                                            <Badge variant="outline" className="rounded-lg border bg-background/80 py-1 text-[10px] font-medium capitalize backdrop-blur-md">
                                                <Target className="mr-1 h-3 w-3" />
                                                {post.searchIntent}
                                            </Badge>
                                        </div>
                                    )}
                                </div>

                                <div className="flex-1 space-y-3">
                                    <div className="space-y-1">
                                        <p className="line-clamp-2 text-lg font-semibold transition-colors group-hover:text-primary">
                                            {post.title}
                                        </p>
                                        <div className="flex flex-wrap items-center gap-2 text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
                                            <span className="flex items-center gap-1">
                                                <Globe className="h-3 w-3" />
                                                {getBlogStudioSourceLabel(post.brief.sourceMode)}
                                            </span>
                                            <span className="hidden sm:inline">|</span>
                                            <span className="flex items-center gap-1">
                                                <Layout className="h-3 w-3" />
                                                {post.contentType ? humanizeBlogStudioValue(post.contentType) : "Draft"}
                                            </span>
                                        </div>
                                    </div>

                                    <p className="line-clamp-2 text-sm leading-6 text-muted-foreground">
                                        {post.excerpt || "Excerpt will appear here once the draft body exists."}
                                    </p>

                                    {post.contentClusterId || post.parentTopicSlug ? (
                                        <div className="flex flex-wrap gap-2 text-[10px] uppercase tracking-wider text-muted-foreground">
                                            {post.contentClusterId ? (
                                                <span className="flex items-center gap-1 rounded-full border border-border/60 bg-background/60 px-2.5 py-1">
                                                    <Tag className="h-3 w-3" />
                                                    Cluster {humanizeBlogStudioValue(post.contentClusterId)}
                                                </span>
                                            ) : null}
                                            {post.parentTopicSlug ? (
                                                <span className="rounded-full border border-border/60 bg-background/60 px-2.5 py-1">
                                                    Parent {humanizeBlogStudioValue(post.parentTopicSlug)}
                                                </span>
                                            ) : null}
                                        </div>
                                    ) : null}

                                    <p className="text-xs leading-5 text-muted-foreground">
                                        {readinessSummary}
                                    </p>

                                    <div className="flex flex-wrap gap-2 pt-1">
                                        {hasGroundedResearch && (
                                            <div className="flex items-center gap-1 rounded-full bg-primary/5 px-2 py-0.5 text-[10px] font-medium text-primary border border-primary/10" title="Grounded Research Available">
                                                <Search className="h-3 w-3" />
                                                {queueReadiness?.groundedSourceCount || 0} Sources
                                            </div>
                                        )}
                                        {hasFaqPack && (
                                            <div className="flex items-center gap-1 rounded-full bg-blue-500/5 px-2 py-0.5 text-[10px] font-medium text-blue-500 border border-blue-500/10" title="FAQ Pack Available">
                                                <ListChecks className="h-3 w-3" />
                                                FAQ Pack
                                            </div>
                                        )}
                                        {hasInternalLinks && (
                                            <div className="flex items-center gap-1 rounded-full bg-emerald-500/5 px-2 py-0.5 text-[10px] font-medium text-emerald-500 border border-emerald-500/10" title="Internal Links Present">
                                                <Link2 className="h-3 w-3" />
                                                Links
                                            </div>
                                        )}
                                        {internalLinkHealth && blockerCount === 0 ? (
                                            <div className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${
                                                internalLinkHealth.status === "connected"
                                                    ? "border border-emerald-500/10 bg-emerald-500/5 text-emerald-500"
                                                    : internalLinkHealth.status === "weak"
                                                        ? "border border-amber-500/10 bg-amber-500/5 text-amber-500"
                                                        : "border border-destructive/10 bg-destructive/5 text-destructive"
                                            }`} title={internalLinkHealth.summary}>
                                                <Link2 className="h-3 w-3" />
                                                {internalLinkHealth.label}
                                            </div>
                                        ) : null}
                                        {canonicalReady && !hasFaqPack && !hasInternalLinks ? (
                                            <div className="flex items-center gap-1 rounded-full border border-violet-500/10 bg-violet-500/5 px-2 py-0.5 text-[10px] font-medium text-violet-500" title="Canonical URL Ready">
                                                <Target className="h-3 w-3" />
                                                Canonical
                                            </div>
                                        ) : null}
                                        {blockerCount > 0 && (
                                            <div className="flex items-center gap-1 rounded-full border border-amber-500/10 bg-amber-500/5 px-2 py-0.5 text-[10px] font-medium text-amber-500" title="Required SEO blockers remaining">
                                                <AlertCircle className="h-3 w-3" />
                                                {getBlogStudioBlockerSummary(blockerCount)}
                                            </div>
                                        )}
                                    </div>

                                    <div className="flex flex-wrap gap-2">
                                        {publishPackageItems.slice(0, 3).map((item) => (
                                            <div
                                                key={`${post.id}-${item.key}`}
                                                className={`rounded-full border px-2 py-0.5 text-[10px] font-medium ${
                                                    item.ready
                                                        ? "border-emerald-500/10 bg-emerald-500/5 text-emerald-500"
                                                        : "border-border/60 bg-background/40 text-muted-foreground"
                                                }`}
                                            >
                                                {item.label}
                                            </div>
                                        ))}
                                        {publishPackageItems.length > 3 ? (
                                            <div className="rounded-full border border-border/60 bg-background/40 px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                                                +{publishPackageItems.length - 3} more
                                            </div>
                                        ) : null}
                                    </div>
                                </div>

                                <div className="space-y-3 border-t border-border/60 pt-4">
                                    <div className="flex items-center justify-between">
                                        <div className="flex flex-col gap-1">
                                            <span className="text-[10px] uppercase tracking-wider text-muted-foreground">SEO Score</span>
                                            <div className="flex items-center gap-1.5">
                                                <TrendingUp className={`h-3.5 w-3.5 ${
                                                    seoScoreTone === "emerald"
                                                        ? "text-emerald-500"
                                                        : seoScoreTone === "amber"
                                                            ? "text-amber-500"
                                                            : seoScoreTone === "blue"
                                                                ? "text-blue-500"
                                                                : "text-primary"
                                                }`} />
                                                <span className={`text-sm font-bold ${
                                                    seoScoreTone === "emerald"
                                                        ? "text-emerald-500"
                                                        : seoScoreTone === "amber"
                                                            ? "text-amber-500"
                                                            : seoScoreTone === "blue"
                                                                ? "text-blue-500"
                                                                : "text-primary"
                                                }`}>
                                                    {typeof seoScore === "number" ? `${seoScore}%` : "Pending"}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="flex flex-col items-end gap-1 text-right">
                                            <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Workflow</span>
                                            <span className="text-xs font-medium">{post.wordCount || 0} words</span>
                                        </div>
                                    </div>
                                    <div className="h-1.5 overflow-hidden rounded-full bg-muted/70">
                                        <div
                                            className={`h-full rounded-full transition-all duration-500 ${
                                                seoScoreTone === "emerald"
                                                    ? "bg-emerald-500"
                                                    : seoScoreTone === "amber"
                                                        ? "bg-amber-500"
                                                        : seoScoreTone === "blue"
                                                            ? "bg-blue-500"
                                                            : "bg-primary"
                                            }`}
                                            style={{ width: `${typeof seoScore === "number" ? Math.min(seoScore, 100) : 10}%` }}
                                        />
                                    </div>
                                    <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                                        <span>Updated {formatBlogStudioDate(post.updatedAt, true)}</span>
                                        <span className="truncate max-w-[120px]">{post.target.label}</span>
                                    </div>
                                </div>
                                </div>
                            </AIBloggerGlassCard>
                        </Link>
                    );
                })}
            </div>

            {postsPage.posts.length === 0 ? (
                <AIBloggerGlassCard className="p-12 text-center">
                    <div className="mx-auto max-w-md space-y-4">
                        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-xl bg-primary/12 text-primary">
                            <FileText className="h-8 w-8" />
                        </div>
                        <div className="space-y-2">
                            <h3 className="text-xl font-bold">No posts found</h3>
                            <p className="text-sm leading-6 text-muted-foreground">
                                {hasEditorialFiltersApplied(postsPage)
                                    ? "Try adjusting the active search or editorial filters."
                                    : "Generate your first AI Blogger draft to get started."}
                            </p>
                        </div>
                        <AIBloggerGradientButton asChild>
                            <Link href={`${basePath}/generate`}>Generate Draft</Link>
                        </AIBloggerGradientButton>
                    </div>
                </AIBloggerGlassCard>
            ) : null}

            {postsPage.posts.length > 0 ? (
                <div className="flex flex-col gap-3 rounded-xl border border-border/60 bg-background/40 p-4 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-sm text-muted-foreground">
                        {!postsPage.hasPreviousPage && !postsPage.hasNextPage
                            ? "Showing all drafts on one page"
                            : !postsPage.hasPreviousPage
                            ? "Showing first page"
                            : !postsPage.hasNextPage
                            ? "Showing last page"
                            : `Page ${postsPage.page} of ${postsPage.totalPages}`}
                    </p>
                    <div className="flex flex-wrap gap-3">
                        <AIBloggerGradientButton
                            type="button"
                            variant="outline"
                            disabled={!postsPage.hasPreviousPage || isPending}
                            onClick={() => {
                                pushWithParams({ page: String(postsPage.page - 1) });
                                window.scrollTo({ top: 0, behavior: "smooth" });
                            }}
                            title={!postsPage.hasPreviousPage ? "Already on first page" : "Go to previous page"}
                        >
                            <ArrowLeft className="h-4 w-4" />
                            Previous
                        </AIBloggerGradientButton>
                        <AIBloggerGradientButton
                            type="button"
                            disabled={!postsPage.hasNextPage || isPending}
                            onClick={() => {
                                pushWithParams({ page: String(postsPage.page + 1) });
                                window.scrollTo({ top: 0, behavior: "smooth" });
                            }}
                            title={!postsPage.hasNextPage ? "Already on last page" : "Go to next page"}
                        >
                            Next
                            <ArrowRight className="h-4 w-4" />
                        </AIBloggerGradientButton>
                    </div>
                </div>
            ) : null}

            {/* Floating bulk action toolbar */}
            {selectedSlugs.size > 0 ? (
                <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2">
                    <div className="flex items-center gap-3 rounded-2xl border border-primary/25 bg-background/95 px-5 py-3 shadow-2xl shadow-primary/10 backdrop-blur-xl">
                        <span className="text-sm font-semibold">
                            {selectedSlugs.size} selected
                        </span>
                        <div className="h-5 w-px bg-border/60" />
                        {bulkStatusOptions.map((option) => (
                            <AIBloggerGradientButton
                                key={option.value}
                                type="button"
                                variant="outline"
                                size="sm"
                                disabled={bulkBusy}
                                onClick={() => handleBulkStatusChange(option.value)}
                            >
                                {bulkActionStatus === option.value ? "Moving..." : `Move to ${option.label}`}
                            </AIBloggerGradientButton>
                        ))}
                        <div className="h-5 w-px bg-border/60" />
                        <button
                            type="button"
                            onClick={clearSelection}
                            disabled={bulkBusy}
                            className="flex h-8 w-8 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive disabled:pointer-events-none disabled:opacity-50"
                            aria-label="Clear selection"
                        >
                            <X className="h-4 w-4" />
                        </button>
                    </div>
                </div>
            ) : null}
        </div>
    );
}

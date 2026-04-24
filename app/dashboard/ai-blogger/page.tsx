import Link from "next/link";
import {
    ArrowUpRight,
    CalendarClock,
    CheckCircle2,
    Clock3,
    FilePenLine,
    Sparkles,
    TrendingUp,
} from "lucide-react";

import { AIBloggerLockedState } from "@/components/ai-blogger/AIBloggerLockedState";
import { AIBloggerBreadcrumb } from "@/components/ai-blogger/AIBloggerBreadcrumb";
import { AIBloggerPerformanceSyncCard } from "@/components/ai-blogger/AIBloggerPerformanceSyncCard";
import { RecentRunsCard } from "@/components/ai-blogger/RecentRunsCard";
import { SearchConsoleAnalyticsCard } from "@/components/ai-blogger/SearchConsoleAnalyticsCard";
import {
    AIBloggerGlassCard,
    AIBloggerGradientButton,
    AIBloggerMetricCard,
} from "@/components/ai-blogger/AIBloggerPrimitives";
import { AIBloggerDatabaseUnavailableState } from "@/components/ai-blogger/AIBloggerDatabaseUnavailableState";
import { Badge } from "@/components/ui/badge";
import { getBlogStudioOverviewImpl, getAggregatedSearchConsoleAnalyticsImpl } from "@/lib/actions/ai-blogger";
import { aiBloggerPipelineSteps } from "@/lib/ai-blogger-content";
import { getAIBloggerDashboardContext } from "@/lib/ai-blogger-dashboard";
import { isMongoConnectionIssue } from "@/lib/mongodb-connection";
import {
    formatBlogStudioDate,
    getBlogStudioPublishModeLabel,
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

export default async function AIBloggerOverviewPage() {
    try {
        const { access, agency, currentUser } = await getAIBloggerDashboardContext();

        if (!access.canAccess) {
            return <AIBloggerLockedState access={access} />;
        }

        const [overview, searchConsoleAnalytics] = await Promise.all([
            getBlogStudioOverviewImpl(agency.id, agency.name),
            getAggregatedSearchConsoleAnalyticsImpl(agency.id, 7),
        ]);
        const firstName = currentUser.name?.split(" ")[0] || "there";

        const overviewMetrics = [
            {
                label: "Draft Queue",
                value: overview.metrics.draftsInQueue,
                note: "Drafts still moving through research, writing, and SEO review.",
                icon: FilePenLine,
                tone: "primary" as const,
            },
            {
                label: "Ready To Review",
                value: overview.metrics.readyToReview,
                note: "Posts waiting for editorial approval before the next handoff.",
                icon: Sparkles,
                tone: "violet" as const,
            },
            {
                label: "Active Schedules",
                value: overview.metrics.scheduledRuns,
                note: "Saved automation windows ready to create new drafts for your content plan.",
                icon: CalendarClock,
                tone: "blue" as const,
            },
            {
                label: "Published Posts",
                value: overview.metrics.publishedPosts,
                note: "Approved posts that already made it through the AI Blogger flow.",
                icon: CheckCircle2,
                tone: "emerald" as const,
            },
            {
                label: "Refresh Queue",
                value: overview.metrics.refreshCandidates,
                note: "Published posts with live performance signals that suggest a refresh.",
                icon: TrendingUp,
                tone: "blue" as const,
            },
        ];

        return (
            <>
            <div className="space-y-3">
                <AIBloggerBreadcrumb items={[{ label: "AI Blogger" }, { label: "Overview" }]} />
                <div className="space-y-2">
                        <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
                            Welcome back, {firstName}.
                        </h2>
                        <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
                            Keep the queue moving, review the latest runs, and jump straight into drafting.
                        </p>
                    </div>
                </div>

            <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-5">
                {overviewMetrics.map((metric) => (
                    <AIBloggerMetricCard
                        key={metric.label}
                        icon={metric.icon}
                        label={metric.label}
                        value={metric.value}
                        note={metric.note}
                        tone={metric.tone}
                    />
                ))}
            </div>

            <AIBloggerPerformanceSyncCard syncStatus={overview.syncStatus} />

            <SearchConsoleAnalyticsCard initialData={searchConsoleAnalytics} syncStatus={overview.syncStatus} />

            <div className="grid gap-6 xl:grid-cols-[minmax(0,1.08fr)_minmax(320px,0.92fr)]">
                <AIBloggerGlassCard className="p-6">
                    <div className="space-y-5">
                        <div className="space-y-2">
                            <div className="flex items-center justify-between gap-3">
                                <div>
                                    <h3 className="text-lg font-semibold">Workflow Snapshot</h3>
                                    <p className="text-sm leading-6 text-muted-foreground">
                                        Core publishing defaults and the current editorial pipeline.
                                    </p>
                                </div>
                                <Badge className="rounded-full bg-primary/12 px-3 py-1 text-primary hover:bg-primary/12">
                                    Live
                                </Badge>
                            </div>
                        </div>

                        <div className="grid gap-3 md:grid-cols-3">
                            {[
                                `Target: ${overview.settings.publishing.defaultTarget.label}`,
                                `Publish mode: ${getBlogStudioPublishModeLabel(overview.settings.publishing.publishMode)}`,
                                `Avg SEO: ${overview.metrics.averageSeoScore > 0 ? `${overview.metrics.averageSeoScore}/100` : "Waiting for scored drafts"}`,
                            ].map((item) => (
                                <div key={item} className="rounded-2xl border border-border/60 bg-background/65 px-4 py-3 text-sm text-muted-foreground">
                                    {item}
                                </div>
                            ))}
                        </div>

                        <div className="space-y-3">
                            {aiBloggerPipelineSteps.map((step, index) => (
                                <div
                                    key={step.title}
                                    className="flex gap-4 rounded-2xl border border-border/60 bg-background/60 px-4 py-4"
                                >
                                    <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-2xl bg-primary/12 text-sm font-semibold text-primary">
                                        0{index + 1}
                                    </div>
                                    <div className="space-y-1">
                                        <p className="font-medium">{step.title}</p>
                                        <p className="text-sm leading-6 text-muted-foreground">{step.description}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </AIBloggerGlassCard>

                <AIBloggerGlassCard glow className="p-6">
                    <div className="flex h-full flex-col justify-between gap-5">
                        <div className="space-y-3">
                            <Badge className="w-fit rounded-full bg-primary/12 px-3 py-1 text-primary hover:bg-primary/12">
                                Editorial Command Center
                            </Badge>
                            <div className="space-y-2">
                                <h3 className="text-xl font-bold sm:text-2xl">
                                    Draft, review, and publish faster
                                </h3>
                                <p className="text-sm leading-6 text-muted-foreground">
                                    Move from idea to published article with a clear editorial flow.
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center justify-between gap-4 rounded-[24px] border border-primary/18 bg-primary/8 px-4 py-4">
                            <div className="space-y-1">
                                <p className="text-sm font-semibold">Best next action</p>
                                <p className="text-sm text-muted-foreground">
                                    {overview.metrics.refreshCandidates > 0
                                        ? "Open the refresh queue and update published posts with the strongest decay signals."
                                        : overview.metrics.draftsInQueue > 0
                                        ? "Open the queue and move ready drafts toward approval."
                                        : "Start a new AI draft from the Generate page."}
                                </p>
                            </div>
                            <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-[20px] bg-gradient-to-br from-primary via-yellow-300 to-amber-200 text-black shadow-[0_18px_40px_rgba(212,160,10,0.24)]">
                                <Sparkles className="h-6 w-6" />
                            </div>
                        </div>
                    </div>
                </AIBloggerGlassCard>
            </div>

            <AIBloggerGlassCard className="p-6">
                <div className="space-y-5">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                        <div className="space-y-2">
                            <div className="flex flex-wrap items-center gap-2">
                                <h3 className="text-xl font-semibold">Performance Refresh Queue</h3>
                                <Badge variant="outline" className="rounded-full">
                                    {overview.refreshQueue.totalCandidates} candidate{overview.refreshQueue.totalCandidates === 1 ? "" : "s"}
                                </Badge>
                            </div>
                            <p className="max-w-3xl text-sm leading-6 text-muted-foreground">
                                Published posts with low CTR, decaying visibility, or aging content windows that should be refreshed next.
                            </p>
                        </div>
                        <AIBloggerGradientButton asChild variant="outline" size="sm">
                            <Link href="/dashboard/ai-blogger/refresh-queue">
                                View Full Queue
                            </Link>
                        </AIBloggerGradientButton>
                    </div>

                    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                        <div className="rounded-2xl border border-border/60 bg-background/55 px-4 py-3">
                            <p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">Critical / High</p>
                            <p className="mt-2 text-lg font-semibold">
                                {overview.refreshQueue.summary.criticalCount + overview.refreshQueue.summary.highCount}
                            </p>
                        </div>
                        <div className="rounded-2xl border border-border/60 bg-background/55 px-4 py-3">
                            <p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">Low CTR / Decay</p>
                            <p className="mt-2 text-lg font-semibold">
                                {overview.refreshQueue.summary.lowCtrCount + overview.refreshQueue.summary.visibilityDecayCount}
                            </p>
                        </div>
                        <div className="rounded-2xl border border-border/60 bg-background/55 px-4 py-3">
                            <p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">Sync Gaps</p>
                            <p className="mt-2 text-lg font-semibold">
                                {overview.refreshQueue.summary.noRecentSyncCount + overview.refreshQueue.summary.noSnapshotCount}
                            </p>
                        </div>
                        <div className="rounded-2xl border border-border/60 bg-background/55 px-4 py-3">
                            <p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">Latest Movers</p>
                            <p className="mt-2 text-lg font-semibold">
                                {overview.refreshQueue.reporting.improvedCount} up / {overview.refreshQueue.reporting.declinedCount} down
                            </p>
                        </div>
                    </div>

                    {overview.refreshQueue.items.length > 0 ? (
                        <div className="grid gap-4 xl:grid-cols-2">
                            {overview.refreshQueue.items.map((item) => (
                                <div
                                    key={item.post.id}
                                    className="rounded-[24px] border border-border/60 bg-background/60 p-5"
                                >
                                    <div className="flex flex-wrap items-start justify-between gap-3">
                                        <div className="space-y-2">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <Link
                                                    href={`/dashboard/ai-blogger/posts/${item.post.slug}`}
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
                                        <AIBloggerGradientButton asChild variant="outline" size="sm">
                                            <Link href={`/dashboard/ai-blogger/posts/${item.post.slug}`}>
                                                Open Post
                                                <ArrowUpRight className="h-4 w-4" />
                                            </Link>
                                        </AIBloggerGradientButton>
                                    </div>

                                    <div className="mt-4 grid gap-3 sm:grid-cols-3">
                                        <div className="rounded-2xl border border-border/60 bg-background/55 px-4 py-3">
                                            <p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">Clicks</p>
                                            <p className="mt-2 text-lg font-semibold">
                                                {item.latestSnapshot ? formatCompactNumber(item.latestSnapshot.clicks) : "—"}
                                            </p>
                                        </div>
                                        <div className="rounded-2xl border border-border/60 bg-background/55 px-4 py-3">
                                            <p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">Impressions</p>
                                            <p className="mt-2 text-lg font-semibold">
                                                {item.latestSnapshot ? formatCompactNumber(item.latestSnapshot.impressions) : "—"}
                                            </p>
                                        </div>
                                        <div className="rounded-2xl border border-border/60 bg-background/55 px-4 py-3">
                                            <p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">CTR / Position</p>
                                            <p className="mt-2 text-lg font-semibold">
                                                {item.latestSnapshot
                                                    ? `${(item.latestSnapshot.ctr * 100).toFixed(1)}% | ${item.latestSnapshot.position > 0 ? item.latestSnapshot.position.toFixed(1) : "-"}`
                                                    : "Awaiting Search Console data"}
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

                                    <p className="mt-4 text-xs text-muted-foreground">
                                        {item.latestSnapshot
                                            ? `Synced ${formatBlogStudioDate(item.latestSnapshot.refreshedAt, true)}`
                                            : "Search Console coverage has not been captured yet."}
                                    </p>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="rounded-[24px] border border-dashed border-border/60 bg-background/40 px-6 py-8 text-sm text-muted-foreground">
                            No published posts are currently flagged for a performance refresh. Once Search Console snapshots show decay or CTR gaps, they appear here.
                        </div>
                    )}
                </div>
            </AIBloggerGlassCard>

            <div className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)]">
                <AIBloggerGlassCard className="p-6">
                    <div className="flex items-center justify-between gap-4">
                        <div>
                            <h3 className="text-xl font-semibold">Recent Drafts</h3>
                            <p className="mt-1 text-sm text-muted-foreground">
                                Your latest drafts, ready for review, editing, and scheduling.
                            </p>
                        </div>
                        <AIBloggerGradientButton asChild variant="outline" size="sm">
                            <Link href="/dashboard/ai-blogger/posts">View All</Link>
                        </AIBloggerGradientButton>
                    </div>

                    <div className="mt-6 grid gap-4 md:grid-cols-2">
                        {overview.recentPosts.length > 0 ? (
                            overview.recentPosts.map((post) => (
                                <AIBloggerGlassCard key={post.id} className="p-5" hover>
                                    <div className="space-y-4">
                                        <div className="aspect-[16/9] rounded-2xl border border-primary/10 bg-[linear-gradient(135deg,rgba(212,160,10,0.18),rgba(255,255,255,0.02))] dark:bg-[linear-gradient(135deg,rgba(212,160,10,0.16),rgba(15,15,15,0.3))]">
                                            <div className="flex h-full items-center justify-center text-primary/70">
                                                <FilePenLine className="h-10 w-10" />
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <div className="flex items-start justify-between gap-3">
                                                <Link
                                                    href={`/dashboard/ai-blogger/posts/${post.slug}`}
                                                    className="line-clamp-2 text-lg font-semibold transition-colors hover:text-primary"
                                                >
                                                    {post.title}
                                                </Link>
                                                <Badge variant="outline" className="rounded-full">
                                                    {post.status}
                                                </Badge>
                                            </div>
                                            <p className="line-clamp-2 text-sm leading-6 text-muted-foreground">
                                                {post.excerpt || "Excerpt will appear here once the draft is generated."}
                                            </p>
                                        </div>

                                        <div className="space-y-3 pt-1">
                                            <div className="flex items-center justify-between text-xs text-muted-foreground">
                                                <span>{post.target.label}</span>
                                                <span>{post.wordCount ?? "-"} words</span>
                                            </div>
                                            <div className="flex items-center justify-between text-xs">
                                                <span className="text-muted-foreground">SEO score</span>
                                                <span className="font-semibold text-primary">
                                                    {typeof post.seoScore === "number" ? `${post.seoScore}/100` : "Pending"}
                                                </span>
                                            </div>
                                            <div className="h-1.5 overflow-hidden rounded-full bg-muted/70">
                                                <div
                                                    className="h-full rounded-full bg-primary"
                                                    style={{ width: `${typeof post.seoScore === "number" ? Math.min(post.seoScore, 100) : 24}%` }}
                                                />
                                            </div>
                                            <div className="text-xs text-muted-foreground">
                                                Updated {formatBlogStudioDate(post.updatedAt, true)}
                                            </div>
                                        </div>
                                    </div>
                                </AIBloggerGlassCard>
                            ))
                        ) : (
                            <div className="col-span-full rounded-[24px] border border-dashed border-border/60 bg-background/40 px-6 py-10 text-center text-sm text-muted-foreground">
                                No drafts yet. Your first AI or manual draft will show up here.
                            </div>
                        )}
                    </div>
                </AIBloggerGlassCard>

                <div className="space-y-6">
                    <RecentRunsCard runs={overview.recentRuns} />

                    <AIBloggerGlassCard className="p-6">
                        <div className="space-y-4">
                            <h3 className="text-lg font-semibold">Active Schedules</h3>
                            <div className="space-y-3">
                                {overview.activeSchedules.length > 0 ? (
                                    overview.activeSchedules.map((schedule) => (
                                        <div key={schedule.id} className="rounded-2xl border border-border/60 bg-background/60 px-4 py-4">
                                            <div className="flex items-start justify-between gap-3">
                                                <div>
                                                    <p className="font-medium">{schedule.name}</p>
                                                    <p className="mt-1 text-sm text-muted-foreground">
                                                        {humanizeBlogStudioValue(schedule.cadence)} cadence
                                                    </p>
                                                    <p className="mt-1 text-xs text-muted-foreground">
                                                        Next run: {formatBlogStudioDate(schedule.nextRunAt, true)}
                                                    </p>
                                                </div>
                                                <div className="rounded-2xl bg-primary/10 p-2 text-primary">
                                                    <Clock3 className="h-4 w-4" />
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="rounded-2xl border border-dashed border-border/60 bg-background/40 px-4 py-6 text-sm text-muted-foreground">
                                        No schedules are active yet.
                                    </div>
                                )}
                            </div>
                        </div>
                    </AIBloggerGlassCard>
                </div>
            </div>
            </>
        );
    } catch (error) {
        if (!isMongoConnectionIssue(error)) {
            throw error;
        }

        return (
            <AIBloggerDatabaseUnavailableState
                retryHref="/dashboard/ai-blogger"
                message="AI Blogger couldn't load the overview because MongoDB is temporarily unavailable."
            />
        );
    }
}

import Link from "next/link";
import {
    BarChart3,
    ExternalLink,
    FileText,
    Link2,
    Search,
    ShieldCheck,
    Sparkles,
    Target,
} from "lucide-react";

import {
    AIBloggerGlassCard,
} from "@/components/ai-blogger/AIBloggerPrimitives";
import { Badge } from "@/components/ui/badge";
import type { BlogStudioGenerationDiagnostics } from "@/lib/types";
import type { AIBloggerWebsiteIntelligence } from "@/lib/ai-blogger-website-intelligence";
import type { AIBloggerSerpAnalysis } from "@/lib/ai-blogger-serp-analysis";

/* ─── Helpers ──────────────────────────────────────────────────── */

function formatWorkflowDate(value?: string) {
    if (!value) {
        return "Not available";
    }

    const parsed = new Date(value);
    if (!Number.isFinite(parsed.getTime())) {
        return value;
    }

    return parsed.toLocaleString();
}

function getScoreTone(score?: number) {
    if (typeof score !== "number") {
        return "border-border/60 bg-background/60 text-muted-foreground";
    }

    if (score >= 80) {
        return "border-emerald-500/25 bg-emerald-500/8 text-emerald-500";
    }

    if (score >= 60) {
        return "border-amber-500/25 bg-amber-500/8 text-amber-500";
    }

    return "border-primary/25 bg-primary/8 text-primary";
}

function formatSearchLocationLabel(location?: string) {
    return location?.trim() ? location.toUpperCase() : "GLOBAL";
}

const generationSourceLabels: Array<{
    key: keyof NonNullable<BlogStudioGenerationDiagnostics["sourceUsage"]>;
    label: string;
}> = [
    { key: "usedWebsiteIntelligence", label: "Website Intelligence" },
    { key: "usedLiveTrends", label: "Live Trends" },
    { key: "usedTrendFocus", label: "Trend Focus" },
    { key: "usedSerpAnalysis", label: "SERP Analysis" },
    { key: "usedGroundedResearch", label: "Grounded Research" },
    { key: "usedPerformanceData", label: "Performance Data" },
];

export function PostGenerationStrategyCard({
    diagnostics,
}: {
    diagnostics?: BlogStudioGenerationDiagnostics;
}) {
    const sourceUsage = diagnostics?.sourceUsage;
    const scorecard = diagnostics?.scorecard;
    const enabledSources = generationSourceLabels.filter((item) => sourceUsage?.[item.key]);
    const keywordOpportunities = diagnostics?.keywordPlan?.keywordOpportunityScores?.slice(0, 4) || [];
    const finalQualityScore = diagnostics?.finalQuality?.score ?? scorecard?.finalQuality;
    const scoreMetrics = [
        { label: "Opportunity Score", value: scorecard?.opportunityScore, icon: Target },
        { label: "Topic Integrity", value: scorecard?.topicIntegrity, icon: ShieldCheck },
        { label: "Search Demand", value: scorecard?.searchDemand, icon: BarChart3 },
        { label: "Winnability", value: scorecard?.winnability, icon: ShieldCheck },
        { label: "Internal Link Support", value: scorecard?.internalLinkSupport, icon: Link2 },
        { label: "Website Relevance", value: scorecard?.websiteRelevance, icon: FileText },
        { label: "Trend Relevance", value: scorecard?.trendRelevance, icon: Sparkles },
        { label: "Business Fit", value: scorecard?.businessFit, icon: BarChart3 },
        { label: "Final Quality", value: finalQualityScore, icon: Search },
    ];

    return (
        <AIBloggerGlassCard className="p-6">
            <div className="space-y-5">
                <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-[20px] bg-primary/12 text-primary">
                        <Sparkles className="h-5 w-5" />
                    </div>
                    <div>
                        <h3 className="text-lg font-semibold">Topic Strategy</h3>
                        <p className="text-sm text-muted-foreground">
                            Stored topic scoring and source usage from the generation pipeline.
                        </p>
                    </div>
                </div>

                {diagnostics ? (
                    <div className="space-y-4">
                        <div className="flex flex-wrap gap-2">
                            <Badge variant="outline" className="rounded-full">
                                {diagnostics.fetchTrendsLabel || "Strategy stored"}
                            </Badge>
                            {diagnostics.selectedTopic ? (
                                <Badge variant="outline" className="rounded-full">
                                    Topic: {diagnostics.selectedTopic}
                                </Badge>
                            ) : null}
                        </div>

                        <div className="rounded-xl border border-border/60 bg-background/60 px-4 py-4">
                            <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                                Trend Discovery Notes
                            </p>
                            <p className="mt-2 text-sm leading-6 text-muted-foreground">
                                {diagnostics.fetchTrendsNotes || "No generation note was stored for trend discovery."}
                            </p>
                        </div>

                        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                            {scoreMetrics.map((item) => (
                                <div key={item.label} className="rounded-xl border border-border/60 bg-background/60 px-4 py-4">
                                    <div className="flex items-center justify-between gap-3">
                                        <div>
                                            <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                                                {item.label}
                                            </p>
                                            <p className="mt-2 text-sm text-muted-foreground">
                                                {typeof item.value === "number" ? `${item.value}/100` : "Not scored"}
                                            </p>
                                        </div>
                                        <div className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold ${getScoreTone(item.value)}`}>
                                            <item.icon className="h-3.5 w-3.5" />
                                            {typeof item.value === "number" ? item.value : "—"}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {keywordOpportunities.length > 0 ? (
                            <div className="rounded-xl border border-border/60 bg-background/60 px-4 py-4">
                                <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                                    Winnable Keyword Signals
                                </p>
                                <div className="mt-3 space-y-3">
                                    {keywordOpportunities.map((item) => (
                                        <div key={`${item.keyword}-${item.score}`} className="flex flex-col gap-2 rounded-lg border border-border/50 bg-background/50 px-3 py-3 sm:flex-row sm:items-center sm:justify-between">
                                            <div>
                                                <p className="text-sm font-medium">{item.keyword}</p>
                                                <p className="mt-1 text-xs leading-5 text-muted-foreground">
                                                    {item.reasons.slice(0, 2).join(" | ") || "No reason stored."}
                                                </p>
                                            </div>
                                            <div className={`inline-flex w-fit items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold ${getScoreTone(item.score)}`}>
                                                <Target className="h-3.5 w-3.5" />
                                                {item.score}/100
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ) : null}

                        <div className="rounded-xl border border-border/60 bg-background/60 px-4 py-4">
                            <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                                Data Sources Used
                            </p>
                            <div className="mt-3 flex flex-wrap gap-2">
                                {enabledSources.length > 0 ? enabledSources.map((item) => (
                                    <Badge key={item.key} variant="outline" className="rounded-full">
                                        {item.label}
                                    </Badge>
                                )) : (
                                    <p className="text-sm text-muted-foreground">
                                        No stored generation-source usage was found for this draft.
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="rounded-xl border border-dashed border-border/60 bg-background/40 px-4 py-5 text-sm text-muted-foreground">
                        No stored topic-strategy diagnostics are available for this draft yet.
                    </div>
                )}
            </div>
        </AIBloggerGlassCard>
    );
}

/* ─── Website Intelligence ─────────────────────────────────────── */

export function PostWebsiteIntelligenceCard({
    intelligence,
    sourceMode,
}: {
    intelligence: AIBloggerWebsiteIntelligence | null;
    sourceMode: string;
}) {
    return (
        <AIBloggerGlassCard className="p-6">
            <div className="space-y-5">
                <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-[20px] bg-primary/12 text-primary">
                        <FileText className="h-5 w-5" />
                    </div>
                    <div>
                        <h3 className="text-lg font-semibold">Website Intelligence</h3>
                        <p className="text-sm text-muted-foreground">
                            Raw site signals captured before topic shaping when this draft starts from a website URL.
                        </p>
                    </div>
                </div>

                {intelligence ? (
                    <div className="space-y-4">
                        <div className="flex flex-wrap gap-2">
                            <Badge variant="outline" className="rounded-full">
                                {intelligence.cacheStatus === "cached" ? "Cached snapshot" : "Fresh crawl"}
                            </Badge>
                            <Badge variant="outline" className="rounded-full">
                                {intelligence.pageCount} pages scanned
                            </Badge>
                            <Badge variant="outline" className="rounded-full">
                                Refreshed {formatWorkflowDate(intelligence.refreshedAt)}
                            </Badge>
                        </div>

                        <div className="rounded-xl border border-border/60 bg-background/60 px-4 py-4">
                            <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                                Crawl Summary
                            </p>
                            <p className="mt-2 text-sm leading-6 text-muted-foreground">
                                {intelligence.summary}
                            </p>
                        </div>

                        <div className="grid gap-3 md:grid-cols-2">
                            <div className="rounded-xl border border-border/60 bg-background/60 px-4 py-4">
                                <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                                    Priority Paths
                                </p>
                                <div className="mt-3 flex flex-wrap gap-2">
                                    {intelligence.priorityPaths.length > 0 ? intelligence.priorityPaths.map((path) => (
                                        <Badge key={path} variant="outline" className="rounded-full">
                                            {path}
                                        </Badge>
                                    )) : (
                                        <p className="text-sm text-muted-foreground">No priority paths were extracted.</p>
                                    )}
                                </div>
                            </div>

                            <div className="rounded-xl border border-border/60 bg-background/60 px-4 py-4">
                                <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                                    Topic Hints
                                </p>
                                <div className="mt-3 flex flex-wrap gap-2">
                                    {intelligence.topicHints.length > 0 ? intelligence.topicHints.map((hint) => (
                                        <Badge key={hint} variant="outline" className="rounded-full">
                                            {hint}
                                        </Badge>
                                    )) : (
                                        <p className="text-sm text-muted-foreground">No topic hints were extracted.</p>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="grid gap-3 md:grid-cols-2">
                            <div className="rounded-xl border border-border/60 bg-background/60 px-4 py-4">
                                <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                                    Page Titles
                                </p>
                                <div className="mt-3 space-y-2">
                                    {intelligence.pageTitles.length > 0 ? intelligence.pageTitles.map((title) => (
                                        <p key={title} className="text-sm leading-6 text-muted-foreground">
                                            {title}
                                        </p>
                                    )) : (
                                        <p className="text-sm text-muted-foreground">No page titles were stored.</p>
                                    )}
                                </div>
                            </div>

                            <div className="rounded-xl border border-border/60 bg-background/60 px-4 py-4">
                                <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                                    FAQ Signals
                                </p>
                                <div className="mt-3 space-y-2">
                                    {intelligence.faqQuestions.length > 0 ? intelligence.faqQuestions.map((question) => (
                                        <p key={question} className="text-sm leading-6 text-muted-foreground">
                                            {question}
                                        </p>
                                    )) : (
                                        <p className="text-sm text-muted-foreground">No FAQ questions were extracted.</p>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="rounded-xl border border-dashed border-border/60 bg-background/40 px-4 py-5 text-sm text-muted-foreground">
                        {sourceMode === "website"
                            ? "No website intelligence snapshot is available for this draft yet."
                            : "This draft did not start from website mode, so there is no crawl snapshot to show."}
                    </div>
                )}
            </div>
        </AIBloggerGlassCard>
    );
}

/* ─── SERP Snapshot ────────────────────────────────────────────── */

export function PostSerpSnapshotCard({
    serpAnalysis,
    serpEnabled,
}: {
    serpAnalysis: AIBloggerSerpAnalysis | null;
    serpEnabled?: boolean;
}) {
    return (
        <AIBloggerGlassCard className="p-6">
            <div className="space-y-5">
                <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-[20px] bg-primary/12 text-primary">
                        <Search className="h-5 w-5" />
                    </div>
                    <div>
                        <h3 className="text-lg font-semibold">SERP Snapshot</h3>
                        <p className="text-sm text-muted-foreground">
                            Ranking-page, competitor, and People Also Ask signals that shaped SEO planning.
                        </p>
                    </div>
                </div>

                {serpAnalysis ? (
                    <div className="space-y-4">
                        <div className="flex flex-wrap gap-2">
                            <Badge variant="outline" className="rounded-full capitalize">
                                Intent {serpAnalysis.intent}
                            </Badge>
                            <Badge variant="outline" className="rounded-full">
                                {serpAnalysis.device} | {formatSearchLocationLabel(serpAnalysis.location)}
                            </Badge>
                            <Badge variant="outline" className="rounded-full">
                                {serpAnalysis.cacheStatus === "cached" ? "Cached SERP" : "Fresh SERP"}
                            </Badge>
                            <Badge variant="outline" className="rounded-full">
                                Refreshed {formatWorkflowDate(serpAnalysis.refreshedAt)}
                            </Badge>
                        </div>

                        <div className="rounded-xl border border-border/60 bg-background/60 px-4 py-4">
                            <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                                SERP Summary
                            </p>
                            <p className="mt-2 text-sm leading-6 text-muted-foreground">
                                {serpAnalysis.summary}
                            </p>
                        </div>

                        <div className="grid gap-3 md:grid-cols-2">
                            <div className="rounded-xl border border-border/60 bg-background/60 px-4 py-4">
                                <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                                    Competitor Domains
                                </p>
                                <div className="mt-3 flex flex-wrap gap-2">
                                    {serpAnalysis.competitorDomains.length > 0 ? serpAnalysis.competitorDomains.map((domain) => (
                                        <Badge key={domain} variant="outline" className="rounded-full">
                                            {domain}
                                        </Badge>
                                    )) : (
                                        <p className="text-sm text-muted-foreground">No competitor domains were stored.</p>
                                    )}
                                </div>
                            </div>

                            <div className="rounded-xl border border-border/60 bg-background/60 px-4 py-4">
                                <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                                    Featured Snippet Style
                                </p>
                                <p className="mt-3 text-sm leading-6 text-muted-foreground">
                                    {serpAnalysis.featuredSnippetStyle || "No featured snippet pattern was detected."}
                                </p>
                            </div>
                        </div>

                        <div className="grid gap-3 md:grid-cols-2">
                            <div className="rounded-xl border border-border/60 bg-background/60 px-4 py-4">
                                <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                                    People Also Ask
                                </p>
                                <div className="mt-3 space-y-2">
                                    {serpAnalysis.peopleAlsoAsk.length > 0 ? serpAnalysis.peopleAlsoAsk.map((question) => (
                                        <p key={question} className="text-sm leading-6 text-muted-foreground">
                                            {question}
                                        </p>
                                    )) : (
                                        <p className="text-sm text-muted-foreground">No People Also Ask questions were stored.</p>
                                    )}
                                </div>
                            </div>

                            <div className="rounded-xl border border-border/60 bg-background/60 px-4 py-4">
                                <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                                    Content Gaps
                                </p>
                                <div className="mt-3 space-y-2">
                                    {serpAnalysis.contentGaps.length > 0 ? serpAnalysis.contentGaps.map((gap) => (
                                        <p key={gap} className="text-sm leading-6 text-muted-foreground">
                                            {gap}
                                        </p>
                                    )) : (
                                        <p className="text-sm text-muted-foreground">No content gaps were stored.</p>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="rounded-xl border border-border/60 bg-background/60 px-4 py-4">
                            <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                                Top Ranking Pages
                            </p>
                            <div className="mt-3 space-y-3">
                                {serpAnalysis.topResultTitles.slice(0, 5).map((resultTitle, index) => (
                                    <div key={`${resultTitle}-${index}`} className="space-y-1">
                                        <p className="text-sm font-medium text-foreground">
                                            {resultTitle}
                                        </p>
                                        {serpAnalysis.topResultUrls[index] ? (
                                            <Link
                                                href={serpAnalysis.topResultUrls[index]}
                                                target="_blank"
                                                className="inline-flex items-center gap-1 text-xs font-medium text-primary"
                                            >
                                                Open result
                                                <ExternalLink className="h-3.5 w-3.5" />
                                            </Link>
                                        ) : null}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="rounded-xl border border-dashed border-border/60 bg-background/40 px-4 py-5 text-sm text-muted-foreground">
                        {serpEnabled === false
                            ? "SERP analysis is disabled in AI Blogger admin for this workspace."
                            : "No SERP snapshot is available for this draft yet."}
                    </div>
                )}
            </div>
        </AIBloggerGlassCard>
    );
}

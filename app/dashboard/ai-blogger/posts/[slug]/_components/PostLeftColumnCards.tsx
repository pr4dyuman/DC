import Link from "next/link";
import {
    AlertCircle,
    ExternalLink,
    Link2,
    Sparkles,
    Tag,
    Search,
    Target,
} from "lucide-react";

import {
    AIBloggerGlassCard,
} from "@/components/ai-blogger/AIBloggerPrimitives";
import { Badge } from "@/components/ui/badge";
import { humanizeBlogStudioValue } from "@/lib/ai-blogger-presentation";

/* ─── SEO Priorities ───────────────────────────────────────────── */

export function PostSeoPrioritiesCard({
    suggestions,
}: {
    suggestions: string[];
}) {
    return (
        <AIBloggerGlassCard className="p-6">
            <div className="space-y-5">
                <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-[20px] bg-primary/12 text-primary">
                        <Sparkles className="h-5 w-5" />
                    </div>
                    <div>
                        <h3 className="text-lg font-semibold">SEO Priorities</h3>
                        <p className="text-sm text-muted-foreground">
                            The main improvements this draft needs before approval and publishing.
                        </p>
                    </div>
                </div>

                <div className="space-y-3">
                    {suggestions.map((suggestion) => (
                        <div
                            key={suggestion}
                            className="rounded-xl border border-primary/18 bg-primary/6 px-4 py-4 text-sm leading-6 text-foreground"
                        >
                            {suggestion}
                        </div>
                    ))}
                </div>
            </div>
        </AIBloggerGlassCard>
    );
}

/* ─── Cannibalization ──────────────────────────────────────────── */

interface CannibalizationMatch {
    source: string;
    slug: string;
    title: string;
    statusLabel: string;
    reason: string;
    similarityScore: number;
    primaryKeyword?: string;
    href: string;
}

export function PostCannibalizationCard({
    report,
    tone,
}: {
    report: { risk: string; score: number; summary: string; matches: CannibalizationMatch[] };
    tone: "destructive" | "amber" | "emerald";
}) {
    return (
        <AIBloggerGlassCard className="p-6">
            <div className="space-y-5">
                <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-[20px] bg-primary/12 text-primary">
                        <AlertCircle className="h-5 w-5" />
                    </div>
                    <div>
                        <h3 className="text-lg font-semibold">Cannibalization Check</h3>
                        <p className="text-sm text-muted-foreground">
                            Prevent this draft from competing with another published post in this workspace targeting the same topic.
                        </p>
                    </div>
                </div>

                <div className={`rounded-xl border px-4 py-4 text-sm leading-6 ${
                    tone === "destructive"
                        ? "border-destructive/30 bg-destructive/5 text-destructive"
                        : tone === "amber"
                            ? "border-amber-500/30 bg-amber-500/8 text-amber-700 dark:text-amber-300"
                            : "border-emerald-500/25 bg-emerald-500/8 text-emerald-600"
                }`}>
                    <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="outline" className="rounded-full capitalize">
                            {report.risk} risk
                        </Badge>
                        <Badge variant="outline" className="rounded-full">
                            {report.score}/100 overlap
                        </Badge>
                    </div>
                    <p className="mt-3">{report.summary}</p>
                </div>

                {report.matches.length > 0 ? (
                    <div className="space-y-3">
                        {report.matches.map((match) => (
                            <div
                                key={`${match.source}-${match.slug}`}
                                className="rounded-xl border border-border/60 bg-background/60 px-4 py-4"
                            >
                                <div className="flex flex-wrap items-start justify-between gap-3">
                                    <div className="space-y-2">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <p className="text-sm font-medium text-foreground">
                                                {match.title}
                                            </p>
                                            <Badge variant="outline" className="rounded-full">
                                                {match.statusLabel}
                                            </Badge>
                                            <Badge variant="outline" className="rounded-full capitalize">
                                                {match.source === "ai-blogger" ? "AI Blogger" : "Published Blog"}
                                            </Badge>
                                        </div>
                                        <p className="text-xs leading-5 text-muted-foreground">
                                            {match.reason}
                                        </p>
                                        <p className="text-xs text-muted-foreground">
                                            Similarity: {Math.round(match.similarityScore * 100)}%
                                            {match.primaryKeyword ? ` | Keyword: ${match.primaryKeyword}` : ""}
                                        </p>
                                    </div>
                                    <Link
                                        href={match.href}
                                        className="inline-flex items-center gap-1 text-xs font-medium text-primary"
                                    >
                                        Open
                                        <ExternalLink className="h-3.5 w-3.5" />
                                    </Link>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="rounded-xl border border-dashed border-border/60 bg-background/40 px-4 py-5 text-sm text-muted-foreground">
                        No overlapping draft or published entry was flagged for this topic.
                    </div>
                )}
            </div>
        </AIBloggerGlassCard>
    );
}

/* ─── Internal Link Map ────────────────────────────────────────── */

interface InternalLink {
    href: string;
    title: string;
    anchorText: string;
    source: string;
    relationType: string;
    score: number;
    placement?: string;
    suggestedSectionHeading?: string;
    matchReason: string;
}

interface InternalLinkHealth {
    status: string;
    label: string;
    summary: string;
    inboundCount: number;
    clusterAlignedCount: number;
    relatedPostCount?: number;
}

function humanizeInternalLinkRelation(value: string) {
    return value
        .split("-")
        .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
        .join(" ");
}

export function PostInternalLinksCard({
    acceptedLinks,
    health,
    healthTone,
    relatedPostCount,
}: {
    acceptedLinks: InternalLink[];
    health: InternalLinkHealth | null;
    healthTone: "emerald" | "amber" | "destructive";
    relatedPostCount: number;
}) {
    return (
        <AIBloggerGlassCard className="p-6">
            <div className="space-y-5">
                <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-[20px] bg-primary/12 text-primary">
                        <Link2 className="h-5 w-5" />
                    </div>
                    <div>
                        <h3 className="text-lg font-semibold">Internal Link Map</h3>
                        <p className="text-sm text-muted-foreground">
                            Review the accepted link structure, cluster fit, and connectivity risk before publishing.
                        </p>
                    </div>
                </div>

                <div className={`rounded-xl border px-4 py-4 text-sm leading-6 ${
                    healthTone === "emerald"
                        ? "border-emerald-500/25 bg-emerald-500/8 text-emerald-600"
                        : healthTone === "amber"
                            ? "border-amber-500/30 bg-amber-500/8 text-amber-700 dark:text-amber-300"
                            : "border-destructive/30 bg-destructive/5 text-destructive"
                }`}>
                    <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="outline" className="rounded-full">
                            {health?.label || "Orphaned"}
                        </Badge>
                        <Badge variant="outline" className="rounded-full">
                            {acceptedLinks.length} accepted target{acceptedLinks.length === 1 ? "" : "s"}
                        </Badge>
                        {health ? (
                            <Badge variant="outline" className="rounded-full">
                                {health.inboundCount} inbound connection{health.inboundCount === 1 ? "" : "s"}
                            </Badge>
                        ) : null}
                    </div>
                    <p className="mt-3">
                        {health?.summary || "No stored internal-link health summary is available yet."}
                    </p>
                </div>

                <div className="grid gap-3 md:grid-cols-4">
                    <div className="rounded-xl border border-border/60 bg-background/60 px-4 py-4">
                        <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Accepted</p>
                        <p className="mt-2 text-sm font-medium">{acceptedLinks.length}</p>
                    </div>
                    <div className="rounded-xl border border-border/60 bg-background/60 px-4 py-4">
                        <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Cluster-Aligned</p>
                        <p className="mt-2 text-sm font-medium">{health?.clusterAlignedCount || 0}</p>
                    </div>
                    <div className="rounded-xl border border-border/60 bg-background/60 px-4 py-4">
                        <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Inbound</p>
                        <p className="mt-2 text-sm font-medium">{health?.inboundCount || 0}</p>
                    </div>
                    <div className="rounded-xl border border-border/60 bg-background/60 px-4 py-4">
                        <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Related Posts</p>
                        <p className="mt-2 text-sm font-medium">{health?.relatedPostCount || relatedPostCount}</p>
                    </div>
                </div>

                {acceptedLinks.length > 0 ? (
                    <div className="space-y-3">
                        {acceptedLinks.map((link) => (
                            <div
                                key={`${link.href}-${link.anchorText}`}
                                className="rounded-xl border border-border/60 bg-background/60 px-4 py-4"
                            >
                                <div className="flex flex-wrap items-start justify-between gap-3">
                                    <div className="space-y-2">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <p className="text-sm font-medium text-foreground">{link.title}</p>
                                            <Badge variant="outline" className="rounded-full capitalize">
                                                {link.source}
                                            </Badge>
                                            <Badge variant="outline" className="rounded-full">
                                                {humanizeInternalLinkRelation(link.relationType)}
                                            </Badge>
                                            <Badge variant="outline" className="rounded-full">
                                                {link.score}/100
                                            </Badge>
                                        </div>
                                        <p className="text-xs text-muted-foreground">
                                            Anchor: {link.anchorText}
                                            {link.placement ? ` | ${humanizeBlogStudioValue(link.placement)}` : ""}
                                            {link.suggestedSectionHeading ? ` | Section: ${link.suggestedSectionHeading}` : ""}
                                        </p>
                                        <p className="text-xs leading-5 text-muted-foreground">{link.matchReason}</p>
                                    </div>
                                    <Link
                                        href={link.href}
                                        target="_blank"
                                        className="inline-flex items-center gap-1 text-xs font-medium text-primary"
                                    >
                                        Open
                                        <ExternalLink className="h-3.5 w-3.5" />
                                    </Link>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="rounded-xl border border-dashed border-border/60 bg-background/40 px-4 py-5 text-sm text-muted-foreground">
                        Accept a few internal link targets in the editor to turn suggestions into a real stored link map.
                    </div>
                )}
            </div>
        </AIBloggerGlassCard>
    );
}

/* ─── Cluster Context ──────────────────────────────────────────── */

interface RelatedPost {
    id: string;
    title: string;
    slug: string;
    status: string;
    contentClusterId?: string | null;
    parentTopicSlug?: string | null;
}

export function PostClusterContextCard({
    contentClusterId,
    parentTopicSlug,
    relatedPosts,
}: {
    contentClusterId?: string | null;
    parentTopicSlug?: string | null;
    relatedPosts: RelatedPost[];
}) {
    return (
        <AIBloggerGlassCard className="p-6">
            <div className="space-y-5">
                <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-[20px] bg-primary/12 text-primary">
                        <Tag className="h-5 w-5" />
                    </div>
                    <div>
                        <h3 className="text-lg font-semibold">Cluster Context</h3>
                        <p className="text-sm text-muted-foreground">
                            Keep this draft tied to its pillar topic so refreshes, internal links, and cannibalization checks stay coherent.
                        </p>
                    </div>
                </div>

                <div className="grid gap-3 md:grid-cols-3">
                    <div className="rounded-xl border border-border/60 bg-background/60 px-4 py-4">
                        <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Cluster ID</p>
                        <p className="mt-2 text-sm font-medium">
                            {contentClusterId ? humanizeBlogStudioValue(contentClusterId) : "Not set yet"}
                        </p>
                    </div>
                    <div className="rounded-xl border border-border/60 bg-background/60 px-4 py-4">
                        <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Parent Topic</p>
                        <p className="mt-2 text-sm font-medium">
                            {parentTopicSlug ? humanizeBlogStudioValue(parentTopicSlug) : "Not set yet"}
                        </p>
                    </div>
                    <div className="rounded-xl border border-border/60 bg-background/60 px-4 py-4">
                        <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Related Drafts</p>
                        <p className="mt-2 text-sm font-medium">
                            {relatedPosts.length} linked post{relatedPosts.length === 1 ? "" : "s"}
                        </p>
                    </div>
                </div>

                {relatedPosts.length > 0 ? (
                    <div className="space-y-3">
                        {relatedPosts.map((relatedPost) => (
                            <div
                                key={relatedPost.id}
                                className="rounded-xl border border-border/60 bg-background/60 px-4 py-4"
                            >
                                <div className="flex flex-wrap items-start justify-between gap-3">
                                    <div className="space-y-2">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <p className="text-sm font-medium text-foreground">
                                                {relatedPost.title}
                                            </p>
                                            <Badge variant="outline" className="rounded-full">
                                                {relatedPost.status}
                                            </Badge>
                                        </div>
                                        <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                                            {relatedPost.contentClusterId ? (
                                                <span>Cluster {humanizeBlogStudioValue(relatedPost.contentClusterId)}</span>
                                            ) : null}
                                            {relatedPost.parentTopicSlug ? (
                                                <span>Parent {humanizeBlogStudioValue(relatedPost.parentTopicSlug)}</span>
                                            ) : null}
                                        </div>
                                    </div>
                                    <Link
                                        href={`/dashboard/ai-blogger/posts/${relatedPost.slug}`}
                                        className="inline-flex items-center gap-1 text-xs font-medium text-primary"
                                    >
                                        Open
                                        <ExternalLink className="h-3.5 w-3.5" />
                                    </Link>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="rounded-xl border border-dashed border-border/60 bg-background/40 px-4 py-5 text-sm text-muted-foreground">
                        Save a cluster ID or parent topic on related drafts to build a clearer pillar map for this workspace.
                    </div>
                )}
            </div>
        </AIBloggerGlassCard>
    );
}

/* ─── Grounded Research ────────────────────────────────────────── */

interface ExternalSource {
    id: string;
    title: string;
    url: string;
    domain: string;
    type: string;
    trustLevel: string;
    freshness: string;
    summary: string;
    publishedAt?: string;
}

export function PostGroundedResearchCard({
    postId,
    externalSources,
    researchNotes,
}: {
    postId: string;
    externalSources: ExternalSource[];
    researchNotes: string[];
}) {
    return (
        <AIBloggerGlassCard className="p-6">
            <div className="space-y-5">
                <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-[20px] bg-primary/12 text-primary">
                        <Search className="h-5 w-5" />
                    </div>
                    <div>
                        <h3 className="text-lg font-semibold">Grounded Research</h3>
                        <p className="text-sm text-muted-foreground">
                            External sources and source-backed notes captured during generation.
                        </p>
                    </div>
                </div>

                <div className="space-y-3">
                    {externalSources.length > 0 ? (
                        externalSources.map((source) => (
                            <div
                                key={source.id}
                                className="rounded-xl border border-border/60 bg-background/60 px-4 py-4"
                            >
                                <div className="flex flex-wrap items-center justify-between gap-3">
                                    <div className="space-y-2">
                                        <Link
                                            href={source.url}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="inline-flex items-center gap-1 text-sm font-medium text-foreground transition-colors hover:text-primary"
                                        >
                                            {source.title}
                                            <ExternalLink className="h-3.5 w-3.5" />
                                        </Link>
                                        <div className="flex flex-wrap gap-2">
                                            <Badge variant="outline" className="rounded-full capitalize">
                                                {source.type}
                                            </Badge>
                                            <Badge variant="outline" className="rounded-full capitalize">
                                                Trust: {source.trustLevel}
                                            </Badge>
                                            <Badge variant="outline" className="rounded-full capitalize">
                                                {source.freshness}
                                            </Badge>
                                        </div>
                                    </div>
                                    <Link
                                        href={source.url}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="inline-flex items-center gap-1 text-xs font-medium text-primary"
                                    >
                                        Open
                                        <ExternalLink className="h-3.5 w-3.5" />
                                    </Link>
                                </div>
                                <p className="mt-3 text-sm leading-6 text-muted-foreground">
                                    {source.summary}
                                </p>
                                <p className="mt-2 text-xs text-muted-foreground">
                                    <Link
                                        href={source.url}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="transition-colors hover:text-foreground hover:underline"
                                    >
                                        {source.domain}
                                    </Link>
                                    {source.publishedAt
                                        ? ` • ${new Date(source.publishedAt).toLocaleDateString()}`
                                        : ""}
                                </p>
                            </div>
                        ))
                    ) : (
                        <div className="rounded-xl border border-dashed border-border/60 bg-background/40 px-4 py-5 text-sm text-muted-foreground">
                            This draft does not have stored grounded research sources yet.
                        </div>
                    )}
                </div>

                <div className="space-y-3 border-t border-border/50 pt-5">
                    <h4 className="font-semibold">Source Notes</h4>
                    {researchNotes.length > 0 ? (
                        researchNotes.map((note, index) => (
                            <div
                                key={`${postId}-research-note-${index}`}
                                className="rounded-xl border border-border/60 bg-background/60 px-4 py-4 text-sm leading-6 text-muted-foreground"
                            >
                                {note}
                            </div>
                        ))
                    ) : (
                        <div className="rounded-xl border border-dashed border-border/60 bg-background/40 px-4 py-5 text-sm text-muted-foreground">
                            No grounded source notes were stored for this draft.
                        </div>
                    )}
                </div>
            </div>
        </AIBloggerGlassCard>
    );
}

/* ─── Advanced Draft Packs ─────────────────────────────────────── */

interface DraftBrief {
    businessFitScore?: number;
    searchIntent?: string;
    contentType?: string;
    businessFitSummary?: string;
    ctaGoal?: string;
    titleDirection?: string;
    metadataDirection?: string;
    entities?: string[];
    businessFitWarnings?: string[];
}

interface FaqItem {
    question: string;
    answer: string;
}

export function PostAdvancedDraftPacksCard({
    postId,
    draftBrief,
    faqItems,
    featuredImagePrompt,
}: {
    postId: string;
    draftBrief?: DraftBrief;
    faqItems: FaqItem[];
    featuredImagePrompt?: string;
}) {
    return (
        <AIBloggerGlassCard className="p-6">
            <div className="space-y-5">
                <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-[20px] bg-primary/12 text-primary">
                        <Target className="h-5 w-5" />
                    </div>
                    <div>
                        <h3 className="text-lg font-semibold">Advanced Draft Packs</h3>
                        <p className="text-sm text-muted-foreground">
                            Structured assets created before the final body draft.
                        </p>
                    </div>
                </div>

                <div className="grid gap-3">
                    <div className="rounded-xl border border-border/60 bg-background/60 px-4 py-4">
                        <div className="flex flex-wrap gap-2">
                            {typeof draftBrief?.businessFitScore === "number" ? (
                                <Badge variant="outline" className="rounded-full">
                                    Business Fit {draftBrief.businessFitScore}/100
                                </Badge>
                            ) : null}
                            {draftBrief?.searchIntent ? (
                                <Badge variant="outline" className="rounded-full capitalize">
                                    {draftBrief.searchIntent}
                                </Badge>
                            ) : null}
                            {draftBrief?.contentType ? (
                                <Badge variant="outline" className="rounded-full capitalize">
                                    {draftBrief.contentType}
                                </Badge>
                            ) : null}
                        </div>
                        <div className="mt-3 space-y-3 text-sm leading-6 text-muted-foreground">
                            <div>
                                <p className="text-xs uppercase tracking-[0.16em]">Business Fit</p>
                                <p>{draftBrief?.businessFitSummary || "Not stored"}</p>
                            </div>
                            <div>
                                <p className="text-xs uppercase tracking-[0.16em]">CTA Goal</p>
                                <p>{draftBrief?.ctaGoal || "Not stored"}</p>
                            </div>
                            <div>
                                <p className="text-xs uppercase tracking-[0.16em]">Title Direction</p>
                                <p>{draftBrief?.titleDirection || "Not stored"}</p>
                            </div>
                            <div>
                                <p className="text-xs uppercase tracking-[0.16em]">Metadata Direction</p>
                                <p>{draftBrief?.metadataDirection || "Not stored"}</p>
                            </div>
                            <div>
                                <p className="text-xs uppercase tracking-[0.16em]">Entities</p>
                                <p>{draftBrief?.entities?.length ? draftBrief.entities.join(", ") : "Not stored"}</p>
                            </div>
                            {draftBrief?.businessFitWarnings?.length ? (
                                <div>
                                    <p className="text-xs uppercase tracking-[0.16em]">Fit Warnings</p>
                                    <div className="mt-2 space-y-2">
                                        {draftBrief.businessFitWarnings.map((warning) => (
                                            <p
                                                key={warning}
                                                className="rounded-2xl border border-amber-500/20 bg-amber-500/5 px-3 py-2 text-sm leading-6 text-amber-700 dark:text-amber-300"
                                            >
                                                {warning}
                                            </p>
                                        ))}
                                    </div>
                                </div>
                            ) : null}
                        </div>
                    </div>

                    <div className="rounded-xl border border-border/60 bg-background/60 px-4 py-4">
                        <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                            Featured Image Prompt
                        </p>
                        <p className="mt-2 text-sm leading-6 text-muted-foreground">
                            {featuredImagePrompt || "No image prompt stored for this draft yet."}
                        </p>
                    </div>

                    <div className="rounded-xl border border-border/60 bg-background/60 px-4 py-4">
                        <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                            FAQ Pack
                        </p>
                        <div className="mt-3 space-y-3">
                            {faqItems.length > 0 ? (
                                faqItems.map((item, index) => (
                                    <div key={`${postId}-faq-pack-${index}`} className="space-y-1">
                                        <p className="text-sm font-medium text-foreground">
                                            {item.question}
                                        </p>
                                        <p className="text-sm leading-6 text-muted-foreground">
                                            {item.answer}
                                        </p>
                                    </div>
                                ))
                            ) : (
                                <p className="text-sm text-muted-foreground">
                                    No FAQ pack was stored for this draft.
                                </p>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </AIBloggerGlassCard>
    );
}

import Link from "next/link";
import {
    AlertCircle,
    CheckCircle2,
    Code,
    ExternalLink,
    FileText,
    ImagePlus,
    Link2,
    ListChecks,
    Tag,
    Target,
} from "lucide-react";

import {
    AIBloggerGlassCard,
} from "@/components/ai-blogger/AIBloggerPrimitives";
import { Badge } from "@/components/ui/badge";
import { getBlogStudioSeoLabel } from "@/lib/ai-blogger-seo-audit";
import {
    getBlogStudioBlockerSummary,
    getBlogStudioPostStatusNote,
} from "@/lib/ai-blogger-presentation";
import type { BlogStudioSeoAuditCheck, BlogStudioPostStatus } from "@/lib/types-ai-blogger";

/* ─── Featured Image ───────────────────────────────────────────── */

interface FeaturedImageMeta {
    width?: number;
    height?: number;
    format?: string;
    fileSizeBytes?: number;
}

interface ImageHistoryEntry {
    source?: string;
    alt?: string;
    reason?: string;
    replacedAt?: string;
}

export function PostFeaturedImageCard({
    featuredImageUrl,
    featuredImageAlt,
    featuredImageSourceLabel,
    featuredImageMeta,
    imageHistory,
    title,
}: {
    featuredImageUrl?: string;
    featuredImageAlt?: string;
    featuredImageSourceLabel: string;
    featuredImageMeta?: FeaturedImageMeta;
    imageHistory?: ImageHistoryEntry[];
    title: string;
}) {
    return (
        <AIBloggerGlassCard className="p-5">
            <div className="space-y-4">
                <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/12 text-primary">
                        <ImagePlus className="h-4 w-4" />
                    </div>
                    <div>
                        <h3 className="font-semibold">Featured Image</h3>
                        <p className="text-xs text-muted-foreground mt-0.5">
                            Hero asset shipped with the published draft.
                        </p>
                    </div>
                </div>

                {featuredImageUrl ? (
                    <div className="space-y-4">
                        <div
                            className="aspect-[16/9] rounded-[24px] border border-border/60 bg-cover bg-center bg-no-repeat"
                            style={{ backgroundImage: `url("${featuredImageUrl.replace(/"/g, "%22")}")` }}
                        />
                        <div className="flex flex-wrap items-center gap-2">
                            <Badge variant="outline" className="rounded-full">
                                {featuredImageSourceLabel}
                            </Badge>
                            <Badge variant="outline" className="rounded-full">
                                Alt ready
                            </Badge>
                        </div>
                        <div className="rounded-[24px] border border-border/60 bg-background/60 px-4 py-4">
                            <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                                Alt Text
                            </p>
                            <p className="mt-2 text-sm leading-6 text-muted-foreground">
                                {featuredImageAlt || title}
                            </p>
                        </div>
                        <Link
                            href={featuredImageUrl}
                            target="_blank"
                            className="inline-flex items-center gap-1 text-sm font-medium text-primary"
                        >
                            Open Image Asset
                            <ExternalLink className="h-4 w-4" />
                        </Link>

                        {featuredImageMeta && (featuredImageMeta.width || featuredImageMeta.format || featuredImageMeta.fileSizeBytes) ? (
                            <div className="grid gap-3 sm:grid-cols-3">
                                {featuredImageMeta.width && featuredImageMeta.height ? (
                                    <div className="rounded-[22px] border border-border/60 bg-background/60 px-4 py-3">
                                        <p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">Dimensions</p>
                                        <p className="mt-1.5 text-sm font-medium">{featuredImageMeta.width} × {featuredImageMeta.height}</p>
                                    </div>
                                ) : null}
                                {featuredImageMeta.format ? (
                                    <div className="rounded-[22px] border border-border/60 bg-background/60 px-4 py-3">
                                        <p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">Format</p>
                                        <p className="mt-1.5 text-sm font-medium uppercase">{featuredImageMeta.format}</p>
                                    </div>
                                ) : null}
                                {featuredImageMeta.fileSizeBytes ? (
                                    <div className="rounded-[22px] border border-border/60 bg-background/60 px-4 py-3">
                                        <p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">File Size</p>
                                        <p className="mt-1.5 text-sm font-medium">{featuredImageMeta.fileSizeBytes > 1024 ? `${(featuredImageMeta.fileSizeBytes / 1024).toFixed(1)} KB` : `${featuredImageMeta.fileSizeBytes} B`}</p>
                                    </div>
                                ) : null}
                            </div>
                        ) : null}

                        {imageHistory && imageHistory.length > 0 ? (
                            <div className="space-y-3 border-t border-border/50 pt-4">
                                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                                    Replacement History ({imageHistory.length})
                                </p>
                                {imageHistory.slice(0, 5).map((entry, index) => (
                                    <div
                                        key={`img-history-${index}`}
                                        className="rounded-[22px] border border-border/60 bg-background/60 px-4 py-3"
                                    >
                                        <div className="flex flex-wrap items-center gap-2">
                                            <Badge variant="outline" className="rounded-full text-[10px]">
                                                {entry.source === "ai-generated" ? "AI Generated" : entry.source === "upload" ? "Upload" : entry.source || "Unknown"}
                                            </Badge>
                                            {entry.replacedAt ? (
                                                <span className="text-xs text-muted-foreground">
                                                    {new Date(entry.replacedAt).toLocaleDateString()}
                                                </span>
                                            ) : null}
                                        </div>
                                        {entry.alt ? (
                                            <p className="mt-1.5 text-xs leading-5 text-muted-foreground">Alt: {entry.alt}</p>
                                        ) : null}
                                        {entry.reason ? (
                                            <p className="mt-1 text-xs leading-5 text-muted-foreground">Reason: {entry.reason}</p>
                                        ) : null}
                                    </div>
                                ))}
                            </div>
                        ) : null}
                    </div>
                ) : (
                    <div className="rounded-[24px] border border-dashed border-border/60 bg-background/40 px-5 py-6 text-sm text-muted-foreground">
                        This draft does not have a stored featured image yet. Upload one in the editor or generate it from the AI image prompt.
                    </div>
                )}
            </div>
        </AIBloggerGlassCard>
    );
}

/* ─── Hard SEO Audit ───────────────────────────────────────────── */

interface PublishPackageItem {
    key: string;
    label: string;
    ready: boolean;
}

export function PostSeoAuditCard({
    postId,
    auditScore,
    aiEstimatedSeoScore,
    aiVsAuditDelta,
    seoAudit,
    blockersCount,
    blockerTone,
    publishPackageItems,
}: {
    postId: string;
    auditScore: number;
    aiEstimatedSeoScore: number | null;
    aiVsAuditDelta: number | null;
    seoAudit: { requiredChecksPassed: boolean; checks: BlogStudioSeoAuditCheck[]; blockers: string[]; counts: { recommendedPassed: number; recommendedTotal: number } };
    blockersCount: number;
    blockerTone: string;
    publishPackageItems: PublishPackageItem[];
}) {
    return (
        <AIBloggerGlassCard className="p-5">
            <div className="space-y-4">
                <div className="text-center">
                    <h3 className="font-semibold">Hard SEO Audit</h3>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                        {getBlogStudioSeoLabel(auditScore)}
                    </p>
                </div>

                <div className="relative mx-auto h-36 w-36">
                    <svg className="h-full w-full -rotate-90 transform">
                        <circle
                            cx="72"
                            cy="72"
                            r="60"
                            fill="none"
                            stroke="currentColor"
                            strokeOpacity="0.12"
                            strokeWidth="12"
                            className="text-foreground"
                        />
                        <circle
                            cx="72"
                            cy="72"
                            r="60"
                            fill="none"
                            stroke="url(#ai-blogger-score)"
                            strokeWidth="12"
                            strokeLinecap="round"
                            strokeDasharray={`${(auditScore / 100) * 377} 377`}
                        />
                        <defs>
                            <linearGradient id="ai-blogger-score" x1="0%" x2="100%" y1="0%" y2="0%">
                                <stop offset="0%" stopColor="rgb(212 160 10)" />
                                <stop offset="50%" stopColor="rgb(253 224 71)" />
                                <stop offset="100%" stopColor="rgb(251 191 36)" />
                            </linearGradient>
                        </defs>
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-4xl font-bold">{auditScore}</span>
                    </div>
                </div>

                <div className="rounded-[24px] border border-border/60 bg-background/60 px-4 py-4 text-sm text-muted-foreground">
                    <p>
                        Rule-based score for approval and publishing.
                        {aiEstimatedSeoScore !== null
                            ? ` AI model estimate: ${aiEstimatedSeoScore}/100${
                                aiVsAuditDelta === null || aiVsAuditDelta === 0
                                    ? "."
                                    : ` (${aiVsAuditDelta > 0 ? "+" : ""}${aiVsAuditDelta} vs hard audit).`
                            }`
                            : ""}
                    </p>
                </div>

                <div className="rounded-[24px] border border-border/60 bg-background/60 px-4 py-4 text-sm text-muted-foreground">
                    {seoAudit.requiredChecksPassed
                        ? `All required SEO blockers are clear. ${seoAudit.counts.recommendedPassed}/${seoAudit.counts.recommendedTotal} recommended checks are already passing.`
                        : `${seoAudit.blockers.length} required blocker${seoAudit.blockers.length === 1 ? "" : "s"} still need attention before approval or scheduling.`}
                </div>

                <div className="flex flex-wrap gap-2">
                    <div className={`rounded-full border px-3 py-1 text-xs font-medium ${
                        blockerTone === "amber"
                            ? "border-amber-500/20 bg-amber-500/5 text-amber-500"
                            : "border-emerald-500/20 bg-emerald-500/5 text-emerald-500"
                    }`}>
                        {getBlogStudioBlockerSummary(blockersCount)}
                    </div>
                    {publishPackageItems.map((item) => (
                        <div
                            key={`${postId}-${item.key}`}
                            className={`rounded-full border px-3 py-1 text-xs font-medium ${
                                item.ready
                                    ? "border-emerald-500/20 bg-emerald-500/5 text-emerald-500"
                                    : "border-border/60 bg-background/40 text-muted-foreground"
                            }`}
                        >
                            {item.label}
                        </div>
                    ))}
                </div>

                <div className="grid gap-3">
                    {seoAudit.checks.filter(c => c.severity === "required" && !c.passed).length > 0 && (
                        <div className="space-y-3">
                            <p className="px-1 text-xs font-semibold uppercase tracking-[0.18em] text-amber-500">
                                Blockers
                            </p>
                            {seoAudit.checks.filter(c => c.severity === "required" && !c.passed).map((check) => (
                                <div
                                    key={check.key}
                                    className="flex items-start justify-between gap-4 rounded-[22px] border border-amber-500/20 bg-amber-500/5 px-4 py-4"
                                >
                                    <div className="space-y-2">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <span className="text-sm font-medium text-foreground">{check.label}</span>
                                            <Badge variant="outline" className="rounded-full border-amber-500/30 bg-amber-500/10 text-[10px] uppercase tracking-[0.16em] text-amber-600">
                                                {check.severity}
                                            </Badge>
                                        </div>
                                        {check.detail ? (
                                            <p className="text-xs leading-5 text-muted-foreground">{check.detail}</p>
                                        ) : null}
                                    </div>
                                    <div className="pt-0.5">
                                        <AlertCircle className="h-4 w-4 text-amber-500" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {seoAudit.checks.filter(c => c.severity === "recommended" || (c.severity === "required" && c.passed)).length > 0 && (
                        <div className="space-y-3">
                            <p className="mt-2 px-1 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                                Improvements & Status
                            </p>
                            {seoAudit.checks
                                .filter(c => c.severity === "recommended" || (c.severity === "required" && c.passed))
                                .sort((a, b) => (a.passed === b.passed ? 0 : a.passed ? 1 : -1))
                                .map((check) => (
                                <div
                                    key={check.key}
                                    className={`flex items-start justify-between gap-4 rounded-[22px] border border-border/60 px-4 py-4 ${check.passed ? "bg-background/40" : "bg-background/60"}`}
                                >
                                    <div className="space-y-2">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <span className="text-sm font-medium text-foreground">{check.label}</span>
                                            <Badge variant="outline" className="rounded-full text-[10px] uppercase tracking-[0.16em]">
                                                {check.severity}
                                            </Badge>
                                        </div>
                                        {check.detail ? (
                                            <p className="text-xs leading-5 text-muted-foreground">{check.detail}</p>
                                        ) : null}
                                    </div>
                                    <div className="pt-0.5">
                                        {check.passed ? (
                                            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                                        ) : (
                                            <AlertCircle className="h-4 w-4 text-muted-foreground/40" />
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </AIBloggerGlassCard>
    );
}

/* ─── Brief & Meta ─────────────────────────────────────────────── */

export function PostBriefMetaCard({
    briefItems,
    status,
}: {
    briefItems: { label: string; value: string }[];
    status: BlogStudioPostStatus;
}) {
    return (
        <AIBloggerGlassCard className="p-5">
            <div className="space-y-4">
                <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/12 text-primary">
                        <Target className="h-4 w-4" />
                    </div>
                    <div>
                        <h3 className="font-semibold">Brief & Meta</h3>
                        <p className="text-xs text-muted-foreground mt-0.5">
                            Publishing target and editorial notes.
                        </p>
                    </div>
                </div>

                <div className="grid gap-3">
                    {briefItems.map((item) => (
                        <div
                            key={item.label}
                            className="rounded-[22px] border border-border/60 bg-background/60 px-4 py-4"
                        >
                            <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                                {item.label}
                            </p>
                            <p className="mt-2 text-sm font-medium">{item.value}</p>
                        </div>
                    ))}
                </div>

                <div className="rounded-[24px] border border-border/60 bg-background/60 px-4 py-4 text-sm leading-6 text-muted-foreground">
                    {getBlogStudioPostStatusNote(status)}
                </div>
            </div>
        </AIBloggerGlassCard>
    );
}

/* ─── Outline & Tags ───────────────────────────────────────────── */

export function PostOutlineTagsCard({
    postId,
    outline,
    tags,
    internalLinksPresent,
    wordCount,
    minWords,
    maxWords,
}: {
    postId: string;
    outline: string[];
    tags: string[];
    internalLinksPresent: boolean;
    wordCount: number;
    minWords: number;
    maxWords: number;
}) {
    return (
        <AIBloggerGlassCard className="p-5 sm:p-6">
            <div className="space-y-5">
                <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/12 text-primary">
                        <ListChecks className="h-4 w-4" />
                    </div>
                    <div>
                        <h3 className="font-semibold">Outline & Tags</h3>
                        <p className="text-xs text-muted-foreground mt-0.5">
                            Draft structure and tags at a glance.
                        </p>
                    </div>
                </div>

                <div className="space-y-3">
                    {outline.length > 0 ? (
                        outline.map((item, index) => (
                            <div
                                key={`${postId}-outline-${index}`}
                                className="flex gap-4 rounded-[22px] border border-border/60 bg-background/60 px-4 py-4"
                            >
                                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-primary/12 text-sm font-semibold text-primary">
                                    {index + 1}
                                </div>
                                <div className="text-sm leading-6 text-muted-foreground">{item}</div>
                            </div>
                        ))
                    ) : (
                        <div className="rounded-[24px] border border-dashed border-border/60 bg-background/40 px-4 py-5 text-sm text-muted-foreground">
                            No outline has been stored for this draft yet.
                        </div>
                    )}
                </div>

                <div className="space-y-3 border-t border-border/50 pt-5">
                    <div className="flex items-center gap-2">
                        <Tag className="h-4 w-4 text-primary" />
                        <h4 className="font-semibold">Tags</h4>
                    </div>
                    {tags.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                            {tags.map((tag) => (
                                <Badge key={tag} variant="outline" className="rounded-full">
                                    {tag}
                                </Badge>
                            ))}
                        </div>
                    ) : (
                        <div className="rounded-[24px] border border-dashed border-border/60 bg-background/40 px-4 py-4 text-sm text-muted-foreground">
                            No tags have been attached to this draft yet.
                        </div>
                    )}
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-[22px] border border-border/60 bg-background/60 px-4 py-4">
                        <div className="mb-2 flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-muted-foreground">
                            <Link2 className="h-3.5 w-3.5" />
                            Internal Links
                        </div>
                        <p className="text-sm font-medium">
                            {internalLinksPresent ? "Present in body copy" : "Still missing"}
                        </p>
                    </div>
                    <div className="rounded-[22px] border border-border/60 bg-background/60 px-4 py-4">
                        <div className="mb-2 flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-muted-foreground">
                            <FileText className="h-3.5 w-3.5" />
                            Word Range
                        </div>
                        <p className="text-sm font-medium">
                            {wordCount} / {minWords}-{maxWords}
                        </p>
                    </div>
                </div>
            </div>
        </AIBloggerGlassCard>
    );
}

/* ─── Schema Markup ────────────────────────────────────────────── */

export function PostSchemaMarkupCard({
    schemaJsonLd,
}: {
    schemaJsonLd: string;
}) {
    if (schemaJsonLd === "[]") {
        return null;
    }

    return (
        <AIBloggerGlassCard className="p-5">
            <div className="space-y-4">
                <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/12 text-primary">
                        <Code className="h-4 w-4" />
                    </div>
                    <div>
                        <h3 className="font-semibold">Schema Markup</h3>
                        <p className="text-xs text-muted-foreground mt-0.5">
                            JSON-LD structured data for this post.
                        </p>
                    </div>
                </div>
                <pre className="max-h-80 overflow-auto rounded-[18px] border border-border/60 bg-background/60 p-4 text-xs leading-5 text-muted-foreground">
                    {(() => { try { return JSON.stringify(JSON.parse(schemaJsonLd), null, 2); } catch { return schemaJsonLd; } })()}
                </pre>
            </div>
        </AIBloggerGlassCard>
    );
}

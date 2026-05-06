import Link from "next/link";
import { notFound } from "next/navigation";
import {
    AlertCircle,
    ArrowLeft,
    CheckCircle2,
    FileText,
    Sparkles,
} from "lucide-react";

import { AIBloggerPostActions } from "@/components/ai-blogger/AIBloggerPostActions";
import { AIBloggerPostEditorForm } from "@/components/ai-blogger/AIBloggerPostEditorForm";
import { AIBloggerLiveWordCount } from "@/components/ai-blogger/AIBloggerLiveWordCount";
import { AIBloggerDatabaseUnavailableState } from "@/components/ai-blogger/AIBloggerDatabaseUnavailableState";
import { AIBloggerLockedState } from "@/components/ai-blogger/AIBloggerLockedState";
import { AIBloggerBreadcrumb } from "@/components/ai-blogger/AIBloggerBreadcrumb";
import {
    AIBloggerGlassCard,
    AIBloggerGradientButton,
    AIBloggerSectionEyebrow,
} from "@/components/ai-blogger/AIBloggerPrimitives";
import {
    getBlogStudioCannibalizationReportImpl,
    getBlogStudioPostInternalLinkHealthImpl,
    getBlogStudioPostBySlugImpl,
    getBlogStudioPostPerformanceReportImpl,
    getBlogStudioSettingsImpl,
    listBlogStudioRelatedPostsImpl,
    validateBlogStudioPublishPackage,
    buildBlogStudioArticleJsonLd,
} from "@/lib/actions/ai-blogger";
import { getAIBloggerDashboardContext } from "@/lib/ai-blogger-dashboard";
import { getBlogStudioInternalLinkSuggestions } from "@/lib/ai-blogger-internal-links";
import { getAIBloggerSerpAnalysis } from "@/lib/ai-blogger-serp-analysis";
import { sanitizeLocation } from "@/lib/ai-blogger-text-utils";
import { getBlogStudioSeoAudit } from "@/lib/ai-blogger-seo-audit";
import { getAIBloggerWebsiteIntelligence } from "@/lib/ai-blogger-website-intelligence";
import {
    getBlogStudioBlockerTone,
    getBlogStudioPublishPackageItems,
    getBlogStudioReadinessTone,
    getBlogStudioSeoScoreTone,
    getBlogStudioSourceLabel,
    getBlogStudioTrendBadgeLabel,
    humanizeBlogStudioValue,
    isBlogStudioTrendLed,
} from "@/lib/ai-blogger-presentation";
import { buildBlogStudioBlockerResolutionPreview } from "@/lib/ai-blogger-blocker-resolution";
import { isMongoConnectionIssue } from "@/lib/mongodb-connection";
import { getAgencyAIBloggerConfigServer } from "@/lib/utils-server";

import {
    PostCannibalizationCard,
    PostInternalLinksCard,
    PostClusterContextCard,
    PostGroundedResearchCard,
    PostAdvancedDraftPacksCard,
} from "./_components/PostLeftColumnCards";
import { PostPerformanceCard } from "./_components/PostPerformanceCard";
import {
    PostGenerationStrategyCard,
    PostWebsiteIntelligenceCard,
    PostSerpSnapshotCard,
} from "./_components/PostIntelligenceCards";
import {
    PostFeaturedImageCard,
    PostSeoAuditCard,
    PostBriefMetaCard,
    PostOutlineTagsCard,
    PostSchemaMarkupCard,
} from "./_components/PostSidebarCards";
import { PostTabNav, type PostTabHealthSignals } from "./_components/PostTabController";
import { PostCommandPanel } from "./_components/PostCommandPanel";

/* ─── Helpers ──────────────────────────────────────────────────── */

function countWords(content?: string) {
    if (!content?.trim()) return 0;
    return content.trim().split(/\s+/).length;
}

function resolveActiveTab(searchParams: Record<string, string>): "write" | "seo" | "assets" | "settings" {
    const raw = searchParams["tab"];
    if (raw === "seo" || raw === "assets" || raw === "settings") return raw;
    return "write";
}

function resolvePostSearchLocation(
    configLocation: string | undefined,
    briefLocation: string | undefined,
    defaultLocation: string | undefined,
) {
    if (typeof configLocation === "string") {
        return sanitizeLocation(configLocation, defaultLocation ?? "us");
    }

    if (typeof briefLocation === "string") {
        return sanitizeLocation(briefLocation, defaultLocation ?? "us");
    }

    return sanitizeLocation(defaultLocation, "us");
}

/* ─── Page ─────────────────────────────────────────────────────── */

export default async function AIBloggerPostDetailPage({
    params,
    searchParams,
}: {
    params: Promise<{ slug: string }>;
    searchParams: Promise<Record<string, string>>;
}) {
    try {
        const { access, agency } = await getAIBloggerDashboardContext();

        if (!access.canAccess) {
            return <AIBloggerLockedState access={access} />;
        }

        const { slug } = await params;
        const resolvedSearchParams = await searchParams;
        const activeTab = resolveActiveTab(resolvedSearchParams);

    const [post, settings, aiBloggerConfig] = await Promise.all([
        getBlogStudioPostBySlugImpl(agency.id, slug),
        getBlogStudioSettingsImpl(agency.id, agency.name),
        getAgencyAIBloggerConfigServer(),
    ]);

    if (!post) {
        notFound();
    }

    const postCrawlSiteUrl = post.brief.sourceMode === "website"
        ? post.brief.sourceValue
        : post.brief.targetWebsiteUrl;
    const configuredSiteUrl =
        aiBloggerConfig?.entityModeling?.organizationUrl ||
        aiBloggerConfig?.author?.url ||
        postCrawlSiteUrl ||
        "";

    /* ── Parallel data fetches ────────────────────────────────── */

    const serpQuery = post.brief.primaryKeyword || post.title;
    const [
        internalLinkSuggestions,
        internalLinkHealth,
        cannibalizationReport,
        performanceReport,
        websiteIntelligence,
        serpAnalysis,
        relatedClusterPosts,
    ] = await Promise.all([
        getBlogStudioInternalLinkSuggestions(post, 6, {
            siteUrl: configuredSiteUrl,
            crawlConfig: {
                enabled: aiBloggerConfig?.crawl?.enabled ?? true,
                maxPages: aiBloggerConfig?.crawl?.maxPages,
                timeoutMs: aiBloggerConfig?.crawl?.timeoutMs,
                refreshWindowHours: aiBloggerConfig?.crawl?.refreshWindowHours,
                allowedPaths: aiBloggerConfig?.crawl?.allowedPaths,
                blockedPaths: aiBloggerConfig?.crawl?.blockedPaths,
            },
        }),
        getBlogStudioPostInternalLinkHealthImpl(agency.id, post.slug),
        getBlogStudioCannibalizationReportImpl(agency.id, post),
        getBlogStudioPostPerformanceReportImpl(agency.id, post.slug),
        postCrawlSiteUrl
            ? getAIBloggerWebsiteIntelligence(postCrawlSiteUrl, {
                agencyId: agency.id,
                enabled: aiBloggerConfig?.crawl?.enabled ?? true,
                maxPages: aiBloggerConfig?.crawl?.maxPages,
                timeoutMs: aiBloggerConfig?.crawl?.timeoutMs,
                refreshWindowHours: aiBloggerConfig?.crawl?.refreshWindowHours,
                allowedPaths: aiBloggerConfig?.crawl?.allowedPaths,
                blockedPaths: aiBloggerConfig?.crawl?.blockedPaths,
                totalBudgetMs: 18_000,
            })
            : Promise.resolve(null),
        getAIBloggerSerpAnalysis(serpQuery, {
            agencyId: agency.id,
            enabled: aiBloggerConfig?.serp?.enabled ?? false,
            apiKey: aiBloggerConfig?.serp?.apiKey,
            fallbackApiKey: aiBloggerConfig?.serp?.fallbackApiKey,
            fallbackEnabled: aiBloggerConfig?.serp?.fallbackEnabled ?? true,
            location: resolvePostSearchLocation(
                aiBloggerConfig?.serp?.defaultLocation,
                post.brief.location,
                settings.seo.defaultLocation,
            ),
            device: aiBloggerConfig?.serp?.device,
            maxCompetitors: aiBloggerConfig?.serp?.maxCompetitors,
            refreshWindowHours: aiBloggerConfig?.serp?.refreshWindowHours,
            trendsApiKey: aiBloggerConfig?.trends?.apiKey,
            trendsFallbackApiKey: aiBloggerConfig?.trends?.fallbackApiKey,
            trendsFallbackEnabled: aiBloggerConfig?.trends?.fallbackEnabled,
        }).catch(() => null),
        listBlogStudioRelatedPostsImpl(agency.id, post, 6),
    ]);

    /* ── Derived state ────────────────────────────────────────── */

    const wordCount = countWords(post.content) || post.wordCount || 0;
    const seoAudit = getBlogStudioSeoAudit(post, settings, aiBloggerConfig?.publishRules, {
        cannibalization: cannibalizationReport,
    });
    const auditScore = seoAudit.score;
    const aiEstimatedSeoScore = typeof post.seoScore === "number" ? post.seoScore : null;
    const aiVsAuditDelta = aiEstimatedSeoScore !== null ? aiEstimatedSeoScore - auditScore : null;
    const internalLinksPresent = seoAudit.checks.find((check) => check.key === "internal-links")?.passed ?? false;
    const topSuggestions = seoAudit.suggestions.slice(0, 3);
    const externalSources = post.externalSources || [];
    const faqItems = post.faqItems || [];
    const acceptedInternalLinks = post.internalLinks || [];
    const draftBrief = post.draftBrief;
    const featuredImageSourceLabel =
        post.featuredImageSource === "ai-generated"
            ? "AI generated"
            : post.featuredImageSource === "upload"
                ? "Uploaded"
                : "No image";

    const blockersCount = seoAudit.blockers.length;
    const isReady = seoAudit.requiredChecksPassed;
    const readinessTone = getBlogStudioReadinessTone({ readyForApproval: isReady, blockersCount, needsAttention: !isReady });
    const seoScoreTone = getBlogStudioSeoScoreTone(auditScore);
    const blockerTone = getBlogStudioBlockerTone(blockersCount);
    const hasContent = Boolean(post.content?.trim());
    const hasMetaDescription = Boolean(post.metaDescription?.trim());
    const hasFeaturedImage = Boolean(post.featuredImageUrl?.trim());
    const tabHealthSignals: PostTabHealthSignals = {
        seoScore: auditScore,
        blockersCount,
        hasFeaturedImage,
        hasMetaDescription,
        hasContent,
    };
    const publishPackageItems = getBlogStudioPublishPackageItems({
        metaDescriptionReady: seoAudit.checks.find((check) => check.key === "meta-description")?.passed ?? false,
        canonicalReady: seoAudit.checks.find((check) => check.key === "canonical-url")?.passed ?? false,
        featuredImageAltReady: seoAudit.checks.find((check) => check.key === "featured-image-alt")?.passed ?? false,
        schemaReady: Boolean(post.schemaMarkup?.trim()),
    });
    const cannibalizationTone = cannibalizationReport.risk === "high"
        ? "destructive"
        : cannibalizationReport.risk === "medium"
            ? "amber"
            : "emerald";
    const performanceSyncStatus = performanceReport?.syncStatus || null;
    const latestPerformanceSnapshot = performanceReport?.latestSnapshot || null;
    const previousPerformanceSnapshot = performanceReport?.previousSnapshot || null;
    const refreshOpportunity = performanceReport?.refreshOpportunity || null;
    const performanceRefreshReady = Boolean(post.status === "Published" && latestPerformanceSnapshot);
    const pagePerformanceNote = aiBloggerConfig?.pagePerformance?.enabled
        ? `Page performance config is stored as ${aiBloggerConfig.pagePerformance.provider} on ${aiBloggerConfig.pagePerformance.strategy} with a ${aiBloggerConfig.pagePerformance.performanceThreshold} threshold, but it is still config-only today and does not change SEO audit scoring or refresh recommendations yet.`
        : "Page performance checks are not active in the editor workflow yet.";
    const internalLinkHealthTone = internalLinkHealth?.status === "connected"
        ? "emerald"
        : internalLinkHealth?.status === "weak"
            ? "amber"
            : "destructive";
    const blockerResolutionSiteUrl = configuredSiteUrl;
    const publishValidation = validateBlogStudioPublishPackage(
        post,
        settings,
        aiBloggerConfig?.publishRules,
        undefined,
        undefined,
        auditScore,
        {
            audit: seoAudit,
            cannibalization: cannibalizationReport,
        },
    );
    const blockerResolutionPreview = buildBlogStudioBlockerResolutionPreview({
        post,
        settings,
        publishRules: aiBloggerConfig?.publishRules,
        audit: seoAudit,
        publishValidation,
        siteUrl: blockerResolutionSiteUrl,
    });
    const schemaJsonLd = buildBlogStudioArticleJsonLd(post, {
        author: aiBloggerConfig?.author,
        entityModeling: aiBloggerConfig?.entityModeling,
        siteUrl: configuredSiteUrl,
    });

    const briefItems = [
        { label: "Target", value: post.target.label },
        { label: "Audience", value: post.brief.audience || settings.brandVoice.audience },
        { label: "Tone", value: post.brief.tone || settings.brandVoice.tone },
        { label: "CTA", value: post.brief.cta || settings.brandVoice.ctaStyle },
        { label: "Trend Focus", value: post.brief.trendFocus || "Not set" },
        { label: "Language", value: post.brief.language || settings.seo.defaultLanguage },
        { label: "Location", value: post.brief.location || settings.seo.defaultLocation },
    ];

    /* ── Render ────────────────────────────────────────────────── */

        return (
            <div className="flex flex-col">
            <div className="px-4 sm:px-6 py-6">
                <AIBloggerBreadcrumb items={[{ label: "AI Blogger" }, { label: "Posts" }, { label: post.title }]} />
            </div>
            <div className="space-y-5 px-4 sm:px-6 py-6">

            {/* ── Unified Page Header ──────────────────────────── */}
            <AIBloggerGlassCard className="overflow-hidden p-0">
                {/* Top strip: readiness tone accent */}
                <div className={`h-1 w-full ${
                    readinessTone === "emerald" ? "bg-gradient-to-r from-emerald-500/60 to-emerald-400/30"
                    : readinessTone === "amber" ? "bg-gradient-to-r from-amber-500/60 to-amber-400/30"
                    : "bg-gradient-to-r from-primary/60 to-primary/20"
                }`} />

                <div className="p-5 sm:p-6">
                    {/* Row 1: Back + Actions */}
                    <div className="flex items-center justify-between gap-4 flex-wrap">
                        <AIBloggerGradientButton asChild variant="ghost" size="sm">
                            <Link href="/dashboard/ai-blogger/posts">
                                <ArrowLeft className="h-4 w-4" />
                                Back to Posts
                            </Link>
                        </AIBloggerGradientButton>

                        <div className="shrink-0">
                            <AIBloggerPostActions
                                slug={post.slug}
                                title={post.title}
                                content={post.content}
                                excerpt={post.excerpt}
                                metaTitle={post.metaTitle}
                                metaDescription={post.metaDescription}
                                performanceRefreshReady={performanceRefreshReady}
                            />
                        </div>
                    </div>

                    {/* Row 2: Title + Excerpt */}
                    <div className="mt-4">
                        <AIBloggerSectionEyebrow>Editor</AIBloggerSectionEyebrow>
                        <h2 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl leading-tight">
                            {post.title}
                        </h2>
                        {post.excerpt && (
                            <p className="mt-2 line-clamp-2 max-w-4xl text-sm leading-6 text-muted-foreground">
                                {post.excerpt}
                            </p>
                        )}
                    </div>

                    {/* Row 3: Stats strip */}
                    <div className="mt-4 flex flex-wrap items-center gap-2">
                        {/* Status */}
                        <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold ${
                            post.status === "Published" ? "border-emerald-500/30 bg-emerald-500/8 text-emerald-500"
                            : post.status === "Approved" ? "border-blue-500/30 bg-blue-500/8 text-blue-400"
                            : post.status === "SEO Review" ? "border-amber-500/30 bg-amber-500/8 text-amber-500"
                            : "border-border/60 bg-background/60 text-muted-foreground"
                        }`}>
                            {isReady
                                ? <CheckCircle2 className="h-3 w-3" />
                                : <AlertCircle className="h-3 w-3" />
                            }
                            {post.status}
                        </span>

                        {/* SEO Score */}
                        <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold ${
                            seoScoreTone === "emerald" ? "border-emerald-500/25 bg-emerald-500/8 text-emerald-500"
                            : seoScoreTone === "amber" ? "border-amber-500/25 bg-amber-500/8 text-amber-500"
                            : "border-primary/25 bg-primary/8 text-primary"
                        }`}>
                            <Sparkles className="h-3 w-3" />
                            SEO {auditScore}/100
                        </span>

                        {/* Blockers */}
                        {blockersCount > 0 && (
                            <span className="inline-flex items-center gap-1.5 rounded-full border border-destructive/30 bg-destructive/8 px-3 py-1 text-xs font-semibold text-destructive">
                                <AlertCircle className="h-3 w-3" />
                                {blockersCount} {blockersCount === 1 ? "blocker" : "blockers"}
                            </span>
                        )}

                        {/* Word count */}
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-background/60 px-3 py-1 text-xs text-muted-foreground">
                            <FileText className="h-3 w-3" />
                            <AIBloggerLiveWordCount postId={post.id} initialWordCount={wordCount} />
                        </span>

                        {/* Source */}
                        <span className="inline-flex items-center rounded-full border border-border/60 bg-background/60 px-3 py-1 text-xs text-muted-foreground">
                            {getBlogStudioSourceLabel(post.brief.sourceMode)}
                        </span>

                        {isBlogStudioTrendLed({
                            sourceMode: post.brief.sourceMode,
                            trendFocus: post.brief.trendFocus,
                            contentType: post.contentType,
                        }) ? (
                            <span className="inline-flex items-center rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                                {getBlogStudioTrendBadgeLabel(post.brief, post.contentType)}
                            </span>
                        ) : null}

                        {/* AI Score if available */}
                        {aiEstimatedSeoScore !== null && (
                            <span className="inline-flex items-center rounded-full border border-border/60 bg-background/60 px-3 py-1 text-xs text-muted-foreground">
                                AI est. {aiEstimatedSeoScore}/100
                            </span>
                        )}

                        {/* Cluster if set */}
                        {post.contentClusterId && (
                            <span className="inline-flex items-center rounded-full border border-border/60 bg-background/60 px-3 py-1 text-xs text-muted-foreground">
                                Cluster: {humanizeBlogStudioValue(post.contentClusterId)}
                            </span>
                        )}
                    </div>
                </div>
            </AIBloggerGlassCard>

            {/* ── Main layout: wide editor + focused sidebar ─────── */}
            <div className="grid gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(300px,1fr)]">

                {/* ── LEFT: Tab nav + editor + analysis cards ──────── */}
                <div className="space-y-5 min-w-0">

                    {/* Tab navigation */}
                    <PostTabNav activeTab={activeTab} healthSignals={tabHealthSignals} />

                    {/* Editor card — no inner sub-header, clean edges */}
                    <AIBloggerGlassCard className="p-5 sm:p-6">
                        <AIBloggerPostEditorForm
                            key={`${post.id}:${post.updatedAt}`}
                            post={post}
                            settings={settings}
                            internalLinkSuggestions={internalLinkSuggestions}
                            activeTab={activeTab}
                        />
                    </AIBloggerGlassCard>

                    {/* Tab-specific analysis cards below the editor */}
                    {activeTab === "seo" && (
                        <div className="space-y-5">
                            <PostCannibalizationCard
                                report={cannibalizationReport}
                                tone={cannibalizationTone as "destructive" | "amber" | "emerald"}
                            />
                            <PostInternalLinksCard
                                acceptedLinks={acceptedInternalLinks}
                                health={internalLinkHealth}
                                healthTone={internalLinkHealthTone as "emerald" | "amber" | "destructive"}
                                relatedPostCount={relatedClusterPosts.length}
                            />
                        </div>
                    )}

                    {activeTab === "assets" && (
                        <div className="space-y-5">
                            <PostGenerationStrategyCard
                                diagnostics={post.generationDiagnostics}
                            />
                            <PostWebsiteIntelligenceCard
                                intelligence={websiteIntelligence}
                                sourceMode={post.brief.sourceMode}
                            />
                            <PostSerpSnapshotCard
                                serpAnalysis={serpAnalysis}
                                serpEnabled={aiBloggerConfig?.serp?.enabled}
                            />
                        </div>
                    )}

                    {activeTab === "settings" && (
                        <div className="space-y-5">
                            <PostClusterContextCard
                                contentClusterId={post.contentClusterId}
                                parentTopicSlug={post.parentTopicSlug}
                                relatedPosts={relatedClusterPosts}
                            />
                            <PostBriefMetaCard briefItems={briefItems} status={post.status} />
                            <PostSchemaMarkupCard schemaJsonLd={schemaJsonLd} />
                        </div>
                    )}

                    {activeTab === "write" && (
                        <div className="space-y-5">
                            <PostOutlineTagsCard
                                postId={post.id}
                                outline={post.outline}
                                tags={post.tags}
                                internalLinksPresent={internalLinksPresent}
                                wordCount={wordCount}
                                minWords={settings.seo.minWords}
                                maxWords={settings.seo.maxWords}
                            />
                            <PostGroundedResearchCard
                                postId={post.id}
                                externalSources={externalSources}
                                researchNotes={post.researchNotes || []}
                            />
                            <PostAdvancedDraftPacksCard
                                postId={post.id}
                                draftBrief={draftBrief}
                                faqItems={faqItems}
                                featuredImagePrompt={post.featuredImagePrompt}
                            />
                        </div>
                    )}
                </div>

                {/* ── RIGHT: Sticky sidebar ────────────────────────── */}
                <div className="xl:sticky xl:top-6 xl:self-start">
                    <div className="space-y-4 pb-2">
                        <PostCommandPanel
                            slug={post.slug}
                            status={post.status}
                            targetType={post.target.type}
                            targetLabel={post.target.label}
                            scheduledFor={post.scheduledFor}
                            publishedUrl={post.canonicalUrl}
                            publishedTargetUrl={post.publishedTargetUrl}
                            deliveryStatus={post.deliveryStatus}
                            deliveryError={post.deliveryError}
                            deliveryAttemptedAt={post.deliveryAttemptedAt}
                            audit={seoAudit}
                            publishValidation={publishValidation}
                            publishingSettings={settings.publishing}
                            seoSettings={settings.seo}
                            blockerResolutionPreview={blockerResolutionPreview}
                            auditScore={auditScore}
                            blockersCount={blockersCount}
                            isReady={isReady}
                            topSuggestions={topSuggestions}
                        />

                        <PostFeaturedImageCard
                            featuredImageUrl={post.featuredImageUrl}
                            featuredImageAlt={post.featuredImageAlt}
                            featuredImageSourceLabel={featuredImageSourceLabel}
                            featuredImageMeta={post.featuredImageMeta}
                            imageHistory={post.imageHistory}
                            title={post.title}
                        />

                        <PostSeoAuditCard
                            postId={post.id}
                            auditScore={auditScore}
                            aiEstimatedSeoScore={aiEstimatedSeoScore}
                            aiVsAuditDelta={aiVsAuditDelta}
                            seoAudit={seoAudit}
                            blockersCount={blockersCount}
                            blockerTone={blockerTone}
                            publishPackageItems={publishPackageItems}
                        />

                        {/* Performance card — only show when published or has data */}
                        {(post.status === "Published" || latestPerformanceSnapshot) && (
                            <PostPerformanceCard
                                syncStatus={performanceSyncStatus}
                                pagePerformanceNote={pagePerformanceNote}
                                latestSnapshot={latestPerformanceSnapshot}
                                previousSnapshot={previousPerformanceSnapshot}
                                refreshOpportunity={refreshOpportunity}
                                performanceReport={performanceReport}
                            />
                        )}
                    </div>
                </div>
            </div>
            </div>
            </div>
        );
    } catch (error) {
        if (!isMongoConnectionIssue(error)) {
            throw error;
        }

        return (
            <AIBloggerDatabaseUnavailableState
                retryHref="/dashboard/ai-blogger/posts"
                message="AI Blogger couldn't load this post editor because MongoDB is temporarily unavailable."
            />
        );
    }
}

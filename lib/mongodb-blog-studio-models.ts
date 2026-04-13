import mongoose, { Model, Schema } from "mongoose";

import type {
    BlogStudioDraftBrief,
    BlogStudioGroundedResearchSnapshot,
    BlogStudioFaqItem,
    BlogStudioPerformanceSyncRun,
    BlogStudioPerformanceSnapshot,
    BlogStudioPost,
    BlogStudioRun,
    BlogStudioSchedule,
    BlogStudioExternalSource,
    BlogStudioSerpSnapshot,
    BlogStudioSitePriorityPage,
    BlogStudioSiteSnapshot,
    BlogStudioSettings,
} from "./types-ai-blogger";

const BlogStudioTargetSchema = new Schema(
    {
        type: {
            type: String,
            enum: ["webhook", "manual-export"],
            required: true,
        },
        label: { type: String, required: true },
        externalId: { type: String },
        webhookConfig: {
            url: { type: String },
            active: { type: Boolean, default: false },
            retryAttempts: { type: Number, default: 3, min: 1, max: 5 },
            timeout: { type: Number, default: 10, min: 5, max: 30 },
            secret: { type: String },
            lastSentAt: { type: String },
            lastStatus: { type: String, enum: ["success", "failed", "pending"] },
            lastError: { type: String },
        },
    },
    { _id: false }
);

const BlogStudioBriefSchema = new Schema(
    {
        sourceMode: {
            type: String,
            enum: ["website", "trending", "keywords"],
            required: true,
        },
        sourceValue: { type: String },
        targetWebsiteUrl: { type: String },
        trendFocus: { type: String },
        audience: { type: String },
        tone: { type: String },
        cta: { type: String },
        primaryKeyword: { type: String },
        language: { type: String },
        location: { type: String },
    },
    { _id: false }
);

const BlogStudioExternalSourceSchema = new Schema<BlogStudioExternalSource>(
    {
        id: { type: String, required: true },
        title: { type: String, required: true },
        url: { type: String, required: true },
        domain: { type: String, required: true },
        summary: { type: String, default: "" },
        type: {
            type: String,
            enum: ["government", "education", "official", "industry", "competitor", "news", "reference"],
            required: true,
            default: "reference",
        },
        freshness: {
            type: String,
            enum: ["current", "recent", "evergreen", "dated", "unknown"],
            required: true,
            default: "unknown",
        },
        trustLevel: {
            type: String,
            enum: ["high", "medium", "low"],
            required: true,
            default: "medium",
        },
        publishedAt: { type: String },
        keyClaims: [{ type: String }],
        citationBlock: { type: String, default: "" },
    },
    { _id: false }
);

const BlogStudioFaqItemSchema = new Schema<BlogStudioFaqItem>(
    {
        question: { type: String, required: true },
        answer: { type: String, required: true },
    },
    { _id: false }
);

const BlogStudioDraftBriefSchema = new Schema<BlogStudioDraftBrief>(
    {
        businessFitSummary: { type: String, default: "" },
        businessFitScore: { type: Number },
        businessFitWarnings: [{ type: String }],
        targetAudience: { type: String, default: "" },
        ctaGoal: { type: String, default: "" },
        toneDirection: { type: String, default: "" },
        titleDirection: { type: String, default: "" },
        metadataDirection: { type: String, default: "" },
        searchIntent: {
            type: String,
            enum: ["informational", "commercial", "navigational", "transactional"],
        },
        contentType: {
            type: String,
            enum: ["evergreen-guide", "trend-reaction", "comparison", "how-to", "solution-explainer", "category-authority"],
        },
        entities: [{ type: String }],
    },
    { _id: false }
);

const BlogStudioGenerationScorecardSchema = new Schema(
    {
        websiteRelevance: { type: Number },
        trendRelevance: { type: Number },
        keywordStrength: { type: Number },
        businessFit: { type: Number },
    },
    { _id: false }
);

const BlogStudioGenerationSourceUsageSchema = new Schema(
    {
        usedWebsiteIntelligence: { type: Boolean, default: false },
        usedLiveTrends: { type: Boolean, default: false },
        usedTrendFocus: { type: Boolean, default: false },
        usedSerpAnalysis: { type: Boolean, default: false },
        usedGroundedResearch: { type: Boolean, default: false },
        usedPerformanceData: { type: Boolean, default: false },
    },
    { _id: false }
);

const BlogStudioGenerationKeywordPlanSchema = new Schema(
    {
        primaryKeyword: { type: String },
        secondaryKeywords: [{ type: String }],
        metaKeywords: [{ type: String }],
        sectionAngles: [{ type: String }],
    },
    { _id: false }
);

const BlogStudioGenerationStepSchema = new Schema(
    {
        key: { type: String, required: true },
        label: { type: String, required: true },
        status: {
            type: String,
            enum: ["pending", "running", "completed", "failed", "skipped"],
            required: true,
            default: "pending",
        },
        notes: { type: String },
    },
    { _id: false }
);

const BlogStudioGenerationDiagnosticsSchema = new Schema(
    {
        selectedTopic: { type: String },
        fetchTrendsSource: {
            type: String,
            enum: [
                "live-google-trends",
                "live-google-trends-fallback-key",
                "ai-only-discovery",
                "ai-fallback-after-live-failure",
            ],
        },
        fetchTrendsLabel: { type: String },
        fetchTrendsNotes: { type: String },
        businessFitSummary: { type: String },
        businessFitScore: { type: Number },
        businessFitWarnings: [{ type: String }],
        keywordPlan: { type: BlogStudioGenerationKeywordPlanSchema },
        scorecard: { type: BlogStudioGenerationScorecardSchema },
        sourceUsage: { type: BlogStudioGenerationSourceUsageSchema },
        steps: { type: [BlogStudioGenerationStepSchema], default: [] },
    },
    { _id: false }
);

const BlogStudioPostInternalLinkSchema = new Schema(
    {
        href: { type: String, required: true },
        title: { type: String, required: true },
        source: { type: String, enum: ["service", "page", "blog"], required: true },
        anchorText: { type: String, required: true },
        relationType: {
            type: String,
            enum: [
                "cluster-parent",
                "cluster-supporting",
                "pillar-parent",
                "pillar-supporting",
                "service-authority",
                "related-reading",
                "site-supporting",
            ],
            required: true,
        },
        score: { type: Number, required: true, default: 0 },
        matchReason: { type: String, default: "" },
        clusterAligned: { type: Boolean, required: true, default: false },
        suggestedSectionHeading: { type: String },
        targetPostSlug: { type: String },
        targetClusterId: { type: String },
        targetParentTopicSlug: { type: String },
        placement: {
            type: String,
            enum: ["introduction", "body", "faq", "conclusion"],
        },
    },
    { _id: false }
);

const BlogStudioPostSchema = new Schema<BlogStudioPost>(
    {
        id: { type: String, required: true, unique: true },
        agencyId: { type: String, required: true, index: true },
        slug: { type: String, required: true },
        title: { type: String, required: true },
        excerpt: { type: String, default: "" },
        metaTitle: { type: String, default: "" },
        metaDescription: { type: String, default: "" },
        canonicalUrl: { type: String, default: "" },
        schemaMarkup: { type: String, default: "" },
        featuredImageAlt: { type: String, default: "" },
        featuredImageUrl: { type: String, default: "" },
        featuredImageSource: { type: String, enum: ["upload", "ai-generated"] },
        featuredImageMeta: {
            type: new Schema({
                width: { type: Number },
                height: { type: Number },
                format: { type: String },
                fileSizeBytes: { type: Number },
                license: { type: String },
                attribution: { type: String },
            }, { _id: false }),
        },
        featuredImageCrop: {
            type: new Schema({
                x: { type: Number, required: true },
                y: { type: Number, required: true },
                width: { type: Number, required: true },
                height: { type: Number, required: true },
            }, { _id: false }),
        },
        imageHistory: [{
            type: new Schema({
                url: { type: String, required: true },
                alt: { type: String },
                source: { type: String, enum: ["upload", "ai-generated"] },
                prompt: { type: String },
                meta: {
                    type: new Schema({
                        width: { type: Number },
                        height: { type: Number },
                        format: { type: String },
                        fileSizeBytes: { type: Number },
                        license: { type: String },
                        attribution: { type: String },
                    }, { _id: false }),
                },
                replacedAt: { type: String, required: true },
                replacedBy: { type: String },
                reason: { type: String },
            }, { _id: false }),
        }],
        content: { type: String },
        status: {
            type: String,
            enum: ["Draft", "Research", "SEO Review", "Approved", "Scheduled", "Published"],
            required: true,
            default: "Draft",
        },
        target: { type: BlogStudioTargetSchema, required: true },
        tags: [{ type: String }],
        outline: [{ type: String }],
        brief: { type: BlogStudioBriefSchema, required: true },
        draftBrief: { type: BlogStudioDraftBriefSchema },
        faqItems: { type: [BlogStudioFaqItemSchema], default: [] },
        searchIntent: {
            type: String,
            enum: ["informational", "commercial", "navigational", "transactional"],
        },
        contentType: {
            type: String,
            enum: ["evergreen-guide", "trend-reaction", "comparison", "how-to", "solution-explainer", "category-authority"],
        },
        contentClusterId: { type: String, index: true },
        parentTopicSlug: { type: String, index: true },
        internalLinks: { type: [BlogStudioPostInternalLinkSchema], default: [] },
        featuredImagePrompt: { type: String, default: "" },
        researchNotes: [{ type: String }],
        externalSources: { type: [BlogStudioExternalSourceSchema], default: [] },
        generationDiagnostics: { type: BlogStudioGenerationDiagnosticsSchema },
        seoScore: { type: Number },
        wordCount: { type: Number },
        createdBy: { type: String, required: true },
        updatedBy: { type: String },
        approvedBy: { type: String },
        scheduledFor: { type: String },
        publishedAt: { type: String },
        publishedEntryId: { type: String },
        publishedEntrySlug: { type: String },
        publishedTargetUrl: { type: String },
        deliveryStatus: { type: String, enum: ["success", "failed", "pending"] },
        deliveryError: { type: String },
        deliveryAttemptedAt: { type: String },
        publishedMetadataValidatedAt: { type: String },
        lastRefreshedAt: { type: String },
        refreshCount: { type: Number, default: 0 },
        pagePerformanceScore: { type: Number },
        pagePerformanceCheckedAt: { type: String },
        createdAt: { type: String, required: true },
        updatedAt: { type: String, required: true },
    },
    { timestamps: true }
);

BlogStudioPostSchema.index({ agencyId: 1, slug: 1 }, { unique: true });
BlogStudioPostSchema.index({ agencyId: 1, status: 1 });
BlogStudioPostSchema.index({ agencyId: 1, contentClusterId: 1, updatedAt: -1 });
BlogStudioPostSchema.index({ agencyId: 1, parentTopicSlug: 1, updatedAt: -1 });
BlogStudioPostSchema.index({ agencyId: 1, updatedAt: -1 });
BlogStudioPostSchema.index({ agencyId: 1, scheduledFor: 1 });

const BlogStudioRunStepSchema = new Schema(
    {
        key: { type: String, required: true },
        label: { type: String, required: true },
        status: {
            type: String,
            enum: ["pending", "running", "completed", "failed", "skipped"],
            required: true,
            default: "pending",
        },
        notes: { type: String },
        startedAt: { type: String },
        completedAt: { type: String },
        input: { type: Schema.Types.Mixed },
        process: {
            durationMs: { type: Number },
            details: { type: Schema.Types.Mixed },
        },
        output: {
            summary: { type: String },
            data: { type: Schema.Types.Mixed },
            metrics: { type: Schema.Types.Mixed },
            rawText: { type: String },
        },
        errors: [{ type: String }],
    },
    { _id: false }
);

const BlogStudioRunSchema = new Schema<BlogStudioRun>(
    {
        id: { type: String, required: true, unique: true },
        agencyId: { type: String, required: true, index: true },
        postId: { type: String },
        scheduleId: { type: String },
        sourceMode: {
            type: String,
            enum: ["website", "trending", "keywords"],
            required: true,
        },
        status: {
            type: String,
            enum: ["queued", "running", "completed", "failed", "cancelled"],
            required: true,
            default: "queued",
        },
        selectedTopic: { type: String },
        summary: { type: String },
        steps: { type: [BlogStudioRunStepSchema], default: [] },
        createdBy: { type: String, required: true },
        startedAt: { type: String },
        completedAt: { type: String },
        createdAt: { type: String, required: true },
        updatedAt: { type: String, required: true },
    },
    { timestamps: true }
);

BlogStudioRunSchema.index({ agencyId: 1, createdAt: -1 });
BlogStudioRunSchema.index({ agencyId: 1, status: 1 });
BlogStudioRunSchema.index({ agencyId: 1, postId: 1, createdAt: -1 });
BlogStudioRunSchema.index({ agencyId: 1, scheduleId: 1, createdAt: -1 });

const BlogStudioBrandVoiceSchema = new Schema(
    {
        tone: { type: String, required: true },
        audience: { type: String, required: true },
        ctaStyle: { type: String, required: true },
        bannedTerms: [{ type: String }],
    },
    { _id: false }
);

const BlogStudioSeoSchema = new Schema(
    {
        minWords: { type: Number, required: true },
        maxWords: { type: Number, required: true },
        defaultLanguage: { type: String, required: true },
        defaultLocation: { type: String, required: true },
        requireInternalLinks: { type: Boolean, required: true, default: true },
        requireMetaDescription: { type: Boolean, required: true, default: true },
        requireSeoReview: { type: Boolean, required: true, default: true },
    },
    { _id: false }
);

const BlogStudioPublishingSchema = new Schema(
    {
        defaultTarget: { type: BlogStudioTargetSchema, required: true },
        requireApproval: { type: Boolean, required: true, default: true },
        autoSchedule: { type: Boolean, required: true, default: false },
        publishMode: {
            type: String,
            enum: ["draft-only", "approval-required", "schedule-after-approval"],
            required: true,
            default: "draft-only",
        },
    },
    { _id: false }
);

const BlogStudioNotificationSchema = new Schema(
    {
        scheduleFailureEmail: { type: Boolean, required: true, default: true },
        schedulePausedEmail: { type: Boolean, required: true, default: true },
        notificationEmails: [{ type: String }],
    },
    { _id: false }
);

const SearchConsoleOAuthSchema = new Schema(
    {
        enabled: { type: Boolean, required: true, default: false },
        selectedDomain: { type: String },
        refreshToken: { type: String },
        accessToken: { type: String },
        accessTokenExpiresAt: { type: Number },
        lastTokenRefreshAt: { type: Number },
        authStatus: {
            type: String,
            enum: ["not-connected", "connected", "token-expired"],
            required: true,
            default: "not-connected",
        },
        authorizedAt: { type: String },
        oauthProvider: { type: String, required: true, default: "google" },
    },
    { _id: false }
);

const BlogStudioSettingsSchema = new Schema<BlogStudioSettings>(
    {
        agencyId: { type: String, required: true, unique: true },
        brandVoice: { type: BlogStudioBrandVoiceSchema, required: true },
        seo: { type: BlogStudioSeoSchema, required: true },
        publishing: { type: BlogStudioPublishingSchema, required: true },
        notifications: { type: BlogStudioNotificationSchema },
        searchConsoleOAuth: { type: SearchConsoleOAuthSchema },
        createdBy: { type: String, required: true },
        updatedBy: { type: String },
        createdAt: { type: String, required: true },
        updatedAt: { type: String, required: true },
    },
    { timestamps: true }
);

const BlogStudioScheduleSchema = new Schema<BlogStudioSchedule>(
    {
        id: { type: String, required: true, unique: true },
        agencyId: { type: String, required: true, index: true },
        name: { type: String, required: true },
        status: {
            type: String,
            enum: ["draft", "active", "paused"],
            required: true,
            default: "draft",
        },
        cadence: {
            type: String,
            enum: ["daily", "weekly", "monthly"],
            required: true,
        },
        timezone: { type: String, required: true },
        target: { type: BlogStudioTargetSchema, required: true },
        brief: { type: BlogStudioBriefSchema, required: true },
        createDraftOnly: { type: Boolean, required: true, default: true },
        nextRunAt: { type: String },
        lastRunAt: { type: String },
        consecutiveFailures: { type: Number, required: true, default: 0 },
        maxRetries: { type: Number, required: true, default: 3 },
        lastRunStatus: { type: String, enum: ["completed", "failed"] },
        lastRunSummary: { type: String },
        lockedUntil: { type: String },
        lockedBy: { type: String },
        createdBy: { type: String, required: true },
        updatedBy: { type: String },
        createdAt: { type: String, required: true },
        updatedAt: { type: String, required: true },
    },
    { timestamps: true }
);

BlogStudioScheduleSchema.index({ agencyId: 1, status: 1 });
BlogStudioScheduleSchema.index({ agencyId: 1, nextRunAt: 1 });
BlogStudioScheduleSchema.index({ agencyId: 1, updatedAt: -1 });
BlogStudioScheduleSchema.index({ status: 1, nextRunAt: 1, lockedUntil: 1 });

const BlogStudioSiteSnapshotSchema = new Schema<BlogStudioSiteSnapshot>(
    {
        id: { type: String, required: true, unique: true },
        agencyId: { type: String, required: true, index: true },
        sourceUrl: { type: String, required: true },
        normalizedUrl: { type: String, required: true },
        pageCount: { type: Number, required: true, default: 0 },
        pageTitles: [{ type: String }],
        topicHints: [{ type: String }],
        faqQuestions: [{ type: String }],
        priorityPaths: [{ type: String }],
        priorityPages: { type: [new Schema<BlogStudioSitePriorityPage>(
            {
                path: { type: String, required: true },
                url: { type: String, required: true },
                title: { type: String, default: "" },
                description: { type: String, default: "" },
                excerpt: { type: String, default: "" },
                highlights: [{ type: String }],
                serviceSignals: [{ type: String }],
                proofSignals: [{ type: String }],
                ctaPatterns: [{ type: String }],
                pageCategory: {
                    type: String,
                    enum: ["service", "product", "collection", "category", "brand", "solution", "case-study", "pricing", "industry", "blog", "faq", "about", "contact", "home", "general"],
                    default: "general",
                },
                pageScore: { type: Number, default: 0 },
            },
            { _id: false }
        )], default: [] },
        serviceSignals: [{ type: String }],
        ctaPatterns: [{ type: String }],
        proofSignals: [{ type: String }],
        summary: { type: String, default: "" },
        refreshedAt: { type: String, required: true },
        createdAt: { type: String, required: true },
        updatedAt: { type: String, required: true },
    },
    { timestamps: true }
);

BlogStudioSiteSnapshotSchema.index({ agencyId: 1, normalizedUrl: 1 }, { unique: true });
BlogStudioSiteSnapshotSchema.index({ agencyId: 1, refreshedAt: -1 });
BlogStudioSiteSnapshotSchema.index({ agencyId: 1, updatedAt: -1 });

const BlogStudioSerpSnapshotSchema = new Schema<BlogStudioSerpSnapshot>(
    {
        id: { type: String, required: true, unique: true },
        agencyId: { type: String, required: true, index: true },
        query: { type: String, required: true },
        normalizedQuery: { type: String, required: true },
        location: { type: String, required: true },
        device: {
            type: String,
            enum: ["desktop", "mobile"],
            required: true,
            default: "desktop",
        },
        provider: {
            type: String,
            enum: ["serpapi"],
            required: true,
            default: "serpapi",
        },
        intent: {
            type: String,
            enum: ["informational", "commercial", "navigational", "transactional"],
            required: true,
            default: "informational",
        },
        topResultTitles: [{ type: String }],
        topResultUrls: [{ type: String }],
        competitorDomains: [{ type: String }],
        peopleAlsoAsk: [{ type: String }],
        relatedSearches: [{ type: String }],
        headingPatterns: [{ type: String }],
        contentGaps: [{ type: String }],
        featuredSnippetStyle: { type: String, default: "" },
        rankingDifficulty: { type: String, default: "" },
        dominantContentFormat: { type: String, default: "" },
        titleAnglePatterns: [{ type: String }],
        sectionGapAnalysis: [{ type: String }],
        summary: { type: String, default: "" },
        refreshedAt: { type: String, required: true },
        createdAt: { type: String, required: true },
        updatedAt: { type: String, required: true },
    },
    { timestamps: true }
);

BlogStudioSerpSnapshotSchema.index(
    { agencyId: 1, normalizedQuery: 1, location: 1, device: 1 },
    { unique: true },
);
BlogStudioSerpSnapshotSchema.index({ agencyId: 1, refreshedAt: -1 });
BlogStudioSerpSnapshotSchema.index({ agencyId: 1, updatedAt: -1 });

const BlogStudioGroundedResearchSnapshotSchema = new Schema<BlogStudioGroundedResearchSnapshot>(
    {
        id: { type: String, required: true, unique: true },
        agencyId: { type: String, required: true, index: true },
        query: { type: String, required: true },
        normalizedQuery: { type: String, required: true },
        location: { type: String, required: true },
        sources: { type: [BlogStudioExternalSourceSchema], default: [] },
        summary: { type: String, default: "" },
        refreshedAt: { type: String, required: true },
        createdAt: { type: String, required: true },
        updatedAt: { type: String, required: true },
    },
    { timestamps: true }
);

BlogStudioGroundedResearchSnapshotSchema.index(
    { agencyId: 1, normalizedQuery: 1, location: 1 },
    { unique: true },
);
BlogStudioGroundedResearchSnapshotSchema.index({ agencyId: 1, refreshedAt: -1 });
BlogStudioGroundedResearchSnapshotSchema.index({ agencyId: 1, updatedAt: -1 });

const BlogStudioPerformanceQuerySnapshotSchema = new Schema(
    {
        query: { type: String, required: true },
        clicks: { type: Number, required: true, default: 0 },
        impressions: { type: Number, required: true, default: 0 },
        ctr: { type: Number, required: true, default: 0 },
        position: { type: Number, required: true, default: 0 },
    },
    { _id: false }
);

const BlogStudioPerformanceBreakdownSnapshotSchema = new Schema(
    {
        label: { type: String, required: true },
        clicks: { type: Number, required: true, default: 0 },
        impressions: { type: Number, required: true, default: 0 },
        ctr: { type: Number, required: true, default: 0 },
        position: { type: Number, required: true, default: 0 },
    },
    { _id: false }
);

const BlogStudioPerformanceSnapshotSchema = new Schema<BlogStudioPerformanceSnapshot>(
    {
        id: { type: String, required: true, unique: true },
        agencyId: { type: String, required: true, index: true },
        postId: { type: String, required: true, index: true },
        postSlug: { type: String, required: true },
        pageUrl: { type: String, required: true },
        source: {
            type: String,
            enum: ["search-console"],
            required: true,
            default: "search-console",
        },
        startDate: { type: String, required: true },
        endDate: { type: String, required: true },
        clicks: { type: Number, required: true, default: 0 },
        impressions: { type: Number, required: true, default: 0 },
        ctr: { type: Number, required: true, default: 0 },
        position: { type: Number, required: true, default: 0 },
        topQueries: { type: [BlogStudioPerformanceQuerySnapshotSchema], default: [] },
        topCountries: { type: [BlogStudioPerformanceBreakdownSnapshotSchema], default: [] },
        topDevices: { type: [BlogStudioPerformanceBreakdownSnapshotSchema], default: [] },
        refreshedAt: { type: String, required: true },
        createdAt: { type: String, required: true },
        updatedAt: { type: String, required: true },
    },
    { timestamps: true }
);

BlogStudioPerformanceSnapshotSchema.index(
    { agencyId: 1, postId: 1, startDate: 1, endDate: 1 },
    { unique: true },
);
BlogStudioPerformanceSnapshotSchema.index({ agencyId: 1, refreshedAt: -1 });
BlogStudioPerformanceSnapshotSchema.index({ agencyId: 1, postId: 1, refreshedAt: -1 });
BlogStudioPerformanceSnapshotSchema.index({ agencyId: 1, postSlug: 1, refreshedAt: -1 });

const BlogStudioPerformanceSyncRunSchema = new Schema<BlogStudioPerformanceSyncRun>(
    {
        id: { type: String, required: true, unique: true },
        agencyId: { type: String, required: true, index: true },
        status: {
            type: String,
            enum: ["synced", "skipped", "failed"],
            required: true,
        },
        trigger: {
            type: String,
            enum: ["manual", "scheduled"],
            required: true,
            default: "scheduled",
        },
        summary: { type: String, required: true, default: "" },
        postsEvaluated: { type: Number, required: true, default: 0 },
        snapshotsStored: { type: Number, required: true, default: 0 },
        startedAt: { type: String, required: true },
        completedAt: { type: String, required: true },
        createdAt: { type: String, required: true },
        updatedAt: { type: String, required: true },
    },
    { timestamps: true }
);

BlogStudioPerformanceSyncRunSchema.index({ agencyId: 1, completedAt: -1 });
BlogStudioPerformanceSyncRunSchema.index({ agencyId: 1, status: 1, completedAt: -1 });

// ==================== WEBHOOK DELIVERY LOGS ====================

const BlogStudioWebhookDeliveryResultSchema = new Schema(
    {
        success: { type: Boolean, required: true },
        statusCode: { type: Number },
        responseTime: { type: Number, required: true },
        error: { type: String },
        timestamp: { type: String, required: true },
        attempt: { type: Number, required: true },
    },
    { _id: false }
);

const BlogStudioWebhookDeliveryLogSchema = new Schema(
    {
        id: { type: String, required: true, unique: true },
        agencyId: { type: String, required: true, index: true },
        webhookUrl: { type: String, required: true },
        event: { type: String, required: true },
        postId: { type: String, required: true },
        postSlug: { type: String, required: true },
        payload: {
            type: new Schema({
                event: { type: String, required: true },
                blog: {
                    type: new Schema({
                        id: { type: String },
                        title: { type: String, required: true },
                        slug: { type: String, required: true },
                        content: { type: String, required: true },
                        excerpt: { type: String, required: true },
                        metaKeywords: { type: String },
                        metaTitle: { type: String, required: true },
                        metaDescription: { type: String, required: true },
                        canonicalUrl: { type: String, required: true },
                        image: { type: String, required: true },
                        imageAlt: { type: String, required: true },
                        schemaMarkup: { type: String },
                        category: { type: String },
                        faqItems: [
                            {
                                question: { type: String },
                                answer: { type: String },
                            },
                        ],
                        peopleAlsoAsk: [{ type: String }],
                        internalLinks: [
                            {
                                href: { type: String },
                                title: { type: String },
                                anchorText: { type: String },
                                source: { type: String },
                                relationType: { type: String },
                                score: { type: Number },
                            },
                        ],
                        contentClusterId: { type: String },
                        parentTopicSlug: { type: String },
                        publishedAt: { type: String, required: true },
                    }, { _id: false }),
                    required: true,
                },
                source: {
                    type: new Schema({
                        agencyId: { type: String },
                        agencyName: { type: String },
                        publishedAt: { type: String },
                    }, { _id: false }),
                },
            }, { _id: false }),
            required: true,
        },
        results: { type: [BlogStudioWebhookDeliveryResultSchema], default: [] },
        finalStatus: { type: String, enum: ["success", "failed"], required: true },
        createdAt: { type: String, required: true },
        updatedAt: { type: String, required: true },
    },
    { timestamps: true }
);

BlogStudioWebhookDeliveryLogSchema.index({ agencyId: 1, createdAt: -1 });
BlogStudioWebhookDeliveryLogSchema.index({ agencyId: 1, postId: 1 });
BlogStudioWebhookDeliveryLogSchema.index({ agencyId: 1, webhookUrl: 1, createdAt: -1 });
BlogStudioWebhookDeliveryLogSchema.index({ createdAt: -1 }, { expireAfterSeconds: 7776000 }); // Auto-delete after 90 days

type BlogStudioPipelineJobStatus = "running" | "complete" | "error";

type BlogStudioPipelineJobEvent = {
    type: "step-start" | "step-complete" | "step-fail" | "step-skip" | "log" | "complete" | "error";
    step?: string;
    label?: string;
    notes?: string;
    message?: string;
    timestamp: string;
};

type BlogStudioPipelineJobExecution = {
    phase?: string;
    request?: unknown;
    context?: unknown;
    claimedPhase?: string;
    claimId?: string;
    claimExpiresAt?: string;
    updatedAt?: string;
};

type BlogStudioPipelineJob = {
    id: string;
    agencyId: string;
    createdBy?: string;
    status: BlogStudioPipelineJobStatus;
    events: BlogStudioPipelineJobEvent[];
    execution?: BlogStudioPipelineJobExecution;
    result?: unknown;
    errorMessage?: string;
    createdAt: string;
    updatedAt: string;
    completedAt?: string;
    expiresAt: Date;
};

const BlogStudioPipelineJobEventSchema = new Schema<BlogStudioPipelineJobEvent>(
    {
        type: {
            type: String,
            enum: ["step-start", "step-complete", "step-fail", "step-skip", "log", "complete", "error"],
            required: true,
        },
        step: { type: String },
        label: { type: String },
        notes: { type: String },
        message: { type: String },
        timestamp: { type: String, required: true },
    },
    { _id: false }
);

const BlogStudioPipelineJobExecutionSchema = new Schema<BlogStudioPipelineJobExecution>(
    {
        phase: { type: String },
        request: { type: Schema.Types.Mixed },
        context: { type: Schema.Types.Mixed },
        claimedPhase: { type: String },
        claimId: { type: String },
        claimExpiresAt: { type: String },
        updatedAt: { type: String },
    },
    { _id: false }
);

const BlogStudioPipelineJobSchema = new Schema<BlogStudioPipelineJob>(
    {
        id: { type: String, required: true, unique: true },
        agencyId: { type: String, required: true, index: true },
        createdBy: { type: String },
        status: { type: String, enum: ["running", "complete", "error"], required: true, default: "running" },
        events: { type: [BlogStudioPipelineJobEventSchema], default: [] },
        execution: { type: BlogStudioPipelineJobExecutionSchema },
        result: { type: Schema.Types.Mixed },
        errorMessage: { type: String },
        createdAt: { type: String, required: true },
        updatedAt: { type: String, required: true },
        completedAt: { type: String },
        expiresAt: { type: Date, required: true },
    },
    { timestamps: true }
);

BlogStudioPipelineJobSchema.index({ agencyId: 1, createdAt: -1 });
BlogStudioPipelineJobSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const BlogStudioWebhookDeliveryLogModel =
    (mongoose.models.BlogStudioWebhookDeliveryLog as Model<any>) ||
    mongoose.model("BlogStudioWebhookDeliveryLog", BlogStudioWebhookDeliveryLogSchema);

export const BlogStudioPipelineJobModel =
    (mongoose.models.BlogStudioPipelineJob as Model<BlogStudioPipelineJob>) ||
    mongoose.model<BlogStudioPipelineJob>("BlogStudioPipelineJob", BlogStudioPipelineJobSchema);

export const BlogStudioPostModel =
    (mongoose.models.BlogStudioPost as Model<BlogStudioPost>) ||
    mongoose.model<BlogStudioPost>("BlogStudioPost", BlogStudioPostSchema);

export const BlogStudioRunModel =
    (mongoose.models.BlogStudioRun as Model<BlogStudioRun>) ||
    mongoose.model<BlogStudioRun>("BlogStudioRun", BlogStudioRunSchema);

export const BlogStudioSettingsModel =
    (mongoose.models.BlogStudioSettings as Model<BlogStudioSettings>) ||
    mongoose.model<BlogStudioSettings>("BlogStudioSettings", BlogStudioSettingsSchema);

export const BlogStudioScheduleModel =
    (mongoose.models.BlogStudioSchedule as Model<BlogStudioSchedule>) ||
    mongoose.model<BlogStudioSchedule>("BlogStudioSchedule", BlogStudioScheduleSchema);

export const BlogStudioSiteSnapshotModel =
    (mongoose.models.BlogStudioSiteSnapshot as Model<BlogStudioSiteSnapshot>) ||
    mongoose.model<BlogStudioSiteSnapshot>("BlogStudioSiteSnapshot", BlogStudioSiteSnapshotSchema);

export const BlogStudioSerpSnapshotModel =
    (mongoose.models.BlogStudioSerpSnapshot as Model<BlogStudioSerpSnapshot>) ||
    mongoose.model<BlogStudioSerpSnapshot>("BlogStudioSerpSnapshot", BlogStudioSerpSnapshotSchema);

export const BlogStudioGroundedResearchSnapshotModel =
    (mongoose.models.BlogStudioGroundedResearchSnapshot as Model<BlogStudioGroundedResearchSnapshot>) ||
    mongoose.model<BlogStudioGroundedResearchSnapshot>(
        "BlogStudioGroundedResearchSnapshot",
        BlogStudioGroundedResearchSnapshotSchema,
    );

export const BlogStudioPerformanceSnapshotModel =
    (mongoose.models.BlogStudioPerformanceSnapshot as Model<BlogStudioPerformanceSnapshot>) ||
    mongoose.model<BlogStudioPerformanceSnapshot>(
        "BlogStudioPerformanceSnapshot",
        BlogStudioPerformanceSnapshotSchema,
    );

export const BlogStudioPerformanceSyncRunModel =
    (mongoose.models.BlogStudioPerformanceSyncRun as Model<BlogStudioPerformanceSyncRun>) ||
    mongoose.model<BlogStudioPerformanceSyncRun>(
        "BlogStudioPerformanceSyncRun",
        BlogStudioPerformanceSyncRunSchema,
    );

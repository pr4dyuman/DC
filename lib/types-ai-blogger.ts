export type BlogStudioInputMode = "website" | "trending" | "keywords";

export type BlogStudioPostStatus =
    | "Draft"
    | "Research"
    | "SEO Review"
    | "Approved"
    | "Scheduled"
    | "Published";

export type BlogStudioRunStatus = "queued" | "running" | "completed" | "failed" | "cancelled";

export type BlogStudioRunStepStatus = "pending" | "running" | "completed" | "failed" | "skipped";

export type BlogStudioScheduleStatus = "draft" | "active" | "paused";

export type BlogStudioScheduleCadence = "daily" | "weekly" | "monthly";

export type BlogStudioPostListFilter =
    | "all"
    | "draft"
    | "review"
    | "approved"
    | "scheduled"
    | "published";

export type BlogStudioTargetType = "webhook" | "manual-export";

export type BlogStudioPublishMode = "draft-only" | "approval-required" | "schedule-after-approval";

export type BlogStudioFeaturedImageSource = "upload" | "ai-generated";

export type BlogStudioImageMeta = {
    width?: number;
    height?: number;
    format?: string;
    fileSizeBytes?: number;
    license?: string;
    attribution?: string;
};

export type BlogStudioImageCrop = {
    x: number;
    y: number;
    width: number;
    height: number;
};

export type BlogStudioImageHistoryEntry = {
    url: string;
    alt?: string;
    source?: BlogStudioFeaturedImageSource;
    prompt?: string;
    meta?: BlogStudioImageMeta;
    replacedAt: string;
    replacedBy?: string;
    reason?: string;
};

export type BlogStudioWebhookStatus = "success" | "failed" | "pending";

export type BlogStudioWebhookConfig = {
    url: string;
    active: boolean;
    retryAttempts: number;
    timeout: number;
    secret?: string;
    secretMasked?: string;
    hasSecret?: boolean;
    lastSentAt?: string;
    lastStatus?: BlogStudioWebhookStatus;
    lastError?: string;
};

export type BlogStudioTarget = {
    type: BlogStudioTargetType;
    label: string;
    externalId?: string;
    webhookConfig?: BlogStudioWebhookConfig;
};

export type BlogStudioBrief = {
    sourceMode: BlogStudioInputMode;
    sourceValue?: string;
    trendFocus?: string;
    audience?: string;
    tone?: string;
    cta?: string;
    primaryKeyword?: string;
    language?: string;
    location?: string;
    /**
     * Optional website URL for internal link crawling when sourceMode is "trending" or "keywords".
     * Has no effect when sourceMode is "website" (sourceValue is used instead).
     */
    targetWebsiteUrl?: string;
};

export type BlogStudioExternalSourceType =
    | "government"
    | "education"
    | "official"
    | "industry"
    | "competitor"
    | "news"
    | "reference";

export type BlogStudioExternalSourceFreshness =
    | "current"
    | "recent"
    | "evergreen"
    | "dated"
    | "unknown";

export type BlogStudioExternalSourceTrustLevel = "high" | "medium" | "low";

export type BlogStudioExternalSource = {
    id: string;
    title: string;
    url: string;
    domain: string;
    summary: string;
    type: BlogStudioExternalSourceType;
    freshness: BlogStudioExternalSourceFreshness;
    trustLevel: BlogStudioExternalSourceTrustLevel;
    publishedAt?: string;
    keyClaims: string[];
    citationBlock: string;
};

export type BlogStudioContentType =
    | "evergreen-guide"
    | "trend-reaction"
    | "comparison"
    | "how-to"
    | "solution-explainer"
    | "category-authority";

export type BlogStudioFaqItem = {
    question: string;
    answer: string;
};

export type BlogStudioDraftBrief = {
    businessFitSummary: string;
    businessFitScore?: number;
    businessFitWarnings?: string[];
    targetAudience: string;
    ctaGoal: string;
    toneDirection: string;
    titleDirection: string;
    metadataDirection: string;
    searchIntent?: BlogStudioSearchIntent;
    contentType?: BlogStudioContentType;
    entities: string[];
};

export type BlogStudioGenerationScorecard = {
    websiteRelevance?: number;
    trendRelevance?: number;
    keywordStrength?: number;
    businessFit?: number;
    topicIntegrity?: number;
    websiteTopicAccepted?: boolean;
};

export type BlogStudioGenerationSourceUsage = {
    usedWebsiteIntelligence: boolean;
    usedLiveTrends: boolean;
    usedTrendFocus: boolean;
    usedSerpAnalysis: boolean;
    usedGroundedResearch: boolean;
    usedPerformanceData: boolean;
};

export type BlogStudioPost = {
    id: string;
    agencyId: string;
    slug: string;
    title: string;
    excerpt: string;
    metaTitle?: string;
    metaDescription?: string;
    canonicalUrl?: string;
    schemaMarkup?: string;
    featuredImageAlt?: string;
    featuredImageUrl?: string;
    featuredImageSource?: BlogStudioFeaturedImageSource;
    featuredImageMeta?: BlogStudioImageMeta;
    featuredImageCrop?: BlogStudioImageCrop;
    imageHistory?: BlogStudioImageHistoryEntry[];
    content?: string;
    status: BlogStudioPostStatus;
    target: BlogStudioTarget;
    tags: string[];
    outline: string[];
    brief: BlogStudioBrief;
    draftBrief?: BlogStudioDraftBrief;
    faqItems?: BlogStudioFaqItem[];
    searchIntent?: BlogStudioSearchIntent;
    contentType?: BlogStudioContentType;
    contentClusterId?: string;
    parentTopicSlug?: string;
    internalLinks?: BlogStudioPostInternalLink[];
    featuredImagePrompt?: string;
    researchNotes?: string[];
    externalSources?: BlogStudioExternalSource[];
    generationDiagnostics?: BlogStudioGenerationDiagnostics;
    seoScore?: number;
    wordCount?: number;
    createdBy: string;
    updatedBy?: string;
    approvedBy?: string;
    scheduledFor?: string;
    publishedAt?: string;
    publishedEntryId?: string;
    publishedEntrySlug?: string;
    publishedTargetUrl?: string;
    deliveryStatus?: BlogStudioWebhookStatus;
    deliveryError?: string;
    deliveryAttemptedAt?: string;
    publishedMetadataValidatedAt?: string;
    lastRefreshedAt?: string;
    refreshCount?: number;
    pagePerformanceScore?: number;
    pagePerformanceCheckedAt?: string;
    queueReadiness?: BlogStudioQueueReadiness;
    createdAt: string;
    updatedAt: string;
};

export type BlogStudioRunStep = {
    key: string;
    label: string;
    status: BlogStudioRunStepStatus;
    notes?: string;
    startedAt?: string;
    completedAt?: string;
    input?: Record<string, unknown>;
    process?: {
        durationMs?: number;
        details?: Record<string, unknown>;
    };
    output?: {
        summary?: string;
        data?: unknown;
        metrics?: Record<string, unknown>;
        rawText?: string;
    };
    errors?: string[];
};

export type BlogStudioRun = {
    id: string;
    agencyId: string;
    postId?: string;
    scheduleId?: string;
    sourceMode: BlogStudioInputMode;
    status: BlogStudioRunStatus;
    selectedTopic?: string;
    summary?: string;
    steps: BlogStudioRunStep[];
    createdBy: string;
    startedAt?: string;
    completedAt?: string;
    createdAt: string;
    updatedAt: string;
};

export type BlogStudioBrandVoiceSettings = {
    tone: string;
    audience: string;
    ctaStyle: string;
    bannedTerms: string[];
};

export type BlogStudioSeoSettings = {
    minWords: number;
    maxWords: number;
    defaultLanguage: string;
    defaultLocation: string;
    requireInternalLinks: boolean;
    requireMetaDescription: boolean;
    requireSeoReview: boolean;
};

export type BlogStudioSeoAuditSeverity = "required" | "recommended";

export type BlogStudioCannibalizationRisk = "low" | "medium" | "high";

export type BlogStudioCannibalizationMatchSource = "ai-blogger" | "external-published";

export type BlogStudioCannibalizationMatch = {
    source: BlogStudioCannibalizationMatchSource;
    slug: string;
    title: string;
    href: string;
    statusLabel: string;
    reason: string;
    similarityScore: number;
    primaryKeyword?: string;
    searchIntent?: BlogStudioSearchIntent;
    publishedAt?: string;
};

export type BlogStudioCannibalizationReport = {
    risk: BlogStudioCannibalizationRisk;
    shouldBlock: boolean;
    score: number;
    summary: string;
    matches: BlogStudioCannibalizationMatch[];
};

export type BlogStudioSeoAuditCheck = {
    key: string;
    label: string;
    passed: boolean;
    severity: BlogStudioSeoAuditSeverity;
    detail?: string;
};

export type BlogStudioSeoAudit = {
    score: number;
    checks: BlogStudioSeoAuditCheck[];
    blockers: string[];
    suggestions: string[];
    requiredChecksPassed: boolean;
    cannibalization?: BlogStudioCannibalizationReport;
    counts: {
        passed: number;
        total: number;
        requiredPassed: number;
        requiredTotal: number;
        recommendedPassed: number;
        recommendedTotal: number;
    };
};

export type BlogStudioQueueReadiness = {
    auditScore: number;
    blockers: string[];
    blockersCount: number;
    readyForApproval: boolean;
    hasGroundedSources: boolean;
    groundedSourceCount: number;
    highTrustSourceCount: number;
    hasFaqPack: boolean;
    hasInternalLinks: boolean;
    structuredInternalLinkCount: number;
    internalLinkHealth: BlogStudioInternalLinkHealth;
    canonicalReady: boolean;
    metaDescriptionReady: boolean;
    featuredImageAltReady: boolean;
    schemaReady: boolean;
    needsAttention: boolean;
};

export type BlogStudioPublishBlockerCategory =
    | "metadata"
    | "content"
    | "image"
    | "internal-links"
    | "schema"
    | "business-fit"
    | "cannibalization"
    | "claims"
    | "tone"
    | "seo-score"
    | "approval";

export type BlogStudioPublishBlocker = {
    category: BlogStudioPublishBlockerCategory;
    severity: "blocker" | "warning";
    message: string;
    fixHint: string;
};

export type BlogStudioPublishValidation = {
    canPublish: boolean;
    blockers: BlogStudioPublishBlocker[];
    warnings: BlogStudioPublishBlocker[];
    blockersCount: number;
    warningsCount: number;
    auditScore: number;
    summary: string;
    validatedAt: string;
};

export type BlogStudioBlockerResolutionKind =
    | "ai-fixable"
    | "human-required"
    | "system-required";

export type BlogStudioBlockerResolutionSource =
    | "seo-audit"
    | "publish-validation"
    | "workflow";

export type BlogStudioBlockerResolutionCategory =
    | BlogStudioPublishBlockerCategory
    | "workflow";

export type BlogStudioResolvedBlocker = {
    key: string;
    category: BlogStudioBlockerResolutionCategory;
    source: BlogStudioBlockerResolutionSource;
    resolutionKind: BlogStudioBlockerResolutionKind;
    message: string;
    fixHint: string;
};

export type BlogStudioBlockerResolutionPreview = {
    blockers: BlogStudioResolvedBlocker[];
    aiFixable: BlogStudioResolvedBlocker[];
    humanRequired: BlogStudioResolvedBlocker[];
    systemRequired: BlogStudioResolvedBlocker[];
    aiFixableCount: number;
    humanRequiredCount: number;
    systemRequiredCount: number;
    hasAiFixable: boolean;
    hasBlockingIssues: boolean;
};

export type BlogStudioBlockerResolutionResult = {
    post: BlogStudioPost;
    changedFields: string[];
    blockersBefore: BlogStudioBlockerResolutionPreview;
    blockersAfter: BlogStudioBlockerResolutionPreview;
    aiFixed: BlogStudioResolvedBlocker[];
    remainingHuman: BlogStudioResolvedBlocker[];
    remainingSystem: BlogStudioResolvedBlocker[];
    summary: string;
};

export type BlogStudioInternalLinkSuggestionSource = "service" | "page" | "blog";

export type BlogStudioInternalLinkRelationType =
    | "cluster-parent"
    | "cluster-supporting"
    | "pillar-parent"
    | "pillar-supporting"
    | "service-authority"
    | "related-reading"
    | "site-supporting";

export type BlogStudioInternalLinkPlacement =
    | "introduction"
    | "body"
    | "faq"
    | "conclusion";

export type BlogStudioPostInternalLink = {
    href: string;
    title: string;
    source: BlogStudioInternalLinkSuggestionSource;
    anchorText: string;
    relationType: BlogStudioInternalLinkRelationType;
    score: number;
    matchReason: string;
    clusterAligned: boolean;
    suggestedSectionHeading?: string;
    targetPostSlug?: string;
    targetClusterId?: string;
    targetParentTopicSlug?: string;
    placement?: BlogStudioInternalLinkPlacement;
};

export type BlogStudioInternalLinkHealthStatus = "orphan" | "weak" | "connected";

export type BlogStudioInternalLinkHealth = {
    status: BlogStudioInternalLinkHealthStatus;
    label: string;
    summary: string;
    outboundCount: number;
    inboundCount: number;
    acceptedCount: number;
    clusterAlignedCount: number;
    relatedPostCount: number;
};

export type BlogStudioInternalLinkSuggestion = {
    id: string;
    title: string;
    href: string;
    source: BlogStudioInternalLinkSuggestionSource;
    description: string;
    suggestedAnchor: string;
    matchReason: string;
    score: number;
    relationType: BlogStudioInternalLinkRelationType;
    clusterAligned: boolean;
    suggestedSectionHeading?: string;
    targetPostSlug?: string;
    targetClusterId?: string;
    targetParentTopicSlug?: string;
};

export type BlogStudioPublishingSettings = {
    defaultTarget: BlogStudioTarget;
    requireApproval: boolean;
    autoSchedule: boolean;
    publishMode: BlogStudioPublishMode;
};

export type BlogStudioNotificationSettings = {
    scheduleFailureEmail: boolean;
    schedulePausedEmail: boolean;
    notificationEmails: string[];
};

export type BlogStudioSettings = {
    agencyId: string;
    brandVoice: BlogStudioBrandVoiceSettings;
    seo: BlogStudioSeoSettings;
    publishing: BlogStudioPublishingSettings;
    notifications?: BlogStudioNotificationSettings;
    searchConsoleOAuth?: {
        enabled: boolean;
        selectedDomain?: string;
        refreshToken?: string;
        accessToken?: string;
        accessTokenExpiresAt?: number;
        lastTokenRefreshAt?: number;
        authStatus: "not-connected" | "configured" | "token-expired";
        authorizedAt?: string;
        oauthProvider: "google";
    };
    createdBy: string;
    updatedBy?: string;
    createdAt: string;
    updatedAt: string;
};

export type BlogStudioScheduleLastRunStatus = "completed" | "failed";

export type BlogStudioSchedule = {
    id: string;
    agencyId: string;
    name: string;
    status: BlogStudioScheduleStatus;
    cadence: BlogStudioScheduleCadence;
    timezone: string;
    target: BlogStudioTarget;
    brief: BlogStudioBrief;
    createDraftOnly: boolean;
    nextRunAt?: string;
    lastRunAt?: string;
    consecutiveFailures: number;
    maxRetries: number;
    lastRunStatus?: BlogStudioScheduleLastRunStatus;
    lastRunSummary?: string;
    lockedUntil?: string;
    lockedBy?: string;
    createdBy: string;
    updatedBy?: string;
    createdAt: string;
    updatedAt: string;
};

export type BlogStudioSitePriorityPageCategory =
    | "service"
    | "product"
    | "collection"
    | "category"
    | "brand"
    | "solution"
    | "case-study"
    | "pricing"
    | "industry"
    | "blog"
    | "faq"
    | "about"
    | "contact"
    | "home"
    | "general";

export type BlogStudioSitePriorityPage = {
    path: string;
    url: string;
    title: string;
    description: string;
    excerpt: string;
    highlights: string[];
    serviceSignals: string[];
    proofSignals: string[];
    ctaPatterns: string[];
    pageCategory: BlogStudioSitePriorityPageCategory;
    pageScore: number;
};

export type BlogStudioSiteSnapshot = {
    id: string;
    agencyId: string;
    sourceUrl: string;
    normalizedUrl: string;
    pageCount: number;
    pageTitles: string[];
    topicHints: string[];
    faqQuestions: string[];
    priorityPaths: string[];
    priorityPages?: BlogStudioSitePriorityPage[];
    serviceSignals: string[];
    ctaPatterns: string[];
    proofSignals: string[];
    summary: string;
    refreshedAt: string;
    createdAt: string;
    updatedAt: string;
};

export type BlogStudioSearchIntent =
    | "informational"
    | "commercial"
    | "navigational"
    | "transactional";

export type BlogStudioSerpSnapshot = {
    id: string;
    agencyId: string;
    query: string;
    normalizedQuery: string;
    location: string;
    device: "desktop" | "mobile";
    provider: "serpapi";
    intent: BlogStudioSearchIntent;
    topResultTitles: string[];
    topResultUrls: string[];
    competitorDomains: string[];
    peopleAlsoAsk: string[];
    relatedSearches: string[];
    headingPatterns: string[];
    contentGaps: string[];
    featuredSnippetStyle: string;
    rankingDifficulty: string;
    dominantContentFormat: string;
    titleAnglePatterns: string[];
    sectionGapAnalysis: string[];
    summary: string;
    refreshedAt: string;
    createdAt: string;
    updatedAt: string;
};

export type BlogStudioGroundedResearchSnapshot = {
    id: string;
    agencyId: string;
    query: string;
    normalizedQuery: string;
    location: string;
    sources: BlogStudioExternalSource[];
    summary: string;
    refreshedAt: string;
    createdAt: string;
    updatedAt: string;
};

export type BlogStudioPerformanceQuerySnapshot = {
    query: string;
    clicks: number;
    impressions: number;
    ctr: number;
    position: number;
};

export type BlogStudioPerformanceBreakdownSnapshot = {
    label: string;
    clicks: number;
    impressions: number;
    ctr: number;
    position: number;
};

export type BlogStudioPerformanceSnapshot = {
    id: string;
    agencyId: string;
    postId: string;
    postSlug: string;
    pageUrl: string;
    source: "search-console";
    startDate: string;
    endDate: string;
    clicks: number;
    impressions: number;
    ctr: number;
    position: number;
    topQueries: BlogStudioPerformanceQuerySnapshot[];
    topCountries: BlogStudioPerformanceBreakdownSnapshot[];
    topDevices: BlogStudioPerformanceBreakdownSnapshot[];
    refreshedAt: string;
    createdAt: string;
    updatedAt: string;
};

export type BlogStudioPerformanceSyncRunStatus = "synced" | "skipped" | "failed";

export type BlogStudioPerformanceSyncTrigger = "manual" | "scheduled";

export type BlogStudioPerformanceSyncRun = {
    id: string;
    agencyId: string;
    status: BlogStudioPerformanceSyncRunStatus;
    trigger: BlogStudioPerformanceSyncTrigger;
    summary: string;
    postsEvaluated: number;
    snapshotsStored: number;
    startedAt: string;
    completedAt: string;
    createdAt: string;
    updatedAt: string;
};

export type BlogStudioPerformanceSyncStatus = {
    enabled: boolean;
    hasValidConfig: boolean;
    authStatus: "not-connected" | "configured" | "token-expired";
    propertyUrl: string;
    syncFrequencyHours: number;
    lookbackDays: number;
    publishedPosts: number;
    latestSnapshotAt: string | null;
    lastRun: BlogStudioPerformanceSyncRun | null;
    lastSuccessAt: string | null;
    lastFailureAt: string | null;
    lastFailureSummary: string;
    stale: boolean;
    needsAttention: boolean;
};

export type BlogStudioRefreshOpportunity = {
    needsRefresh: boolean;
    score: number;
    urgency: "critical" | "high" | "medium" | "low";
    summary: string;
    reasons: string[];
    signalKeys: Array<
        | "low-ctr"
        | "position-opportunity"
        | "visibility-decay"
        | "stale-content"
        | "no-recent-sync"
        | "no-snapshot"
    >;
    clickChangePct?: number;
    impressionChangePct?: number;
    ctrDelta?: number;
    positionDelta?: number;
    snapshotAgeHours?: number;
    publishedAgeDays?: number;
};

export type BlogStudioPostPerformanceReport = {
    isPublished: boolean;
    hasSearchConsoleConfig: boolean;
    syncStatus: BlogStudioPerformanceSyncStatus;
    latestSnapshot: BlogStudioPerformanceSnapshot | null;
    previousSnapshot: BlogStudioPerformanceSnapshot | null;
    history: BlogStudioPerformanceSnapshot[];
    refreshOpportunity: BlogStudioRefreshOpportunity;
};

export type BlogStudioRefreshQueueItem = {
    post: BlogStudioPost;
    latestSnapshot: BlogStudioPerformanceSnapshot | null;
    previousSnapshot: BlogStudioPerformanceSnapshot | null;
    syncCoverage: "current" | "stale" | "missing";
    refreshOpportunity: BlogStudioRefreshOpportunity;
};

export type BlogStudioRefreshQueueSummary = {
    criticalCount: number;
    highCount: number;
    mediumCount: number;
    lowCount: number;
    lowCtrCount: number;
    positionOpportunityCount: number;
    visibilityDecayCount: number;
    staleContentCount: number;
    noRecentSyncCount: number;
    noSnapshotCount: number;
    averageScore: number;
};

export type BlogStudioRefreshOutcomeBucket = "improved" | "declined" | "stable";

export type BlogStudioRefreshOutcomeItem = {
    postId: string;
    postSlug: string;
    postTitle: string;
    bucket: BlogStudioRefreshOutcomeBucket;
    clicksDelta: number;
    clicksDeltaPct: number;
    impressionsDelta: number;
    impressionsDeltaPct: number;
    ctrDelta: number;
    positionDelta: number;
    lastSyncedAt: string;
};

export type BlogStudioRefreshReporting = {
    improvedCount: number;
    declinedCount: number;
    stableCount: number;
    avgClicksDeltaPct: number;
    avgCtrDelta: number;
    avgPositionDelta: number;
    topMovers: BlogStudioRefreshOutcomeItem[];
};

export type BlogStudioFetchTrendsSource =
    | "live-google-trends"
    | "live-google-trends-fallback-key"
    | "ai-only-discovery"
    | "ai-fallback-after-live-failure";

export type BlogStudioGenerationStepInsight = {
    key: string;
    label: string;
    status: BlogStudioRunStepStatus;
    notes?: string;
};

export type BlogStudioGenerationKeywordPlan = {
    primaryKeyword?: string;
    secondaryKeywords: string[];
    metaKeywords: string[];
    sectionAngles: string[];
};

export type BlogStudioGenerationDiagnostics = {
    selectedTopic?: string;
    fetchTrendsSource: BlogStudioFetchTrendsSource;
    fetchTrendsLabel: string;
    fetchTrendsNotes: string;
    businessFitSummary?: string;
    businessFitScore?: number;
    businessFitWarnings: string[];
    keywordPlan?: BlogStudioGenerationKeywordPlan;
    scorecard?: BlogStudioGenerationScorecard;
    sourceUsage?: BlogStudioGenerationSourceUsage;
    steps: BlogStudioGenerationStepInsight[];
};

export type BlogStudioGenerateDraftResult = {
    post: BlogStudioPost;
    diagnostics: BlogStudioGenerationDiagnostics;
};

export type BlogStudioPipelineCompletionResult = {
    post: Pick<BlogStudioPost, "id" | "slug" | "title" | "status" | "wordCount" | "seoScore">;
    diagnostics: BlogStudioGenerationDiagnostics;
};

export type BlogStudioOverviewMetrics = {
    draftsInQueue: number;
    readyToReview: number;
    scheduledRuns: number;
    averageSeoScore: number;
    totalPosts: number;
    publishedPosts: number;
    refreshCandidates: number;
};

export type BlogStudioRefreshQueue = {
    items: BlogStudioRefreshQueueItem[];
    totalCandidates: number;
    summary: BlogStudioRefreshQueueSummary;
    reporting: BlogStudioRefreshReporting;
};

export type BlogStudioPostSortBy = "updatedAt" | "createdAt" | "seoScore" | "wordCount" | "title";

export type BlogStudioPostSortOrder = "asc" | "desc";

export type BlogStudioPostsPage = {
    posts: BlogStudioPost[];
    refreshQueue: BlogStudioRefreshQueue;
    filter: BlogStudioPostListFilter;
    query: string;
    page: number;
    pageSize: number;
    total: number;
    totalCount: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
    targetType?: string;
    sourceMode?: string;
    searchIntent?: string;
    contentType?: string;
    needsAttention?: boolean;
    refreshReason?: string;
    refreshSort?: string;
    sortBy: BlogStudioPostSortBy;
    sortOrder: BlogStudioPostSortOrder;
};

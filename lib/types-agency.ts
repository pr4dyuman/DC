export type AgencyPlan = "free" | "starter" | "pro" | "enterprise";
export type AgencyStatus = "active" | "suspended" | "trial" | "cancelled";

export type AgencyLimits = {
    maxUsers: number;
    maxProjects: number;
    maxClients: number;
    maxStorage: number;
    maxMonthlyInvoices: number;
    aiEnabled: boolean;
    customBranding: boolean;
};

export type AgencyFeatures = {
    aiAssistant: boolean;
    aiBlogger: boolean;
    advancedReporting: boolean;
    apiAccess: boolean;
    whiteLabel: boolean;
    customDomain: boolean;
    ssoEnabled: boolean;
};

export type AIProvider = "gemini" | "openai" | "nvidia" | "github" | "groq";

export type AIFeatureConfig = {
    provider: AIProvider;
    apiKey: string;
    model: string;
    customModelId?: string;
};

export type AIBloggerStageKey =
    | "extractKeywords"
    | "research"
    | "seoAnalysis"
    | "writeBlog"
    | "generateImage";

export type AIBloggerStageConfig = {
    provider: AIProvider;
    apiKey?: string;
    fallbackApiKey?: string;
    model: string;
    customModelId?: string;
    systemPrompt: string;
};

export type AIBloggerTrendProvider = "serpapi";
export type AIBloggerWebsiteCrawlProvider = "basic-fetch";
export type AIBloggerSerpProvider = "serpapi";
export type AIBloggerSerpDevice = "desktop" | "mobile";
export type AIBloggerGroundedResearchTrustPreference = "balanced" | "high-only";
export type AIBloggerGroundedResearchFreshnessPreference = "balanced" | "recent-first" | "evergreen-ok";
export type AIBloggerGroundedResearchSourceType =
    | "government"
    | "education"
    | "official"
    | "industry"
    | "competitor"
    | "news"
    | "reference";
export type AIBloggerPagePerformanceProvider = "pagespeed";
export type AIBloggerPagePerformanceStrategy = "mobile" | "desktop" | "both";
export type AIBloggerSearchConsoleAuthStatus = "not-connected" | "configured" | "token-expired";
export type AIBloggerImageGenerationProvider = "openai" | "gemini";
export type AIBloggerImageGenerationSize = "1024x1024" | "1792x1024" | "1024x1792";
export type AIBloggerImageGenerationQuality = "standard" | "hd";
export type AIBloggerImageGenerationStyle = "natural" | "vivid";

export type AIBloggerTrendsConfig = {
    enabled: boolean;
    provider: AIBloggerTrendProvider;
    apiKey?: string;
    fallbackApiKey?: string;
    fallbackEnabled: boolean;
    fallbackToAi: boolean;
    defaultLocation: string;
    trendFirstMode: boolean;
    maxTrendRequestsPerBlog: number;
    trendScanTimeBudgetMs: number;
    minimumTrendFitScore: number;
    minimumTrendScore: number;
};

export type AIBloggerWebsiteCrawlConfig = {
    enabled: boolean;
    provider: AIBloggerWebsiteCrawlProvider;
    maxPages: number;
    timeoutMs: number;
    refreshWindowHours: number;
    allowedPaths: string[];
    blockedPaths: string[];
};

export type AIBloggerSerpConfig = {
    enabled: boolean;
    provider: AIBloggerSerpProvider;
    apiKey?: string;
    fallbackApiKey?: string;
    fallbackEnabled: boolean;
    defaultLocation: string;
    device: AIBloggerSerpDevice;
    maxCompetitors: number;
    refreshWindowHours: number;
};

export type AIBloggerGroundedResearchConfig = {
    enabled: boolean;
    maxSources: number;
    trustPreference: AIBloggerGroundedResearchTrustPreference;
    freshnessPreference: AIBloggerGroundedResearchFreshnessPreference;
    allowedSourceTypes: AIBloggerGroundedResearchSourceType[];
    blockedDomains: string[];
    refreshWindowHours: number;
};

export type AIBloggerSearchConsoleConfig = {
    enabled: boolean;
    propertyUrl: string;
    credentialsJson?: string;
    authStatus: AIBloggerSearchConsoleAuthStatus;
    syncFrequencyHours: number;
    lookbackDays: number;
};

export type AIBloggerPagePerformanceConfig = {
    enabled: boolean;
    provider: AIBloggerPagePerformanceProvider;
    apiKey?: string;
    strategy: AIBloggerPagePerformanceStrategy;
    performanceThreshold: number;
    refreshWindowHours: number;
};

export type AIBloggerImageGenerationConfig = {
    enabled: boolean;
    provider: AIBloggerImageGenerationProvider;
    apiKey?: string;
    fallbackApiKey?: string;
    model: string;
    customModelId?: string;
    size: AIBloggerImageGenerationSize;
    quality: AIBloggerImageGenerationQuality;
    style: AIBloggerImageGenerationStyle;
};

export type AIBloggerPublishRulesConfig = {
    requireInternalLinks: boolean;
    requireMetaDescription: boolean;
    requireFaqForInformational: boolean;
    requireImageAltText: boolean;
    requireManualApproval: boolean;
    minimumSeoScore: number;
    requireCanonicalUrl: boolean;
    requireSchemaMarkup: boolean;
    aiReviewPolicy: {
        enableFinalChecker: boolean;
        apiKey?: string;
        model?: string;
        customModelId?: string;
        autoFixStructuralIssues: boolean;
        autoFixToneMismatch: boolean;
        flagWeakBusinessFit: boolean;
        flagWeakCtaAlignment: boolean;
        softenQuestionableClaims: boolean;
        flagSoftCannibalization: boolean;
        requireHumanReviewForHighRiskClaims: boolean;
        requireHumanReviewForHighRiskCannibalization: boolean;
        requireGroundedSourcesForClaims: boolean;
    };
};
export type AIBloggerAuthorConfig = {
    enabled: boolean;
    name: string;
    url?: string;
    bio?: string;
    socialProfiles?: string[];
    imageUrl?: string;
};

export type AIBloggerEntityModelingConfig = {
    enabled: boolean;
    organizationName?: string;
    organizationUrl?: string;
    organizationLogoUrl?: string;
    serviceNames?: string[];
    enableArticleSchema: boolean;
    enableOrganizationSchema: boolean;
    enableFaqSchema: boolean;
    enableBreadcrumbSchema: boolean;
};

export type AIBloggerConfig = {
    fallbackEnabled: boolean;
    trends: AIBloggerTrendsConfig;
    crawl: AIBloggerWebsiteCrawlConfig;
    serp: AIBloggerSerpConfig;
    groundedResearch: AIBloggerGroundedResearchConfig;
    searchConsole: AIBloggerSearchConsoleConfig;
    pagePerformance: AIBloggerPagePerformanceConfig;
    imageGeneration: AIBloggerImageGenerationConfig;
    publishRules: AIBloggerPublishRulesConfig;
    author: AIBloggerAuthorConfig;
    entityModeling: AIBloggerEntityModelingConfig;
    extractKeywords: AIBloggerStageConfig;
    research: AIBloggerStageConfig;
    seoAnalysis: AIBloggerStageConfig;
    writeBlog: AIBloggerStageConfig;
    generateImage: AIBloggerStageConfig;
    updatedAt?: string;
    updatedBy?: string;
};

export type AIConfig = {
    provider: AIProvider;
    apiKey: string;
    model: string;          // default / fallback model
    customModelId?: string; // used when model === "custom"
    // Per-feature full configuration overrides
    chatConfig?: AIFeatureConfig;
    agentConfig?: AIFeatureConfig;
    taskExplainConfig?: AIFeatureConfig;
    hourEstimateConfig?: AIFeatureConfig;
    taskChatbotConfig?: AIFeatureConfig;
    heavyTasksConfig?: AIFeatureConfig; // Admin-only heavy tasks model override
};

export type AIPermissions = {
    canPayroll: boolean;
    canManageInvoices: boolean;
    canRefund: boolean;
    canCreateEmployee: boolean;
    canDelete: boolean;
};

export const DEFAULT_AI_PERMISSIONS: AIPermissions = {
    canPayroll: false,
    canManageInvoices: false,
    canRefund: false,
    canCreateEmployee: false,
    canDelete: false,
};

export type AgencyUsage = {
    users: number;
    projects: number;
    clients: number;
    storage: number;
    monthlyInvoices: number;
};

export type Agency = {
    id: string;
    name: string;
    slug: string;
    domain?: string;
    logo?: string;
    primaryColor?: string;
    secondaryColor?: string;
    status: AgencyStatus;
    plan: AgencyPlan;
    trialEndsAt?: string;
    planExpiresAt?: string;
    planDuration?: "monthly" | "3months" | "6months" | "yearly" | "lifetime";
    limits: AgencyLimits;
    usage: AgencyUsage;
    billing: {
        subscriptionId?: string;
        stripeCustomerId?: string;
        subscriptionStatus?: "active" | "past_due" | "canceled" | "unpaid" | "trialing" | "incomplete" | "incomplete_expired" | "paused";
        currentPeriodEnd?: string;
        cancelAtPeriodEnd?: boolean;
        billingEmail: string;
        billingAddress?: string;
        taxId?: string;
    };
    settings: {
        systemName: string;
        timezone: string;
        currency: string;
        dateFormat: string;
        allowClientRegistration: boolean;
        requireEmailVerification: boolean;
        enableTwoFactor: boolean;
        emailNotificationsEnabled: boolean;
        emailCategories?: {
            accountCreation?: boolean;
            invoicePayment?: boolean;
            salaryPayroll?: boolean;
            refund?: boolean;
            projectUpdates?: boolean;
            taskUpdates?: boolean;
            leaveManagement?: boolean;
            documentApproval?: boolean;
            aiBloggerAlerts?: boolean;
            taskEmailPriorities?: {
                high?: boolean;
                medium?: boolean;
                low?: boolean;
            };
            taskEmailEvents?: {
                taskCreated?: { enabled?: boolean; notifyAssignee?: boolean; notifyClient?: boolean };
                taskInProgress?: { enabled?: boolean; notifyAssignee?: boolean; notifyClient?: boolean };
                taskDone?: { enabled?: boolean; notifyAssignee?: boolean; notifyClient?: boolean };
            };
        };
    };
    createdAt: string;
    createdBy: string;
    updatedAt?: string;
    lastActivityAt?: string;
    aiConfig?: AIConfig;
    aiBloggerConfig?: AIBloggerConfig;
    aiPermissions?: AIPermissions;
    features: AgencyFeatures;
};

export type SuperAdmin = {
    id: string;
    name: string;
    email: string;
    password: string;
    role: "superadmin";
    avatar?: string;
    phone?: string;
    timezone?: string;
    twoFactorEnabled?: boolean;
    twoFactorSecret?: string;
    createdAt: string;
    lastLoginAt?: string;
    permissions: {
        canCreateAgency: boolean;
        canDeleteAgency: boolean;
        canSuspendAgency: boolean;
        canViewBilling: boolean;
        canManagePlans: boolean;
    };
};

export const AGENCY_PLANS: Record<AgencyPlan, { limits: AgencyLimits; features: AgencyFeatures }> = {
    free: {
        limits: {
            maxUsers: 3,
            maxProjects: 5,
            maxClients: 10,
            maxStorage: 100,
            maxMonthlyInvoices: 20,
            aiEnabled: false,
            customBranding: false,
        },
        features: {
            aiAssistant: false,
            aiBlogger: false,
            advancedReporting: false,
            apiAccess: false,
            whiteLabel: false,
            customDomain: false,
            ssoEnabled: false,
        },
    },
    starter: {
        limits: {
            maxUsers: 10,
            maxProjects: 50,
            maxClients: 100,
            maxStorage: 1024,
            maxMonthlyInvoices: 100,
            aiEnabled: true,
            customBranding: false,
        },
        features: {
            aiAssistant: true,
            aiBlogger: false,
            advancedReporting: true,
            apiAccess: false,
            whiteLabel: false,
            customDomain: false,
            ssoEnabled: false,
        },
    },
    pro: {
        limits: {
            maxUsers: 50,
            maxProjects: 500,
            maxClients: 1000,
            maxStorage: 10240,
            maxMonthlyInvoices: 1000,
            aiEnabled: true,
            customBranding: true,
        },
        features: {
            aiAssistant: true,
            aiBlogger: true,
            advancedReporting: true,
            apiAccess: true,
            whiteLabel: true,
            customDomain: false,
            ssoEnabled: false,
        },
    },
    enterprise: {
        limits: {
            maxUsers: -1,
            maxProjects: -1,
            maxClients: -1,
            maxStorage: -1,
            maxMonthlyInvoices: -1,
            aiEnabled: true,
            customBranding: true,
        },
        features: {
            aiAssistant: true,
            aiBlogger: true,
            advancedReporting: true,
            apiAccess: true,
            whiteLabel: true,
            customDomain: true,
            ssoEnabled: true,
        },
    },
};

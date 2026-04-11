import mongoose, { Model, Schema } from "mongoose";
import { Agency, SuperAdmin } from "./types";

const AgencyLimitsSchema = new Schema({
    maxUsers: { type: Number, required: true },
    maxProjects: { type: Number, required: true },
    maxClients: { type: Number, required: true },
    maxStorage: { type: Number, required: true },
    maxMonthlyInvoices: { type: Number, required: true },
    aiEnabled: { type: Boolean, required: true },
    customBranding: { type: Boolean, required: true },
}, { _id: false });

const AgencyUsageSchema = new Schema({
    users: { type: Number, default: 0 },
    projects: { type: Number, default: 0 },
    clients: { type: Number, default: 0 },
    storage: { type: Number, default: 0 },
    monthlyInvoices: { type: Number, default: 0 },
}, { _id: false });

const TaskEmailEventSchema = new Schema({
    enabled: { type: Boolean, default: false },
    notifyAssignee: { type: Boolean, default: true },
    notifyClient: { type: Boolean, default: false },
}, { _id: false });

const TaskEmailEventsSchema = new Schema({
    taskCreated: { type: TaskEmailEventSchema, default: () => ({ enabled: true, notifyAssignee: true, notifyClient: false }) },
    taskInProgress: { type: TaskEmailEventSchema, default: () => ({ enabled: false, notifyAssignee: true, notifyClient: false }) },
    taskDone: { type: TaskEmailEventSchema, default: () => ({ enabled: false, notifyAssignee: true, notifyClient: true }) },
}, { _id: false });

const EmailCategoriesSchema = new Schema({
    accountCreation: { type: Boolean, default: true },
    invoicePayment: { type: Boolean, default: true },
    salaryPayroll: { type: Boolean, default: true },
    refund: { type: Boolean, default: true },
    projectUpdates: { type: Boolean, default: false },
    taskUpdates: { type: Boolean, default: false },
    leaveManagement: { type: Boolean, default: false },
    documentApproval: { type: Boolean, default: false },
    taskEmailPriorities: { type: Schema.Types.Mixed, default: undefined },
    taskEmailEvents: { type: TaskEmailEventsSchema, default: () => ({}) },
}, { _id: false });

const AgencySettingsSchema = new Schema({
    systemName: { type: String, required: true },
    timezone: { type: String, default: "UTC" },
    currency: { type: String, default: "USD" },
    dateFormat: { type: String, default: "MM/DD/YYYY" },
    allowClientRegistration: { type: Boolean, default: false },
    requireEmailVerification: { type: Boolean, default: false },
    enableTwoFactor: { type: Boolean, default: false },
    emailNotificationsEnabled: { type: Boolean, default: true },
    emailCategories: { type: EmailCategoriesSchema, default: () => ({}) },
}, { _id: false });

const AgencyFeaturesSchema = new Schema({
    aiAssistant: { type: Boolean, default: false },
    aiBlogger: { type: Boolean, default: false },
    advancedReporting: { type: Boolean, default: false },
    apiAccess: { type: Boolean, default: false },
    whiteLabel: { type: Boolean, default: false },
    customDomain: { type: Boolean, default: false },
    ssoEnabled: { type: Boolean, default: false },
}, { _id: false });

const AIFeatureConfigSchema = new Schema({
    provider: { type: String, enum: ["gemini", "openai", "nvidia", "github", "groq"], required: true },
    apiKey: { type: String },
    model: { type: String, required: true },
    customModelId: { type: String },
}, { _id: false });

const AIConfigSchema = new Schema({
    provider: { type: String, enum: ["gemini", "openai", "nvidia", "github", "groq"], required: true },
    apiKey: { type: String, required: true },
    model: { type: String, required: true },
    customModelId: { type: String },
    chatConfig: { type: AIFeatureConfigSchema },
    agentConfig: { type: AIFeatureConfigSchema },
    taskExplainConfig: { type: AIFeatureConfigSchema },
    hourEstimateConfig: { type: AIFeatureConfigSchema },
    taskChatbotConfig: { type: AIFeatureConfigSchema },
    heavyTasksConfig: { type: AIFeatureConfigSchema },
}, { _id: false });

const AIBloggerStageConfigSchema = new Schema({
    provider: { type: String, enum: ["gemini", "openai", "nvidia", "github", "groq"], required: true },
    apiKey: { type: String, default: "" },
    fallbackApiKey: { type: String, default: "" },
    model: { type: String, required: true },
    customModelId: { type: String },
    systemPrompt: { type: String, required: true },
}, { _id: false });

const AIBloggerTrendsConfigSchema = new Schema({
    enabled: { type: Boolean, default: false },
    provider: { type: String, enum: ["serpapi"], default: "serpapi" },
    apiKey: { type: String, default: "" },
    fallbackApiKey: { type: String, default: "" },
    fallbackEnabled: { type: Boolean, default: true },
    fallbackToAi: { type: Boolean, default: true },
    defaultLocation: { type: String, default: "us" },
}, { _id: false });

const AIBloggerWebsiteCrawlConfigSchema = new Schema({
    enabled: { type: Boolean, default: true },
    provider: { type: String, enum: ["basic-fetch"], default: "basic-fetch" },
    maxPages: { type: Number, default: 8 },
    timeoutMs: { type: Number, default: 8000 },
    refreshWindowHours: { type: Number, default: 24 },
    allowedPaths: [{ type: String }],
    blockedPaths: [{ type: String }],
}, { _id: false });

const AIBloggerSerpConfigSchema = new Schema({
    enabled: { type: Boolean, default: true },
    provider: { type: String, enum: ["serpapi"], default: "serpapi" },
    apiKey: { type: String, default: "" },
    fallbackApiKey: { type: String, default: "" },
    fallbackEnabled: { type: Boolean, default: true },
    defaultLocation: { type: String, default: "us" },
    device: { type: String, enum: ["desktop", "mobile"], default: "desktop" },
    maxCompetitors: { type: Number, default: 5 },
    refreshWindowHours: { type: Number, default: 24 },
}, { _id: false });

const AIBloggerGroundedResearchConfigSchema = new Schema({
    enabled: { type: Boolean, default: true },
    maxSources: { type: Number, default: 5 },
    trustPreference: { type: String, enum: ["balanced", "high-only"], default: "balanced" },
    freshnessPreference: {
        type: String,
        enum: ["balanced", "recent-first", "evergreen-ok"],
        default: "balanced",
    },
    allowedSourceTypes: [{
        type: String,
        enum: ["government", "education", "official", "industry", "competitor", "news", "reference"],
    }],
    blockedDomains: [{ type: String }],
    refreshWindowHours: { type: Number, default: 24 },
}, { _id: false });

const AIBloggerSearchConsoleConfigSchema = new Schema({
    enabled: { type: Boolean, default: false },
    propertyUrl: { type: String, default: "" },
    credentialsJson: { type: String, default: "" },
    authStatus: { type: String, enum: ["not-connected", "configured"], default: "not-connected" },
    syncFrequencyHours: { type: Number, default: 24 },
    lookbackDays: { type: Number, default: 28 },
}, { _id: false });

const AIBloggerPagePerformanceConfigSchema = new Schema({
    enabled: { type: Boolean, default: false },
    provider: { type: String, enum: ["pagespeed"], default: "pagespeed" },
    apiKey: { type: String, default: "" },
    strategy: { type: String, enum: ["mobile", "desktop", "both"], default: "mobile" },
    performanceThreshold: { type: Number, default: 60 },
    refreshWindowHours: { type: Number, default: 24 * 7 },
}, { _id: false });

const AIBloggerImageGenerationConfigSchema = new Schema({
    enabled: { type: Boolean, default: false },
    provider: { type: String, enum: ["openai", "gemini"], default: "openai" },
    apiKey: { type: String, default: "" },
    fallbackApiKey: { type: String, default: "" },
    model: { type: String, default: "dall-e-3" },
    customModelId: { type: String },
    size: { type: String, enum: ["1024x1024", "1792x1024", "1024x1792"], default: "1792x1024" },
    quality: { type: String, enum: ["standard", "hd"], default: "standard" },
    style: { type: String, enum: ["natural", "vivid"], default: "vivid" },
}, { _id: false });

const AIBloggerPublishRulesConfigSchema = new Schema({
    requireInternalLinks: { type: Boolean, default: true },
    requireMetaDescription: { type: Boolean, default: true },
    requireFaqForInformational: { type: Boolean, default: false },
    requireImageAltText: { type: Boolean, default: true },
    requireManualApproval: { type: Boolean, default: true },
    minimumSeoScore: { type: Number, default: 80 },
    requireCanonicalUrl: { type: Boolean, default: true },
    requireSchemaMarkup: { type: Boolean, default: true },
    aiReviewPolicy: {
        type: new Schema({
            enableFinalChecker: { type: Boolean, default: true },
            apiKey: { type: String, default: "" },
            model: { type: String, default: "" },
            customModelId: { type: String, default: "" },
            autoFixStructuralIssues: { type: Boolean, default: true },
            autoFixToneMismatch: { type: Boolean, default: true },
            flagWeakBusinessFit: { type: Boolean, default: true },
            flagWeakCtaAlignment: { type: Boolean, default: true },
            softenQuestionableClaims: { type: Boolean, default: true },
            flagSoftCannibalization: { type: Boolean, default: true },
            requireHumanReviewForHighRiskClaims: { type: Boolean, default: true },
            requireHumanReviewForHighRiskCannibalization: { type: Boolean, default: true },
            requireGroundedSourcesForClaims: { type: Boolean, default: true },
        }, { _id: false }),
        default: () => ({}),
    },
}, { _id: false });

const AIBloggerConfigSchema = new Schema({
    fallbackEnabled: { type: Boolean, default: true },
    trends: { type: AIBloggerTrendsConfigSchema, default: () => ({}) },
    crawl: { type: AIBloggerWebsiteCrawlConfigSchema, default: () => ({}) },
    serp: { type: AIBloggerSerpConfigSchema, default: () => ({}) },
    groundedResearch: { type: AIBloggerGroundedResearchConfigSchema, default: () => ({}) },
    searchConsole: { type: AIBloggerSearchConsoleConfigSchema, default: () => ({}) },
    pagePerformance: { type: AIBloggerPagePerformanceConfigSchema, default: () => ({}) },
    imageGeneration: { type: AIBloggerImageGenerationConfigSchema, default: () => ({}) },
    publishRules: { type: AIBloggerPublishRulesConfigSchema, default: () => ({}) },
    extractKeywords: { type: AIBloggerStageConfigSchema, required: true },
    research: { type: AIBloggerStageConfigSchema, required: true },
    seoAnalysis: { type: AIBloggerStageConfigSchema, required: true },
    writeBlog: { type: AIBloggerStageConfigSchema, required: true },
    generateImage: { type: AIBloggerStageConfigSchema, required: true },
    updatedAt: { type: String },
    updatedBy: { type: String },
}, { _id: false });

const AIPermissionsSchema = new Schema({
    canPayroll: { type: Boolean, default: false },
    canManageInvoices: { type: Boolean, default: false },
    canRefund: { type: Boolean, default: false },
    canCreateEmployee: { type: Boolean, default: false },
    canDelete: { type: Boolean, default: false },
}, { _id: false });

const AgencySchema = new Schema({
    id: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    slug: { type: String, required: true, unique: true },
    domain: { type: String, sparse: true },
    logo: { type: String },
    primaryColor: { type: String },
    secondaryColor: { type: String },
    status: {
        type: String,
        enum: ["active", "suspended", "trial", "cancelled"],
        required: true,
        default: "trial",
    },
    plan: {
        type: String,
        enum: ["free", "starter", "pro", "enterprise"],
        required: true,
        default: "free",
    },
    planDuration: {
        type: String,
        enum: ["monthly", "3months", "6months", "yearly", "lifetime"],
    },
    planExpiresAt: { type: String },
    trialEndsAt: { type: String },
    limits: { type: AgencyLimitsSchema, required: true },
    usage: { type: AgencyUsageSchema, required: true },
    billing: {
        subscriptionId: { type: String },
        stripeCustomerId: { type: String },
        subscriptionStatus: {
            type: String,
            enum: ["active", "past_due", "canceled", "unpaid", "trialing", "incomplete", "incomplete_expired", "paused"],
        },
        currentPeriodEnd: { type: String },
        cancelAtPeriodEnd: { type: Boolean },
        billingEmail: { type: String, required: true },
        billingAddress: { type: String },
        taxId: { type: String },
    },
    settings: { type: AgencySettingsSchema, required: true },
    createdAt: { type: String, required: true },
    createdBy: { type: String, required: true },
    updatedAt: { type: String },
    lastActivityAt: { type: String },
    features: { type: AgencyFeaturesSchema, required: true },
    aiConfig: { type: AIConfigSchema },
    aiBloggerConfig: { type: AIBloggerConfigSchema },
    aiPermissions: { type: AIPermissionsSchema },
}, { timestamps: true });

AgencySchema.index({ status: 1 });
AgencySchema.index({ plan: 1 });
AgencySchema.index({ createdBy: 1 });

const SuperAdminPermissionsSchema = new Schema({
    canCreateAgency: { type: Boolean, default: true },
    canDeleteAgency: { type: Boolean, default: true },
    canSuspendAgency: { type: Boolean, default: true },
    canViewBilling: { type: Boolean, default: true },
    canManagePlans: { type: Boolean, default: true },
}, { _id: false });

const SuperAdminSchema = new Schema({
    id: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, default: "superadmin" },
    avatar: { type: String },
    phone: { type: String },
    timezone: { type: String },
    twoFactorEnabled: { type: Boolean, default: false },
    twoFactorSecret: { type: String },
    createdAt: { type: String, required: true },
    lastLoginAt: { type: String },
    permissions: { type: SuperAdminPermissionsSchema, required: true },
}, { timestamps: true });

export const AgencyModel = (mongoose.models.Agency as Model<Agency>) || mongoose.model<Agency>("Agency", AgencySchema);
export const SuperAdminModel = (mongoose.models.SuperAdmin as Model<SuperAdmin>) || mongoose.model<SuperAdmin>("SuperAdmin", SuperAdminSchema);

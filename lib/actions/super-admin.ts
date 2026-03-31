"use server";

import { AgencyModel, UserModel, SuperAdminModel, ClientModel, SettingsModel, SystemSettingsModel, connectDB, encryptApiKey } from "../mongodb";
import { Agency, User, AGENCY_PLANS, AIBloggerConfig, AIBloggerStageConfig, AIConfig } from "../types";
import { generateId } from "../utils-server";
import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { sanitizeName, sanitizeString, sanitizePhone, validateEmail, validatePassword, validateStrongPassword } from "../validation";
import { mergeAIBloggerConfig } from "../ai-blogger-config";
import { getBlogStudioOverviewImpl } from "./ai-blogger";
import {
    getAgencyAIBloggerConfigSuperAdminImpl,
    getAIUsageByAgencyImpl,
    getAIUsageByUserImpl,
    getAIUsageForAgencyImpl,
    getAIUsageOverviewImpl,
    getAgencyAIConfigSuperAdminImpl,
    getAgencyDetailsImpl,
    getAllAgenciesWithStatsImpl,
    getDefaultAiConfigForSignupImpl,
    getDefaultAiConfigImpl,
    getDefaultCurrencyImpl,
    getNotificationDefaultsImpl,
    getPromptConfigImpl,
    getPromptConfigPublicImpl,
    getPublicSecuritySettingsImpl,
    getStorageByAgencyImpl,
    getSystemAnalyticsImpl,
    getSystemLogsImpl,
    getSystemSettingsImpl,
    getAgencySearchConsoleMetricsImpl,
} from "./super-admin-queries";
import {
    logSystemEventImpl,
    subscribeNewsletterImpl,
    updateSystemSettingsImpl,
    savePromptConfigImpl,
} from "./super-admin-ops";
import {
    activateAgencyImpl,
    deleteAgencyImpl,
    extendTrialImpl,
    suspendAgencyImpl,
    updateAgencyImpl,
    updateAgencyCurrencyImpl,
    updateAgencyPlanImpl,
} from "./super-admin-agency-lifecycle";
import {
    getSuperAdminAlertSettings,
    sendSuperAdminAlertEmail,
    type SettingsUpdateRecord,
    type StoredAIConfig,
    type SystemSettingsRecord,
    verifySuperAdmin,
} from "./super-admin-shared";

/**
 * Get all agencies with stats
 */
export async function getAllAgenciesWithStats() {
    return getAllAgenciesWithStatsImpl();
}

/**
 * Get agency by ID with full details
 */
export async function getAgencyDetails(agencyId: string) {
    return getAgencyDetailsImpl(agencyId);
}

/**
 * Get system analytics
 */
export async function getSystemAnalytics() {
    return getSystemAnalyticsImpl();
}
/**
 * Create new agency
 */
export async function createAgency(data: {
    name: string;
    ownerName: string;
    ownerEmail: string;
    ownerPassword: string;
    ownerPhone?: string;
    plan: 'free' | 'starter' | 'pro' | 'enterprise';
    logo?: string;
    customLimits?: Partial<Agency['limits']>;
    customFeatures?: Partial<Agency['features']>;
    createdAt?: string; // Optional backdate
}) {
    const sa = await verifySuperAdmin();
    await connectDB();

    // Input sanitization
    data.name = sanitizeName(data.name, 200);
    if (!data.name) throw new Error('Agency name is required');
    data.ownerName = sanitizeName(data.ownerName || '', 200);
    if (!data.ownerName) throw new Error('Owner name is required');
    data.ownerEmail = validateEmail(data.ownerEmail);
    // Check system-level strong password policy
    const sys = await SystemSettingsModel.findOne(
        { key: 'global' },
        { 'security.enforceStrongPasswords': 1 }
    ).lean() as SystemSettingsRecord | null;
    const enforceStrong = sys?.security?.enforceStrongPasswords ?? true;
    if (enforceStrong) {
        validateStrongPassword(data.ownerPassword);
    } else {
        validatePassword(data.ownerPassword);
    }

    const sanitizedPhone = data.ownerPhone ? sanitizePhone(data.ownerPhone) : '';

    // Validate logo if provided (max 3MB base64, must be safe raster image)
    const ALLOWED_LOGO_MIME_TYPES = ['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp'];
    let sanitizedLogo = '';
    if (data.logo && typeof data.logo === 'string') {
        if (data.logo.length > 3_000_000) throw new Error('Logo file is too large. Max 2MB.');
        const mimeMatch = data.logo.match(/^data:(image\/[a-zA-Z+]+);base64,/);
        if (mimeMatch) {
            const mimeType = mimeMatch[1].toLowerCase();
            if (!ALLOWED_LOGO_MIME_TYPES.includes(mimeType)) {
                throw new Error('Unsupported logo format. Please use PNG, JPG, GIF, or WebP.');
            }
            sanitizedLogo = data.logo;
        } else if (data.logo.startsWith('data:')) {
            throw new Error('Invalid logo format. Please upload a valid image file.');
        }
    }

    // Check if email already exists across all collections
    const [existingUser, existingSuperAdmin, existingClient] = await Promise.all([
        UserModel.findOne({ email: data.ownerEmail }).lean(),
        SuperAdminModel.findOne({ email: data.ownerEmail }).lean(),
        ClientModel.findOne({ email: data.ownerEmail }).lean(),
    ]);
    if (existingUser || existingSuperAdmin || existingClient) {
        throw new Error('An account with this email already exists');
    }

    const agencyId = generateId();
    const userId = generateId();

    // Get plan defaults
    const planDefaults = AGENCY_PLANS[data.plan];

    // Generate unique slug
    const baseSlug = data.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    const existingAgency = await AgencyModel.findOne({ slug: baseSlug }).lean();
    const slug = existingAgency ? `${baseSlug}-${agencyId.slice(0, 6)}` : baseSlug;

    // Create agency
    const agency: Agency = {
        id: agencyId,
        name: data.name,
        slug,
        plan: data.plan,
        status: 'active',
        limits: {
            ...planDefaults.limits,
            ...data.customLimits
        },
        usage: {
            users: 1, // Owner
            projects: 0,
            clients: 0,
            storage: 0,
            monthlyInvoices: 0
        },
        features: {
            ...planDefaults.features,
            ...data.customFeatures
        },
        billing: {
            billingEmail: data.ownerEmail,
            stripeCustomerId: undefined,
            subscriptionId: undefined,
            subscriptionStatus: 'active',
            currentPeriodEnd: undefined,
            cancelAtPeriodEnd: false
        },
        settings: {
            systemName: data.name,
            timezone: 'UTC',
            currency: 'USD',
            dateFormat: 'MM/DD/YYYY',
            allowClientRegistration: false,
            requireEmailVerification: false,
            enableTwoFactor: false,
            emailNotificationsEnabled: true
        },
        createdAt: data.createdAt && !isNaN(new Date(data.createdAt).getTime()) ? new Date(data.createdAt).toISOString() : new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdBy: sa.userId
    };

    // Generate unique username
    const baseUsername = data.ownerEmail.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '');
    let username = baseUsername;
    let counter = 1;
    while (await UserModel.exists({ username, agencyId }) || await ClientModel.exists({ username, agencyId })) {
        username = `${baseUsername}${counter}`;
        counter++;
    }

    // Create owner user
    const hashedPassword = await bcrypt.hash(data.ownerPassword, 12);
    const owner: User = {
        id: userId,
        agencyId,
        name: data.ownerName,
        email: data.ownerEmail,
        password: hashedPassword,
        role: 'admin',
        username,
        phone: sanitizedPhone,
        contactNumber: sanitizedPhone,
        jobTitle: 'Agency Owner',
        salary: 0,
        createdAt: data.createdAt && !isNaN(new Date(data.createdAt).getTime()) ? new Date(data.createdAt).toISOString() : new Date().toISOString()
    } as User;

    // Save to database
    await AgencyModel.create(agency);
    await UserModel.create(owner);

    // Create default Settings with logo if provided
    if (sanitizedLogo) {
        await SettingsModel.create({
            agencyId,
            systemName: data.name,
            logo: sanitizedLogo
        });
    }

    await logSystemEvent({
        event: 'Agency Created',
        type: 'agency',
        detail: `${data.name} (${data.plan.toUpperCase()}) was registered`,
        status: 'success',
        agencyId,
        userId: sa.userId,
    });

    // Send super-admin email alert if enabled
    const alertSettings = await getSuperAdminAlertSettings();
    if (alertSettings.emailOnAgencyCreated) {
        const esc = (s: string) => s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
        await sendSuperAdminAlertEmail(
            `New Agency Created: ${data.name}`,
            `<p><strong>Agency:</strong> ${esc(data.name)}</p>
            <p><strong>Plan:</strong> ${esc(data.plan.toUpperCase())}</p>
            <p><strong>Owner:</strong> ${esc(data.ownerEmail)}</p>
            <p><strong>Created:</strong> ${new Date().toLocaleDateString()}</p>`
        );
    }

    revalidatePath('/super-admin/agencies');

    return { agency, owner };
}

/**
 * Update agency
 */
export async function updateAgency(agencyId: string, updates: Partial<Agency>) {
    return updateAgencyImpl(agencyId, updates);
}

/**
 * Update agency currency (super-admin only)
 */
export async function updateAgencyCurrency(agencyId: string, currency: string) {
    return updateAgencyCurrencyImpl(agencyId, currency);
}

/**
 * Suspend agency â€” requires super-admin password confirmation
 */
export async function suspendAgency(agencyId: string, password: string, reason?: string) {
    return suspendAgencyImpl(agencyId, password, reason);
}

/**
 * Activate agency
 */
export async function activateAgency(agencyId: string) {
    return activateAgencyImpl(agencyId);
}

/**
 * Delete agency (dangerous!) â€” requires super-admin password confirmation
 */
export async function deleteAgency(agencyId: string, password: string) {
    return deleteAgencyImpl(agencyId, password);
}

/**
 * Update agency plan
 */
export async function updateAgencyPlan(
    agencyId: string,
    plan: 'free' | 'starter' | 'pro' | 'enterprise',
    duration: 'monthly' | '3months' | '6months' | 'yearly' | 'lifetime' = 'lifetime'
) {
    return updateAgencyPlanImpl(agencyId, plan, duration);
}

/**
 * Extend agency trial by N days
 */
export async function extendTrial(agencyId: string, days: number) {
    return extendTrialImpl(agencyId, days);
}


// =============================================================================
// Singularity AI Configuration (Per-Agency)
// =============================================================================

/**
 * Get AI config for a specific agency (super-admin only)
 */
export async function getAgencyAIConfigSuperAdmin(agencyId: string): Promise<AIConfig | null> {
    return getAgencyAIConfigSuperAdminImpl(agencyId);
}

export async function getAgencyAIBloggerConfigSuperAdmin(agencyId: string): Promise<AIBloggerConfig | null> {
    return getAgencyAIBloggerConfigSuperAdminImpl(agencyId);
}

export async function getAgencyAIBloggerOverviewSuperAdmin(agencyId: string) {
    await verifySuperAdmin();
    await connectDB();

    const agency = await AgencyModel.findOne({ id: agencyId }).select("id name").lean();
    if (!agency) {
        throw new Error("Agency not found");
    }

    return getBlogStudioOverviewImpl(agency.id, agency.name);
}

/**
 * Update AI config for a specific agency (super-admin only)
 */
export async function updateAgencyAIConfigSuperAdmin(agencyId: string, config: AIConfig) {
    await verifySuperAdmin();
    await connectDB();

    // Validate required fields (apiKey can be empty if user didn't change it)
    if (!config.provider || !config.model) {
        throw new Error("Provider and Model are required");
    }

    // Validate provider
    const validProviders = ['gemini', 'openai', 'nvidia', 'github', 'groq'];
    if (!validProviders.includes(config.provider)) {
        throw new Error(`Invalid provider: ${config.provider}`);
    }
    // Input sanitization
    config.model = sanitizeString(config.model, 200);
    if (config.customModelId) config.customModelId = sanitizeString(config.customModelId, 200);

    // Determine the API key to store
    let encryptedApiKey: string;
    const isNewKey = config.apiKey && !config.apiKey.startsWith('****');

    // Fetch agency once — reused for both key fallback and override merging
    const existingAgency = await AgencyModel.findOne({ id: agencyId }).lean();
    if (!existingAgency) throw new Error("Agency not found");

    if (isNewKey) {
        // User provided a new key — encrypt and store
        encryptedApiKey = encryptApiKey(config.apiKey);
    } else {
        // No new key — preserve existing encrypted key from DB
        if (!existingAgency.aiConfig?.apiKey) {
            throw new Error("API Key is required for initial configuration");
        }
        encryptedApiKey = existingAgency.aiConfig.apiKey;
    }

    type RawFeatureConf = { apiKey?: string; provider?: string; model?: string; customModelId?: string };
    const processFeatureConfig = (newConf: RawFeatureConf, oldConf?: RawFeatureConf) => {
        if (!newConf) return undefined;
        let encKey = "";
        if (newConf.apiKey && !newConf.apiKey.startsWith('****')) {
            encKey = encryptApiKey(newConf.apiKey);
        } else if (newConf.apiKey?.startsWith('****') && oldConf?.apiKey) {
            encKey = oldConf.apiKey;
        }
        return {
            provider: newConf.provider,
            apiKey: encKey,
            model: sanitizeString(newConf.model ?? '', 200),
            ...(newConf.customModelId ? { customModelId: sanitizeString(newConf.customModelId, 200) } : {})
        };
    };

    const result = await AgencyModel.updateOne(
        { id: agencyId },
        {
            $set: {
                aiConfig: {
                    provider: config.provider,
                    apiKey: encryptedApiKey,
                    model: config.model,
                    ...(config.customModelId ? { customModelId: config.customModelId } : {}),
                    // Per-feature object overrides
                    ...(config.chatConfig         ? { chatConfig:         processFeatureConfig(config.chatConfig,         existingAgency?.aiConfig?.chatConfig) } : {}),
                    ...(config.agentConfig        ? { agentConfig:        processFeatureConfig(config.agentConfig,        existingAgency?.aiConfig?.agentConfig) } : {}),
                    ...(config.taskExplainConfig  ? { taskExplainConfig:  processFeatureConfig(config.taskExplainConfig,  existingAgency?.aiConfig?.taskExplainConfig) } : {}),
                    ...(config.hourEstimateConfig ? { hourEstimateConfig: processFeatureConfig(config.hourEstimateConfig, existingAgency?.aiConfig?.hourEstimateConfig) } : {}),
                    ...(config.taskChatbotConfig  ? { taskChatbotConfig:  processFeatureConfig(config.taskChatbotConfig,  existingAgency?.aiConfig?.taskChatbotConfig) } : {}),
                    ...(config.heavyTasksConfig   ? { heavyTasksConfig:   processFeatureConfig(config.heavyTasksConfig,   existingAgency?.aiConfig?.heavyTasksConfig) } : {}),
                },
                updatedAt: new Date().toISOString()
            }
        }
    );

    if (result.modifiedCount === 0) {
        throw new Error("Agency not found or no changes made");
    }

    revalidatePath(`/super-admin/agencies/${agencyId}`);
    revalidatePath(`/super-admin/agencies/${agencyId}/ai`);

    return true;
}

/**
 * Remove AI config for a specific agency (super-admin only)
 */
export async function removeAgencyAIConfig(agencyId: string) {
    await verifySuperAdmin();
    await connectDB();

    await AgencyModel.updateOne(
        { id: agencyId },
        {
            $unset: { aiConfig: '' },
            $set: { updatedAt: new Date().toISOString() }
        }
    );

    revalidatePath(`/super-admin/agencies/${agencyId}`);
    revalidatePath(`/super-admin/agencies/${agencyId}/ai`);

    return true;
}

// =============================================================================
// AI Blogger Configuration (Per-Agency)
// =============================================================================

export async function updateAgencyAIBloggerConfigSuperAdmin(agencyId: string, config: AIBloggerConfig) {
    const sa = await verifySuperAdmin();
    await connectDB();

    const existingAgency = await AgencyModel.findOne({ id: agencyId }).lean();
    if (!existingAgency) throw new Error("Agency not found");

    const mergedConfig = mergeAIBloggerConfig(config, existingAgency.aiConfig);
    const validProviders = ['gemini', 'openai', 'nvidia', 'github', 'groq'];

    const processStageConfig = (
        stageName: string,
        nextConfig: AIBloggerStageConfig,
        previousConfig?: AIBloggerStageConfig,
    ) => {
        if (!validProviders.includes(nextConfig.provider)) {
            throw new Error(`${stageName}: invalid provider "${nextConfig.provider}".`);
        }

        const model = sanitizeString(nextConfig.model || "", 200);
        if (!model) {
            throw new Error(`${stageName}: model is required.`);
        }

        const primaryApiKey = nextConfig.apiKey?.trim() || "";
        const fallbackApiKey = nextConfig.fallbackApiKey?.trim() || "";

        const resolvedPrimaryApiKey = primaryApiKey
            ? primaryApiKey.startsWith("****")
                ? previousConfig?.apiKey || ""
                : encryptApiKey(primaryApiKey)
            : "";

        const resolvedFallbackApiKey = fallbackApiKey
            ? fallbackApiKey.startsWith("****")
                ? previousConfig?.fallbackApiKey || ""
                : encryptApiKey(fallbackApiKey)
            : "";

        return {
            provider: nextConfig.provider,
            apiKey: resolvedPrimaryApiKey,
            fallbackApiKey: resolvedFallbackApiKey,
            model,
            ...(nextConfig.customModelId
                ? { customModelId: sanitizeString(nextConfig.customModelId, 200) }
                : {}),
            systemPrompt: sanitizeString(nextConfig.systemPrompt || "", 100000),
        };
    };

    const processTrendsConfig = (
        nextConfig: AIBloggerConfig["trends"],
        previousConfig?: AIBloggerConfig["trends"],
    ) => {
        const validProviders = ["serpapi"] as const;

        if (!validProviders.includes(nextConfig.provider)) {
            throw new Error(`Live Trends: invalid provider "${nextConfig.provider}".`);
        }

        const primaryApiKey = nextConfig.apiKey?.trim() || "";
        const fallbackApiKey = nextConfig.fallbackApiKey?.trim() || "";

        const resolvedPrimaryApiKey = primaryApiKey
            ? primaryApiKey.startsWith("****")
                ? previousConfig?.apiKey || ""
                : encryptApiKey(primaryApiKey)
            : "";

        const resolvedFallbackApiKey = fallbackApiKey
            ? fallbackApiKey.startsWith("****")
                ? previousConfig?.fallbackApiKey || ""
                : encryptApiKey(fallbackApiKey)
            : "";

        if (nextConfig.enabled && !resolvedPrimaryApiKey) {
            throw new Error("Live Trends requires a primary API key before it can be enabled.");
        }

        return {
            enabled: Boolean(nextConfig.enabled),
            provider: nextConfig.provider,
            apiKey: resolvedPrimaryApiKey,
            fallbackApiKey: resolvedFallbackApiKey,
            fallbackEnabled: Boolean(nextConfig.fallbackEnabled),
            fallbackToAi: Boolean(nextConfig.fallbackToAi),
            defaultLocation: sanitizeString(nextConfig.defaultLocation || "us", 12).toLowerCase() || "us",
        };
    };

    const processCrawlConfig = (
        nextConfig: AIBloggerConfig["crawl"],
    ) => {
        const validProviders = ["basic-fetch"] as const;

        if (!validProviders.includes(nextConfig.provider)) {
            throw new Error(`Website Crawl: invalid provider "${nextConfig.provider}".`);
        }

        const sanitizePathList = (values: string[] | undefined) =>
            Array.from(
                new Set(
                    (values || [])
                        .map((value) => sanitizeString(value || "", 200).trim())
                        .filter(Boolean),
                ),
            ).slice(0, 20);

        return {
            enabled: Boolean(nextConfig.enabled),
            provider: nextConfig.provider,
            maxPages: Math.min(6, Math.max(1, Math.round(nextConfig.maxPages || 4))),
            timeoutMs: Math.min(15000, Math.max(2000, Math.round(nextConfig.timeoutMs || 8000))),
            refreshWindowHours: Math.min(24 * 30, Math.max(1, Math.round(nextConfig.refreshWindowHours || 24))),
            allowedPaths: sanitizePathList(nextConfig.allowedPaths),
            blockedPaths: sanitizePathList(nextConfig.blockedPaths),
        };
    };

    const processSerpConfig = (
        nextConfig: AIBloggerConfig["serp"],
        previousConfig: AIBloggerConfig["serp"] | undefined,
        processedTrendsConfig: AIBloggerConfig["trends"],
    ): AIBloggerConfig["serp"] => {
        const validProviders = ["serpapi"] as const;

        if (!validProviders.includes(nextConfig.provider)) {
            throw new Error(`SERP Analysis: invalid provider "${nextConfig.provider}".`);
        }

        const primaryApiKey = nextConfig.apiKey?.trim() || "";
        const fallbackApiKey = nextConfig.fallbackApiKey?.trim() || "";

        const resolvedPrimaryApiKey = primaryApiKey
            ? primaryApiKey.startsWith("****")
                ? previousConfig?.apiKey || ""
                : encryptApiKey(primaryApiKey)
            : "";

        const resolvedFallbackApiKey = fallbackApiKey
            ? fallbackApiKey.startsWith("****")
                ? previousConfig?.fallbackApiKey || ""
                : encryptApiKey(fallbackApiKey)
            : "";

        if (nextConfig.enabled && !resolvedPrimaryApiKey && !processedTrendsConfig.apiKey) {
            throw new Error("SERP Analysis requires a primary API key or a configured Live Trends key before it can be enabled.");
        }

        return {
            enabled: Boolean(nextConfig.enabled),
            provider: nextConfig.provider,
            apiKey: resolvedPrimaryApiKey,
            fallbackApiKey: resolvedFallbackApiKey,
            fallbackEnabled: Boolean(nextConfig.fallbackEnabled),
            defaultLocation: sanitizeString(nextConfig.defaultLocation || "us", 12).toLowerCase() || "us",
            device: nextConfig.device === "mobile" ? "mobile" : "desktop",
            maxCompetitors: Math.min(10, Math.max(3, Math.round(nextConfig.maxCompetitors || 5))),
            refreshWindowHours: Math.min(24 * 30, Math.max(1, Math.round(nextConfig.refreshWindowHours || 24))),
        };
    };

    const processGroundedResearchConfig = (
        nextConfig: AIBloggerConfig["groundedResearch"],
    ): AIBloggerConfig["groundedResearch"] => {
        const validSourceTypes = new Set([
            "government",
            "education",
            "official",
            "industry",
            "competitor",
            "news",
            "reference",
        ]);

        return {
            enabled: Boolean(nextConfig.enabled),
            maxSources: Math.min(8, Math.max(1, Math.round(nextConfig.maxSources || 5))),
            trustPreference: nextConfig.trustPreference === "high-only" ? "high-only" : "balanced",
            freshnessPreference:
                nextConfig.freshnessPreference === "recent-first" ||
                nextConfig.freshnessPreference === "evergreen-ok"
                    ? nextConfig.freshnessPreference
                    : "balanced",
            allowedSourceTypes: Array.from(
                new Set(
                    (nextConfig.allowedSourceTypes || [])
                        .map((value) => sanitizeString(value || "", 40))
                        .filter((value): value is typeof nextConfig.allowedSourceTypes[number] => validSourceTypes.has(value)),
                ),
            ).slice(0, 7),
            blockedDomains: Array.from(
                new Set(
                    (nextConfig.blockedDomains || [])
                        .map((value) => sanitizeString(value || "", 120).trim().toLowerCase())
                        .filter(Boolean),
                ),
            ).slice(0, 30),
            refreshWindowHours: Math.min(24 * 30, Math.max(1, Math.round(nextConfig.refreshWindowHours || 24))),
        };
    };

    const processSearchConsoleConfig = (
        nextConfig: AIBloggerConfig["searchConsole"],
        previousConfig?: AIBloggerConfig["searchConsole"],
    ): AIBloggerConfig["searchConsole"] => {
        const propertyUrl = sanitizeString(nextConfig.propertyUrl || "", 300).trim();
        const credentialsJson = nextConfig.credentialsJson?.trim() || "";
        const resolvedCredentialsJson = credentialsJson
            ? credentialsJson.startsWith("****")
                ? previousConfig?.credentialsJson || ""
                : encryptApiKey(credentialsJson)
            : "";
        const authStatus =
            Boolean(nextConfig.enabled && propertyUrl && resolvedCredentialsJson)
                ? "configured"
                : nextConfig.authStatus === "configured" && propertyUrl && resolvedCredentialsJson
                    ? "configured"
                    : "not-connected";

        return {
            enabled: Boolean(nextConfig.enabled),
            propertyUrl,
            credentialsJson: resolvedCredentialsJson,
            authStatus,
            syncFrequencyHours: Math.min(24 * 30, Math.max(1, Math.round(nextConfig.syncFrequencyHours || 24))),
            lookbackDays: Math.min(365, Math.max(7, Math.round(nextConfig.lookbackDays || 28))),
        };
    };

    const processPagePerformanceConfig = (
        nextConfig: AIBloggerConfig["pagePerformance"],
        previousConfig?: AIBloggerConfig["pagePerformance"],
    ): AIBloggerConfig["pagePerformance"] => {
        const validProviders = ["pagespeed"] as const;
        if (!validProviders.includes(nextConfig.provider)) {
            throw new Error(`Page Performance: invalid provider "${nextConfig.provider}".`);
        }

        const apiKey = nextConfig.apiKey?.trim() || "";
        const resolvedApiKey = apiKey
            ? apiKey.startsWith("****")
                ? previousConfig?.apiKey || ""
                : encryptApiKey(apiKey)
            : "";

        return {
            enabled: Boolean(nextConfig.enabled),
            provider: nextConfig.provider,
            apiKey: resolvedApiKey,
            strategy:
                nextConfig.strategy === "desktop" || nextConfig.strategy === "both"
                    ? nextConfig.strategy
                    : "mobile",
            performanceThreshold: Math.min(100, Math.max(1, Math.round(nextConfig.performanceThreshold || 60))),
            refreshWindowHours: Math.min(24 * 30, Math.max(1, Math.round(nextConfig.refreshWindowHours || 24 * 7))),
        };
    };

    const processImageGenerationConfig = (
        nextConfig: AIBloggerConfig["imageGeneration"],
        previousConfig?: AIBloggerConfig["imageGeneration"],
    ): AIBloggerConfig["imageGeneration"] => {
        const validProviders = ["openai", "gemini"] as const;
        if (!validProviders.includes(nextConfig.provider)) {
            throw new Error(`Image Generation: invalid provider "${nextConfig.provider}".`);
        }

        const model = sanitizeString(nextConfig.model || "", 200);
        if (!model) {
            throw new Error("Image Generation: model is required.");
        }

        const apiKey = nextConfig.apiKey?.trim() || "";
        const fallbackApiKey = nextConfig.fallbackApiKey?.trim() || "";
        const resolvedApiKey = apiKey
            ? apiKey.startsWith("****")
                ? previousConfig?.apiKey || ""
                : encryptApiKey(apiKey)
            : "";
        const resolvedFallbackApiKey = fallbackApiKey
            ? fallbackApiKey.startsWith("****")
                ? previousConfig?.fallbackApiKey || ""
                : encryptApiKey(fallbackApiKey)
            : "";

        if (nextConfig.enabled && !resolvedApiKey) {
            throw new Error("Image Generation requires a primary API key before it can be enabled.");
        }

        return {
            enabled: Boolean(nextConfig.enabled),
            provider: nextConfig.provider,
            apiKey: resolvedApiKey,
            fallbackApiKey: resolvedFallbackApiKey,
            model,
            ...(nextConfig.customModelId
                ? { customModelId: sanitizeString(nextConfig.customModelId, 200) }
                : {}),
            size:
                nextConfig.size === "1024x1024" || nextConfig.size === "1024x1792"
                    ? nextConfig.size
                    : "1792x1024",
            quality: nextConfig.quality === "hd" ? "hd" : "standard",
            style: nextConfig.style === "natural" ? "natural" : "vivid",
        };
    };

    const processPublishRulesConfig = (
        nextConfig: AIBloggerConfig["publishRules"],
        previousConfig?: AIBloggerConfig["publishRules"],
    ): AIBloggerConfig["publishRules"] => {
        const finalCheckerApiKey = sanitizeString(nextConfig.aiReviewPolicy?.apiKey || "", 1000);
        const resolvedFinalCheckerApiKey = finalCheckerApiKey
            ? finalCheckerApiKey.startsWith("****")
                ? previousConfig?.aiReviewPolicy?.apiKey || ""
                : encryptApiKey(finalCheckerApiKey)
            : "";

        return {
            requireInternalLinks: Boolean(nextConfig.requireInternalLinks),
            requireMetaDescription: Boolean(nextConfig.requireMetaDescription),
            requireFaqForInformational: Boolean(nextConfig.requireFaqForInformational),
            requireImageAltText: Boolean(nextConfig.requireImageAltText),
            requireManualApproval: Boolean(nextConfig.requireManualApproval),
            minimumSeoScore: Math.min(100, Math.max(0, Math.round(nextConfig.minimumSeoScore || 80))),
            requireCanonicalUrl: Boolean(nextConfig.requireCanonicalUrl),
            requireSchemaMarkup: Boolean(nextConfig.requireSchemaMarkup),
            aiReviewPolicy: {
                enableFinalChecker: Boolean(nextConfig.aiReviewPolicy?.enableFinalChecker),
                apiKey: resolvedFinalCheckerApiKey,
                model: sanitizeString(nextConfig.aiReviewPolicy?.model || "", 200),
                customModelId: sanitizeString(nextConfig.aiReviewPolicy?.customModelId || "", 200),
                autoFixStructuralIssues: Boolean(nextConfig.aiReviewPolicy?.autoFixStructuralIssues),
                autoFixToneMismatch: Boolean(nextConfig.aiReviewPolicy?.autoFixToneMismatch),
                flagWeakBusinessFit: Boolean(nextConfig.aiReviewPolicy?.flagWeakBusinessFit),
                flagWeakCtaAlignment: Boolean(nextConfig.aiReviewPolicy?.flagWeakCtaAlignment),
                softenQuestionableClaims: Boolean(nextConfig.aiReviewPolicy?.softenQuestionableClaims),
                flagSoftCannibalization: Boolean(nextConfig.aiReviewPolicy?.flagSoftCannibalization),
                requireHumanReviewForHighRiskClaims:
                    Boolean(nextConfig.aiReviewPolicy?.requireHumanReviewForHighRiskClaims),
                requireHumanReviewForHighRiskCannibalization:
                    Boolean(nextConfig.aiReviewPolicy?.requireHumanReviewForHighRiskCannibalization),
                requireGroundedSourcesForClaims:
                    Boolean(nextConfig.aiReviewPolicy?.requireGroundedSourcesForClaims),
            },
        };
    };

    const nextTrendsConfig = processTrendsConfig(mergedConfig.trends, existingAgency.aiBloggerConfig?.trends);

    const nextStoredConfig: AIBloggerConfig = {
        fallbackEnabled: mergedConfig.fallbackEnabled,
        trends: nextTrendsConfig,
        crawl: processCrawlConfig(mergedConfig.crawl),
        serp: processSerpConfig(mergedConfig.serp, existingAgency.aiBloggerConfig?.serp, nextTrendsConfig),
        groundedResearch: processGroundedResearchConfig(mergedConfig.groundedResearch),
        searchConsole: processSearchConsoleConfig(
            mergedConfig.searchConsole,
            existingAgency.aiBloggerConfig?.searchConsole,
        ),
        pagePerformance: processPagePerformanceConfig(
            mergedConfig.pagePerformance,
            existingAgency.aiBloggerConfig?.pagePerformance,
        ),
        imageGeneration: processImageGenerationConfig(
            mergedConfig.imageGeneration,
            existingAgency.aiBloggerConfig?.imageGeneration,
        ),
        publishRules: processPublishRulesConfig(mergedConfig.publishRules, existingAgency.aiBloggerConfig?.publishRules),
        author: mergedConfig.author,
        entityModeling: mergedConfig.entityModeling,
        extractKeywords: processStageConfig(
            "Topic & Keywords",
            mergedConfig.extractKeywords,
            existingAgency.aiBloggerConfig?.extractKeywords,
        ),
        research: processStageConfig(
            "Research",
            mergedConfig.research,
            existingAgency.aiBloggerConfig?.research,
        ),
        seoAnalysis: processStageConfig(
            "SEO Analysis",
            mergedConfig.seoAnalysis,
            existingAgency.aiBloggerConfig?.seoAnalysis,
        ),
        writeBlog: processStageConfig(
            "Write Blog",
            mergedConfig.writeBlog,
            existingAgency.aiBloggerConfig?.writeBlog,
        ),
        generateImage: processStageConfig(
            "Generate Image",
            mergedConfig.generateImage,
            existingAgency.aiBloggerConfig?.generateImage,
        ),
        updatedAt: new Date().toISOString(),
        updatedBy: sa.userId,
    };

    await AgencyModel.updateOne(
        { id: agencyId },
        {
            $set: {
                aiBloggerConfig: nextStoredConfig,
                updatedAt: new Date().toISOString(),
            },
        },
    );

    revalidatePath("/super-admin/ai-blogger");
    revalidatePath(`/super-admin/ai-blogger/agency/${agencyId}`);

    return true;
}

export async function removeAgencyAIBloggerConfigSuperAdmin(agencyId: string) {
    await verifySuperAdmin();
    await connectDB();

    await AgencyModel.updateOne(
        { id: agencyId },
        {
            $unset: { aiBloggerConfig: "" },
            $set: { updatedAt: new Date().toISOString() },
        },
    );

    revalidatePath("/super-admin/ai-blogger");
    revalidatePath(`/super-admin/ai-blogger/agency/${agencyId}`);

    return true;
}

// =============================================================================
// Default AI Config for New Signups
// =============================================================================

/**
 * Get the default AI config that's applied to new signup agencies.
 * Returns masked API key for display in super-admin UI.
 */
export async function getDefaultAiConfig(): Promise<AIConfig | null> {
    return getDefaultAiConfigImpl();
}

/**
 * Save the default AI config for new signup agencies (super-admin only).
 * Set config to null to remove the default.
 */
export async function saveDefaultAiConfig(config: AIConfig | null) {
    await verifySuperAdmin();
    await connectDB();

    if (!config) {
        // Remove default AI config
        await SystemSettingsModel.updateOne(
            { key: 'global' },
            { $unset: { defaultAiConfig: '' } },
            { upsert: true }
        );
    } else {
        // Validate
        if (!config.provider || !config.model) {
            throw new Error("Provider and Model are required");
        }
        const validProviders = ['gemini', 'openai', 'nvidia', 'github', 'groq'];
        if (!validProviders.includes(config.provider)) {
            throw new Error(`Invalid provider: ${config.provider}`);
        }

        // Determine the API key to store
        let encryptedApiKey: string;
        const isNewKey = config.apiKey && !config.apiKey.startsWith('****');
        if (isNewKey) {
            encryptedApiKey = encryptApiKey(config.apiKey);
        } else {
            // Preserve existing key from DB
            const existing = await SystemSettingsModel.findOne({ key: 'global' }).lean() as SystemSettingsRecord | null;
            const existingKey = existing?.defaultAiConfig?.apiKey;
            if (!existingKey) {
                throw new Error("API Key is required for initial configuration");
            }
            encryptedApiKey = existingKey;
        }

        const existingGlobal = await SystemSettingsModel.findOne({ key: 'global' }).lean() as SystemSettingsRecord | null;
        type RawFeatureConfGlobal = { apiKey?: string; provider?: string; model?: string; customModelId?: string };
        const processFeatureConfigGlobal = (newConf: RawFeatureConfGlobal, oldConf?: RawFeatureConfGlobal) => {
            if (!newConf) return undefined;
            let encKey = "";
            if (newConf.apiKey && !newConf.apiKey.startsWith('****')) {
                encKey = encryptApiKey(newConf.apiKey);
            } else if (newConf.apiKey?.startsWith('****') && oldConf?.apiKey) {
                encKey = oldConf.apiKey;
            }
            return {
                provider: newConf.provider,
                apiKey: encKey,
                model: sanitizeString(newConf.model ?? '', 200),
                ...(newConf.customModelId ? { customModelId: sanitizeString(newConf.customModelId, 200) } : {})
            };
        };

        await SystemSettingsModel.updateOne(
            { key: 'global' },
            {
                $set: {
                    defaultAiConfig: {
                        provider: config.provider,
                        apiKey: encryptedApiKey,
                        model: sanitizeString(config.model, 200),
                        ...(config.customModelId ? { customModelId: sanitizeString(config.customModelId, 200) } : {}),
                        // Per-feature object overrides
                        ...(config.chatConfig         ? { chatConfig:         processFeatureConfigGlobal(config.chatConfig,         existingGlobal?.defaultAiConfig?.chatConfig) } : {}),
                        ...(config.agentConfig        ? { agentConfig:        processFeatureConfigGlobal(config.agentConfig,        existingGlobal?.defaultAiConfig?.agentConfig) } : {}),
                        ...(config.taskExplainConfig  ? { taskExplainConfig:  processFeatureConfigGlobal(config.taskExplainConfig,  existingGlobal?.defaultAiConfig?.taskExplainConfig) } : {}),
                        ...(config.hourEstimateConfig ? { hourEstimateConfig: processFeatureConfigGlobal(config.hourEstimateConfig, existingGlobal?.defaultAiConfig?.hourEstimateConfig) } : {}),
                        ...(config.taskChatbotConfig  ? { taskChatbotConfig:  processFeatureConfigGlobal(config.taskChatbotConfig,  existingGlobal?.defaultAiConfig?.taskChatbotConfig) } : {}),
                        ...(config.heavyTasksConfig   ? { heavyTasksConfig:   processFeatureConfigGlobal(config.heavyTasksConfig,   existingGlobal?.defaultAiConfig?.heavyTasksConfig) } : {}),
                    }
                }
            },
            { upsert: true }
        );
    }

    revalidatePath('/super-admin/settings');
    return true;
}

/**
 * Get raw default AI config for signup (NOT masked, with encrypted key).
 * This is used internally by the signup route, not exposed to UI.
 */
export async function getDefaultAiConfigForSignup(): Promise<StoredAIConfig | null> {
    return getDefaultAiConfigForSignupImpl();
}

// =============================================================================
// System Settings (Global platform settings)
// =============================================================================

export async function getSystemSettings(): Promise<SystemSettingsRecord | null> {
    return getSystemSettingsImpl();
}

/** Public read of security settings â€” no auth required (used by signup route) */
export async function getPublicSecuritySettings(): Promise<{
    allowSelfRegistration: boolean;
    enforceStrongPasswords: boolean;
}> {
    return getPublicSecuritySettingsImpl();
}

/** Public read of platform default currency â€” no auth required */
export async function getDefaultCurrency(): Promise<string> {
    return getDefaultCurrencyImpl();
}

/** Public read of notification defaults â€” no auth required (used by actions.ts) */
export async function getNotificationDefaults(): Promise<Record<string, boolean>> {
    return getNotificationDefaultsImpl();
}


/** Send an email alert to the super-admin */


export async function updateSystemSettings(section: 'platform' | 'security' | 'notifications' | 'emailDefaults' | 'notificationDefaults', data: SettingsUpdateRecord) {
    return updateSystemSettingsImpl(section, data);
}

export async function getPromptConfig() {
    return getPromptConfigImpl();
}

/** No super-admin auth — used by the AI route at runtime. */
export async function getPromptConfigPublic() {
    return getPromptConfigPublicImpl();
}

export async function savePromptConfig(promptConfig: Record<string, { standard?: string; live?: string }>) {
    return savePromptConfigImpl(promptConfig);
}

// =============================================================================
// System Logging (Real event log)
// =============================================================================

export async function logSystemEvent(entry: {
    event: string;
    type: 'agency' | 'user' | 'system' | 'security' | 'error';
    detail: string;
    status: 'success' | 'error' | 'warning' | 'info';
    agencyId?: string;
    userId?: string;
    meta?: Record<string, unknown>;
}) {
    return logSystemEventImpl(entry);
}

export async function getSystemLogs(limit = 100) {
    return getSystemLogsImpl(limit);
}

// =============================================================================
// Newsletter Subscription (Brevo Contact List)
// =============================================================================

export async function subscribeNewsletter(email: string) {
    return subscribeNewsletterImpl(email);
}

// =============================================================================
// AI USAGE MONITORING
// =============================================================================

/**
 * Get AI usage overview stats (totals, by feature, recent trend)
 */
export async function getAIUsageOverview(days: number = 30) {
    return getAIUsageOverviewImpl(days);
}

/**
 * Get AI usage breakdown per agency
 */
export async function getAIUsageByAgency(days: number = 30) {
    return getAIUsageByAgencyImpl(days);
}

/**
 * Get AI usage for a specific agency (per-user + per-feature breakdown)
 */
export async function getAIUsageForAgency(agencyId: string, days: number = 30) {
    return getAIUsageForAgencyImpl(agencyId, days);
}

/**
 * Get AI usage breakdown per user (across all agencies)
 */
export async function getAIUsageByUser(days: number = 30) {
    return getAIUsageByUserImpl(days);
}

/**
 * Get storage usage across all agencies
 */
export async function getStorageByAgency() {
    return getStorageByAgencyImpl();
}

// =============================================================================
// SEARCH CONSOLE METRICS
// =============================================================================

/**
 * Get Search Console metrics for a specific agency
 */
export async function getAgencySearchConsoleMetrics(agencyId: string) {
    return getAgencySearchConsoleMetricsImpl(agencyId);
}

/**
 * Search Console configuration - DEPRECATED (Use OAuth instead)
 * All clients now use Google OAuth via AIBloggerSettingsWorkspace
 */

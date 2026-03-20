"use server";

import { AgencyModel, UserModel, SuperAdminModel, ClientModel, SettingsModel, SystemSettingsModel, connectDB, encryptApiKey } from "../mongodb";
import { Agency, User, AGENCY_PLANS, AIConfig } from "../types";
import { generateId } from "../utils-server";
import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { sanitizeName, sanitizeString, sanitizePhone, validateEmail, validatePassword, validateStrongPassword } from "../validation";
import {
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
    getPublicSecuritySettingsImpl,
    getStorageByAgencyImpl,
    getSystemAnalyticsImpl,
    getSystemLogsImpl,
    getSystemSettingsImpl,
} from "./super-admin-queries";
import {
    logSystemEventImpl,
    subscribeNewsletterImpl,
    updateSystemSettingsImpl,
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

    const processFeatureConfig = (newConf: any, oldConf: any) => {
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
            model: sanitizeString(newConf.model, 200),
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
        const processFeatureConfigGlobal = (newConf: any, oldConf: any) => {
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
                model: sanitizeString(newConf.model, 200),
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

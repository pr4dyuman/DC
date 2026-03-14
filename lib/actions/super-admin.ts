"use server";

import { AgencyModel, UserModel, SuperAdminModel, ProjectModel, ClientModel, InvoiceModel, TransactionModel, TaskModel, AssetModel, ActivityModel, NotificationModel, ServiceModel, SettingsModel, LeaveRequestModel, MessageModel, SingularityChatSessionModel, SingularityCheckpointModel, SystemSettingsModel, SystemLogModel, AIUsageLogModel, connectDB, encryptApiKey, decryptApiKey } from "../mongodb";
import { Agency, User, AGENCY_PLANS, AIConfig } from "../types";
import { getSessionUser } from "../auth";
import { generateId } from "../utils-server";
import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { sanitizeName, sanitizeString, sanitizePhone, sanitizeMongoInput, sanitizeUpdates, validateEmail, validatePassword, validateStrongPassword } from "../validation";

/**
 * Verify current user is super admin
 */
async function verifySuperAdmin() {
    const sessionUser = await getSessionUser();
    if (!sessionUser || sessionUser.role !== 'superadmin') {
        throw new Error('Unauthorized: Super admin access required');
    }
    return sessionUser;
}

/**
 * Helper to serialize MongoDB documents
 */
/**
 * Helper to purify data and remove MongoDB specific fields
 */
function toSerializable<T>(obj: T): T {
    // JSON round-trip converts all MongoDB types (ObjectId, Buffer, Date) to plain values,
    // then we strip _id and __v from the result
    const plain = JSON.parse(JSON.stringify(obj));
    return stripMongoFields(plain);
}

function stripMongoFields(obj: any): any {
    if (Array.isArray(obj)) return obj.map(stripMongoFields);
    if (obj && typeof obj === 'object') {
        const clean: any = {};
        for (const key of Object.keys(obj)) {
            if (key === '_id' || key === '__v') continue;
            clean[key] = stripMongoFields(obj[key]);
        }
        return clean;
    }
    return obj;
}

/**
 * Get all agencies with stats
 */
export async function getAllAgenciesWithStats() {
    await verifySuperAdmin();
    await connectDB();

    const agencies = await AgencyModel.find({}).lean();

    // Get stats for each agency
    const agenciesWithStats = await Promise.all(
        agencies.map(async (agency) => {
            const [userCount, projectCount, clientCount] = await Promise.all([
                UserModel.countDocuments({ agencyId: agency.id }),
                ProjectModel.countDocuments({ agencyId: agency.id }),
                ClientModel.countDocuments({ agencyId: agency.id })
            ]);

            return {
                ...agency,
                stats: {
                    users: userCount,
                    projects: projectCount,
                    clients: clientCount
                }
            };
        })
    );

    return toSerializable(agenciesWithStats);
}

/**
 * Get agency by ID with full details
 */
export async function getAgencyDetails(agencyId: string) {
    await verifySuperAdmin();
    await connectDB();

    const agency = await AgencyModel.findOne({ id: agencyId }).lean();
    if (!agency) {
        throw new Error('Agency not found');
    }

    // Get detailed stats
    // Get detailed stats (Counts only, no private data)
    const [userCount, projectCount, clientCount] = await Promise.all([
        UserModel.countDocuments({ agencyId }),
        ProjectModel.countDocuments({ agencyId }),
        ClientModel.countDocuments({ agencyId })
    ]);

    // Only fetch users list for management purposes (e.g. to see who is the admin)
    // But for now, we'll return the Owner info or just the list of users to help with support.
    const users = await UserModel.find({ agencyId }).select('-password').lean();

    return toSerializable({
        agency,
        stats: {
            users: userCount,
            projects: projectCount,
            clients: clientCount
        },
        users // Keeping users for support/management (e.g. resetting passwords or seeing who is active)
    });
}

/**
 * Get system analytics
 */
export async function getSystemAnalytics() {
    await verifySuperAdmin();
    await connectDB();

    const [
        totalAgencies,
        activeAgencies,
        suspendedAgencies,
        totalUsers
    ] = await Promise.all([
        AgencyModel.countDocuments({}),
        AgencyModel.countDocuments({ status: 'active' }),
        AgencyModel.countDocuments({ status: 'suspended' }),
        UserModel.countDocuments({})
    ]);

    // Get agencies by plan
    const agenciesByPlan = await AgencyModel.aggregate([
        { $group: { _id: '$plan', count: { $sum: 1 } } }
    ]);

    // Get recent agencies
    const recentAgencies = await AgencyModel.find({})
        .sort({ createdAt: -1 })
        .limit(10)
        .lean();

    return toSerializable({
        totalAgencies,
        activeAgencies,
        suspendedAgencies,
        totalUsers,
        agenciesByPlan: agenciesByPlan.reduce((acc, item) => {
            acc[item._id] = item.count;
            return acc;
        }, {} as Record<string, number>),
        recentAgencies
    });
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
    ).lean() as any;
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
    let baseUsername = data.ownerEmail.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '');
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
    await verifySuperAdmin();
    await connectDB();
    // Input sanitization — strip NoSQL operators
    updates = sanitizeUpdates(updates) as Partial<Agency>;
    if (updates.name) updates.name = sanitizeName(updates.name, 200);

    const result = await AgencyModel.updateOne(
        { id: agencyId },
        {
            $set: {
                ...updates,
                updatedAt: new Date().toISOString()
            }
        }
    );

    if (result.modifiedCount === 0) {
        throw new Error('Agency not found or no changes made');
    }

    revalidatePath('/super-admin/agencies');
    revalidatePath(`/super-admin/agencies/${agencyId}`);

    return true;
}

/**
 * Suspend agency — requires super-admin password confirmation
 */
export async function suspendAgency(agencyId: string, password: string, reason?: string) {
    const sa = await verifySuperAdmin();
    await connectDB();

    // Sanitize reason before storage/display
    if (reason) reason = sanitizeString(reason, 1000);

    // Verify super-admin password before destructive operation
    if (!password) throw new Error('Password is required to suspend an agency');
    const superAdmin = await SuperAdminModel.findOne({ id: sa.userId }).lean();
    if (!superAdmin || !(await bcrypt.compare(password, (superAdmin as any).password))) {
        throw new Error('Invalid password');
    }

    const agency = await AgencyModel.findOne({ id: agencyId }).lean();
    await AgencyModel.updateOne(
        { id: agencyId },
        {
            $set: {
                status: 'suspended',
                suspendedAt: new Date().toISOString(),
                suspensionReason: reason,
                updatedAt: new Date().toISOString()
            }
        }
    );

    await logSystemEvent({
        event: 'Agency Suspended',
        type: 'agency',
        detail: `${agency?.name || agencyId} was suspended${reason ? `: ${reason}` : ''}`,
        status: 'warning',
        agencyId,
        userId: sa.userId,
    });

    // Send super-admin email alert if enabled
    const alertSettings = await getSuperAdminAlertSettings();
    if (alertSettings.emailOnAgencySuspended) {
        const esc = (s: string) => s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
        const agencyName = agency?.name || agencyId;
        await sendSuperAdminAlertEmail(
            `Agency Suspended: ${agencyName}`,
            `<p><strong>Agency:</strong> ${esc(agencyName)}</p>
            ${reason ? `<p><strong>Reason:</strong> ${esc(reason)}</p>` : ''}
            <p><strong>Suspended at:</strong> ${new Date().toLocaleDateString()}</p>`
        );
    }

    revalidatePath('/super-admin/agencies');
    revalidatePath(`/super-admin/agencies/${agencyId}`);

    return true;
}

/**
 * Activate agency
 */
export async function activateAgency(agencyId: string) {
    const sa = await verifySuperAdmin();
    await connectDB();

    const agency = await AgencyModel.findOne({ id: agencyId }).lean();
    await AgencyModel.updateOne(
        { id: agencyId },
        {
            $set: {
                status: 'active',
                updatedAt: new Date().toISOString()
            },
            $unset: {
                suspendedAt: '',
                suspensionReason: ''
            }
        }
    );

    await logSystemEvent({
        event: 'Agency Activated',
        type: 'agency',
        detail: `${agency?.name || agencyId} was activated`,
        status: 'success',
        agencyId,
        userId: sa.userId,
    });

    // Send super-admin email alert
    const alertSettings = await getSuperAdminAlertSettings();
    if (alertSettings.emailOnAgencySuspended) {
        const esc = (s: string) => s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
        const agencyName = (agency as any)?.name || agencyId;
        await sendSuperAdminAlertEmail(
            `Agency Activated: ${agencyName}`,
            `<p><strong>Agency:</strong> ${esc(agencyName)}</p>
            <p><strong>Activated at:</strong> ${new Date().toLocaleDateString()}</p>`
        );
    }

    revalidatePath('/super-admin/agencies');
    revalidatePath(`/super-admin/agencies/${agencyId}`);

    return true;
}

/**
 * Delete agency (dangerous!) — requires super-admin password confirmation
 */
export async function deleteAgency(agencyId: string, password: string) {
    const sa = await verifySuperAdmin();
    await connectDB();

    // Verify super-admin password before destructive operation
    const superAdmin = await SuperAdminModel.findOne({ id: sa.userId }).lean();
    if (!superAdmin || !superAdmin.password) {
        throw new Error('Super admin account not found or has no password set');
    }
    const isMatch = await bcrypt.compare(password, superAdmin.password);
    if (!isMatch) {
        throw new Error('Invalid password — agency deletion requires correct super-admin password');
    }

    // Verify agency exists
    const agency = await AgencyModel.findOne({ id: agencyId }).lean();
    if (!agency) throw new Error('Agency not found');

    // Delete ALL agency data from every collection — prevents orphaned data
    await Promise.all([
        AgencyModel.deleteOne({ id: agencyId }),
        UserModel.deleteMany({ agencyId }),
        ClientModel.deleteMany({ agencyId }),
        ProjectModel.deleteMany({ agencyId }),
        TaskModel.deleteMany({ agencyId }),
        InvoiceModel.deleteMany({ agencyId }),
        TransactionModel.deleteMany({ agencyId }),
        AssetModel.deleteMany({ agencyId }),
        ActivityModel.deleteMany({ agencyId }),
        NotificationModel.deleteMany({ agencyId }),
        ServiceModel.deleteMany({ agencyId }),
        SettingsModel.deleteMany({ agencyId }),
        LeaveRequestModel.deleteMany({ agencyId }),
        MessageModel.deleteMany({ agencyId }),
        SingularityChatSessionModel.deleteMany({ agencyId }),
        SingularityCheckpointModel.deleteMany({ agencyId }),
    ]);

    await logSystemEvent({
        event: 'Agency Deleted',
        type: 'agency',
        detail: `${(agency as any).name} was permanently deleted`,
        status: 'error',
        agencyId,
        userId: sa.userId,
    });

    // Send super-admin email alert
    const alertSettings = await getSuperAdminAlertSettings();
    if (alertSettings.emailOnAgencySuspended) {
        const esc = (s: string) => s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
        const agencyName = (agency as any).name || agencyId;
        await sendSuperAdminAlertEmail(
            `Agency Deleted: ${agencyName}`,
            `<p><strong>Agency:</strong> ${esc(agencyName)}</p>
            <p><strong>Deleted at:</strong> ${new Date().toLocaleDateString()}</p>
            <p>All agency data has been permanently removed.</p>`
        );
    }

    revalidatePath('/super-admin/agencies');

    return true;
}

/**
 * Update agency plan
 */
export async function updateAgencyPlan(
    agencyId: string,
    plan: 'free' | 'starter' | 'pro' | 'enterprise',
    duration: 'monthly' | '3months' | '6months' | 'yearly' | 'lifetime' = 'lifetime'
) {
    await verifySuperAdmin();
    await connectDB();

    const planDefaults = AGENCY_PLANS[plan];

    // Calculate planExpiresAt based on duration
    let planExpiresAt: string | undefined = undefined;
    if (duration !== 'lifetime') {
        const now = new Date();
        const durationMap: Record<string, number> = {
            'monthly': 1,
            '3months': 3,
            '6months': 6,
            'yearly': 12,
        };
        const months = durationMap[duration] || 1;
        now.setMonth(now.getMonth() + months);
        planExpiresAt = now.toISOString();
    }

    const updateFields: Record<string, any> = {
        plan,
        limits: planDefaults.limits,
        features: planDefaults.features,
        planDuration: duration,
        updatedAt: new Date().toISOString()
    };

    // When upgrading to a paid plan, activate the agency (ends trial)
    if (plan !== 'free') {
        updateFields.status = 'active';
    }

    // Set or clear planExpiresAt
    if (planExpiresAt) {
        updateFields.planExpiresAt = planExpiresAt;
    }

    const unsetFields: Record<string, string> = {};
    if (!planExpiresAt) {
        unsetFields.planExpiresAt = '';
    }
    // Clear trial fields when upgrading
    if (plan !== 'free') {
        unsetFields.trialEndsAt = '';
    }

    await AgencyModel.updateOne(
        { id: agencyId },
        {
            $set: updateFields,
            ...(Object.keys(unsetFields).length > 0 ? { $unset: unsetFields } : {})
        }
    );

    revalidatePath('/super-admin/agencies');
    revalidatePath(`/super-admin/agencies/${agencyId}`);

    return true;
}

/**
 * Extend agency trial by N days
 */
export async function extendTrial(agencyId: string, days: number) {
    const sa = await verifySuperAdmin();
    await connectDB();

    if (!days || days < 1 || days > 365) {
        throw new Error('Days must be between 1 and 365');
    }

    const agency = await AgencyModel.findOne({ id: agencyId }).lean();
    if (!agency) throw new Error('Agency not found');

    // Calculate new trial end date
    const currentEnd = agency.trialEndsAt ? new Date(agency.trialEndsAt) : new Date();
    // If expired, extend from now; if still active, extend from current end
    const base = currentEnd < new Date() ? new Date() : currentEnd;
    base.setDate(base.getDate() + days);

    await AgencyModel.updateOne(
        { id: agencyId },
        {
            $set: {
                status: 'trial',
                trialEndsAt: base.toISOString(),
                updatedAt: new Date().toISOString()
            }
        }
    );

    await logSystemEvent({
        event: 'Trial Extended',
        type: 'agency',
        detail: `${(agency as any).name || agencyId} trial extended by ${days} days (new end: ${base.toLocaleDateString()})`,
        status: 'info',
        agencyId,
        userId: sa.userId,
    });

    revalidatePath('/super-admin/agencies');
    revalidatePath(`/super-admin/agencies/${agencyId}`);

    return true;
}


// =============================================================================
// Singularity AI Configuration (Per-Agency)
// =============================================================================

/**
 * Get AI config for a specific agency (super-admin only)
 */
export async function getAgencyAIConfigSuperAdmin(agencyId: string): Promise<AIConfig | null> {
    await verifySuperAdmin();
    await connectDB();

    const agency = await AgencyModel.findOne({ id: agencyId }).lean();
    if (!agency) throw new Error("Agency not found");

    if (!agency.aiConfig) return null;
    const config = toSerializable(agency.aiConfig) as AIConfig;
    // Mask the API key — super-admin UI only needs to know one is configured (BUG-278)
    if (config?.apiKey) {
        const decrypted = decryptApiKey(config.apiKey);
        config.apiKey = decrypted.length > 4 ? '****' + decrypted.slice(-4) : '****';
    }
    return config;
}

/**
 * Update AI config for a specific agency (super-admin only)
 */
export async function updateAgencyAIConfigSuperAdmin(agencyId: string, config: AIConfig) {
    await verifySuperAdmin();
    await connectDB();

    // Validate required fields
    if (!config.provider || !config.apiKey || !config.model) {
        throw new Error("Provider, API Key, and Model are required");
    }

    // Validate provider
    const validProviders = ['gemini', 'openai', 'nvidia', 'github'];
    if (!validProviders.includes(config.provider)) {
        throw new Error(`Invalid provider: ${config.provider}`);
    }
    // Input sanitization
    config.model = sanitizeString(config.model, 200);
    if (config.customModelId) config.customModelId = sanitizeString(config.customModelId, 200);

    const result = await AgencyModel.updateOne(
        { id: agencyId },
        {
            $set: {
                aiConfig: {
                    provider: config.provider,
                    apiKey: encryptApiKey(config.apiKey), // Encrypt before storing
                    model: config.model,
                    ...(config.customModelId ? { customModelId: config.customModelId } : {})
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
    await verifySuperAdmin();
    await connectDB();

    const settings = await SystemSettingsModel.findOne({ key: 'global' }).lean();
    const config = (settings as any)?.defaultAiConfig;
    if (!config?.provider || !config?.apiKey || !config?.model) return null;

    // Return with masked key for display
    const maskedConfig = { ...toSerializable(config) } as AIConfig;
    if (maskedConfig.apiKey) {
        const decrypted = decryptApiKey(maskedConfig.apiKey);
        maskedConfig.apiKey = decrypted.length > 4 ? '****' + decrypted.slice(-4) : '****';
    }
    return maskedConfig;
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
        if (!config.provider || !config.apiKey || !config.model) {
            throw new Error("Provider, API Key, and Model are required");
        }
        const validProviders = ['gemini', 'openai', 'nvidia', 'github'];
        if (!validProviders.includes(config.provider)) {
            throw new Error(`Invalid provider: ${config.provider}`);
        }

        await SystemSettingsModel.updateOne(
            { key: 'global' },
            {
                $set: {
                    defaultAiConfig: {
                        provider: config.provider,
                        apiKey: encryptApiKey(config.apiKey),
                        model: sanitizeString(config.model, 200),
                        ...(config.customModelId ? { customModelId: sanitizeString(config.customModelId, 200) } : {}),
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
export async function getDefaultAiConfigForSignup(): Promise<Record<string, any> | null> {
    await connectDB();
    const settings = await SystemSettingsModel.findOne({ key: 'global' }).lean();
    const config = (settings as any)?.defaultAiConfig;
    if (!config?.provider || !config?.apiKey || !config?.model) return null;
    return toSerializable(config);
}

// =============================================================================
// System Settings (Global platform settings)
// =============================================================================

export async function getSystemSettings() {
    await verifySuperAdmin();
    await connectDB();
    let settings = await SystemSettingsModel.findOne({ key: 'global' }).lean();
    if (!settings) {
        settings = await SystemSettingsModel.create({ key: 'global' });
        settings = settings.toObject();
    }
    return toSerializable(settings);
}

/** Public read of security settings — no auth required (used by signup route) */
export async function getPublicSecuritySettings(): Promise<{
    allowSelfRegistration: boolean;
    enforceStrongPasswords: boolean;
}> {
    await connectDB();
    const settings = await SystemSettingsModel.findOne(
        { key: 'global' },
        { 'security.allowSelfRegistration': 1, 'security.enforceStrongPasswords': 1 }
    ).lean() as any;
    return {
        allowSelfRegistration: settings?.security?.allowSelfRegistration ?? false,
        enforceStrongPasswords: settings?.security?.enforceStrongPasswords ?? true,
    };
}

/** Public read of platform default currency — no auth required */
export async function getDefaultCurrency(): Promise<string> {
    await connectDB();
    const settings = await SystemSettingsModel.findOne(
        { key: 'global' },
        { 'platform.defaultCurrency': 1 }
    ).lean() as any;
    return settings?.platform?.defaultCurrency || 'USD';
}

/** Public read of notification defaults — no auth required (used by actions.ts) */
export async function getNotificationDefaults(): Promise<Record<string, boolean>> {
    await connectDB();
    const settings = await SystemSettingsModel.findOne(
        { key: 'global' },
        { 'notificationDefaults': 1 }
    ).lean() as any;
    return {
        welcome: settings?.notificationDefaults?.welcome ?? true,
        project: settings?.notificationDefaults?.project ?? true,
        task: settings?.notificationDefaults?.task ?? true,
        invoice: settings?.notificationDefaults?.invoice ?? true,
        salary: settings?.notificationDefaults?.salary ?? true,
        leave: settings?.notificationDefaults?.leave ?? true,
        refund: settings?.notificationDefaults?.refund ?? true,
        document: settings?.notificationDefaults?.document ?? true,
        security: settings?.notificationDefaults?.security ?? true,
    };
}

/** Read super-admin email alert settings — no auth (used internally) */
async function getSuperAdminAlertSettings(): Promise<{
    emailOnAgencyCreated: boolean;
    emailOnAgencySuspended: boolean;
    weeklySummary: boolean;
}> {
    await connectDB();
    const settings = await SystemSettingsModel.findOne(
        { key: 'global' },
        { 'notifications': 1 }
    ).lean() as any;
    return {
        emailOnAgencyCreated: settings?.notifications?.emailOnAgencyCreated ?? true,
        emailOnAgencySuspended: settings?.notifications?.emailOnAgencySuspended ?? true,
        weeklySummary: settings?.notifications?.weeklySummary ?? false,
    };
}

/** Send an email alert to the super-admin */
async function sendSuperAdminAlertEmail(subject: string, body: string) {
    try {
        const sa = await SuperAdminModel.findOne({}).select('email name').lean() as any;
        if (!sa?.email) return;
        const { sendEmail } = await import("../brevo");
        // subject is used in visible <h2> — escape it
        const escSubject = subject.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
        await sendEmail({
            to: sa.email,
            toName: sa.name || 'Super Admin',
            subject,
            htmlContent: `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px;background:#f8f9fa;border-radius:8px;">
                <h2 style="margin:0 0 16px;color:#1a1a2e;">${escSubject}</h2>
                <div style="background:#fff;padding:20px;border-radius:6px;border:1px solid #e5e7eb;color:#374151;line-height:1.6;">${body}</div>
                <p style="margin:16px 0 0;font-size:12px;color:#9ca3af;">This is an automated alert from your AgencyOS platform.</p>
            </div>`,
        });
    } catch (e) {
        console.error('Failed to send super-admin alert email:', e);
    }
}

export async function updateSystemSettings(section: 'platform' | 'security' | 'notifications' | 'emailDefaults' | 'notificationDefaults', data: Record<string, any>) {
    await verifySuperAdmin();
    await connectDB();

    const DANGEROUS_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

    // Build $set object with section prefix
    const setObj: Record<string, any> = {};
    for (const [k, v] of Object.entries(data)) {
        if (DANGEROUS_KEYS.has(k)) continue;
        if (typeof v === 'string') {
            setObj[`${section}.${k}`] = v.slice(0, 500);
        } else if (typeof v === 'boolean') {
            setObj[`${section}.${k}`] = v;
        } else if (typeof v === 'object' && v !== null) {
            // Handle nested objects (e.g. taskEmailEvents.taskCreated.enabled)
            for (const [nk, nv] of Object.entries(v)) {
                if (DANGEROUS_KEYS.has(nk)) continue;
                if (typeof nv === 'boolean') {
                    setObj[`${section}.${k}.${nk}`] = nv;
                } else if (typeof nv === 'object' && nv !== null) {
                    for (const [nnk, nnv] of Object.entries(nv)) {
                        if (DANGEROUS_KEYS.has(nnk)) continue;
                        if (typeof nnv === 'boolean') {
                            setObj[`${section}.${k}.${nk}.${nnk}`] = nnv;
                        }
                    }
                }
            }
        }
    }

    await SystemSettingsModel.updateOne(
        { key: 'global' },
        { $set: setObj },
        { upsert: true }
    );

    await logSystemEvent({
        event: 'Settings Updated',
        type: 'system',
        detail: `${section} settings were updated`,
        status: 'success',
    });

    revalidatePath('/super-admin/settings');
    return true;
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
    meta?: Record<string, any>;
}) {
    try {
        await connectDB();
        await SystemLogModel.create(entry);
    } catch (err) {
        console.error('[SystemLog] Failed to write log:', err);
    }
}

export async function getSystemLogs(limit = 100) {
    await verifySuperAdmin();
    await connectDB();
    const logs = await SystemLogModel.find({})
        .sort({ createdAt: -1 })
        .limit(limit)
        .lean();
    return toSerializable(logs);
}

// =============================================================================
// Newsletter Subscription (Brevo Contact List)
// =============================================================================

export async function subscribeNewsletter(email: string) {
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return { error: 'Please enter a valid email address.' };
    }

    const apiKey = process.env.BREVO_API_KEY;
    if (!apiKey) {
        return { error: 'Newsletter service is not configured.' };
    }

    try {
        const res = await fetch('https://api.brevo.com/v3/contacts', {
            method: 'POST',
            headers: {
                'accept': 'application/json',
                'content-type': 'application/json',
                'api-key': apiKey,
            },
            body: JSON.stringify({
                email,
                updateEnabled: true,
            }),
        });

        if (res.status === 201 || res.status === 204) {
            return { success: true };
        }

        const body = await res.json().catch(() => ({}));
        if (body.code === 'duplicate_parameter') {
            return { success: true }; // Already subscribed
        }

        return { error: 'Could not subscribe. Please try again later.' };
    } catch {
        return { error: 'Network error. Please try again later.' };
    }
}

// =============================================================================
// AI USAGE MONITORING
// =============================================================================

/**
 * Get AI usage overview stats (totals, by feature, recent trend)
 */
export async function getAIUsageOverview(days: number = 30) {
    await verifySuperAdmin();
    await connectDB();

    const since = new Date();
    since.setDate(since.getDate() - days);

    const [totals, byFeature, byDay, byProvider] = await Promise.all([
        // Overall totals
        AIUsageLogModel.aggregate([
            { $match: { createdAt: { $gte: since } } },
            { $group: {
                _id: null,
                totalRequests: { $sum: 1 },
                totalInputTokens: { $sum: { $ifNull: ['$inputTokens', 0] } },
                totalOutputTokens: { $sum: { $ifNull: ['$outputTokens', 0] } },
                totalTokens: { $sum: { $ifNull: ['$totalTokens', 0] } },
                successCount: { $sum: { $cond: ['$success', 1, 0] } },
                errorCount: { $sum: { $cond: ['$success', 0, 1] } },
            }}
        ]),
        // By feature
        AIUsageLogModel.aggregate([
            { $match: { createdAt: { $gte: since } } },
            { $group: {
                _id: '$feature',
                requests: { $sum: 1 },
                totalTokens: { $sum: { $ifNull: ['$totalTokens', 0] } },
                inputTokens: { $sum: { $ifNull: ['$inputTokens', 0] } },
                outputTokens: { $sum: { $ifNull: ['$outputTokens', 0] } },
            }},
            { $sort: { requests: -1 } }
        ]),
        // Daily trend
        AIUsageLogModel.aggregate([
            { $match: { createdAt: { $gte: since } } },
            { $group: {
                _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
                requests: { $sum: 1 },
                tokens: { $sum: { $ifNull: ['$totalTokens', 0] } },
            }},
            { $sort: { _id: 1 } }
        ]),
        // By provider
        AIUsageLogModel.aggregate([
            { $match: { createdAt: { $gte: since } } },
            { $group: {
                _id: '$provider',
                requests: { $sum: 1 },
                totalTokens: { $sum: { $ifNull: ['$totalTokens', 0] } },
            }},
            { $sort: { requests: -1 } }
        ]),
    ]);

    return {
        totals: totals[0] || { totalRequests: 0, totalInputTokens: 0, totalOutputTokens: 0, totalTokens: 0, successCount: 0, errorCount: 0 },
        byFeature,
        byDay,
        byProvider,
        days,
    };
}

/**
 * Get AI usage breakdown per agency
 */
export async function getAIUsageByAgency(days: number = 30) {
    await verifySuperAdmin();
    await connectDB();

    const since = new Date();
    since.setDate(since.getDate() - days);

    const usage = await AIUsageLogModel.aggregate([
        { $match: { createdAt: { $gte: since } } },
        { $group: {
            _id: '$agencyId',
            totalRequests: { $sum: 1 },
            totalTokens: { $sum: { $ifNull: ['$totalTokens', 0] } },
            inputTokens: { $sum: { $ifNull: ['$inputTokens', 0] } },
            outputTokens: { $sum: { $ifNull: ['$outputTokens', 0] } },
        }},
        { $sort: { totalRequests: -1 } }
    ]);

    // Enrich with agency names
    const agencyIds = usage.map((u: any) => u._id).filter(Boolean);
    const agencies = await AgencyModel.find(
        { id: { $in: agencyIds } },
        { id: 1, name: 1, slug: 1, 'usage.storage': 1, 'limits.maxStorage': 1, plan: 1 }
    ).lean();
    const agencyMap = new Map(agencies.map((a: any) => [a.id, a]));

    return usage.map((u: any) => {
        const agency = agencyMap.get(u._id);
        return {
            agencyId: u._id?.toString(),
            agencyName: agency?.name || 'Unknown',
            agencySlug: agency?.slug || '',
            plan: agency?.plan || '',
            storageUsed: agency?.usage?.storage || 0,
            storageLimit: agency?.limits?.maxStorage || 0,
            totalRequests: u.totalRequests,
            totalTokens: u.totalTokens,
            inputTokens: u.inputTokens,
            outputTokens: u.outputTokens,
        };
    });
}

/**
 * Get AI usage for a specific agency (per-user + per-feature breakdown)
 */
export async function getAIUsageForAgency(agencyId: string, days: number = 30) {
    await verifySuperAdmin();
    await connectDB();

    const since = new Date();
    since.setDate(since.getDate() - days);

    const [byUser, byFeature, recentLogs] = await Promise.all([
        AIUsageLogModel.aggregate([
            { $match: { agencyId, createdAt: { $gte: since } } },
            { $group: {
                _id: '$userId',
                totalRequests: { $sum: 1 },
                totalTokens: { $sum: { $ifNull: ['$totalTokens', 0] } },
            }},
            { $sort: { totalRequests: -1 } }
        ]),
        AIUsageLogModel.aggregate([
            { $match: { agencyId, createdAt: { $gte: since } } },
            { $group: {
                _id: '$feature',
                requests: { $sum: 1 },
                totalTokens: { $sum: { $ifNull: ['$totalTokens', 0] } },
            }},
            { $sort: { requests: -1 } }
        ]),
        AIUsageLogModel.find({ agencyId, createdAt: { $gte: since } })
            .sort({ createdAt: -1 })
            .limit(50)
            .lean()
    ]);

    // Enrich user names
    const userIds = byUser.map((u: any) => u._id).filter(Boolean);
    const users = await UserModel.find(
        { id: { $in: userIds } },
        { id: 1, name: 1, email: 1 }
    ).lean();
    const userMap = new Map(users.map((u: any) => [u.id, u]));

    return {
        byUser: byUser.map((u: any) => {
            const user = userMap.get(u._id);
            return {
                userId: u._id?.toString(),
                userName: user?.name || 'Unknown',
                userEmail: user?.email || '',
                totalRequests: u.totalRequests,
                totalTokens: u.totalTokens,
            };
        }),
        byFeature,
        recentLogs: JSON.parse(JSON.stringify(recentLogs)),
    };
}

/**
 * Get AI usage breakdown per user (across all agencies)
 */
export async function getAIUsageByUser(days: number = 30) {
    await verifySuperAdmin();
    await connectDB();

    const since = new Date();
    since.setDate(since.getDate() - days);

    const usage = await AIUsageLogModel.aggregate([
        { $match: { createdAt: { $gte: since } } },
        { $group: {
            _id: '$userId',
            agencyId: { $first: '$agencyId' },
            totalRequests: { $sum: 1 },
            totalTokens: { $sum: { $ifNull: ['$totalTokens', 0] } },
            inputTokens: { $sum: { $ifNull: ['$inputTokens', 0] } },
            outputTokens: { $sum: { $ifNull: ['$outputTokens', 0] } },
            lastUsed: { $max: '$createdAt' },
        }},
        { $sort: { totalRequests: -1 } }
    ]);

    const userIds = usage.map((u: any) => u._id).filter(Boolean);
    const agencyIds = [...new Set(usage.map((u: any) => u.agencyId).filter(Boolean))];

    const [users, agencies] = await Promise.all([
        UserModel.find({ id: { $in: userIds } }, { id: 1, name: 1, email: 1 }).lean(),
        AgencyModel.find({ id: { $in: agencyIds } }, { id: 1, name: 1 }).lean(),
    ]);

    const userMap = new Map((users as any[]).map((u) => [u.id, u]));
    const agencyMap = new Map((agencies as any[]).map((a) => [a.id, a]));

    return usage.map((u: any) => {
        const user = userMap.get(u._id);
        const agency = agencyMap.get(u.agencyId);
        return {
            userId: u._id?.toString() || '',
            userName: user?.name || 'Unknown',
            userEmail: user?.email || '',
            agencyName: agency?.name || 'Unknown',
            totalRequests: u.totalRequests,
            totalTokens: u.totalTokens,
            inputTokens: u.inputTokens,
            outputTokens: u.outputTokens,
            lastUsed: u.lastUsed ? new Date(u.lastUsed).toISOString() : null,
        };
    });
}

/**
 * Get storage usage across all agencies
 */
export async function getStorageByAgency() {
    await verifySuperAdmin();
    await connectDB();

    const agencies = await AgencyModel.find(
        {},
        { name: 1, slug: 1, plan: 1, 'usage.storage': 1, 'limits.maxStorage': 1 }
    ).sort({ 'usage.storage': -1 }).lean();


    return agencies.map((a: any) => ({
        agencyId: a._id.toString(),
        agencyName: a.name,
        agencySlug: a.slug,
        plan: a.plan,
        storageUsed: a.usage?.storage || 0,
        storageLimit: (a.limits?.maxStorage || 0) * 1024 * 1024, // Convert MB to bytes
    }));
}

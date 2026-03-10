"use server";

import { AgencyModel, UserModel, SuperAdminModel, ProjectModel, ClientModel, InvoiceModel, TransactionModel, TaskModel, AssetModel, ActivityModel, NotificationModel, ServiceModel, SettingsModel, LeaveRequestModel, MessageModel, SingularityChatSessionModel, SingularityCheckpointModel, SystemSettingsModel, SystemLogModel, connectDB, encryptApiKey, decryptApiKey } from "../mongodb";
import { Agency, User, AGENCY_PLANS, AIConfig } from "../types";
import { getSessionUser } from "../auth";
import { generateId } from "../utils-server";
import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { sanitizeName, sanitizeString, sanitizeMongoInput, sanitizeUpdates, validateEmail, validatePassword } from "../validation";

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
    // Use JSON.stringify replacer to strip _id and __v during serialization
    // This is safer and handles deep nesting automatically via the JSON engine
    const jsonString = JSON.stringify(obj, (key, value) => {
        if (key === '_id' || key === '__v') {
            return undefined;
        }
        return value;
    });

    return JSON.parse(jsonString);
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
    ownerEmail: string;
    ownerPassword: string;
    plan: 'free' | 'pro' | 'enterprise';
    customLimits?: Partial<Agency['limits']>;
    customFeatures?: Partial<Agency['features']>;
}) {
    const sa = await verifySuperAdmin();
    await connectDB();

    // Input sanitization
    data.name = sanitizeName(data.name, 200);
    if (!data.name) throw new Error('Agency name is required');
    data.ownerEmail = validateEmail(data.ownerEmail);
    validatePassword(data.ownerPassword);

    // Check if email already exists
    const existingUser = await UserModel.findOne({ email: data.ownerEmail });
    if (existingUser) {
        throw new Error('Email already in use');
    }

    const agencyId = generateId();
    const userId = generateId();

    // Get plan defaults
    const planDefaults = AGENCY_PLANS[data.plan];

    // Create agency
    const agency: Agency = {
        id: agencyId,
        name: data.name,
        slug: data.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
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
            systemName: 'AgencyOS',
            timezone: 'UTC',
            currency: 'USD',
            dateFormat: 'MM/DD/YYYY',
            allowClientRegistration: false,
            requireEmailVerification: false,
            enableTwoFactor: false,
            emailNotificationsEnabled: true
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdBy: sa.userId
    };

    // Create owner user
    const hashedPassword = await bcrypt.hash(data.ownerPassword, 12);
    const owner: User = {
        id: userId,
        agencyId,
        name: data.name + ' Owner',
        email: data.ownerEmail,
        password: hashedPassword,
        role: 'admin',
        username: data.ownerEmail.split('@')[0],
        phone: '',
        salary: 0,
        createdAt: new Date().toISOString()
    } as User;

    // Save to database
    await AgencyModel.create(agency);
    await UserModel.create(owner);

    await logSystemEvent({
        event: 'Agency Created',
        type: 'agency',
        detail: `${data.name} (${data.plan.toUpperCase()}) was registered`,
        status: 'success',
        agencyId,
        userId: sa.userId,
    });

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
 * Suspend agency
 */
export async function suspendAgency(agencyId: string, reason?: string) {
    const sa = await verifySuperAdmin();
    await connectDB();

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

    revalidatePath('/super-admin/agencies');

    return true;
}

/**
 * Update agency plan
 */
export async function updateAgencyPlan(agencyId: string, plan: 'free' | 'starter' | 'pro' | 'enterprise') {
    await verifySuperAdmin();
    await connectDB();

    const planDefaults = AGENCY_PLANS[plan];

    const updateFields: Record<string, any> = {
        plan,
        limits: planDefaults.limits,
        features: planDefaults.features,
        updatedAt: new Date().toISOString()
    };

    // When upgrading to a paid plan, activate the agency (ends trial)
    if (plan !== 'free') {
        updateFields.status = 'active';
    }

    await AgencyModel.updateOne(
        { id: agencyId },
        { $set: updateFields }
    );

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

export async function updateSystemSettings(section: 'platform' | 'security' | 'notifications', data: Record<string, any>) {
    await verifySuperAdmin();
    await connectDB();

    // Build $set object with section prefix
    const setObj: Record<string, any> = {};
    for (const [k, v] of Object.entries(data)) {
        if (typeof v === 'string') {
            setObj[`${section}.${k}`] = v.slice(0, 500);
        } else if (typeof v === 'boolean') {
            setObj[`${section}.${k}`] = v;
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

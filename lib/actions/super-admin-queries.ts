import "server-only";

import type { AIConfig } from "../types";
import {
    AgencyModel,
    AIUsageLogModel,
    ClientModel,
    ProjectModel,
    SystemLogModel,
    SystemSettingsModel,
    UserModel,
    connectDB,
    decryptApiKey,
} from "../mongodb";
import {
    type AgencyLookupRecord,
    type AIUsageByAgencyRow,
    type AIUsageByAgencyUserRow,
    type AIUsageByUserRow,
    type StoredAIConfig,
    type SystemSettingsRecord,
    type UserLookupRecord,
    toSerializable,
    verifySuperAdmin,
} from "./super-admin-shared";

export async function getAllAgenciesWithStatsImpl() {
    await verifySuperAdmin();
    await connectDB();

    const agencies = await AgencyModel.find({}).lean();
    const agenciesWithStats = await Promise.all(
        agencies.map(async (agency) => {
            const [userCount, projectCount, clientCount] = await Promise.all([
                UserModel.countDocuments({ agencyId: agency.id }),
                ProjectModel.countDocuments({ agencyId: agency.id }),
                ClientModel.countDocuments({ agencyId: agency.id }),
            ]);

            return {
                ...agency,
                stats: {
                    users: userCount,
                    projects: projectCount,
                    clients: clientCount,
                },
            };
        }),
    );

    return toSerializable(agenciesWithStats);
}

export async function getAgencyDetailsImpl(agencyId: string) {
    await verifySuperAdmin();
    await connectDB();

    const agency = await AgencyModel.findOne({ id: agencyId }).lean();
    if (!agency) {
        throw new Error('Agency not found');
    }

    const [userCount, projectCount, clientCount] = await Promise.all([
        UserModel.countDocuments({ agencyId }),
        ProjectModel.countDocuments({ agencyId }),
        ClientModel.countDocuments({ agencyId }),
    ]);

    const users = await UserModel.find({ agencyId }).select('-password').lean();

    return toSerializable({
        agency,
        stats: {
            users: userCount,
            projects: projectCount,
            clients: clientCount,
        },
        users,
    });
}

export async function getSystemAnalyticsImpl() {
    await verifySuperAdmin();
    await connectDB();

    const [totalAgencies, activeAgencies, suspendedAgencies, totalUsers] = await Promise.all([
        AgencyModel.countDocuments({}),
        AgencyModel.countDocuments({ status: 'active' }),
        AgencyModel.countDocuments({ status: 'suspended' }),
        UserModel.countDocuments({}),
    ]);

    const agenciesByPlan = await AgencyModel.aggregate([
        { $group: { _id: '$plan', count: { $sum: 1 } } },
    ]);

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
        recentAgencies,
    });
}

export async function getAgencyAIConfigSuperAdminImpl(agencyId: string): Promise<AIConfig | null> {
    await verifySuperAdmin();
    await connectDB();

    const agency = await AgencyModel.findOne({ id: agencyId }).lean();
    if (!agency) throw new Error("Agency not found");

    if (!agency.aiConfig) return null;
    const config = toSerializable(agency.aiConfig) as AIConfig;
    if (config?.apiKey) {
        const decrypted = decryptApiKey(config.apiKey);
        config.apiKey = decrypted.length > 4 ? '****' + decrypted.slice(-4) : '****';
    }
    // Mask nested feature config API keys too
    const featureKeys = ['chatConfig', 'agentConfig', 'taskExplainConfig', 'hourEstimateConfig', 'taskChatbotConfig'] as const;
    for (const key of featureKeys) {
        const fc = (config as Record<string, any>)[key];
        if (fc?.apiKey) {
            const decrypted = decryptApiKey(fc.apiKey);
            fc.apiKey = decrypted.length > 4 ? '****' + decrypted.slice(-4) : '****';
        }
    }
    return config;
}

export async function getDefaultAiConfigImpl(): Promise<AIConfig | null> {
    await verifySuperAdmin();
    await connectDB();

    const settings = await SystemSettingsModel.findOne({ key: 'global' }).lean() as SystemSettingsRecord | null;
    const config = settings?.defaultAiConfig;
    if (!config?.provider || !config?.apiKey || !config?.model) return null;

    const maskedConfig = { ...toSerializable(config) } as AIConfig;
    if (maskedConfig.apiKey) {
        const decrypted = decryptApiKey(maskedConfig.apiKey);
        maskedConfig.apiKey = decrypted.length > 4 ? '****' + decrypted.slice(-4) : '****';
    }
    // Mask nested feature config API keys too
    const featureKeys = ['chatConfig', 'agentConfig', 'taskExplainConfig', 'hourEstimateConfig', 'taskChatbotConfig'] as const;
    for (const key of featureKeys) {
        const fc = (maskedConfig as Record<string, any>)[key];
        if (fc?.apiKey) {
            const decrypted = decryptApiKey(fc.apiKey);
            fc.apiKey = decrypted.length > 4 ? '****' + decrypted.slice(-4) : '****';
        }
    }
    return maskedConfig;
}

export async function getDefaultAiConfigForSignupImpl(): Promise<StoredAIConfig | null> {
    await connectDB();
    const settings = await SystemSettingsModel.findOne({ key: 'global' }).lean() as SystemSettingsRecord | null;
    const config = settings?.defaultAiConfig;
    if (!config?.provider || !config?.apiKey || !config?.model) return null;
    return toSerializable(config);
}

export async function getSystemSettingsImpl(): Promise<SystemSettingsRecord | null> {
    await verifySuperAdmin();
    await connectDB();
    const settings = await SystemSettingsModel.findOne({ key: 'global' }).lean() as SystemSettingsRecord | null;
    if (settings) {
        return toSerializable(settings);
    }
    const createdSettings = await SystemSettingsModel.create({ key: 'global' });
    return toSerializable(createdSettings.toObject() as SystemSettingsRecord);
}

export async function getPublicSecuritySettingsImpl(): Promise<{
    allowSelfRegistration: boolean;
    enforceStrongPasswords: boolean;
}> {
    await connectDB();
    const settings = await SystemSettingsModel.findOne(
        { key: 'global' },
        { 'security.allowSelfRegistration': 1, 'security.enforceStrongPasswords': 1 },
    ).lean() as SystemSettingsRecord | null;
    return {
        allowSelfRegistration: settings?.security?.allowSelfRegistration ?? false,
        enforceStrongPasswords: settings?.security?.enforceStrongPasswords ?? true,
    };
}

export async function getDefaultCurrencyImpl(): Promise<string> {
    await connectDB();
    const settings = await SystemSettingsModel.findOne(
        { key: 'global' },
        { 'platform.defaultCurrency': 1 },
    ).lean() as SystemSettingsRecord | null;
    return settings?.platform?.defaultCurrency || 'USD';
}

export async function getNotificationDefaultsImpl(): Promise<Record<string, boolean>> {
    await connectDB();
    const settings = await SystemSettingsModel.findOne(
        { key: 'global' },
        { notificationDefaults: 1 },
    ).lean() as SystemSettingsRecord | null;
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

export async function getSystemLogsImpl(limit = 100) {
    await verifySuperAdmin();
    await connectDB();
    const logs = await SystemLogModel.find({})
        .sort({ createdAt: -1 })
        .limit(limit)
        .lean();
    return toSerializable(logs);
}

export async function getAIUsageOverviewImpl(days: number = 30) {
    await verifySuperAdmin();
    await connectDB();

    const since = new Date();
    since.setDate(since.getDate() - days);

    const [totals, byFeature, byDay, byProvider] = await Promise.all([
        AIUsageLogModel.aggregate([
            { $match: { createdAt: { $gte: since } } },
            {
                $group: {
                    _id: null,
                    totalRequests: { $sum: 1 },
                    totalInputTokens: { $sum: { $ifNull: ['$inputTokens', 0] } },
                    totalOutputTokens: { $sum: { $ifNull: ['$outputTokens', 0] } },
                    totalTokens: { $sum: { $ifNull: ['$totalTokens', 0] } },
                    successCount: { $sum: { $cond: ['$success', 1, 0] } },
                    errorCount: { $sum: { $cond: ['$success', 0, 1] } },
                },
            },
        ]),
        AIUsageLogModel.aggregate([
            { $match: { createdAt: { $gte: since } } },
            {
                $group: {
                    _id: '$feature',
                    requests: { $sum: 1 },
                    totalTokens: { $sum: { $ifNull: ['$totalTokens', 0] } },
                    inputTokens: { $sum: { $ifNull: ['$inputTokens', 0] } },
                    outputTokens: { $sum: { $ifNull: ['$outputTokens', 0] } },
                },
            },
            { $sort: { requests: -1 } },
        ]),
        AIUsageLogModel.aggregate([
            { $match: { createdAt: { $gte: since } } },
            {
                $group: {
                    _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
                    requests: { $sum: 1 },
                    tokens: { $sum: { $ifNull: ['$totalTokens', 0] } },
                },
            },
            { $sort: { _id: 1 } },
        ]),
        AIUsageLogModel.aggregate([
            { $match: { createdAt: { $gte: since } } },
            {
                $group: {
                    _id: '$provider',
                    requests: { $sum: 1 },
                    totalTokens: { $sum: { $ifNull: ['$totalTokens', 0] } },
                },
            },
            { $sort: { requests: -1 } },
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

export async function getAIUsageByAgencyImpl(days: number = 30) {
    await verifySuperAdmin();
    await connectDB();

    const since = new Date();
    since.setDate(since.getDate() - days);

    const usage = await AIUsageLogModel.aggregate([
        { $match: { createdAt: { $gte: since } } },
        {
            $group: {
                _id: '$agencyId',
                totalRequests: { $sum: 1 },
                totalTokens: { $sum: { $ifNull: ['$totalTokens', 0] } },
                inputTokens: { $sum: { $ifNull: ['$inputTokens', 0] } },
                outputTokens: { $sum: { $ifNull: ['$outputTokens', 0] } },
            },
        },
        { $sort: { totalRequests: -1 } },
    ]) as AIUsageByAgencyRow[];

    const agencyIds = usage.map((row) => row._id).filter((agencyId): agencyId is string => Boolean(agencyId));
    const agencies = await AgencyModel.find(
        { id: { $in: agencyIds } },
        { id: 1, name: 1, slug: 1, 'usage.storage': 1, 'limits.maxStorage': 1, plan: 1 },
    ).lean() as AgencyLookupRecord[];
    const agencyMap = new Map(agencies.map((agency) => [agency.id, agency] as const));

    return usage.map((row) => {
        const agency = row._id ? agencyMap.get(row._id) : undefined;
        return {
            agencyId: row._id?.toString() || '',
            agencyName: agency?.name || 'Unknown',
            agencySlug: agency?.slug || '',
            plan: agency?.plan || '',
            storageUsed: agency?.usage?.storage || 0,
            storageLimit: agency?.limits?.maxStorage || 0,
            totalRequests: row.totalRequests,
            totalTokens: row.totalTokens,
            inputTokens: row.inputTokens,
            outputTokens: row.outputTokens,
        };
    });
}

export async function getAIUsageForAgencyImpl(agencyId: string, days: number = 30) {
    await verifySuperAdmin();
    await connectDB();

    const since = new Date();
    since.setDate(since.getDate() - days);

    const [byUser, byFeature, recentLogs] = await Promise.all([
        AIUsageLogModel.aggregate([
            { $match: { agencyId, createdAt: { $gte: since } } },
            {
                $group: {
                    _id: '$userId',
                    totalRequests: { $sum: 1 },
                    totalTokens: { $sum: { $ifNull: ['$totalTokens', 0] } },
                },
            },
            { $sort: { totalRequests: -1 } },
        ]) as Promise<AIUsageByAgencyUserRow[]>,
        AIUsageLogModel.aggregate([
            { $match: { agencyId, createdAt: { $gte: since } } },
            {
                $group: {
                    _id: '$feature',
                    requests: { $sum: 1 },
                    totalTokens: { $sum: { $ifNull: ['$totalTokens', 0] } },
                },
            },
            { $sort: { requests: -1 } },
        ]),
        AIUsageLogModel.find({ agencyId, createdAt: { $gte: since } })
            .sort({ createdAt: -1 })
            .limit(50)
            .lean(),
    ]);

    const userIds = byUser.map((row) => row._id).filter((userId): userId is string => Boolean(userId));
    const users = await UserModel.find(
        { id: { $in: userIds } },
        { id: 1, name: 1, email: 1 },
    ).lean() as UserLookupRecord[];
    const userMap = new Map(users.map((user) => [user.id, user] as const));

    return {
        byUser: byUser.map((row) => {
            const user = row._id ? userMap.get(row._id) : undefined;
            return {
                userId: row._id?.toString(),
                userName: user?.name || 'Unknown',
                userEmail: user?.email || '',
                totalRequests: row.totalRequests,
                totalTokens: row.totalTokens,
            };
        }),
        byFeature,
        recentLogs: JSON.parse(JSON.stringify(recentLogs)),
    };
}

export async function getAIUsageByUserImpl(days: number = 30) {
    await verifySuperAdmin();
    await connectDB();

    const since = new Date();
    since.setDate(since.getDate() - days);

    const usage = await AIUsageLogModel.aggregate([
        { $match: { createdAt: { $gte: since } } },
        {
            $group: {
                _id: '$userId',
                agencyId: { $first: '$agencyId' },
                totalRequests: { $sum: 1 },
                totalTokens: { $sum: { $ifNull: ['$totalTokens', 0] } },
                inputTokens: { $sum: { $ifNull: ['$inputTokens', 0] } },
                outputTokens: { $sum: { $ifNull: ['$outputTokens', 0] } },
                lastUsed: { $max: '$createdAt' },
            },
        },
        { $sort: { totalRequests: -1 } },
    ]) as AIUsageByUserRow[];

    const userIds = usage.map((row) => row._id).filter((userId): userId is string => Boolean(userId));
    const agencyIds = [...new Set(usage.map((row) => row.agencyId).filter((agencyId): agencyId is string => Boolean(agencyId)))];

    const [users, agencies] = await Promise.all([
        UserModel.find({ id: { $in: userIds } }, { id: 1, name: 1, email: 1 }).lean() as Promise<UserLookupRecord[]>,
        AgencyModel.find({ id: { $in: agencyIds } }, { id: 1, name: 1 }).lean() as Promise<AgencyLookupRecord[]>,
    ]);

    const userMap = new Map(users.map((user) => [user.id, user] as const));
    const agencyMap = new Map(agencies.map((agency) => [agency.id, agency] as const));

    return usage.map((row) => {
        const user = row._id ? userMap.get(row._id) : undefined;
        const agency = row.agencyId ? agencyMap.get(row.agencyId) : undefined;
        return {
            userId: row._id?.toString() || '',
            userName: user?.name || 'Unknown',
            userEmail: user?.email || '',
            agencyName: agency?.name || 'Unknown',
            totalRequests: row.totalRequests,
            totalTokens: row.totalTokens,
            inputTokens: row.inputTokens,
            outputTokens: row.outputTokens,
            lastUsed: row.lastUsed ? new Date(row.lastUsed).toISOString() : null,
        };
    });
}

export async function getStorageByAgencyImpl() {
    await verifySuperAdmin();
    await connectDB();

    const agencies = await AgencyModel.find(
        {},
        { id: 1, name: 1, slug: 1, plan: 1, 'usage.storage': 1, 'limits.maxStorage': 1 },
    ).sort({ 'usage.storage': -1 }).lean() as AgencyLookupRecord[];

    return agencies.map((agency) => ({
        agencyId: agency.id,
        agencyName: agency.name || 'Unknown',
        agencySlug: agency.slug || '',
        plan: agency.plan || '',
        storageUsed: agency.usage?.storage || 0,
        storageLimit: (agency.limits?.maxStorage || 0) * 1024 * 1024,
    }));
}

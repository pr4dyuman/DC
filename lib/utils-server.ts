import { connectDB, UserModel, ClientModel, SuperAdminModel, decryptApiKey } from "./mongodb";
import { User, AIBloggerConfig, AIConfig } from "./types";
import { randomUUID } from "crypto";
import { getCurrentAgency } from "./agency-context";
import { AI_BLOGGER_STAGE_KEYS } from "./ai-blogger-config";

type ResolvedUser = Omit<User, "role"> & {
    role: User["role"] | "superadmin";
    agencyId?: string;
};

export function generateId(): string {
    return randomUUID();
}

/**
 * Resolves a User or Client by ID or Username.
 * If found as a Client, adapts it to the User type.
 * @param agencyId - Optional agency scope. When provided, User/Client queries are
 *                   restricted to that agency to prevent cross-tenant data access.
 */
export async function resolveUserOrClient(identifier: string, agencyId?: string): Promise<ResolvedUser | undefined> {
    await connectDB();

    // Build agency-scoped filter for multi-tenancy safety
    const agencyScope = agencyId ? { agencyId } : {};

    // Parallel lookup for maximum performance
    const [user, client, superAdmin] = await Promise.all([
        UserModel.findOne({ $or: [{ id: identifier }, { username: identifier }], ...agencyScope }).select('-password').lean(),
        ClientModel.findOne({ $or: [{ id: identifier }, { username: identifier }], ...agencyScope }).select('-password').lean(),
        SuperAdminModel.findOne({ id: identifier }).select('-password').lean() // SuperAdmin is global, not tenant-scoped
    ]);

    // 1. Check User
    if (user) {
        return {
            ...user,
            id: user.id || user._id.toString(), // Ensure ID is string
            agencyId: user.agencyId || agencyId
        } as ResolvedUser;
    }

    // 2. Check Super Admin
    if (superAdmin) {
        return {
            id: superAdmin.id,
            name: superAdmin.name,
            email: superAdmin.email,
            role: 'superadmin',
            avatar: superAdmin.avatar,
            createdAt: superAdmin.createdAt,
            agencyId: 'super-admin'
        } as ResolvedUser;
    }

    // 3. Check Client
    if (client) {
        return {
            id: client.id,
            name: client.name,
            email: client.email,
            role: 'client',
            jobTitle: client.companyName,
            avatar: client.logo || `https://api.dicebear.com/7.x/initials/svg?seed=${client.companyName}`,
            lastActiveAt: client.lastActiveAt,
            username: client.username || client.id,
            agencyId: client.agencyId || agencyId
        } as ResolvedUser;
    }

    return undefined;
}

// Server-only: returns AI config with real decrypted key (NOT a server action)
export async function getAgencyAIConfigServer(): Promise<AIConfig | null> {
    await connectDB();
    const agency = await getCurrentAgency();
    if (!agency || !agency.aiConfig) return null;
    const config = agency.aiConfig as AIConfig;
    if (config?.apiKey) config.apiKey = decryptApiKey(config.apiKey);

    const featureKeys = ["chatConfig", "agentConfig", "taskExplainConfig", "hourEstimateConfig", "taskChatbotConfig", "heavyTasksConfig"] as const;
    for (const key of featureKeys) {
        const featureConfig = config[key];
        if (featureConfig?.apiKey) {
            featureConfig.apiKey = decryptApiKey(featureConfig.apiKey);
        }
    }

    return config;
}

export async function getAgencyAIBloggerConfigServer(): Promise<AIBloggerConfig | null> {
    await connectDB();
    const agency = await getCurrentAgency();
    if (!agency || !agency.aiBloggerConfig) return null;

    const config = agency.aiBloggerConfig as AIBloggerConfig;

    if (config.trends?.apiKey) {
        config.trends.apiKey = decryptApiKey(config.trends.apiKey);
    }

    if (config.trends?.fallbackApiKey) {
        config.trends.fallbackApiKey = decryptApiKey(config.trends.fallbackApiKey);
    }

    if (config.serp?.apiKey) {
        config.serp.apiKey = decryptApiKey(config.serp.apiKey);
    }

    if (config.serp?.fallbackApiKey) {
        config.serp.fallbackApiKey = decryptApiKey(config.serp.fallbackApiKey);
    }

    if (config.searchConsole?.credentialsJson) {
        config.searchConsole.credentialsJson = decryptApiKey(config.searchConsole.credentialsJson);
    }

    if (config.pagePerformance?.apiKey) {
        config.pagePerformance.apiKey = decryptApiKey(config.pagePerformance.apiKey);
    }

    if (config.imageGeneration?.apiKey) {
        config.imageGeneration.apiKey = decryptApiKey(config.imageGeneration.apiKey);
    }

    if (config.imageGeneration?.fallbackApiKey) {
        config.imageGeneration.fallbackApiKey = decryptApiKey(config.imageGeneration.fallbackApiKey);
    }

    if (config.publishRules?.aiReviewPolicy?.apiKey) {
        config.publishRules.aiReviewPolicy.apiKey = decryptApiKey(config.publishRules.aiReviewPolicy.apiKey);
    }

    for (const key of AI_BLOGGER_STAGE_KEYS) {
        const stageConfig = config[key];
        if (!stageConfig) continue;

        if (stageConfig.apiKey) {
            stageConfig.apiKey = decryptApiKey(stageConfig.apiKey);
        }

        if (stageConfig.fallbackApiKey) {
            stageConfig.fallbackApiKey = decryptApiKey(stageConfig.fallbackApiKey);
        }
    }

    return config;
}

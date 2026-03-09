import { connectDB, UserModel, ClientModel, SuperAdminModel, decryptApiKey } from "./mongodb";
import { User, AIConfig } from "./types";
import { randomUUID } from "crypto";
import { getCurrentAgency } from "./agency-context";

export function generateId(): string {
    return randomUUID();
}

/**
 * Resolves a User or Client by ID or Username.
 * If found as a Client, adapts it to the User type.
 * @param agencyId - Optional agency scope. When provided, User/Client queries are
 *                   restricted to that agency to prevent cross-tenant data access.
 */
export async function resolveUserOrClient(identifier: string, agencyId?: string): Promise<User | undefined> {
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
            agencyId: user.agencyId || 'default-agency' // Fallback
        } as any as User;
    }

    // 2. Check Super Admin
    if (superAdmin) {
        return {
            id: superAdmin.id,
            name: superAdmin.name,
            email: superAdmin.email,
            role: 'superadmin' as any, // Cast to any to bypass strict User role enum if needed
            avatar: superAdmin.avatar,
            createdAt: superAdmin.createdAt,
            agencyId: 'super-admin'
        } as any as User;
    }

    // 3. Check Client
    if (client) {
        return {
            id: client.id,
            name: client.name,
            email: client.email,
            role: 'client' as any,
            jobTitle: client.companyName,
            avatar: client.logo || `https://api.dicebear.com/7.x/initials/svg?seed=${client.companyName}`,
            lastActiveAt: client.lastActiveAt,
            username: client.username || client.id,
            agencyId: client.agencyId || 'default-agency'
        } as User;
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
    return config;
}

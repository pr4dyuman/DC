import { connectDB, UserModel, ClientModel, SuperAdminModel } from "./mongodb";
import { User } from "./types"; // Ensure User type is imported

export function generateId(): string {
    return Math.random().toString(36).substr(2, 9);
}

/**
 * Resolves a User or Client by ID or Username.
 * If found as a Client, adapts it to the User type.
 */
export async function resolveUserOrClient(identifier: string): Promise<User | undefined> {
    await connectDB();

    // Parallel lookup for maximum performance
    const [user, client, superAdmin] = await Promise.all([
        UserModel.findOne({ $or: [{ id: identifier }, { username: identifier }] }).lean(),
        ClientModel.findOne({ $or: [{ id: identifier }, { username: identifier }] }).lean(),
        SuperAdminModel.findOne({ id: identifier }).lean()
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

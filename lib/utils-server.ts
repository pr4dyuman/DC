
import { db, User } from "./db";

export function generateId(): string {
    return Math.random().toString(36).substr(2, 9);
}

/**
 * Resolves a User or Client by ID or Username.
 * If found as a Client, adapts it to the User type.
 */
export async function resolveUserOrClient(identifier: string): Promise<User | undefined> {
    const data = await db.get();

    // 1. Try finding by username in Users
    let user = data.users.find(u => u.username === identifier);

    // 2. If not found, try finding by ID in Users (Fallback)
    if (!user) {
        user = data.users.find(u => u.id === identifier);
    }

    // 2.1 Check Super Admins
    if (!user && data.superAdmins) {
        const sa = data.superAdmins.find(s => s.id === identifier);
        if (sa) {
            user = {
                id: sa.id,
                name: sa.name,
                email: sa.email,
                role: 'superadmin' as any,
                avatar: sa.avatar,
                createdAt: sa.createdAt,
                agencyId: 'super-admin'
            } as any as User;
        }
    }

    // 3. If still not found, check Clients (by ID or potential future username)
    if (!user && data.clients) {
        const client = data.clients.find(c => c.id === identifier || (c as any).username === identifier);
        if (client) {
            // Adapt Client to User type
            user = {
                id: client.id,
                name: client.name,
                email: client.email,
                role: 'client' as any,
                jobTitle: client.companyName,
                avatar: `https://api.dicebear.com/7.x/initials/svg?seed=${client.companyName}`,
                lastActiveAt: client.lastActiveAt,
                username: client.username || client.id
            } as User;
        }
    }

    return user;
}

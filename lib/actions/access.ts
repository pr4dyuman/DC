import "server-only";

import type { Client, User } from "../db";
import { getSessionId, getSessionUser } from "../auth";
import {
    ClientModel,
    ProjectModel,
    SettingsModel,
    SuperAdminModel,
    TaskModel,
    UserModel,
    connectDB,
} from "../mongodb";
import { sanitizeDoc } from "./shared";

export type AllowedRole = 'admin' | 'manager' | 'employee' | 'client' | 'superadmin';

export type CurrentUserResult = Omit<User, 'role'> & {
    role: User['role'] | 'superadmin';
    avatar?: string;
    username?: string;
};

export type ActionActor = {
    id: string;
    name: string;
    role: string;
    timezone?: string;
};

type AIPermissionSettingsSnapshot = {
    userPermissions?: Record<string, { canUseAI?: boolean }>;
};

export async function getCurrentUserImpl(): Promise<CurrentUserResult | null> {
    await connectDB();

    const session = await getSessionUser();
    if (session) {
        const now = new Date().toISOString();
        if (session.role === 'superadmin') {
            const admin = await SuperAdminModel.findOne({ id: session.userId }).select('-password').lean() as CurrentUserResult | null;
            if (admin) return sanitizeDoc(admin) as CurrentUserResult;
        } else if (session.role === 'client') {
            const client = await ClientModel.findOne({ id: session.userId }).select('-password').lean() as Client | null;
            if (client) {
                const lastActive = client.lastActiveAt ? new Date(client.lastActiveAt).getTime() : 0;
                if (Date.now() - lastActive > 5 * 60 * 1000) {
                    ClientModel.updateOne({ id: session.userId }, { $set: { lastActiveAt: now } }).catch(() => { });
                }
                return sanitizeDoc({ ...client, role: 'client' }) as CurrentUserResult;
            }
        } else {
            const user = await UserModel.findOne({ id: session.userId }).select('-password').lean() as User | null;
            if (user) {
                const lastActive = user.lastActiveAt ? new Date(user.lastActiveAt).getTime() : 0;
                if (Date.now() - lastActive > 5 * 60 * 1000) {
                    UserModel.updateOne({ id: session.userId }, { $set: { lastActiveAt: now } }).catch(() => { });
                }
                return sanitizeDoc(user) as User;
            }
        }
    }

    const userId = await getSessionId();
    if (!userId) return null;

    const superAdmin = await SuperAdminModel.findOne({ id: userId }).select('-password').lean() as CurrentUserResult | null;
    if (superAdmin) return sanitizeDoc(superAdmin) as CurrentUserResult;

    const user = await UserModel.findOne({ id: userId }).select('-password').lean() as User | null;
    if (user) return sanitizeDoc(user) as User;

    const client = await ClientModel.findOne({ id: userId }).select('-password').lean() as Client | null;
    if (client) {
        return sanitizeDoc({
            id: client.id,
            name: client.name,
            email: client.email,
            role: 'client',
            agencyId: client.agencyId,
            avatar: client.logo,
            username: client.username || client.id.substring(0, 8),
        }) as CurrentUserResult;
    }

    return null;
}

export async function requireAuth() {
    const user = await getCurrentUserImpl();
    if (!user) throw new Error("Unauthorized: You must be logged in.");
    return user;
}

export async function requireRole(...roles: AllowedRole[]) {
    const user = await requireAuth();
    if (!roles.includes(user.role as AllowedRole)) {
        const allowed = roles.map((role) => role.charAt(0).toUpperCase() + role.slice(1)).join(' / ');
        throw new Error(`Unauthorized: This action requires ${allowed} access.`);
    }
    return user;
}

export function toActionActor(user: ActionActor): ActionActor {
    return {
        id: user.id,
        name: user.name,
        role: user.role,
        timezone: user.timezone,
    };
}

export async function getScopedProjectIdsForCurrentUser(agencyId: string): Promise<string[] | null> {
    const currentUser = await requireAuth();
    if (currentUser.role === 'admin' || currentUser.role === 'manager' || currentUser.role === 'superadmin') {
        return null;
    }

    if (currentUser.role === 'client') {
        return await ProjectModel.distinct('id', { clientId: currentUser.id, agencyId });
    }

    return await TaskModel.distinct('projectId', { assigneeId: currentUser.id, agencyId });
}

export async function canCurrentUserAccessProject(projectId: string, agencyId: string): Promise<boolean> {
    const currentUser = await requireAuth();

    if (currentUser.role === 'admin' || currentUser.role === 'manager' || currentUser.role === 'superadmin') {
        return true;
    }

    if (currentUser.role === 'client') {
        return !!await ProjectModel.exists({ id: projectId, agencyId, clientId: currentUser.id });
    }

    return !!await TaskModel.exists({ projectId, agencyId, assigneeId: currentUser.id });
}

export async function hasExplicitAIAccessSetting(
    actor: Pick<ActionActor, "id" | "role">,
    agencyId: string,
): Promise<boolean | null> {
    if (actor.role === "admin" || actor.role === "manager" || actor.role === "superadmin") {
        return true;
    }

    await connectDB();

    const settings = await SettingsModel.findOne({ agencyId })
        .select("userPermissions")
        .lean() as AIPermissionSettingsSnapshot | null;

    if (!settings?.userPermissions || !(actor.id in settings.userPermissions)) {
        return null;
    }

    return settings.userPermissions[actor.id]?.canUseAI !== false;
}

export async function ensureAIAccess(
    actor: Pick<ActionActor, "id" | "role">,
    agencyId: string,
) {
    const hasAIAccess = await hasExplicitAIAccessSetting(actor, agencyId);
    if (hasAIAccess === false) {
        throw new Error("Unauthorized: AI access is disabled for this account.");
    }
}

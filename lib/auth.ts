"use server";

import { cookies } from "next/headers";
import { SuperAdminModel, UserModel, ClientModel, connectDB, RateLimitModel, SystemSettingsModel } from "./mongodb";
import bcrypt from "bcryptjs";
import { signToken, verifyToken, AuthSession } from "./auth-utils";
import { validatePassword, validateStrongPassword } from "./validation";

import { validateEmail } from "./validation";

// --- Rate limiting for login (MongoDB-backed) ---
const MAX_LOGIN_ATTEMPTS = 10;
const LOGIN_WINDOW_MS = 15 * 60 * 1000; // 15 minutes

type RateLimitRecord = {
    count?: number;
};

type SecuritySettingsRecord = {
    security?: {
        enforceStrongPasswords?: boolean;
    };
};

type ArchivedLoginCandidate = {
    archived?: boolean;
    password?: string;
    id: string;
    agencyId?: string;
};

type ArchivedUserCandidate = ArchivedLoginCandidate & {
    role: string;
};

type PasswordDocument = {
    password?: string;
};

function getErrorMessage(error: unknown, fallback: string): string {
    return error instanceof Error && error.message ? error.message : fallback;
}

async function checkLoginRateLimit(email: string): Promise<void> {
    const key = `login:${email.toLowerCase().trim()}`;
    const now = new Date();
    const record = await RateLimitModel.findOne({ key, expiresAt: { $gt: now } }).lean();
    if (record) {
        if (((record as RateLimitRecord).count ?? 0) >= MAX_LOGIN_ATTEMPTS) {
            throw new Error('Too many login attempts. Please try again later.');
        }
        await RateLimitModel.updateOne({ key }, { $inc: { count: 1 } });
    } else {
        await RateLimitModel.findOneAndUpdate(
            { key },
            { count: 1, expiresAt: new Date(now.getTime() + LOGIN_WINDOW_MS) },
            { upsert: true }
        );
    }
}

async function resetLoginRateLimit(email: string): Promise<void> {
    await RateLimitModel.deleteOne({ key: `login:${email.toLowerCase().trim()}` });
}

// --- Password Utilities ---

export async function hashPassword(password: string): Promise<string> {
    const salt = await bcrypt.genSalt(12);
    return bcrypt.hash(password, salt);
}

export async function comparePassword(plain: string, stored: string): Promise<boolean> {
    // Only compare against properly hashed passwords
    if (stored.startsWith('$2a$') || stored.startsWith('$2b$') || stored.startsWith('$2y$')) {
        return bcrypt.compare(plain, stored);
    }
    // Reject login if password is not hashed — run migrate-passwords script to fix
    return false;
}

// --- Session Management ---

export async function getSessionId() {
    const cookieStore = await cookies();
    // Only accept JWT — legacy cookie fallback removed for security
    const token = cookieStore.get("auth_token")?.value;
    if (token) {
        const session = await verifyToken(token);
        if (session) return session.userId;
    }
    return undefined;
}

export async function login(userId: string, role: string, agencyId?: string): Promise<void> {
    const token = await signToken({ userId, role, agencyId });
    const cookieStore = await cookies();

    // Set secure HTTP-only cookie
    cookieStore.set("auth_token", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 60 * 24 // 24 hours
    });

    // Client-readable indicator (NOT the token itself) so Navigation can show Dashboard vs Login
    cookieStore.set("logged_in", "1", { httpOnly: false, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 });
}

export async function logout() {
    const cookieStore = await cookies();
    cookieStore.delete("auth_token");
    cookieStore.delete("selectedAgencyId");
    cookieStore.delete("logged_in");
    // Also clean up any remaining legacy cookies
    cookieStore.delete("userId");
    cookieStore.delete("userRole");
}

/**
 * Check if current user is a super admin
 */
export async function isSuperAdmin(): Promise<boolean> {
    const session = await getSessionUser();
    return session?.role === 'superadmin';
}

/**
 * Get current session user with role
 */
export async function getSessionUser(): Promise<AuthSession | null> {
    const cookieStore = await cookies();
    const token = cookieStore.get("auth_token")?.value;

    if (token) {
        return verifyToken(token);
    }

    // No JWT token = not authenticated (legacy fallback removed for security)
    return null;
}

export type LoginResult = {
    success: boolean;
    error?: string;
    redirectTo?: string;
};

export async function authenticateUser(email: string, password: string): Promise<LoginResult> {
    // Validate email format and normalize to lowercase before DB queries
    try {
        email = validateEmail(email);
    } catch {
        return { success: false, error: "Invalid email or password" };
    }

    try {
        await connectDB();
        // Rate limiting check
        await checkLoginRateLimit(email);
    } catch (error: unknown) {
        return { success: false, error: getErrorMessage(error, 'Too many login attempts. Please try again later.') };
    }

    // 1. Check Super Admin
    const superAdmin = await SuperAdminModel.findOne({ email }).lean();
    if (superAdmin) {
        if (superAdmin.password && await comparePassword(password, superAdmin.password)) {
            await resetLoginRateLimit(email);
            await login(superAdmin.id, 'superadmin');
            return { success: true, redirectTo: '/super-admin' };
        }
    }

    // 2. Check Users
    const matchedUsers = await UserModel.find({ email }).lean();
    if (matchedUsers.length > 1) {
        return { success: false, error: "Multiple accounts found for this email. Please contact support." };
    }
    const user = matchedUsers[0] as ArchivedUserCandidate | undefined;
    if (user) {
        if (user.archived) {
            return { success: false, error: 'This account has been deactivated. Please contact your agency.' };
        }
        if (user.password && await comparePassword(password, user.password)) {
            await resetLoginRateLimit(email);
            await login(user.id, user.role, user.agencyId);
            return { success: true, redirectTo: '/dashboard' };
        }
    }

    // 3. Check Clients
    const matchedClients = await ClientModel.find({ email }).lean();
    if (matchedClients.length > 1) {
        return { success: false, error: "Multiple accounts found for this email. Please contact support." };
    }
    const client = matchedClients[0] as ArchivedLoginCandidate | undefined;
    if (client) {
        if (client.archived) {
            return { success: false, error: 'This account has been deactivated. Please contact your agency.' };
        }
        if (client.password && await comparePassword(password, client.password)) {
            await resetLoginRateLimit(email);
            await login(client.id, 'client', client.agencyId);
            return { success: true, redirectTo: '/dashboard' };
        }
    }

    return { success: false, error: "Invalid email or password" };
}

export async function updatePassword(currentPassword: string, newPassword: string): Promise<{ success: boolean; error?: string }> {
    const session = await getSessionUser();

    if (!session) return { success: false, error: "Unauthorized" };

    // Validate new password against system policy
    try {
        await connectDB();
        const sys = await SystemSettingsModel.findOne(
            { key: 'global' },
            { 'security.enforceStrongPasswords': 1 }
        ).lean() as SecuritySettingsRecord | null;
        const enforceStrong = sys?.security?.enforceStrongPasswords ?? true;
        if (enforceStrong) {
            validateStrongPassword(newPassword);
        } else {
            validatePassword(newPassword);
        }
    } catch (error: unknown) {
        return { success: false, error: getErrorMessage(error, 'Invalid password') };
    }

    // 1. Fetch User Document
    let user: PasswordDocument | null = null;

    if (session.role === 'superadmin') {
        user = await SuperAdminModel.findOne({ id: session.userId });
    } else if (session.role === 'client') {
        user = await ClientModel.findOne({ id: session.userId });
    } else {
        user = await UserModel.findOne({ id: session.userId });
    }

    if (!user) {
        return { success: false, error: "User not found" };
    }

    // 2. Verify Current Password
    if (user.password) {
        const isMatch = await comparePassword(currentPassword, user.password);
        if (!isMatch) {
            return { success: false, error: "Incorrect current password" };
        }
    } else {
        // No password in DB — reject update, require admin reset
        return { success: false, error: "No password configured. Contact an administrator." };
    }

    // 3. Hash & Update
    const hashedPassword = await hashPassword(newPassword);

    if (session.role === 'superadmin') {
        await SuperAdminModel.findOneAndUpdate({ id: session.userId }, { password: hashedPassword });
    } else if (session.role === 'client') {
        await ClientModel.findOneAndUpdate({ id: session.userId }, { password: hashedPassword });
    } else {
        await UserModel.findOneAndUpdate({ id: session.userId }, { password: hashedPassword });
    }

    return { success: true };
}

"use server";

import { cookies } from "next/headers";
import { SuperAdminModel, UserModel, ClientModel, connectDB, RateLimitModel } from "./mongodb";
import bcrypt from "bcryptjs";
import { signToken, verifyToken, AuthSession } from "./auth-utils";
import { validatePassword } from "./validation";

import { validateEmail } from "./validation";

// --- Rate limiting for login (MongoDB-backed) ---
const MAX_LOGIN_ATTEMPTS = 10;
const LOGIN_WINDOW_MS = 15 * 60 * 1000; // 15 minutes

async function checkLoginRateLimit(email: string): Promise<void> {
    const key = `login:${email.toLowerCase().trim()}`;
    const now = new Date();
    const record = await RateLimitModel.findOne({ key, expiresAt: { $gt: now } }).lean();
    if (record) {
        if ((record as any).count >= MAX_LOGIN_ATTEMPTS) {
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
    // Check if stored password is a bcrypt hash
    if (stored.startsWith('$2a$') || stored.startsWith('$2b$') || stored.startsWith('$2y$')) {
        return bcrypt.compare(plain, stored);
    }
    // Plain text fallback for migration from unhashed passwords
    return plain === stored;
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
    // Validate email format before DB queries
    if (!email || !validateEmail(email)) {
        return { success: false, error: "Invalid email or password" };
    }

    try {
        // Rate limiting check
        await checkLoginRateLimit(email);
    } catch (e: any) {
        return { success: false, error: e.message || 'Too many login attempts. Please try again later.' };
    }

    await connectDB();

    // Helper: if user had a plain text password, rehash it on successful login
    async function rehashIfPlain(model: any, id: string, stored: string) {
        if (!stored.startsWith('$2a$') && !stored.startsWith('$2b$') && !stored.startsWith('$2y$')) {
            const hashed = await hashPassword(password);
            await model.updateOne({ id }, { $set: { password: hashed } });
        }
    }

    // 1. Check Super Admin
    const superAdmin = await SuperAdminModel.findOne({ email }).lean();
    if (superAdmin) {
        if (superAdmin.password && await comparePassword(password, superAdmin.password)) {
            await rehashIfPlain(SuperAdminModel, superAdmin.id, superAdmin.password);
            await resetLoginRateLimit(email);
            await login(superAdmin.id, 'superadmin');
            return { success: true, redirectTo: '/super-admin' };
        }
    }

    // 2. Check Users
    const user = await UserModel.findOne({ email }).lean();
    if (user) {
        if (user.password && await comparePassword(password, user.password)) {
            await rehashIfPlain(UserModel, user.id, user.password);
            await resetLoginRateLimit(email);
            await login(user.id, user.role, user.agencyId);
            return { success: true, redirectTo: '/dashboard' };
        }
    }

    // 3. Check Clients
    const client = await ClientModel.findOne({ email }).lean();
    if (client) {
        if ((client as any).archived) {
            return { success: false, error: 'This account has been deactivated. Please contact your agency.' };
        }
        if (client.password && await comparePassword(password, client.password)) {
            await rehashIfPlain(ClientModel, client.id, client.password);
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

    // Validate new password
    try {
        validatePassword(newPassword);
    } catch (e: any) {
        return { success: false, error: e.message || 'Invalid password' };
    }

    await connectDB();

    // 1. Fetch User Document
    let user: any;
    let model: any;

    if (session.role === 'superadmin') {
        user = await SuperAdminModel.findOne({ id: session.userId });
        model = SuperAdminModel;
    } else if (session.role === 'client') {
        user = await ClientModel.findOne({ id: session.userId });
        model = ClientModel;
    } else {
        user = await UserModel.findOne({ id: session.userId });
        model = UserModel;
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

    await model.findOneAndUpdate({ id: session.userId }, { password: hashedPassword });

    return { success: true };
}

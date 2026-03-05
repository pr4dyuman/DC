"use server";

import { cookies } from "next/headers";
import { SuperAdminModel, UserModel, ClientModel, connectDB } from "./mongodb";
import bcrypt from "bcryptjs";
import { signToken, verifyToken, AuthSession } from "./auth-utils";
import { validatePassword } from "./validation";

// --- Rate limiting for login (in-memory, per-process) ---
const loginAttempts = new Map<string, { count: number; resetAt: number }>();
const MAX_LOGIN_ATTEMPTS = 10;
const LOGIN_WINDOW_MS = 15 * 60 * 1000; // 15 minutes

function checkLoginRateLimit(email: string): void {
    const now = Date.now();
    const key = email.toLowerCase().trim();
    const record = loginAttempts.get(key);
    if (record && now < record.resetAt) {
        if (record.count >= MAX_LOGIN_ATTEMPTS) {
            throw new Error('Too many login attempts. Please try again later.');
        }
        record.count++;
    } else {
        loginAttempts.set(key, { count: 1, resetAt: now + LOGIN_WINDOW_MS });
    }
}

function resetLoginRateLimit(email: string): void {
    loginAttempts.delete(email.toLowerCase().trim());
}

// --- Password Utilities ---

export async function hashPassword(password: string): Promise<string> {
    const salt = await bcrypt.genSalt(10);
    return bcrypt.hash(password, salt);
}

export async function comparePassword(plain: string, hashed: string): Promise<boolean> {
    return bcrypt.compare(plain, hashed);
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

    // Legacy cookies for backward compatibility (secured)
    cookieStore.set("userId", userId, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/" });
    cookieStore.set("userRole", role, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/" });
}

export async function logout() {
    const cookieStore = await cookies();
    cookieStore.delete("auth_token");
    cookieStore.delete("userId");
    cookieStore.delete("userRole");
    cookieStore.delete("selectedAgencyId");
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
    // Rate limiting check
    checkLoginRateLimit(email);
    await connectDB();

    // 1. Check Super Admin
    const superAdmin = await SuperAdminModel.findOne({ email }).lean();
    if (superAdmin) {
        // Migration: If no password set, assume migration is pending or use default
        if (superAdmin.password && await comparePassword(password, superAdmin.password)) {
            resetLoginRateLimit(email);
            await login(superAdmin.id, 'superadmin');
            return { success: true, redirectTo: '/super-admin' };
        }
    }

    // 2. Check Users
    const user = await UserModel.findOne({ email }).lean();
    if (user) {
        if (user.password && await comparePassword(password, user.password)) {
            resetLoginRateLimit(email);
            await login(user.id, user.role, user.agencyId);
            return { success: true, redirectTo: '/dashboard' };
        }
    }

    // 3. Check Clients
    const client = await ClientModel.findOne({ email }).lean();
    if (client) {
        if (client.password && await comparePassword(password, client.password)) {
            resetLoginRateLimit(email);
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

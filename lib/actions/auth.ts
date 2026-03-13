"use server";

import { User } from "../db";
import { getSessionId, comparePassword } from "../auth";
import { SuperAdminModel, UserModel, ClientModel, connectDB, RateLimitModel } from "../mongodb";
import { login as authLogin } from "../auth";
import { validateEmail } from "../validation";

export { getSessionId };

const MAX_LOGIN_ATTEMPTS = 10;
const LOGIN_WINDOW_MS = 15 * 60 * 1000; // 15 minutes

export async function login(email: string, password: string) {
    // Validate email format before DB queries
    if (!email || !validateEmail(email)) {
        return { success: false, error: 'Invalid credentials' };
    }

    await connectDB();

    // Rate limiting (MongoDB-backed)
    const rateKey = `login:${email.toLowerCase().trim()}`;
    const now = new Date();
    const rateRecord = await RateLimitModel.findOne({ key: rateKey, expiresAt: { $gt: now } }).lean();
    if (rateRecord && (rateRecord as any).count >= MAX_LOGIN_ATTEMPTS) {
        return { success: false, error: 'Too many login attempts. Please try again later.' };
    }
    if (rateRecord) {
        await RateLimitModel.updateOne({ key: rateKey }, { $inc: { count: 1 } });
    } else {
        await RateLimitModel.findOneAndUpdate(
            { key: rateKey },
            { count: 1, expiresAt: new Date(now.getTime() + LOGIN_WINDOW_MS) },
            { upsert: true }
        );
    }

    // Check super admin first
    const superAdmin = await SuperAdminModel.findOne({ email }).lean();
    if (superAdmin) {
        if (superAdmin.password && await comparePassword(password, superAdmin.password)) {
            await RateLimitModel.deleteOne({ key: rateKey });
            await authLogin(superAdmin.id, 'superadmin');
            const { password: _, ...safeAdmin } = superAdmin;
            return { success: true, user: safeAdmin, isSuperAdmin: true };
        }
    }

    // Check regular user
    const user = await UserModel.findOne({ email }).lean();
    if (user) {
        if ((user as any).archived) {
            return { success: false, error: 'This account has been deactivated. Please contact your agency.' };
        }
        if (user.password && await comparePassword(password, user.password)) {
            await RateLimitModel.deleteOne({ key: rateKey });
            await authLogin(user.id, user.role, user.agencyId);
            await UserModel.updateOne({ id: user.id }, { $set: { lastActiveAt: new Date().toISOString() } });
            const { password: _, ...safeUser } = user;
            return { success: true, user: safeUser, isSuperAdmin: false };
        }
    }

    // Check client
    const client = await ClientModel.findOne({ email }).lean();
    if (client) {
        if ((client as any).archived) {
            return { success: false, error: 'This account has been deactivated. Please contact your agency.' };
        }
        if (client.password && await comparePassword(password, client.password)) {
            await RateLimitModel.deleteOne({ key: rateKey });
            await authLogin(client.id, 'client', client.agencyId);
            await ClientModel.updateOne({ id: client.id }, { $set: { lastActiveAt: new Date().toISOString() } });
            const { password: _, ...safeClient } = client;
            return { success: true, user: safeClient, isSuperAdmin: false };
        }
    }

    return { success: false, error: "Invalid credentials" };
}

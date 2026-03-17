"use server";

import { getSessionId, comparePassword } from "../auth";
import { SuperAdminModel, UserModel, ClientModel, connectDB, RateLimitModel } from "../mongodb";
import { login as authLogin } from "../auth";
import { validateEmail } from "../validation";

export { getSessionId };

const MAX_LOGIN_ATTEMPTS = 10;
const LOGIN_WINDOW_MS = 15 * 60 * 1000; // 15 minutes

function withoutPassword<T extends { password?: unknown }>(value: T) {
    const clone = { ...value };
    delete clone.password;
    return clone;
}

export async function login(email: string, password: string) {
    // Validate email format and normalize to lowercase before DB queries
    try {
        email = validateEmail(email);
    } catch {
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
            return { success: true, user: withoutPassword(superAdmin), isSuperAdmin: true };
        }
    }

    // Check regular user
    const matchedUsers = await UserModel.find({ email }).lean();
    if (matchedUsers.length > 1) {
        return { success: false, error: "Multiple accounts found for this email. Please contact support." };
    }
    const user = matchedUsers[0];
    if (user) {
        if ((user as any).archived) {
            return { success: false, error: 'This account has been deactivated. Please contact your agency.' };
        }
        if (user.password && await comparePassword(password, user.password)) {
            await RateLimitModel.deleteOne({ key: rateKey });
            await authLogin(user.id, user.role, user.agencyId);
            await UserModel.updateOne({ id: user.id }, { $set: { lastActiveAt: new Date().toISOString() } });
            return { success: true, user: withoutPassword(user), isSuperAdmin: false };
        }
    }

    // Check client
    const matchedClients = await ClientModel.find({ email }).lean();
    if (matchedClients.length > 1) {
        return { success: false, error: "Multiple accounts found for this email. Please contact support." };
    }
    const client = matchedClients[0];
    if (client) {
        if ((client as any).archived) {
            return { success: false, error: 'This account has been deactivated. Please contact your agency.' };
        }
        if (client.password && await comparePassword(password, client.password)) {
            await RateLimitModel.deleteOne({ key: rateKey });
            await authLogin(client.id, 'client', client.agencyId);
            await ClientModel.updateOne({ id: client.id }, { $set: { lastActiveAt: new Date().toISOString() } });
            return { success: true, user: withoutPassword(client), isSuperAdmin: false };
        }
    }

    return { success: false, error: "Invalid credentials" };
}

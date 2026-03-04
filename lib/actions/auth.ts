"use server";

import { User } from "../db";
import { getSessionId } from "../auth";
import { resolveUserOrClient } from "../utils-server";
import { SuperAdminModel, UserModel, ClientModel, connectDB } from "../mongodb";
import { login as authLogin } from "../auth";
import bcrypt from "bcryptjs";

export { getSessionId };

export async function login(email: string, password: string) {
    await connectDB();

    // Check super admin first
    const superAdmin = await SuperAdminModel.findOne({ email }).lean();
    if (superAdmin) {
        if (superAdmin.password && await bcrypt.compare(password, superAdmin.password)) {
            await authLogin(superAdmin.id, 'superadmin');
            return { success: true, user: superAdmin, isSuperAdmin: true };
        }
    }

    // Check regular user
    const user = await UserModel.findOne({ email }).lean();
    if (user) {
        if (user.password && await bcrypt.compare(password, user.password)) {
            await authLogin(user.id, user.role, user.agencyId);
            await UserModel.updateOne({ id: user.id }, { $set: { lastActiveAt: new Date().toISOString() } });
            return { success: true, user, isSuperAdmin: false };
        }
    }

    // Check client
    const client = await ClientModel.findOne({ email }).lean();
    if (client) {
        if (client.password && await bcrypt.compare(password, client.password)) {
            await authLogin(client.id, 'client', client.agencyId);
            await ClientModel.updateOne({ id: client.id }, { $set: { lastActiveAt: new Date().toISOString() } });
            return { success: true, user: client, isSuperAdmin: false };
        }
    }

    return { success: false, error: "Invalid credentials" };
}

export async function getCurrentUser() {
    const userId = await getSessionId();
    if (!userId) return null;

    const targetUser = await resolveUserOrClient(userId);
    if (!targetUser) return undefined;

    const isAdmin = targetUser.role === 'admin' || targetUser.role === 'manager';

    if (isAdmin) {
        return targetUser;
    }

    // Redact salary for non-admin users viewing their own profile
    const { salary, ...redacted } = targetUser;
    return redacted as User;
}

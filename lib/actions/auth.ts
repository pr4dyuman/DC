"use server";

import { db, User, Client } from "../db";
import { cookies } from "next/headers";
import { getSessionId } from "../auth"; // Fixed: import from parent directory
import { resolveUserOrClient } from "../utils-server";
import { SuperAdminModel, UserModel, ClientModel, connectDB } from "../mongodb";

export { getSessionId };

import bcrypt from "bcryptjs";

export async function login(email: string, password: string) {
    await connectDB();
    
    // Check super admin first
    const superAdmin = await SuperAdminModel.findOne({ email }).lean();
    if (superAdmin) {
        const isValid = await bcrypt.compare(password, superAdmin.password) || superAdmin.password === password;
        if (isValid) {
            const cookieStore = await cookies();
            cookieStore.set("userId", superAdmin.id);
            cookieStore.set("userRole", "superadmin");
            return { success: true, user: superAdmin, isSuperAdmin: true };
        }
    }
    
    // Check regular user
    const user = await UserModel.findOne({ email }).lean();
    if (user) {
        const isValid = (user.password && await bcrypt.compare(password, user.password)) || user.password === password;
        if (isValid) {
            const cookieStore = await cookies();
            cookieStore.set("userId", user.id);
            cookieStore.set("userRole", user.role);
            return { success: true, user, isSuperAdmin: false };
        }
    }
    
    // Check client
    const client = await ClientModel.findOne({ email }).lean();
    if (client) {
         const isValid = (client.password && await bcrypt.compare(password, client.password)) || client.password === password;
         if (isValid) {
            const cookieStore = await cookies();
            cookieStore.set("userId", client.id);
            cookieStore.set("userRole", "client");
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

    const currentUser = await resolveUserOrClient(userId);
    const isAdmin = currentUser && (currentUser.role === 'admin' || currentUser.role === 'manager');

    if (isAdmin || userId === userId) {
        return targetUser;
    }

    const { salary, ...redacted } = targetUser;
    return redacted as User;
}

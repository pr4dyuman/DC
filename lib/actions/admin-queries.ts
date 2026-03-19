import "server-only";

import type { Client, User } from "../db";
import { ClientModel, SuperAdminModel, UserModel, connectDB } from "../mongodb";
import { sanitizeDoc } from "./shared";

export async function getAllUsersImpl(agencyId: string) {
    await connectDB();
    const users = await UserModel.find({ agencyId }).select("-password").lean();
    return users.map((user) => sanitizeDoc(user) as User);
}

export async function getAllClientsImpl(agencyId: string) {
    await connectDB();
    const clients = await ClientModel.find({ agencyId }).select("-password").lean();
    return clients.map((client) => sanitizeDoc(client) as Client);
}

export async function getSuperAdminsImpl() {
    await connectDB();
    const admins = await SuperAdminModel.find({}).select("-password").lean();
    return admins.map((admin) => sanitizeDoc(admin));
}

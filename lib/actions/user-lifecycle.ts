import "server-only";

import { revalidatePath } from "next/cache";
import type { User } from "../db";
import { decrementAgencyUsage, incrementAgencyUsage } from "../agency-context";
import { NotificationModel, TaskModel, UserModel, connectDB } from "../mongodb";
import { sanitizeDoc } from "./shared";

export async function deleteUserImpl(id: string, agencyId?: string) {
    await connectDB();

    const user = await UserModel.findOne({ id, agencyId }).select("-password").lean();
    if (!user) throw new Error("User not found");

    await UserModel.updateOne(
        { id, agencyId },
        { $set: { archived: true, archivedAt: new Date().toISOString() } }
    );
    await TaskModel.updateMany(
        { assigneeIds: id, agencyId, status: { $ne: "Done" } },
        { $pull: { assigneeIds: id } }
    );
    await TaskModel.updateMany(
        { assigneeId: id, agencyId, status: { $ne: "Done" } },
        [{ $set: { assigneeId: { $ifNull: [{ $arrayElemAt: ["$assigneeIds", 0] }, ""] } } }]
    );
    await NotificationModel.deleteMany({ userId: id, agencyId });
    if (agencyId) await decrementAgencyUsage(agencyId, "users");

    revalidatePath("/dashboard/team");
}

export async function getArchivedUsersImpl(agencyId?: string) {
    await connectDB();
    const users = await UserModel.find({ agencyId, archived: true }).select("-password").lean();
    return users.map((user) => sanitizeDoc(user) as User);
}

export async function unarchiveUserImpl(id: string, agencyId?: string) {
    await connectDB();

    const user = await UserModel.findOne({ id, agencyId }).select("-password").lean() as User | null;
    if (!user) throw new Error("User not found");
    if (!user.archived) throw new Error("User is not archived");

    await UserModel.updateOne(
        { id, agencyId },
        { $set: { archived: false }, $unset: { archivedAt: "" } }
    );
    if (agencyId) await incrementAgencyUsage(agencyId, "users");

    revalidatePath("/dashboard/team");
}

import "server-only";

import { revalidatePath } from "next/cache";
import type { Asset, Project } from "../db";
import { decrementAgencyUsage } from "../agency-context";
import { comparePassword } from "../auth";
import {
    ActivityModel,
    AssetModel,
    ClientModel,
    InvoiceModel,
    MessageModel,
    NotificationModel,
    ProjectModel,
    ServiceModel,
    TaskModel,
    TransactionModel,
    UserModel,
    LeaveRequestModel,
    connectDB,
} from "../mongodb";

function parseAssetSizeToBytes(size: string | undefined): number {
    const sizeStr = String(size || "");
    const sizeMatch = sizeStr.match(/([\d.]+)\s*(KB|MB|GB|B)/i);
    if (!sizeMatch) return 0;

    const num = parseFloat(sizeMatch[1]);
    const unit = sizeMatch[2].toUpperCase();
    if (unit === "GB") return num * 1073741824;
    if (unit === "MB") return num * 1048576;
    if (unit === "KB") return num * 1024;
    return num;
}

async function cleanupAssetFiles(assets: Array<Pick<Asset, "url" | "size">>, agencyId: string, logLabel: string) {
    if (assets.length === 0) return;

    try {
        const { deleteFile } = await import("@/lib/storage");
        const BATCH_SIZE = 10;
        let totalBytesFreed = 0;

        for (let i = 0; i < assets.length; i += BATCH_SIZE) {
            const batch = assets.slice(i, i + BATCH_SIZE);
            await Promise.allSettled(
                batch.map((asset) => asset.url ? deleteFile(asset.url) : Promise.resolve())
            );
        }

        for (const asset of assets) {
            totalBytesFreed += parseAssetSizeToBytes(asset.size);
        }

        if (totalBytesFreed > 0) {
            await decrementAgencyUsage(agencyId, "storage", Math.round(totalBytesFreed));
        }
        console.log(`[${logLabel}] Cleaned up ${assets.length} files from storage`);
    } catch (storageErr) {
        console.error(`[${logLabel}] Storage cleanup error (proceeding with DB deletion):`, storageErr);
    }
}

export async function verifyAdminPasswordImpl(currentUserId: string, password: string): Promise<boolean> {
    await connectDB();
    const user = await UserModel.findOne({ id: currentUserId }).lean();
    if (!user?.password) return false;
    return comparePassword(password, user.password);
}

export async function permanentlyDeleteClientImpl(id: string, agencyId: string) {
    await connectDB();

    const client = await ClientModel.findOne({ id, agencyId }).select("-password").lean();
    if (!client) throw new Error("Client not found");

    const clientProjects = await ProjectModel.find({
        agencyId,
        $or: [{ clientId: id }, { clientIds: id }],
    }).select("id clientId clientIds").lean() as Array<Pick<Project, "id" | "clientId" | "clientIds">>;

    const projectIds: string[] = [];
    const projectDetachUpdates: Array<{ projectId: string; clientIds: string[]; clientId?: string }> = [];
    for (const project of clientProjects) {
        const linkedClientIds = new Set<string>();
        if (project.clientId) linkedClientIds.add(project.clientId);
        for (const clientId of project.clientIds || []) {
            if (clientId) linkedClientIds.add(clientId);
        }
        linkedClientIds.delete(id);
        const remainingClientIds = [...linkedClientIds];
        if (remainingClientIds.length === 0) {
            projectIds.push(project.id);
        } else {
            projectDetachUpdates.push({
                projectId: project.id,
                clientIds: remainingClientIds,
                clientId: project.clientId && project.clientId !== id ? project.clientId : remainingClientIds[0],
            });
        }
    }

    if (projectDetachUpdates.length > 0) {
        const primaryClientIds = [...new Set(projectDetachUpdates.map((update) => update.clientId).filter(Boolean) as string[])];
        const primaryClients = await ClientModel.find({ id: { $in: primaryClientIds }, agencyId }).select("id name").lean() as Array<{ id: string; name?: string }>;
        const clientNameById = new Map(primaryClients.map((primaryClient) => [primaryClient.id, primaryClient.name || ""]));
        await Promise.all(projectDetachUpdates.map((update) => ProjectModel.updateOne(
            { id: update.projectId, agencyId },
            {
                $set: {
                    clientId: update.clientId,
                    clientIds: update.clientIds,
                    ...(update.clientId ? { client: clientNameById.get(update.clientId) || "" } : {}),
                },
            }
        )));
    }

    let deletedProjectInvoiceCount = 0;
    if (projectIds.length > 0) {
        const assets = await AssetModel.find({ projectId: { $in: projectIds }, agencyId }).select("url size").lean() as Array<Pick<Asset, "url" | "size">>;
        await cleanupAssetFiles(assets, agencyId, "permanentDeleteClient");
        deletedProjectInvoiceCount = await InvoiceModel.countDocuments({ projectId: { $in: projectIds }, agencyId });
    }

    await Promise.all([
        ClientModel.deleteOne({ id, agencyId }),
        NotificationModel.deleteMany({ userId: id, agencyId }),
        MessageModel.deleteMany({
            agencyId,
            $or: [{ senderId: id }, { receiverId: id }],
        }),
        ...(projectIds.length > 0 ? [
            ProjectModel.deleteMany({ id: { $in: projectIds }, agencyId }),
            ServiceModel.deleteMany({ projectId: { $in: projectIds }, agencyId }),
            TaskModel.deleteMany({ projectId: { $in: projectIds }, agencyId }),
            InvoiceModel.deleteMany({ projectId: { $in: projectIds }, agencyId }),
            TransactionModel.deleteMany({ projectId: { $in: projectIds }, agencyId }),
            AssetModel.deleteMany({ projectId: { $in: projectIds }, agencyId }),
            ActivityModel.deleteMany({ target: { $in: projectIds }, agencyId }),
        ] : []),
    ]);

    await decrementAgencyUsage(agencyId, "clients");
    if (projectIds.length > 0) {
        await decrementAgencyUsage(agencyId, "projects", projectIds.length);
    }
    if (deletedProjectInvoiceCount > 0) {
        await decrementAgencyUsage(agencyId, "monthlyInvoices", deletedProjectInvoiceCount);
    }

    revalidatePath("/dashboard/clients");
}

export async function permanentlyDeleteUserImpl(id: string, agencyId: string) {
    await connectDB();

    const user = await UserModel.findOne({ id, agencyId }).select("-password").lean();
    if (!user) throw new Error("User not found");

    await Promise.all([
        UserModel.deleteOne({ id, agencyId }),
        NotificationModel.deleteMany({ userId: id, agencyId }),
        LeaveRequestModel.deleteMany({ userId: id, agencyId }),
        TaskModel.updateMany(
            { assigneeId: id, agencyId },
            { $set: { assigneeId: "" } }
        ),
        TransactionModel.deleteMany({ userId: id, agencyId }),
        MessageModel.deleteMany({
            agencyId,
            $or: [{ senderId: id }, { receiverId: id }],
        }),
        ActivityModel.deleteMany({ userId: id, agencyId }),
    ]);

    await decrementAgencyUsage(agencyId, "users");
    revalidatePath("/dashboard/team");
}

export async function deleteProjectImpl(id: string, agencyId: string) {
    await connectDB();

    const project = await ProjectModel.findOne({ id, agencyId }).select("id name").lean() as { id: string; name: string } | null;
    if (!project) throw new Error("Project not found");

    const assets = await AssetModel.find({ projectId: id, agencyId }).select("url size").lean() as Array<Pick<Asset, "url" | "size">>;
    const deletedInvoiceCount = await InvoiceModel.countDocuments({ projectId: id, agencyId });
    await cleanupAssetFiles(assets, agencyId, "deleteProject");

    await Promise.all([
        ProjectModel.deleteOne({ id, agencyId }),
        ServiceModel.deleteMany({ projectId: id, agencyId }),
        TaskModel.deleteMany({ projectId: id, agencyId }),
        AssetModel.deleteMany({ projectId: id, agencyId }),
        InvoiceModel.deleteMany({ projectId: id, agencyId }),
        TransactionModel.deleteMany({ projectId: id, agencyId }),
        ActivityModel.deleteMany({
            agencyId,
            $or: [
                { target: id },
                { entityId: id, entityType: "project" },
                ...(project?.name ? [{ target: project.name, action: { $regex: "project", $options: "i" } }] : []),
            ],
        }),
        NotificationModel.deleteMany({ agencyId, link: { $regex: id } }),
    ]);

    await decrementAgencyUsage(agencyId, "projects");
    if (deletedInvoiceCount > 0) {
        await decrementAgencyUsage(agencyId, "monthlyInvoices", deletedInvoiceCount);
    }
    revalidatePath("/dashboard/projects");
    return true;
}

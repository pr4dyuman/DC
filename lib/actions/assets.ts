import { revalidatePath } from "next/cache";

import type { Asset } from "../db";
import { decrementAgencyUsage } from "../agency-context";
import { ActivityModel, AssetModel, connectDB } from "../mongodb";
import { generateId } from "../utils-server";
import { sanitizeMongoInput, sanitizeName, sanitizeString, sanitizeUpdates, sanitizeUrl, validateId } from "../validation";
import { sanitizeDoc, sortByUploadedAtDesc } from "./shared";

type AssetActor = {
    id?: string;
    name?: string;
} | null;

type AddProjectAssetInput = Omit<Asset, "id" | "uploadedAt" | "agencyId" | "uploadedBy"> & {
    uploadedBy?: string;
};

const MAX_ASSET_CONTENT_LENGTH = 200_000;
const ASSET_TYPES = new Set<Asset["type"]>(["image", "file", "code", "zip", "folder", "link"]);

function sanitizeAssetContent(content: unknown) {
    if (typeof content !== "string") return undefined;
    const sanitized = sanitizeString(content, MAX_ASSET_CONTENT_LENGTH);
    return sanitized || undefined;
}

function sanitizeAssetContentUpdate(content: unknown) {
    if (typeof content !== "string") return undefined;
    return sanitizeString(content, MAX_ASSET_CONTENT_LENGTH);
}

function normalizeAssetType(type: unknown): Asset["type"] {
    if (typeof type === "string" && ASSET_TYPES.has(type as Asset["type"])) {
        return type as Asset["type"];
    }
    throw new Error("Invalid asset type");
}

export async function getProjectAssetsImpl(projectId: string, agencyId: string) {
    await connectDB();
    const assets = await AssetModel.find({ projectId, agencyId }).lean() as Asset[];
    return assets.map(sanitizeDoc).sort(sortByUploadedAtDesc);
}

export async function addProjectAssetImpl(
    asset: AddProjectAssetInput,
    agencyId: string,
    actor: NonNullable<AssetActor>
) {
    const nextAsset = sanitizeMongoInput(asset) as AddProjectAssetInput;
    nextAsset.projectId = validateId(nextAsset.projectId);
    nextAsset.name = sanitizeName(nextAsset.name, 500);
    if (!nextAsset.name) throw new Error("Asset name is required");
    nextAsset.type = normalizeAssetType(nextAsset.type);
    if (nextAsset.description) nextAsset.description = sanitizeString(nextAsset.description, 2000);
    if (nextAsset.url) nextAsset.url = sanitizeUrl(nextAsset.url);
    if (!nextAsset.url) throw new Error("Asset URL is required");
    if (nextAsset.size) nextAsset.size = sanitizeString(nextAsset.size, 100) || undefined;
    nextAsset.content = sanitizeAssetContent(nextAsset.content);

    const forbiddenExtensions = [".exe", ".bat", ".cmd", ".sh", ".vbs", ".msi", ".jar", ".com", ".scr", ".pif"];
    const fileName = nextAsset.name.toLowerCase();
    if (forbiddenExtensions.some((extension) => fileName.endsWith(extension))) {
        throw new Error("Security Alert: Malicious file type rejected by server.");
    }

    await connectDB();
    const newAsset: Asset = {
        ...nextAsset,
        id: generateId(),
        uploadedAt: new Date().toISOString(),
        agencyId,
        uploadedBy: actor.name || "Unknown User",
    };

    await AssetModel.create(newAsset);
    await ActivityModel.create({
        id: generateId(),
        agencyId,
        user: actor.name || "Unknown User",
        userId: actor.id || "unknown",
        action: "uploaded asset",
        target: nextAsset.name,
        timestamp: new Date().toISOString(),
    });

    revalidatePath(`/dashboard/projects/${nextAsset.projectId}`);
    revalidatePath("/dashboard/projects/[slug]", "page");
    return newAsset;
}

export async function deleteProjectAssetImpl(assetId: string, agencyId: string, actor: AssetActor) {
    await connectDB();
    const asset = await AssetModel.findOne({ id: assetId, agencyId }).lean() as Asset | null;
    if (!asset) throw new Error("Asset not found");

    await AssetModel.deleteOne({ id: assetId, agencyId });

    if (asset.url) {
        try {
            const { deleteFile } = await import("@/lib/storage");
            await deleteFile(asset.url);
        } catch (error) {
            console.error("Failed to delete file from storage:", error);
        }

        try {
            const assetSize = asset.size;
            if (assetSize) {
                const sizeMatch = String(assetSize).match(/([\d.]+)\s*(KB|MB|GB|B)/i);
                if (sizeMatch) {
                    const amount = parseFloat(sizeMatch[1]);
                    const unit = sizeMatch[2].toUpperCase();
                    const bytes =
                        unit === "GB" ? amount * 1073741824 :
                            unit === "MB" ? amount * 1048576 :
                                unit === "KB" ? amount * 1024 :
                                    amount;
                    await decrementAgencyUsage(agencyId, "storage", Math.round(bytes));
                }
            }
        } catch (error) {
            console.error("Failed to update storage usage:", error);
        }
    }

    await ActivityModel.create({
        id: generateId(),
        agencyId,
        user: actor?.name || "System",
        userId: actor?.id || "system",
        action: "deleted asset",
        target: asset.name,
        timestamp: new Date().toISOString(),
    });

    revalidatePath("/dashboard/projects/[id]", "page");
    revalidatePath("/dashboard/projects/[slug]", "page");
    revalidatePath(`/dashboard/projects/${asset.projectId}`);
}

export async function updateProjectAssetImpl(
    assetId: string,
    updates: Partial<Asset>,
    agencyId: string,
    actor: AssetActor
) {
    const rawUpdates = sanitizeUpdates(updates) as Partial<Asset>;

    await connectDB();
    const asset = await AssetModel.findOne({ id: assetId, agencyId }).lean() as Asset | null;
    if (!asset) throw new Error("Asset not found");

    const nextUpdates: Partial<Asset> = {};
    if (Object.prototype.hasOwnProperty.call(rawUpdates, "name")) {
        const name = sanitizeName(rawUpdates.name || "", 500);
        if (!name) throw new Error("Asset name is required");
        nextUpdates.name = name;
    }
    if (Object.prototype.hasOwnProperty.call(rawUpdates, "description")) {
        nextUpdates.description = rawUpdates.description
            ? sanitizeString(rawUpdates.description, 2000)
            : "";
    }
    if (Object.prototype.hasOwnProperty.call(rawUpdates, "url")) {
        const url = rawUpdates.url ? sanitizeUrl(rawUpdates.url) : "";
        if (!url) throw new Error("Asset URL is required");
        nextUpdates.url = url;
    }
    if (Object.prototype.hasOwnProperty.call(rawUpdates, "content")) {
        nextUpdates.content = sanitizeAssetContentUpdate(rawUpdates.content);
    }
    if (Object.prototype.hasOwnProperty.call(rawUpdates, "aiEnabled")) {
        nextUpdates.aiEnabled = Boolean(rawUpdates.aiEnabled);
    }

    if (Object.keys(nextUpdates).length === 0) return sanitizeDoc(asset);

    await AssetModel.updateOne({ id: assetId, agencyId }, { $set: nextUpdates });
    await ActivityModel.create({
        id: generateId(),
        agencyId,
        user: actor?.name || "System",
        userId: actor?.id || "system",
        action: "updated asset",
        target: asset.name || "Asset",
        timestamp: new Date().toISOString(),
    });

    revalidatePath("/dashboard/projects/[id]", "page");
    revalidatePath("/dashboard/projects/[slug]", "page");
    revalidatePath(`/dashboard/projects/${asset.projectId}`);
}

export async function toggleAssetAIImpl(assetId: string, enabled: boolean, agencyId: string) {
    await connectDB();
    const asset = await AssetModel.findOne({ id: assetId, agencyId }).select("projectId").lean() as Pick<Asset, "projectId"> | null;
    if (!asset) throw new Error("Asset not found");
    await AssetModel.updateOne({ id: assetId, agencyId }, { $set: { aiEnabled: enabled } });
    revalidatePath("/dashboard/projects/[id]", "page");
    revalidatePath("/dashboard/projects/[slug]", "page");
    revalidatePath(`/dashboard/projects/${asset.projectId}`);
}

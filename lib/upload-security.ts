import path from "path";

import { AgencyModel, connectDB } from "./mongodb";
import { deleteFile } from "./storage";

export const ALLOWED_UPLOAD_EXTENSIONS = new Set([
    ".jpg", ".jpeg", ".png", ".gif", ".webp",
    ".pdf", ".doc", ".docx", ".xls", ".xlsx", ".csv", ".txt",
]);

export const MAX_UPLOAD_FILE_SIZE = 50 * 1024 * 1024;
export const MAX_IMAGE_DIMENSION = 8192;

export const UPLOAD_MIME_TYPES: Record<string, string> = {
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".gif": "image/gif",
    ".webp": "image/webp",
    ".pdf": "application/pdf",
    ".doc": "application/msword",
    ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ".xls": "application/vnd.ms-excel",
    ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ".csv": "text/csv",
    ".txt": "text/plain",
};

const DIRECT_UPLOAD_ALLOWED_CONTENT_TYPES: Record<string, string[]> = {
    ".jpg": ["image/jpeg"],
    ".jpeg": ["image/jpeg"],
    ".png": ["image/png"],
    ".gif": ["image/gif"],
    ".webp": ["image/webp"],
    ".pdf": ["application/pdf"],
    ".doc": ["application/msword"],
    ".docx": ["application/vnd.openxmlformats-officedocument.wordprocessingml.document"],
    ".xls": ["application/vnd.ms-excel"],
    ".xlsx": ["application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"],
    ".csv": ["text/csv", "application/csv", "application/vnd.ms-excel"],
    ".txt": ["text/plain"],
};

const IMAGE_MAGIC: Record<string, number[] | null> = {
    ".png": [0x89, 0x50, 0x4e, 0x47],
    ".jpg": [0xff, 0xd8, 0xff],
    ".jpeg": [0xff, 0xd8, 0xff],
    ".gif": [0x47, 0x49, 0x46],
    ".webp": null,
};

export const IMAGE_EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".gif", ".webp"]);

type UploadAgencyContext = {
    id?: string;
    limits?: {
        maxStorage?: number;
    };
    usage?: {
        storage?: number;
    };
} | null | undefined;

export type DirectUploadClientPayload = {
    projectId?: string;
    fileSize?: number;
    contentType?: string;
};

function formatStorageLimitError(currentStorageBytes: number, maxStorageMb: number) {
    return `Storage limit reached. You have used ${(currentStorageBytes / (1024 * 1024)).toFixed(2)}MB of your ${maxStorageMb}MB limit.`;
}

export function parseDirectUploadClientPayload(clientPayload: string | null): DirectUploadClientPayload {
    if (!clientPayload) return {};

    try {
        const parsed = JSON.parse(clientPayload) as DirectUploadClientPayload;
        return parsed && typeof parsed === "object" ? parsed : {};
    } catch {
        throw new Error("Invalid upload metadata.");
    }
}

export function getUploadExtension(fileName: string) {
    return path.extname(String(fileName || "")).toLowerCase();
}

export function assertAllowedUploadExtension(fileName: string) {
    const ext = getUploadExtension(fileName);
    if (!ext || !ALLOWED_UPLOAD_EXTENSIONS.has(ext)) {
        throw new Error("File type not allowed.");
    }
    return ext;
}

export function getAllowedContentTypesForExtension(ext: string) {
    return DIRECT_UPLOAD_ALLOWED_CONTENT_TYPES[ext] || [];
}

export function getUploadMimeType(ext: string) {
    return UPLOAD_MIME_TYPES[ext] || "application/octet-stream";
}

export function sanitizeUploadFilename(fileName: string) {
    const baseName = path.basename(String(fileName || ""));
    const safeName = baseName.replace(/[^a-zA-Z0-9._-]/g, "_");
    return `${Date.now()}_${safeName}`;
}

export function assertValidUploadSize(fileSize: number) {
    if (!Number.isFinite(fileSize) || fileSize <= 0) {
        throw new Error("Invalid file size.");
    }
    if (fileSize > MAX_UPLOAD_FILE_SIZE) {
        throw new Error("File too large. Maximum size is 50MB.");
    }
}

export function assertAgencyCanUpload(agency: UploadAgencyContext, fileSize: number) {
    assertValidUploadSize(fileSize);

    if (!agency?.id) {
        throw new Error("Agency context not found. Please log in again.");
    }

    const maxStorageMb = agency.limits?.maxStorage ?? 0;
    if (maxStorageMb === -1) {
        return;
    }

    const currentStorageBytes = agency.usage?.storage || 0;
    const maxStorageBytes = maxStorageMb * 1024 * 1024;

    if ((currentStorageBytes + fileSize) > maxStorageBytes) {
        throw new Error(formatStorageLimitError(currentStorageBytes, maxStorageMb));
    }
}

export function validateMagicBytes(buffer: Buffer, ext: string) {
    if (ext === ".webp") {
        return buffer.length >= 12
            && buffer[0] === 0x52 && buffer[1] === 0x49
            && buffer[2] === 0x46 && buffer[3] === 0x46
            && buffer[8] === 0x57 && buffer[9] === 0x45
            && buffer[10] === 0x42 && buffer[11] === 0x50;
    }

    const magic = IMAGE_MAGIC[ext];
    if (!magic) return true;
    if (buffer.length < magic.length) return false;
    return magic.every((byte, index) => buffer[index] === byte);
}

export function getImageDimensions(buffer: Buffer, ext: string): { width: number; height: number } | null {
    try {
        if (ext === ".png") {
            if (buffer.length < 24) return null;
            return {
                width: buffer.readUInt32BE(16),
                height: buffer.readUInt32BE(20),
            };
        }

        if (ext === ".gif") {
            if (buffer.length < 10) return null;
            return {
                width: buffer.readUInt16LE(6),
                height: buffer.readUInt16LE(8),
            };
        }

        if (ext === ".jpg" || ext === ".jpeg") {
            let offset = 2;
            while (offset < buffer.length - 8) {
                if (buffer[offset] !== 0xff) {
                    offset += 1;
                    continue;
                }

                const marker = buffer[offset + 1];
                if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8) {
                    return {
                        height: buffer.readUInt16BE(offset + 5),
                        width: buffer.readUInt16BE(offset + 7),
                    };
                }

                const segmentLength = buffer.readUInt16BE(offset + 2);
                offset += 2 + segmentLength;
            }
            return null;
        }

        if (ext === ".webp") {
            if (buffer.length < 30) return null;

            const chunk = String.fromCharCode(buffer[12], buffer[13], buffer[14], buffer[15]);
            if (chunk === "VP8 ") {
                return {
                    width: buffer.readUInt16LE(26) & 0x3fff,
                    height: buffer.readUInt16LE(28) & 0x3fff,
                };
            }

            if (chunk === "VP8L") {
                if (buffer.length < 25) return null;
                const b0 = buffer[21];
                const b1 = buffer[22];
                const b2 = buffer[23];
                const b3 = buffer[24];
                return {
                    width: 1 + (((b1 & 0x3f) << 8) | b0),
                    height: 1 + (((b3 & 0x0f) << 10) | (b2 << 2) | ((b1 >> 6) & 0x03)),
                };
            }

            if (chunk === "VP8X") {
                if (buffer.length < 30) return null;
                return {
                    width: 1 + (buffer[24] | (buffer[25] << 8) | (buffer[26] << 16)),
                    height: 1 + (buffer[27] | (buffer[28] << 8) | (buffer[29] << 16)),
                };
            }
        }
    } catch {
        return null;
    }

    return null;
}

export function validateImageBuffer(buffer: Buffer, ext: string) {
    if (!IMAGE_EXTENSIONS.has(ext)) return;

    if (!validateMagicBytes(buffer, ext)) {
        throw new Error("File content does not match its extension. Upload rejected.");
    }

    const dimensions = getImageDimensions(buffer, ext);
    if (!dimensions) return;

    if (dimensions.width > MAX_IMAGE_DIMENSION || dimensions.height > MAX_IMAGE_DIMENSION) {
        throw new Error(`Image dimensions too large (${dimensions.width}x${dimensions.height}). Maximum allowed is ${MAX_IMAGE_DIMENSION}x${MAX_IMAGE_DIMENSION}.`);
    }

    if (dimensions.width <= 0 || dimensions.height <= 0) {
        throw new Error("Invalid image dimensions.");
    }
}

export async function validateUploadedBlobFromUrl(blobUrl: string, ext: string) {
    if (!IMAGE_EXTENSIONS.has(ext)) return;

    const response = await fetch(blobUrl, { cache: "no-store" });
    if (!response.ok) {
        throw new Error("Failed to validate uploaded image.");
    }

    const arrayBuffer = await response.arrayBuffer();
    validateImageBuffer(Buffer.from(arrayBuffer), ext);
}

export async function reserveAgencyStorageAfterUpload(agencyId: string, fileSize: number, uploadedUrl?: string) {
    await connectDB();

    const agency = await AgencyModel.findOne({ id: agencyId })
        .select("limits usage")
        .lean() as UploadAgencyContext;

    if (!agency?.id) {
        if (uploadedUrl) await deleteFile(uploadedUrl);
        throw new Error("Agency context not found. Please log in again.");
    }

    assertValidUploadSize(fileSize);

    const maxStorageMb = agency.limits?.maxStorage ?? 0;
    if (maxStorageMb === -1) {
        await AgencyModel.updateOne(
            { id: agencyId },
            { $inc: { "usage.storage": fileSize } }
        );
        return;
    }

    const currentStorageBytes = agency.usage?.storage || 0;
    const maxStorageBytes = maxStorageMb * 1024 * 1024;
    const availableBytes = maxStorageBytes - fileSize;

    const result = await AgencyModel.updateOne(
        { id: agencyId, "usage.storage": { $lte: availableBytes } },
        { $inc: { "usage.storage": fileSize } }
    );

    if (result.modifiedCount === 0) {
        if (uploadedUrl) await deleteFile(uploadedUrl);
        throw new Error(formatStorageLimitError(currentStorageBytes, maxStorageMb));
    }
}

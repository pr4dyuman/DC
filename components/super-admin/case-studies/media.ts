"use client";

import { upload } from "@vercel/blob/client";

/** Uploads an image through the Super Admin image route; resolves to its public link. */
export function uploadImage(file: File, onProgress?: (percent: number) => void) {
    const formData = new FormData();
    formData.append("file", file);

    return new Promise<string>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.upload.addEventListener("progress", (event) => {
            if (event.lengthComputable) onProgress?.(Math.round((event.loaded / event.total) * 100));
        });
        xhr.addEventListener("load", () => {
            try {
                const payload = JSON.parse(xhr.responseText) as { success?: boolean; url?: string; error?: string };
                if (xhr.status >= 200 && xhr.status < 300 && payload.success && payload.url) {
                    resolve(payload.url);
                    return;
                }
                reject(new Error(payload.error || "The image could not be uploaded."));
            } catch {
                reject(new Error(xhr.status === 413 ? "The image is too large. Try one under 4 MB." : "The image could not be uploaded."));
            }
        });
        xhr.addEventListener("error", () => reject(new Error("Network error while uploading the image.")));
        xhr.addEventListener("timeout", () => reject(new Error("The upload timed out.")));
        xhr.open("POST", "/api/super-admin/blogs/image");
        xhr.timeout = 120000;
        xhr.send(formData);
    });
}

/** Uploads a video straight to storage; resolves to its public link. */
export async function uploadVideo(file: File, onProgress?: (percent: number) => void) {
    const blob = await upload(`case-studies/${file.name}`, file, {
        access: "public",
        handleUploadUrl: "/api/super-admin/case-studies/video",
        multipart: file.size > 20 * 1024 * 1024,
        onUploadProgress: ({ percentage }) => onProgress?.(Math.round(percentage)),
    });
    return blob.url;
}

/** The natural size of an image at a link, or null when it does not load. */
export function readImageSize(src: string) {
    return new Promise<{ width: number; height: number } | null>((resolve) => {
        if (!src) {
            resolve(null);
            return;
        }
        const image = new window.Image();
        const timer = window.setTimeout(() => resolve(null), 15000);
        image.onload = () => {
            window.clearTimeout(timer);
            resolve(image.naturalWidth && image.naturalHeight ? { width: image.naturalWidth, height: image.naturalHeight } : null);
        };
        image.onerror = () => {
            window.clearTimeout(timer);
            resolve(null);
        };
        image.src = src;
    });
}

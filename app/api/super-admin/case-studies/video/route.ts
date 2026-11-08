import path from "path";

import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { NextResponse } from "next/server";

import { verifySuperAdmin } from "@/lib/actions/super-admin-shared";
import { validateCsrfOrigin } from "@/lib/validation";

export const dynamic = "force-dynamic";

// Super Admin → Case Studies: the browser uploads walkthrough and film videos
// straight to Vercel Blob (they are too big to pass through a server
// function). This route only signs the upload for a signed-in super admin.
const VIDEO_TYPES: Record<string, string> = {
    ".mp4": "video/mp4",
    ".webm": "video/webm",
};
const MAX_VIDEO_BYTES = 200 * 1024 * 1024;

export async function POST(request: Request) {
    let body: HandleUploadBody;
    try {
        body = (await request.json()) as HandleUploadBody;
    } catch {
        return NextResponse.json({ error: "The upload request could not be read." }, { status: 400 });
    }

    if (body?.type === "blob.generate-client-token") {
        const csrf = validateCsrfOrigin(request);
        if (!csrf.valid) return csrf.response;
        try {
            await verifySuperAdmin();
        } catch {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
    }

    try {
        const result = await handleUpload({
            body,
            request,
            onBeforeGenerateToken: async (pathname) => {
                const contentType = VIDEO_TYPES[path.extname(pathname).toLowerCase()];
                if (!contentType) {
                    throw new Error("Upload an MP4 or WebM video.");
                }
                return {
                    allowedContentTypes: [contentType],
                    maximumSizeInBytes: MAX_VIDEO_BYTES,
                    addRandomSuffix: true,
                };
            },
        });
        return NextResponse.json(result);
    } catch (error) {
        console.error("[CaseStudyVideoUpload] Upload failed:", error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Upload failed." },
            { status: 400 },
        );
    }
}

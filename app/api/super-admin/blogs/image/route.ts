import { NextRequest, NextResponse } from "next/server";

import { verifySuperAdmin } from "@/lib/actions/super-admin-shared";
import { uploadFile } from "@/lib/storage";
import {
  getUploadMimeType,
  getUploadExtension,
  IMAGE_EXTENSIONS,
  MAX_UPLOAD_FILE_SIZE,
  sanitizeUploadFilename,
  validateImageBuffer,
} from "@/lib/upload-security";
import { validateCsrfOrigin } from "@/lib/validation";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    const csrf = validateCsrfOrigin(request);
    if (!csrf.valid) return csrf.response;

    await verifySuperAdmin();

    const formData = await request.formData();
    const file = formData.get("file");

    if (!file || typeof file === "string") {
      return NextResponse.json({ success: false, error: "No image received" }, { status: 400 });
    }

    if (file.size > MAX_UPLOAD_FILE_SIZE) {
      return NextResponse.json({ success: false, error: "Image is too large" }, { status: 400 });
    }

    const originalName = file.name || "";
    const ext = getUploadExtension(originalName);
    if (!IMAGE_EXTENSIONS.has(ext)) {
      return NextResponse.json({ success: false, error: "Only JPG, PNG, GIF, and WebP images are allowed" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    try {
      validateImageBuffer(buffer, ext);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Upload rejected";
      return NextResponse.json({ success: false, error: message }, { status: 400 });
    }

    const filename = sanitizeUploadFilename(originalName);
    const url = await uploadFile(buffer, filename, getUploadMimeType(ext));

    return NextResponse.json({ success: true, url }, { status: 201 });
  } catch (error) {
    console.error("[SuperAdminBlogImageUpload] Upload failed:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Upload failed" },
      { status: 500 },
    );
  }
}

import { NextResponse } from 'next/server';

import { checkAuth } from '@/lib/authMiddleware';
import { uploadFile } from '@/lib/storage';
import {
  getUploadExtension,
  getUploadMimeType,
  IMAGE_EXTENSIONS,
  MAX_UPLOAD_FILE_SIZE,
  sanitizeUploadFilename,
  validateImageBuffer,
} from '@/lib/upload-security';
import { validateCsrfOrigin } from '@/lib/validation';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

// Cover and inline images for blog posts written in the content admin at /admin.
export async function POST(req) {
  try {
    const csrf = validateCsrfOrigin(req);
    if (!csrf.valid) return csrf.response;

    const auth = await checkAuth();
    if (!auth.authorized) return auth.response;

    const formData = await req.formData();
    const file = formData.get('file');
    if (!file || typeof file === 'string') {
      return NextResponse.json({ success: false, error: 'No image received' }, { status: 400 });
    }
    if (file.size > MAX_UPLOAD_FILE_SIZE) {
      return NextResponse.json({ success: false, error: 'Image is too large' }, { status: 400 });
    }

    const ext = getUploadExtension(file.name || '');
    if (!IMAGE_EXTENSIONS.has(ext)) {
      return NextResponse.json({ success: false, error: 'Only JPG, PNG, GIF and WebP images are allowed' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    try {
      validateImageBuffer(buffer, ext);
    } catch (error) {
      return NextResponse.json(
        { success: false, error: error instanceof Error ? error.message : 'Upload rejected' },
        { status: 400 }
      );
    }

    const url = await uploadFile(buffer, sanitizeUploadFilename(file.name || `image${ext}`), getUploadMimeType(ext));
    return NextResponse.json({ success: true, url }, { status: 201 });
  } catch (error) {
    console.error('[AdminBlogImageUpload] Upload failed:', error);
    return NextResponse.json({ success: false, error: 'Upload failed. Try again in a moment.' }, { status: 500 });
  }
}

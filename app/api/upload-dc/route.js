import { NextResponse } from 'next/server';

import { getSessionUser } from '@/lib/auth';
import { getCurrentAgency, checkTrialExpired } from '@/lib/agency-context';
import {
  assertAgencyCanUpload,
  assertAllowedUploadExtension,
  getUploadMimeType,
  reserveAgencyStorageAfterUpload,
  sanitizeUploadFilename,
  validateImageBuffer,
} from '@/lib/upload-security';
import { validateCsrfOrigin } from '@/lib/validation';
import { uploadFile } from '@/lib/storage';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function POST(req) {
  try {
    const csrf = validateCsrfOrigin(req);
    if (!csrf.valid) return csrf.response;

    const session = await getSessionUser();
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const agency = await getCurrentAgency();
    if (await checkTrialExpired(agency)) {
      return NextResponse.json({ success: false, error: 'Trial expired. Please upgrade your plan.' }, { status: 403 });
    }

    const formData = await req.formData();
    const file = formData.get('file');

    if (!file || typeof file === 'string') {
      return NextResponse.json({ success: false, error: 'No file received' }, { status: 400 });
    }

    try {
      assertAgencyCanUpload(agency, file.size);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Upload blocked';
      const status = message.includes('Storage limit') || message.includes('Agency context') ? 403 : 400;
      return NextResponse.json({ success: false, error: message }, { status });
    }

    const originalName = file.name || '';

    let ext;
    try {
      ext = assertAllowedUploadExtension(originalName);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'File type not allowed.';
      return NextResponse.json({ success: false, error: message }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    try {
      validateImageBuffer(buffer, ext);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Upload rejected.';
      return NextResponse.json({ success: false, error: message }, { status: 400 });
    }

    const filename = sanitizeUploadFilename(originalName);
    const contentType = getUploadMimeType(ext);
    const blobUrl = await uploadFile(buffer, filename, contentType);

    try {
      await reserveAgencyStorageAfterUpload(agency.id, buffer.length, blobUrl);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Upload blocked';
      const status = message.includes('Storage limit') || message.includes('Agency context') ? 403 : 400;
      return NextResponse.json({ success: false, error: message }, { status });
    }

    return NextResponse.json({
      success: true,
      url: blobUrl,
    }, { status: 201 });
  } catch (error) {
    console.error('Error uploading file:', error);
    return NextResponse.json({ success: false, error: 'Upload failed' }, { status: 500 });
  }
}

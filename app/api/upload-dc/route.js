import { NextResponse } from 'next/server';
import path from 'path';
import { getSessionUser } from '@/lib/auth';
import { getCurrentAgency, checkTrialExpired } from '@/lib/agency-context';
import { validateCsrfOrigin } from '@/lib/validation';
import { uploadToAzure } from '@/lib/azure-storage';

export const dynamic = 'force-dynamic';

const ALLOWED_EXTENSIONS = new Set([
  '.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg',
  '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.csv', '.txt'
]);
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

// MIME type mapping for Azure content-type header
const MIME_TYPES = {
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png',
  '.gif': 'image/gif', '.webp': 'image/webp', '.svg': 'image/svg+xml',
  '.pdf': 'application/pdf', '.doc': 'application/msword',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.xls': 'application/vnd.ms-excel',
  '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  '.csv': 'text/csv', '.txt': 'text/plain'
};

export async function POST(req) {
  try {
    const csrf = validateCsrfOrigin(req);
    if (!csrf.valid) return csrf.response;

    // Authentication check
    const session = await getSessionUser();
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    // Trial expiration check
    const agency = await getCurrentAgency();
    if (await checkTrialExpired(agency)) {
      return NextResponse.json({ success: false, error: 'Trial expired. Please upgrade your plan.' }, { status: 403 });
    }

    const formData = await req.formData();
    const file = formData.get('file');

    if (!file) {
      return NextResponse.json({ success: false, error: 'No file received' }, { status: 400 });
    }

    // File size validation
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ success: false, error: 'File too large. Maximum size is 50MB.' }, { status: 400 });
    }

    // Agency storage limit validation
    if (!agency) {
      return NextResponse.json({ success: false, error: 'Agency context not found. Please log in again.' }, { status: 403 });
    }

    const maxStorageBytes = (agency.limits?.maxStorage || 0) * 1024 * 1024;
    const currentStorageBytes = agency.usage?.storage || 0;
    
    // -1 means unlimited
    if (agency.limits?.maxStorage !== -1 && (currentStorageBytes + file.size) > maxStorageBytes) {
        return NextResponse.json({ 
            success: false, 
            error: `Storage limit reached. You have used ${(currentStorageBytes / (1024*1024)).toFixed(2)}MB of your ${agency.limits?.maxStorage}MB limit.` 
        }, { status: 403 });
    }

    // File type validation — use extension from original filename
    const originalName = file.name || '';
    const ext = path.extname(originalName).toLowerCase();
    if (!ext || !ALLOWED_EXTENSIONS.has(ext)) {
      return NextResponse.json({ success: false, error: 'File type not allowed.' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    // Sanitize filename: strip path traversal, remove special chars
    const baseName = path.basename(originalName);
    const safeName = baseName.replace(/[^a-zA-Z0-9._-]/g, '_');
    const filename = Date.now() + '_' + safeName;

    // Get content type for Azure
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    // Upload to Azure Blob Storage
    const blobUrl = await uploadToAzure(buffer, filename, contentType);

    // Track storage usage for the agency
    try {
      const { connectDB } = await import('@/lib/db');
      const { AgencyModel } = await import('@/lib/mongodb');
      await connectDB();
      await AgencyModel.updateOne(
        { id: agency.id },
        { $inc: { 'usage.storage': buffer.length } }
      );
    } catch (storageErr) {
      console.error('Failed to update storage usage:', storageErr);
    }

    return NextResponse.json({ 
      success: true, 
      url: blobUrl
    }, { status: 201 });

  } catch (error) {
    console.error('Error uploading file:', error);
    return NextResponse.json({ success: false, error: 'Upload failed' }, { status: 500 });
  }
}

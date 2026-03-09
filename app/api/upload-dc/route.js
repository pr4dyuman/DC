import { NextResponse } from 'next/server';
import path from 'path';
import { writeFile } from 'fs/promises';
import fs from 'fs';
import { getSessionUser } from '@/lib/auth';
import { getCurrentAgency, checkTrialExpired } from '@/lib/agency-context';
import { validateCsrfOrigin } from '@/lib/validation';

export const dynamic = 'force-dynamic';

const ALLOWED_EXTENSIONS = new Set([
  '.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg',
  '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.csv', '.txt'
]);
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

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
      return NextResponse.json({ success: false, error: 'File too large. Maximum size is 5MB.' }, { status: 400 });
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
    
    // Ensure upload dir exists
    const uploadDir = path.join(process.cwd(), 'public/uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    // Resolve and verify the final path stays within uploadDir
    const filePath = path.resolve(uploadDir, filename);
    if (!filePath.startsWith(uploadDir)) {
      return NextResponse.json({ success: false, error: 'Invalid filename.' }, { status: 400 });
    }

    await writeFile(filePath, buffer);

    return NextResponse.json({ 
      success: true, 
      url: `/uploads/${filename}` 
    }, { status: 201 });

  } catch (error) {
    console.error('Error uploading file:', error);
    return NextResponse.json({ success: false, error: 'Upload failed' }, { status: 500 });
  }
}



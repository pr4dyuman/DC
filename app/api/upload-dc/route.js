import { NextResponse } from 'next/server';
import path from 'path';
import { getSessionUser } from '@/lib/auth';
import { getCurrentAgency, checkTrialExpired } from '@/lib/agency-context';
import { validateCsrfOrigin } from '@/lib/validation';
import { uploadToAzure } from '@/lib/azure-storage';

export const dynamic = 'force-dynamic';

// SVG intentionally excluded — can contain embedded <script> tags (XSS vector)
const ALLOWED_EXTENSIONS = new Set([
  '.jpg', '.jpeg', '.png', '.gif', '.webp',
  '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.csv', '.txt'
]);
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

// Maximum image dimensions — prevents pixel bomb attacks
// (e.g. 20KB file with 99999×99999 pixels = ~40GB in memory when decoded)
const MAX_IMAGE_DIMENSION = 8192; // 8K — covers 4K displays with plenty of headroom

// MIME type mapping for Azure content-type header
const MIME_TYPES = {
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png',
  '.gif': 'image/gif', '.webp': 'image/webp',
  '.pdf': 'application/pdf', '.doc': 'application/msword',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.xls': 'application/vnd.ms-excel',
  '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  '.csv': 'text/csv', '.txt': 'text/plain'
};

// Magic byte signatures for image types
const IMAGE_MAGIC = {
  '.png':  [0x89, 0x50, 0x4E, 0x47], // \x89PNG
  '.jpg':  [0xFF, 0xD8, 0xFF],        // JPEG SOI
  '.jpeg': [0xFF, 0xD8, 0xFF],
  '.gif':  [0x47, 0x49, 0x46],        // GIF
  '.webp': null, // WebP: starts with RIFF....WEBP (checked separately)
};

/**
 * Validate magic bytes to prevent extension spoofing
 */
function validateMagicBytes(buffer, ext) {
  if (ext === '.webp') {
    // RIFF....WEBP
    return buffer.length >= 12
      && buffer[0] === 0x52 && buffer[1] === 0x49
      && buffer[2] === 0x46 && buffer[3] === 0x46
      && buffer[8] === 0x57 && buffer[9] === 0x45
      && buffer[10] === 0x42 && buffer[11] === 0x50;
  }
  const magic = IMAGE_MAGIC[ext];
  if (!magic) return true; // Non-image files don't need magic byte check
  if (buffer.length < magic.length) return false;
  return magic.every((byte, i) => buffer[i] === byte);
}

/**
 * Extract image dimensions from raw bytes (no external library needed).
 * Returns { width, height } or null if not an image or can't parse.
 */
function getImageDimensions(buffer, ext) {
  try {
    if (ext === '.png') {
      // PNG: width at offset 16 (4 bytes BE), height at offset 20 (4 bytes BE)
      if (buffer.length < 24) return null;
      const width = buffer.readUInt32BE(16);
      const height = buffer.readUInt32BE(20);
      return { width, height };
    }

    if (ext === '.gif') {
      // GIF: width at offset 6 (2 bytes LE), height at offset 8 (2 bytes LE)
      if (buffer.length < 10) return null;
      const width = buffer.readUInt16LE(6);
      const height = buffer.readUInt16LE(8);
      return { width, height };
    }

    if (ext === '.jpg' || ext === '.jpeg') {
      // JPEG: scan for SOF marker (0xFF 0xC0..0xCF except 0xC4 and 0xC8)
      let offset = 2;
      while (offset < buffer.length - 8) {
        if (buffer[offset] !== 0xFF) { offset++; continue; }
        const marker = buffer[offset + 1];
        // SOF markers: C0-C3, C5-C7, C9-CB, CD-CF
        if (marker >= 0xC0 && marker <= 0xCF && marker !== 0xC4 && marker !== 0xC8) {
          const height = buffer.readUInt16BE(offset + 5);
          const width = buffer.readUInt16BE(offset + 7);
          return { width, height };
        }
        // Skip to next marker
        const segLen = buffer.readUInt16BE(offset + 2);
        offset += 2 + segLen;
      }
      return null;
    }

    if (ext === '.webp') {
      // WebP: VP8 header at offset 12
      if (buffer.length < 30) return null;
      const chunk = String.fromCharCode(buffer[12], buffer[13], buffer[14], buffer[15]);
      if (chunk === 'VP8 ') {
        // Lossy WebP — dimensions at offset 26 (LE, 14-bit)
        const width = (buffer.readUInt16LE(26)) & 0x3FFF;
        const height = (buffer.readUInt16LE(28)) & 0x3FFF;
        return { width, height };
      } else if (chunk === 'VP8L') {
        // Lossless WebP — dimensions encoded in bits 14-27 and 28-41 at offset 21
        if (buffer.length < 25) return null;
        const b0 = buffer[21], b1 = buffer[22], b2 = buffer[23], b3 = buffer[24];
        const width = 1 + (((b1 & 0x3F) << 8) | b0);
        const height = 1 + (((b3 & 0xF) << 10) | (b2 << 2) | ((b1 >> 6) & 0x3));
        return { width, height };
      } else if (chunk === 'VP8X') {
        // Extended WebP — canvas width at offset 24 (3 bytes LE + 1), height at 27
        if (buffer.length < 30) return null;
        const width = 1 + (buffer[24] | (buffer[25] << 8) | (buffer[26] << 16));
        const height = 1 + (buffer[27] | (buffer[28] << 8) | (buffer[29] << 16));
        return { width, height };
      }
      return null;
    }
  } catch {
    return null; // Malformed file — reject dimensions as unknown
  }
  return null; // Not an image type
}

const IMAGE_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.gif', '.webp']);

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

    // Magic byte validation — prevent extension spoofing (e.g. .jpg file that's actually an executable)
    if (IMAGE_EXTENSIONS.has(ext)) {
      if (!validateMagicBytes(buffer, ext)) {
        return NextResponse.json({ success: false, error: 'File content does not match its extension. Upload rejected.' }, { status: 400 });
      }

      // Image dimension validation — prevent pixel bomb attacks
      const dimensions = getImageDimensions(buffer, ext);
      if (dimensions) {
        if (dimensions.width > MAX_IMAGE_DIMENSION || dimensions.height > MAX_IMAGE_DIMENSION) {
          return NextResponse.json({
            success: false,
            error: `Image dimensions too large (${dimensions.width}×${dimensions.height}). Maximum allowed is ${MAX_IMAGE_DIMENSION}×${MAX_IMAGE_DIMENSION}.`
          }, { status: 400 });
        }
        if (dimensions.width <= 0 || dimensions.height <= 0) {
          return NextResponse.json({ success: false, error: 'Invalid image dimensions.' }, { status: 400 });
        }
      }
      // If dimensions couldn't be parsed, allow upload (non-standard format) — size limit still applies
    }

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
      const { AgencyModel } = await import('@/lib/mongodb');
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

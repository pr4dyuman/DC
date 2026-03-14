import { put, del, list } from '@vercel/blob';
import { uploadToAzure, deleteFromAzure, isAzureBlobUrl } from './azure-storage';

/**
 * Hybrid Storage Module
 * 
 * Primary: Vercel Blob (free 1GB across all agencies)
 * Overflow: Azure Blob Storage (when Vercel Blob exceeds 950MB)
 * 
 * Both providers return self-contained URLs:
 * - Vercel Blob: https://xxx.public.blob.vercel-storage.com/filename
 * - Azure Blob:  https://account.blob.core.windows.net/container/filename?sas=...
 */

const VERCEL_BLOB_THRESHOLD = 950 * 1024 * 1024; // 950MB — switch to Azure after this

// In-memory cache for Vercel Blob usage to avoid frequent list() calls
let _cachedVercelUsage: { bytes: number; fetchedAt: number } | null = null;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Check if BLOB_READ_WRITE_TOKEN is configured (Vercel Blob available)
 */
function isVercelBlobConfigured(): boolean {
  return !!process.env.BLOB_READ_WRITE_TOKEN;
}

/**
 * Check if a URL is a Vercel Blob URL
 */
export function isVercelBlobUrl(url: string): boolean {
  return url.includes('.public.blob.vercel-storage.com');
}

/**
 * Get current Vercel Blob usage in bytes.
 * Uses list() API with cursor pagination to sum up all blob sizes.
 * Results are cached for 5 minutes to avoid excessive API calls.
 */
async function getVercelBlobUsage(): Promise<number> {
  // Return cache if fresh
  if (_cachedVercelUsage && (Date.now() - _cachedVercelUsage.fetchedAt) < CACHE_TTL) {
    return _cachedVercelUsage.bytes;
  }

  try {
    let totalBytes = 0;
    let cursor: string | undefined;
    let hasMore = true;

    while (hasMore) {
      const result = await list({ cursor, limit: 1000 });
      for (const blob of result.blobs) {
        totalBytes += blob.size;
      }
      cursor = result.cursor;
      hasMore = result.hasMore;
    }

    _cachedVercelUsage = { bytes: totalBytes, fetchedAt: Date.now() };
    return totalBytes;
  } catch (error) {
    console.error('[Storage] Failed to get Vercel Blob usage:', error);
    // If we can't check usage, fall back to Azure to be safe
    return Infinity;
  }
}

/**
 * Invalidate the usage cache (call after upload/delete)
 */
function invalidateUsageCache() {
  _cachedVercelUsage = null;
}

/**
 * Upload a file — routes to Vercel Blob or Azure based on current usage.
 * 
 * @param buffer - File buffer
 * @param fileName - Sanitized filename (already timestamped by caller)
 * @param contentType - MIME type
 * @returns Public URL of the uploaded file
 */
export async function uploadFile(
  buffer: Buffer,
  fileName: string,
  contentType?: string
): Promise<string> {
  // Check if Vercel Blob is available and under threshold
  if (isVercelBlobConfigured()) {
    try {
      const currentUsage = await getVercelBlobUsage();

      if (currentUsage + buffer.length <= VERCEL_BLOB_THRESHOLD) {
        // Upload to Vercel Blob
        const blob = await put(fileName, buffer, {
          access: 'public',
          contentType: contentType || 'application/octet-stream',
        });

        // Update cache optimistically
        if (_cachedVercelUsage) {
          _cachedVercelUsage.bytes += buffer.length;
        }

        console.log(`[Storage] Uploaded to Vercel Blob (${(currentUsage / (1024 * 1024)).toFixed(1)}MB used)`);
        return blob.url;
      } else {
        console.log(`[Storage] Vercel Blob at ${(currentUsage / (1024 * 1024)).toFixed(1)}MB — routing to Azure`);
      }
    } catch (error) {
      console.error('[Storage] Vercel Blob upload failed, falling back to Azure:', error);
    }
  }

  // Fallback: Upload to Azure
  const url = await uploadToAzure(buffer, fileName, contentType);
  console.log('[Storage] Uploaded to Azure Blob Storage');
  return url;
}

/**
 * Delete a file from whichever provider hosts it.
 * Detects provider from the URL.
 */
export async function deleteFile(url: string): Promise<void> {
  try {
    if (isVercelBlobUrl(url)) {
      await del(url);
      invalidateUsageCache(); // Usage changed, clear cache
      console.log('[Storage] Deleted from Vercel Blob');
    } else if (isAzureBlobUrl(url)) {
      await deleteFromAzure(url);
      console.log('[Storage] Deleted from Azure');
    } else {
      console.warn('[Storage] Unknown storage provider for URL:', url);
    }
  } catch (error) {
    console.error('[Storage] Failed to delete file:', error);
    // Don't throw — DB operations should still succeed
  }
}

/**
 * Get storage stats for monitoring (optional, for super-admin dashboard)
 */
export async function getStorageStats() {
  const vercelUsage = isVercelBlobConfigured() ? await getVercelBlobUsage() : 0;
  return {
    vercelBlob: {
      usedBytes: vercelUsage,
      usedMB: Math.round(vercelUsage / (1024 * 1024) * 100) / 100,
      thresholdMB: VERCEL_BLOB_THRESHOLD / (1024 * 1024),
      isOverThreshold: vercelUsage >= VERCEL_BLOB_THRESHOLD,
      configured: isVercelBlobConfigured(),
    },
    activeProvider: vercelUsage < VERCEL_BLOB_THRESHOLD && isVercelBlobConfigured()
      ? 'vercel-blob' : 'azure',
  };
}

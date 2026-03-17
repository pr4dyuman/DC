import { NextResponse } from 'next/server';
import { handleUpload } from '@vercel/blob/client';
import { getSessionUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

/**
 * Client Upload Handler for Vercel Blob
 * 
 * This enables direct browser-to-Vercel-Blob uploads, bypassing the
 * 4.5MB serverless function body limit. The browser sends the file
 * directly to Vercel Blob storage after getting a secure token.
 * 
 * Flow:
 * 1. Client calls POST /api/upload-blob with upload metadata
 * 2. This handler validates auth and returns a secure upload token
 * 3. Client uploads directly to Vercel Blob using the token
 * 4. Vercel Blob calls back to confirm the upload
 */
export async function POST(req) {
  try {
    // Auth check
    const session = await getSessionUser();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();

    const jsonResponse = await handleUpload({
      body,
      request: req,
      onBeforeGenerateToken: async (pathname) => {
        // Validate file type
        const ext = pathname.split('.').pop()?.toLowerCase();
        const ALLOWED = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'pdf', 'doc', 'docx', 'xls', 'xlsx', 'csv', 'txt'];
        
        if (!ext || !ALLOWED.includes(ext)) {
          throw new Error('File type not allowed.');
        }

        return {
          allowedContentTypes: [
            'image/jpeg', 'image/png', 'image/gif', 'image/webp',
            'application/pdf',
            'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.document',
            'text/csv', 'text/plain'
          ],
          maximumSizeInBytes: 50 * 1024 * 1024, // 50MB
          tokenPayload: JSON.stringify({
            userId: session.userId,
          }),
        };
      },
      onUploadCompleted: async ({ blob }) => {
        // Called after successful upload
        console.log(`[Blob Client Upload] Completed: ${blob.pathname} (${blob.size} bytes)`);
      },
    });

    return NextResponse.json(jsonResponse);
  } catch (error) {
    console.error('[Blob Client Upload] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Upload failed' },
      { status: 400 }
    );
  }
}

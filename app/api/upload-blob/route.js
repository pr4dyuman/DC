import { NextResponse } from 'next/server';
import { handleUpload } from '@vercel/blob/client';

import { getSessionUser } from '@/lib/auth';
import { getCurrentAgency, checkTrialExpired } from '@/lib/agency-context';
import { canCurrentUserAccessProject } from '@/lib/actions/access';
import { deleteFile } from '@/lib/storage';
import {
  assertAgencyCanUpload,
  assertAllowedUploadExtension,
  getAllowedContentTypesForExtension,
  parseDirectUploadClientPayload,
  reserveAgencyStorageAfterUpload,
  validateUploadedBlobFromUrl,
} from '@/lib/upload-security';
import { validateCsrfOrigin } from '@/lib/validation';

export const dynamic = 'force-dynamic';

function parseUploadTokenPayload(tokenPayload) {
  if (!tokenPayload) return {};

  try {
    const parsed = JSON.parse(tokenPayload);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    throw new Error('Invalid upload context.');
  }
}

export async function POST(req) {
  try {
    const body = await req.json();
    const isTokenRequest = body?.type === 'blob.generate-client-token';

    let session = null;
    let agency = null;

    if (isTokenRequest) {
      const csrf = validateCsrfOrigin(req);
      if (!csrf.valid) return csrf.response;

      session = await getSessionUser();
      if (!session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }

      agency = await getCurrentAgency();
      if (await checkTrialExpired(agency)) {
        return NextResponse.json({ error: 'Trial expired. Please upgrade your plan.' }, { status: 403 });
      }
    }

    const jsonResponse = await handleUpload({
      body,
      request: req,
      onBeforeGenerateToken: async (pathname, clientPayload) => {
        if (!session) {
          throw new Error('Unauthorized');
        }

        const uploadMeta = parseDirectUploadClientPayload(clientPayload);
        const projectId = typeof uploadMeta.projectId === 'string' ? uploadMeta.projectId.trim() : '';
        const fileSize = Number(uploadMeta.fileSize);
        const ext = assertAllowedUploadExtension(pathname);

        if (!projectId) {
          throw new Error('Project context is required for uploads.');
        }

        assertAgencyCanUpload(agency, fileSize);

        const canAccess = await canCurrentUserAccessProject(projectId, agency.id);
        if (!canAccess) {
          throw new Error('Unauthorized: You cannot upload files to this project.');
        }

        return {
          allowedContentTypes: getAllowedContentTypesForExtension(ext),
          maximumSizeInBytes: 50 * 1024 * 1024,
          tokenPayload: JSON.stringify({
            agencyId: agency.id,
            extension: ext,
            fileSize,
            projectId,
            userId: session.userId,
          }),
        };
      },
      onUploadCompleted: async ({ blob, tokenPayload }) => {
        const uploadContext = parseUploadTokenPayload(tokenPayload);
        const agencyId = typeof uploadContext.agencyId === 'string' ? uploadContext.agencyId : '';
        const expectedExtension = typeof uploadContext.extension === 'string' ? uploadContext.extension : '';
        const expectedSize = Number(uploadContext.fileSize);
        const actualExtension = assertAllowedUploadExtension(blob.pathname);

        if (!agencyId) {
          await deleteFile(blob.url);
          throw new Error('Missing upload agency context.');
        }

        if (expectedExtension && expectedExtension !== actualExtension) {
          await deleteFile(blob.url);
          throw new Error('Upload extension mismatch.');
        }

        if (Number.isFinite(expectedSize) && expectedSize > 0 && blob.size !== expectedSize) {
          await deleteFile(blob.url);
          throw new Error('Upload metadata mismatch.');
        }

        try {
          await validateUploadedBlobFromUrl(blob.url, actualExtension);
        } catch (error) {
          await deleteFile(blob.url);
          throw error;
        }

        await reserveAgencyStorageAfterUpload(agencyId, blob.size, blob.url);

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

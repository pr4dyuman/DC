import {
  BlobServiceClient,
  StorageSharedKeyCredential,
  generateBlobSASQueryParameters,
  BlobSASPermissions,
  SASProtocol
} from '@azure/storage-blob';

const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING!;
const containerName = process.env.AZURE_STORAGE_CONTAINER || 'corvids';

let _blobServiceClient: BlobServiceClient | null = null;

function getBlobServiceClient(): BlobServiceClient {
  if (!_blobServiceClient) {
    if (!connectionString) {
      throw new Error('AZURE_STORAGE_CONNECTION_STRING is not configured');
    }
    _blobServiceClient = BlobServiceClient.fromConnectionString(connectionString);
  }
  return _blobServiceClient;
}

function getContainerClient() {
  return getBlobServiceClient().getContainerClient(containerName);
}

/**
 * Extract account name and key from connection string for SAS generation
 */
function getCredentials(): { accountName: string; accountKey: string } {
  const parts = connectionString.split(';');
  let accountName = '';
  let accountKey = '';
  for (const part of parts) {
    if (part.startsWith('AccountName=')) accountName = part.slice('AccountName='.length);
    if (part.startsWith('AccountKey=')) accountKey = part.slice('AccountKey='.length);
  }
  return { accountName, accountKey };
}

/**
 * Generate a SAS URL for a blob that's valid for 1 year.
 * Used because the container is private.
 */
function generateSasUrl(blobName: string): string {
  const { accountName, accountKey } = getCredentials();
  const sharedKeyCredential = new StorageSharedKeyCredential(accountName, accountKey);
  
  const expiresOn = new Date();
  expiresOn.setFullYear(expiresOn.getFullYear() + 1); // 1 year expiry

  const sasToken = generateBlobSASQueryParameters(
    {
      containerName,
      blobName,
      permissions: BlobSASPermissions.parse('r'), // Read-only
      expiresOn,
      protocol: SASProtocol.Https,
    },
    sharedKeyCredential
  ).toString();

  return `https://${accountName}.blob.core.windows.net/${containerName}/${blobName}?${sasToken}`;
}

/**
 * Upload a file buffer to Azure Blob Storage.
 * Returns the public URL (with SAS token for private containers).
 */
export async function uploadToAzure(
  buffer: Buffer,
  fileName: string,
  contentType?: string
): Promise<string> {
  const containerClient = getContainerClient();
  
  // Ensure container exists
  await containerClient.createIfNotExists();

  const blockBlobClient = containerClient.getBlockBlobClient(fileName);
  
  await blockBlobClient.uploadData(buffer, {
    blobHTTPHeaders: {
      blobContentType: contentType || 'application/octet-stream',
    },
  });

  // Return SAS URL since container is private
  return generateSasUrl(fileName);
}

/**
 * Delete a file from Azure Blob Storage.
 */
export async function deleteFromAzure(blobUrl: string): Promise<void> {
  try {
    // Extract blob name from URL
    // URL format: https://account.blob.core.windows.net/container/blobname?sastoken
    const url = new URL(blobUrl);
    const pathParts = url.pathname.split('/');
    // pathParts: ['', 'container', ...blobNameParts]
    const blobName = pathParts.slice(2).join('/');
    
    if (!blobName) return;

    const containerClient = getContainerClient();
    const blobClient = containerClient.getBlobClient(blobName);
    await blobClient.deleteIfExists();
  } catch (error) {
    console.error('[Azure] Failed to delete blob:', error);
    // Don't throw — asset deletion from DB should still succeed
  }
}

/**
 * Check if a URL is an Azure Blob Storage URL
 */
export function isAzureBlobUrl(url: string): boolean {
  return url.includes('.blob.core.windows.net/');
}

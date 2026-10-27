import { unstable_cache } from 'next/cache';
import B2 from 'backblaze-b2';

const b2 = new B2({
  applicationKeyId: process.env.B2_APPLICATION_KEY_ID || '',
  applicationKey: process.env.B2_APPLICATION_KEY || '',
});

// B2 account tokens last 24 hours: authorize again before then, and once more if B2 says ours expired
const REAUTHORIZE_AFTER_MS = 23 * 60 * 60 * 1000;
let authorizedAt = 0;

async function authorize(force = false) {
  if (!force && authorizedAt && Date.now() - authorizedAt < REAUTHORIZE_AFTER_MS) return;
  await b2.authorize();
  authorizedAt = Date.now();
}

/** Runs a B2 call with a current token, retrying once with a fresh one on 401. */
async function withB2<T>(call: () => Promise<T>): Promise<T> {
  await authorize();
  try {
    return await call();
  } catch (error) {
    if ((error as { response?: { status?: number } })?.response?.status !== 401) throw error;
    await authorize(true);
    return call();
  }
}

async function requestUploadUrl() {
  try {
    const response = await b2.getUploadUrl({
      bucketId: process.env.B2_BUCKET_ID || '',
    });
    return response.data;
  } catch (error: any) {
    if (error.response) {
      console.error('B2 getUploadUrl Error Response:', error.response.data);
    }
    throw error;
  }
}

export async function uploadFile(
  fileName: string,
  data: Buffer,
  contentType: string
) {
  // A fresh upload URL per attempt: its own token can expire too
  return withB2(async () => {
    const uploadUrlData = await requestUploadUrl();
  
    try {
      const response = await b2.uploadFile({
        uploadUrl: uploadUrlData.uploadUrl,
        uploadAuthToken: uploadUrlData.authorizationToken,
        fileName: fileName,
        data: data,
        // Without an explicit type B2 guesses from the extension
        mime: contentType,
      });
    
      return response.data;
    } catch (error: any) {
      if (error.response) {
        console.error('B2 uploadFile Error Response:', error.response.data);
      }
      throw error;
    }
  });
}

export async function deleteFile(fileId: string, fileName: string) {
  const response = await withB2(() => b2.deleteFileVersion({
    fileId: fileId,
    fileName: fileName,
  }));
  return response.data;
}

export async function getDownloadUrl(fileName: string) {
  // B2 download URL format: https://f000.backblazeb2.com/file/bucket-name/file-name
  const bucketName = process.env.B2_BUCKET_NAME || '';
  let endpoint = process.env.B2_ENDPOINT || 'f000.backblazeb2.com';
  
  // 🟢 FIX: Map S3 endpoint to Native endpoint for correct URL structure
  if (endpoint.includes('s3.us-east-005')) {
    endpoint = 'f005.backblazeb2.com';
  }
  
  const url = `https://${endpoint}/file/${bucketName}/${fileName}`;
  // console.log('Generated B2 Download URL:', url); // Reduced log noise
  return url;
}

/**
 * Generates a pre-signed (authorized) download URL for private buckets
 */
export async function getAuthorizedDownloadUrl(fileName: string, validDurationInSeconds = 3600) {
  const response = await withB2(() => b2.getDownloadAuthorization({
    bucketId: process.env.B2_BUCKET_ID || '',
    fileNamePrefix: fileName,
    validDurationInSeconds,
  }));
  
  const authToken = response.data.authorizationToken;
  const baseUrl = await getDownloadUrl(fileName);
  
  return `${baseUrl}?Authorization=${authToken}`;
}

// One signed URL per file, reused for most of its hour of validity
const getCachedFileUrl = unstable_cache(
  async (fileName: string) => getAuthorizedDownloadUrl(fileName),
  ['b2-signed-file-url'],
  { revalidate: 3000 }
);

/**
 * A viewable URL for stored media: files in our (private) bucket get a download token scoped to
 * that one file; anything else is returned unchanged and never carries a token.
 */
export async function signMediaUrl(url: string | null | undefined): Promise<string | null> {
  const fileName = fileNameFromUrl(url);
  if (!fileName) return url ?? null;
  try {
    return await getCachedFileUrl(fileName);
  } catch (e) {
    console.error('Failed to sign B2 media URL', e);
    return url ?? null;
  }
}

/** The file name inside our bucket for a stored media URL (https://<host>/file/<bucket>/<name>), or null for other URLs. */
export function fileNameFromUrl(url: string | null | undefined): string | null {
  const bucketName = process.env.B2_BUCKET_NAME;
  if (!url || !bucketName) return null;
  try {
    const { hostname, pathname } = new URL(url);
    const prefix = `/file/${bucketName}/`;
    if (!hostname.endsWith('.backblazeb2.com') || !pathname.startsWith(prefix)) return null;
    return decodeURIComponent(pathname.slice(prefix.length)) || null;
  } catch {
    return null;
  }
}

/** Deletes every stored version of a file by name (we keep URLs, not B2 file IDs). */
export async function deleteFileByName(fileName: string) {
  const response = await withB2(() => b2.listFileVersions({
    bucketId: process.env.B2_BUCKET_ID || '',
    startFileName: fileName,
    maxFileCount: 100,
  } as Parameters<typeof b2.listFileVersions>[0])); // the typings wrongly require startFileId
  const versions = (response.data.files as { fileId: string; fileName: string }[]).filter(f => f.fileName === fileName);
  for (const version of versions) {
    await withB2(() => b2.deleteFileVersion({ fileId: version.fileId, fileName: version.fileName }));
  }
  return versions.length;
}

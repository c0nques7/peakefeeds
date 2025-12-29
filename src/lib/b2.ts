import B2 from 'backblaze-b2';

const b2 = new B2({
  applicationKeyId: process.env.B2_APPLICATION_KEY_ID || '',
  applicationKey: process.env.B2_APPLICATION_KEY || '',
});

let authorized = false;

async function authorize() {
  if (authorized) return;
  await b2.authorize();
  authorized = true;
}

export async function getUploadUrl() {
  await authorize();
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
  await authorize();
  const uploadUrlData = await getUploadUrl();
  
  try {
    const response = await b2.uploadFile({
      uploadUrl: uploadUrlData.uploadUrl,
      uploadAuthToken: uploadUrlData.authorizationToken,
      fileName: fileName,
      data: data,
    });
    
    return response.data;
  } catch (error: any) {
    if (error.response) {
      console.error('B2 uploadFile Error Response:', error.response.data);
    }
    throw error;
  }
}

export async function deleteFile(fileId: string, fileName: string) {
  await authorize();
  const response = await b2.deleteFileVersion({
    fileId: fileId,
    fileName: fileName,
  });
  return response.data;
}

export async function getDownloadUrl(fileName: string) {
  await authorize();
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
  await authorize();
  const response = await b2.getDownloadAuthorization({
    bucketId: process.env.B2_BUCKET_ID || '',
    fileNamePrefix: fileName,
    validDurationInSeconds,
  });
  
  const authToken = response.data.authorizationToken;
  const baseUrl = await getDownloadUrl(fileName);
  
  return `${baseUrl}?Authorization=${authToken}`;
}

/**
 * 🟢 NEW: Get a bucket-wide auth token for efficient signing of multiple images
 */
export async function getBucketAuthToken(validDurationInSeconds = 3600) {
  await authorize();
  const response = await b2.getDownloadAuthorization({
    bucketId: process.env.B2_BUCKET_ID || '',
    fileNamePrefix: "", // Empty prefix = access to all files in bucket
    validDurationInSeconds,
  });
  return response.data.authorizationToken;
}

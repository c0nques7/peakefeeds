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
      contentType: contentType,
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
  // Or using the API to get a temporary authorization token if the bucket is private
  const bucketName = process.env.B2_BUCKET_NAME || '';
  const endpoint = process.env.B2_ENDPOINT || 'f000.backblazeb2.com';
  
  const url = `https://${endpoint}/file/${bucketName}/${fileName}`;
  console.log('Generated B2 Download URL:', url);
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

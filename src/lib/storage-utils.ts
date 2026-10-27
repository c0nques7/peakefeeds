export const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

export const ALLOWED_IMAGE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
];

export const ALLOWED_VIDEO_TYPES = [
  'video/mp4',
  'video/webm',
  'video/ogg',
  'video/quicktime', // .mov
];

export const ALLOWED_TYPES = [...ALLOWED_IMAGE_TYPES, ...ALLOWED_VIDEO_TYPES];

export function validateFile(file: File) {
  if (file.size > MAX_FILE_SIZE) {
    throw new Error('File size exceeds the 50MB limit');
  }

  if (!ALLOWED_TYPES.includes(file.type)) {
    throw new Error('Unsupported file type');
  }

  return true;
}

// Stored file extension for each allowed type (never taken from the uploaded file's name)
const EXTENSIONS: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/gif': 'gif',
  'image/webp': 'webp',
  'video/mp4': 'mp4',
  'video/webm': 'webm',
  'video/ogg': 'ogv',
  'video/quicktime': 'mov',
};

const startsWith = (bytes: Uint8Array, signature: number[], offset = 0) =>
  signature.every((b, i) => bytes[offset + i] === b);
const ascii = (s: string) => [...s].map(c => c.charCodeAt(0));

/** The allowed media type the file's leading bytes identify, or null if it isn't one of them. */
export function sniffMediaType(bytes: Uint8Array): string | null {
  if (startsWith(bytes, [0xff, 0xd8, 0xff])) return 'image/jpeg';
  if (startsWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return 'image/png';
  if (startsWith(bytes, ascii('GIF87a')) || startsWith(bytes, ascii('GIF89a'))) return 'image/gif';
  if (startsWith(bytes, ascii('RIFF')) && startsWith(bytes, ascii('WEBP'), 8)) return 'image/webp';
  if (startsWith(bytes, [0x1a, 0x45, 0xdf, 0xa3])) return 'video/webm';
  if (startsWith(bytes, ascii('OggS'))) return 'video/ogg';
  if (startsWith(bytes, ascii('ftyp'), 4)) {
    return startsWith(bytes, ascii('qt  '), 8) ? 'video/quicktime' : 'video/mp4';
  }
  return null;
}

/**
 * The type to store an upload as: its content must be an allowed type matching the declared one.
 * MP4 and QuickTime share a container, so browsers' labels for them are interchangeable.
 */
export function verifiedMediaType(bytes: Uint8Array, declaredType: string): string {
  const sniffed = sniffMediaType(bytes);
  const isMp4Family = (t: string | null) => t === 'video/mp4' || t === 'video/quicktime';
  if (!sniffed || (sniffed !== declaredType && !(isMp4Family(sniffed) && isMp4Family(declaredType)))) {
    throw new Error('File contents do not match its type');
  }
  return sniffed;
}

export function generateFileName(contentType: string) {
  const extension = EXTENSIONS[contentType];
  if (!extension) throw new Error('Unsupported file type');
  return `${crypto.randomUUID()}.${extension}`;
}

import { describe, it, expect, vi, beforeEach } from 'vitest';
import B2 from 'backblaze-b2';
import { uploadFile, deleteFile, signMediaUrl, fileNameFromUrl } from '@/lib/b2';

const { getDownloadAuthorization } = vi.hoisted(() => ({ getDownloadAuthorization: vi.fn() }));
vi.mock('next/cache', () => ({ unstable_cache: (fn: unknown) => fn }));

// Mock B2
vi.mock('backblaze-b2', () => {
  const mockB2 = vi.fn().mockImplementation(function() {
    return {
      authorize: vi.fn().mockResolvedValue({}),
      getUploadUrl: vi.fn().mockResolvedValue({
        data: {
          uploadUrl: 'https://mock-upload-url',
          authorizationToken: 'mock-token',
        },
      }),
      uploadFile: vi.fn().mockResolvedValue({
        data: {
          fileId: 'mock-file-id',
          fileName: 'mock-file-name',
        },
      }),
      getDownloadAuthorization,
      deleteFileVersion: vi.fn().mockResolvedValue({
        data: {
          fileId: 'mock-file-id',
          fileName: 'mock-file-name',
        },
      }),
    };
  });
  return { default: mockB2 };
});

describe('B2 Utility', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset process.env for tests
    process.env.B2_BUCKET_ID = 'test-bucket-id';
    process.env.B2_APPLICATION_KEY_ID = 'test-key-id';
    process.env.B2_APPLICATION_KEY = 'test-key';
  });

  it('should upload a file', async () => {
    const data = Buffer.from('test data');
    const result = await uploadFile('test.txt', data, 'text/plain');
    
    expect(result.fileId).toBe('mock-file-id');
    expect(result.fileName).toBe('mock-file-name');
  });

  it('should delete a file', async () => {
    const result = await deleteFile('mock-file-id', 'mock-file-name');
    
    expect(result.fileId).toBe('mock-file-id');
    expect(result.fileName).toBe('mock-file-name');
  });

  describe('signMediaUrl', () => {
    beforeEach(() => {
      process.env.B2_BUCKET_NAME = 'test-bucket';
      process.env.B2_ENDPOINT = 's3.us-east-005.backblazeb2.com';
      getDownloadAuthorization.mockResolvedValue({ data: { authorizationToken: 'file-token' } });
    });

    it('signs our own files with a token scoped to that file', async () => {
      const signed = await signMediaUrl('https://f005.backblazeb2.com/file/test-bucket/abc.jpg');
      expect(signed).toBe('https://f005.backblazeb2.com/file/test-bucket/abc.jpg?Authorization=file-token');
      expect(getDownloadAuthorization).toHaveBeenCalledWith(expect.objectContaining({ fileNamePrefix: 'abc.jpg' }));
    });

    it.each([
      'https://evil.example/?backblazeb2.com',
      'https://evil.example/file/test-bucket/abc.jpg',
      'https://evilbackblazeb2.com/file/test-bucket/abc.jpg',
      'https://f005.backblazeb2.com/file/other-bucket/abc.jpg',
    ])('never attaches a token to %s', async url => {
      expect(await signMediaUrl(url)).toBe(url);
      expect(getDownloadAuthorization).not.toHaveBeenCalled();
    });

    it('passes through empty values', async () => {
      expect(await signMediaUrl(null)).toBeNull();
      expect(fileNameFromUrl(undefined)).toBeNull();
    });
  });
});

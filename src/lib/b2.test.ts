import { describe, it, expect, vi, beforeEach } from 'vitest';
import B2 from 'backblaze-b2';
import { uploadFile, deleteFile, signMediaUrl, fileNameFromUrl } from '@/lib/b2';

const { getDownloadAuthorization, authorize, staleCacheEntry } = vi.hoisted(() => ({
  getDownloadAuthorization: vi.fn(), authorize: vi.fn(), staleCacheEntry: { value: null as unknown },
}));
// Passes calls through, unless a test sets `staleCacheEntry` to stand in for what the cache serves
vi.mock('next/cache', () => ({
  unstable_cache: (fn: (...args: unknown[]) => unknown) => (...args: unknown[]) => staleCacheEntry.value ?? fn(...args),
}));

// Mock B2
vi.mock('backblaze-b2', () => {
  const mockB2 = vi.fn().mockImplementation(function() {
    return {
      authorize: authorize.mockResolvedValue({}),
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

    it('signs for long enough to outlast the cache', async () => {
      await signMediaUrl('https://f005.backblazeb2.com/file/test-bucket/abc.jpg');
      expect(getDownloadAuthorization).toHaveBeenCalledWith(expect.objectContaining({ validDurationInSeconds: 24 * 60 * 60 }));
    });

    it('re-signs instead of serving a cached URL whose token has expired', async () => {
      staleCacheEntry.value = { url: 'https://f005.backblazeb2.com/file/test-bucket/abc.jpg?Authorization=old', expiresAt: Date.now() - 1000 };
      try {
        expect(await signMediaUrl('https://f005.backblazeb2.com/file/test-bucket/abc.jpg'))
          .toBe('https://f005.backblazeb2.com/file/test-bucket/abc.jpg?Authorization=file-token');
      } finally {
        staleCacheEntry.value = null;
      }
    });

    it('passes through empty values', async () => {
      expect(await signMediaUrl(null)).toBeNull();
      expect(fileNameFromUrl(undefined)).toBeNull();
    });
  });

  describe('authorization', () => {
    beforeEach(() => {
      process.env.B2_BUCKET_NAME = 'test-bucket';
      authorize.mockResolvedValue({});
    });

    it('authorizes again and retries once when B2 says the token expired', async () => {
      getDownloadAuthorization
        .mockRejectedValueOnce({ response: { status: 401 } })
        .mockResolvedValueOnce({ data: { authorizationToken: 'fresh' } });
      const signed = await signMediaUrl('https://f005.backblazeb2.com/file/test-bucket/retry.jpg');
      expect(signed).toContain('Authorization=fresh');
      expect(getDownloadAuthorization).toHaveBeenCalledTimes(2);
      expect(authorize).toHaveBeenCalled();
    });

    it("doesn't retry other errors", async () => {
      getDownloadAuthorization.mockRejectedValueOnce({ response: { status: 500 } });
      expect(await signMediaUrl('https://f005.backblazeb2.com/file/test-bucket/fail.jpg'))
        .toBe('https://f005.backblazeb2.com/file/test-bucket/fail.jpg');
      expect(getDownloadAuthorization).toHaveBeenCalledTimes(1);
    });

    it('authorizes again once the account token is nearly a day old', async () => {
      getDownloadAuthorization.mockResolvedValue({ data: { authorizationToken: 't' } });
      await signMediaUrl('https://f005.backblazeb2.com/file/test-bucket/a.jpg');
      authorize.mockClear();
      await signMediaUrl('https://f005.backblazeb2.com/file/test-bucket/b.jpg');
      expect(authorize).not.toHaveBeenCalled();

      const now = Date.now();
      const clock = vi.spyOn(Date, 'now').mockReturnValue(now + 23.5 * 60 * 60 * 1000);
      await signMediaUrl('https://f005.backblazeb2.com/file/test-bucket/c.jpg');
      expect(authorize).toHaveBeenCalledTimes(1);
      clock.mockRestore();
    });

    it('shares one authorize request between parallel callers', async () => {
      getDownloadAuthorization.mockResolvedValue({ data: { authorizationToken: 't' } });
      // Well past the last authorization, and slow enough that every caller arrives while it runs
      const clock = vi.spyOn(Date, 'now').mockReturnValue(Date.now() + 48 * 60 * 60 * 1000);
      authorize.mockClear().mockImplementation(() => new Promise(resolve => setTimeout(() => resolve({}), 20)));
      const signed = await Promise.all(Array.from({ length: 20 }, (_, i) =>
        signMediaUrl(`https://f005.backblazeb2.com/file/test-bucket/p${i}.jpg`)));
      expect(signed.every(url => url?.includes('Authorization=t'))).toBe(true);
      expect(authorize).toHaveBeenCalledTimes(1);
      clock.mockRestore();
    });
  });
});

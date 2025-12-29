import { describe, it, expect, vi, beforeEach } from 'vitest';
import B2 from 'backblaze-b2';
import { uploadFile, deleteFile } from '@/lib/b2';

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
});

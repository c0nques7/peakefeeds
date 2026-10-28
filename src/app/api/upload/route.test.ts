// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { uploadFile } from '@/lib/b2';
import { POST } from './route';

vi.mock('next-auth', () => ({ getServerSession: vi.fn() }));
vi.mock('@/lib/auth.config', () => ({ authOptions: {} }));
vi.mock('@/lib/penalties', () => ({ getPostingBlockReason: vi.fn().mockResolvedValue(null) }));
vi.mock('@/lib/b2', () => ({
  uploadFile: vi.fn().mockResolvedValue({}),
  getDownloadUrl: vi.fn(async (name: string) => `https://f005.backblazeb2.com/file/test-bucket/${name}`),
}));

const upload = (file: File) => {
  const form = new FormData();
  form.append('file', file);
  return POST(new NextRequest('http://localhost/api/upload', { method: 'POST', body: form }));
};

describe('POST /api/upload', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: 'user-1' } } as never);
  });

  it('rejects HTML disguised as a PNG', async () => {
    const res = await upload(new File(['<html><script>alert(1)</script></html>'], 'x.html', { type: 'image/png' }));
    expect(res.status).toBe(400);
    expect(uploadFile).not.toHaveBeenCalled();
  });

  it('stores a real image under a random name with the sniffed type', async () => {
    const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]);
    const res = await upload(new File([png], 'evil.html', { type: 'image/png' }));
    expect(res.status).toBe(200);
    const [name, , type] = vi.mocked(uploadFile).mock.calls[0];
    expect(name).toMatch(/^[0-9a-f-]{36}\.png$/);
    expect(type).toBe('image/png');
  });
});

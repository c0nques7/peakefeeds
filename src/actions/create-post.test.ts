import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createPost } from './create-post';
import { prisma } from '@/lib/db';
import { getServerSession } from "next-auth";
import { fetchLinkMetadata } from "@/lib/metadata";

// Mock Dependencies
vi.mock('@/lib/db', () => ({
  prisma: {
    post: {
      create: vi.fn(),
    },
    channel: {
      findUnique: vi.fn(),
    },
  },
}));

vi.mock('next-auth', () => ({
  getServerSession: vi.fn(),
}));

vi.mock('@/lib/verification', () => ({
  generateContentHash: vi.fn(),
  recoverSignerAddress: vi.fn(),
}));

vi.mock('@/lib/metadata', () => ({
  fetchLinkMetadata: vi.fn(),
}));

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

describe('createPost Action', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (fetchLinkMetadata as any).mockResolvedValue({});
  });

  it('should successfully create a post with media', async () => {
    const mockSession = { user: { id: 'user-1' } };
    (getServerSession as any).mockResolvedValue(mockSession);
    (prisma.channel.findUnique as any).mockResolvedValue({ slug: 'test-channel' });
    (prisma.post.create as any).mockResolvedValue({ id: 'post-1' });

    const formData = new FormData();
    formData.append('content', 'Test content');
    formData.append('channelId', 'channel-1');
    formData.append('verificationMethod', 'SKIP');
    formData.append('mediaUrl', 'https://example.com/image.jpg');
    formData.append('mediaType', 'IMAGE');

    const result = await createPost({ success: false, message: null }, formData);

    expect(result.success).toBe(true);
    expect(prisma.post.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        content: 'Test content',
        type: 'IMAGE',
        mediaUrl: 'https://example.com/image.jpg',
      }),
    });
  });

  it('should fail if user is not signed in', async () => {
    (getServerSession as any).mockResolvedValue(null);

    const formData = new FormData();
    formData.append('content', 'Test content');
    formData.append('channelId', 'channel-1');
    formData.append('verificationMethod', 'SKIP');

    const result = await createPost({ success: false, message: null }, formData);

    expect(result.message).toBe('You must be signed in to post.');
    expect(prisma.post.create).not.toHaveBeenCalled();
  });
});

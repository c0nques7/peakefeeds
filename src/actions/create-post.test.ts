import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createPost } from './create-post';
import { prisma } from '@/lib/db';
import { getServerSession } from 'next-auth';

// Mock dependencies
vi.mock('@/lib/db', () => ({
  prisma: {
    post: {
      create: vi.fn(),
    },
    channel: {
      findUnique: vi.fn(),
    }
  }
}));

vi.mock('next-auth', () => ({
  getServerSession: vi.fn(),
}));

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
  unstable_cache: (fn: unknown) => fn,
}));

vi.mock('@/lib/metadata', () => ({
  fetchLinkMetadata: vi.fn().mockResolvedValue({ title: null, url: null }),
}));

vi.mock('@/lib/interaction-guard', () => ({
  getInteractionBlockReason: vi.fn().mockResolvedValue(null),
}));

describe('createPost Action', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should fail if user is not authenticated', async () => {
    (getServerSession as any).mockResolvedValue(null);
    
    const formData = new FormData();
    const state = await createPost({}, formData);
    
    expect(state.message).toBe("You must be signed in to post.");
  });

  it('should validate input and fail if content is missing', async () => {
    (getServerSession as any).mockResolvedValue({ user: { id: 'user1' } });
    
    const formData = new FormData();
    // No content
    const state = await createPost({}, formData);
    
    expect(state.errors).toBeDefined();
    expect(state.errors?.content).toBeDefined();
  });

  it('should succeed with SKIP verification method', async () => {
    (getServerSession as any).mockResolvedValue({ user: { id: 'user1' } });
    (prisma.post.create as any).mockResolvedValue({ id: 'post1' });
    (prisma.channel.findUnique as any).mockResolvedValue({ slug: 'test-channel' });

    const formData = new FormData();
    formData.append('content', 'Hello World');
    formData.append('channelId', 'chan1');
    formData.append('verificationMethod', 'SKIP');

    const state = await createPost({}, formData);

    expect(state.success).toBe(true);
    expect(prisma.post.create).toHaveBeenCalled();
  });

  describe('mediaUrl', () => {
    const post = (extra: Record<string, string>) => {
      const formData = new FormData();
      formData.append('content', 'hello');
      formData.append('channelId', 'channel-1');
      formData.append('verificationMethod', 'SKIP');
      for (const [k, v] of Object.entries(extra)) formData.append(k, v);
      return createPost({}, formData);
    };

    beforeEach(() => {
      process.env.B2_BUCKET_NAME = 'test-bucket';
      vi.mocked(getServerSession).mockResolvedValue({ user: { id: 'user1' } } as never);
      vi.mocked(prisma.channel.findUnique).mockResolvedValue({ slug: 'test' } as never);
    });

    it('rejects media that is not in our bucket', async () => {
      const state = await post({ mediaUrl: 'https://evil.example/?backblazeb2.com', mediaType: 'IMAGE' });
      expect(state.success).toBeFalsy();
      expect(prisma.post.create).not.toHaveBeenCalled();
    });

    it('accepts files uploaded to our bucket', async () => {
      const mediaUrl = 'https://f005.backblazeb2.com/file/test-bucket/abc.png';
      const state = await post({ mediaUrl, mediaType: 'IMAGE' });
      expect(state.success).toBe(true);
      expect(prisma.post.create).toHaveBeenCalledWith({ data: expect.objectContaining({ mediaUrl }) });
    });
  });

  it('rejects the unverified AD (sponsored) method', async () => {
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: 'user1', walletAddress: '0xabc' } } as never);
    const formData = new FormData();
    formData.append('content', 'hello');
    formData.append('channelId', 'channel-1');
    formData.append('verificationMethod', 'AD');
    formData.append('adProofToken', 'anything-long-enough');
    const state = await createPost({}, formData);
    expect(state.success).toBeFalsy();
    expect(prisma.post.create).not.toHaveBeenCalled();
  });
});

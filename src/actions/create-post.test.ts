import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createPost } from './create-post';
import { prisma } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { verifyAnchorTx } from '@/lib/anchor-verify';
import { generateContentHash } from '@/lib/verification';

// Mock dependencies
vi.mock('@/lib/db', () => ({
  prisma: {
    post: {
      create: vi.fn(),
      findFirst: vi.fn(),
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

vi.mock('@/lib/anchor-verify', () => ({
  verifyAnchorTx: vi.fn(),
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

  it('rejects the removed AD (sponsored) method', async () => {
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: 'user1', walletAddress: '0xabc' } } as never);
    const formData = new FormData();
    formData.append('content', 'hello');
    formData.append('channelId', 'channel-1');
    formData.append('verificationMethod', 'AD');
    const state = await createPost({}, formData);
    expect(state.success).toBeFalsy();
    expect(prisma.post.create).not.toHaveBeenCalled();
  });

  describe('WALLET (anchored) posts', () => {
    const wallet = '0x00000000000000000000000000000000000a11ce';
    const salt = 'ab'.repeat(32);
    const content = 'An anchored post';
    const contentHash = generateContentHash(content, salt);
    const tx = '0x' + 'Cd'.repeat(32);

    const post = (extra: Record<string, string> = {}) => {
      const formData = new FormData();
      const fields = { content, channelId: 'channel-1', verificationMethod: 'WALLET', contentHash, salt, verificationTx: tx, ...extra };
      for (const [k, v] of Object.entries(fields)) formData.append(k, v);
      return createPost({}, formData);
    };

    beforeEach(() => {
      vi.mocked(getServerSession).mockResolvedValue({ user: { id: 'user1', walletAddress: wallet } } as never);
      vi.mocked(prisma.channel.findUnique).mockResolvedValue({ slug: 'test' } as never);
      vi.mocked(prisma.post.create).mockResolvedValue({ id: 'post1' } as never);
      vi.mocked(prisma.post.findFirst).mockResolvedValue(null);
      vi.mocked(verifyAnchorTx).mockResolvedValue({ ok: true });
    });

    it('saves a verified post with its anchor transaction', async () => {
      const state = await post();
      expect(state.success).toBe(true);
      expect(verifyAnchorTx).toHaveBeenCalledWith({ txHash: tx.toLowerCase(), author: wallet, contentHash });
      expect(prisma.post.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ isVerified: true, verificationTx: tx.toLowerCase(), contentHash, salt }),
      });
    });

    it('refuses a post without an anchor transaction', async () => {
      const state = await post({ verificationTx: '' });
      expect(state.success).toBeFalsy();
      expect(prisma.post.create).not.toHaveBeenCalled();
    });

    it('refuses a malformed transaction hash', async () => {
      const state = await post({ verificationTx: '0x1234' });
      expect(state.success).toBeFalsy();
      expect(verifyAnchorTx).not.toHaveBeenCalled();
    });

    it("refuses content that doesn't match the anchored hash", async () => {
      const state = await post({ content: 'Edited after anchoring' });
      expect(state.message).toMatch(/integrity/);
      expect(verifyAnchorTx).not.toHaveBeenCalled();
    });

    it('refuses a transaction another post already used', async () => {
      vi.mocked(prisma.post.findFirst).mockResolvedValue({ id: 'older' } as never);
      const state = await post();
      expect(state.message).toMatch(/already used/);
      expect(prisma.post.create).not.toHaveBeenCalled();
    });

    it('refuses when the on-chain check fails', async () => {
      vi.mocked(verifyAnchorTx).mockResolvedValue({ ok: false, error: 'nope' });
      const state = await post();
      expect(state.message).toBe('Verification failed: nope');
      expect(prisma.post.create).not.toHaveBeenCalled();
    });
  });
});

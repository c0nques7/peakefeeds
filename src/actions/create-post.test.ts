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
}));

vi.mock('@/lib/metadata', () => ({
  fetchLinkMetadata: vi.fn().mockResolvedValue({ title: null, url: null }),
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
});
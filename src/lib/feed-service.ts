import { prisma } from '@/lib/db';
import { PostType, ReactionType } from '@prisma/client';

// 1. Define a Strict Type for the Feed Items
// This ensures the component knows exactly what fields are available
export type FeedPost = {
  id: string;
  title: string | null;
  content: string;
  createdAt: Date;
  isVerified: boolean;
  contentHash: string | null;
  signature: string | null;
  embedUrl: string | null;
  mediaUrl: string | null;
  type: PostType; // 👈 Strict Enum
  
  // Optimized Counts
  likesCount: number;
  dislikesCount: number;

  author: {
    id: string;
    username: string | null;
    name: string | null;
    image: string | null;
  };

  channel: {
    id: string;
    name: string;
    slug: string;
    creatorId: string;
  };
  
  comments: {
    id: string;
    content: string;
    parentId: string | null;
    author: {
      id: string;
      username: string | null;
    };
  }[];

  _count: {
    comments: number;
    likes: number;
    dislikes: number;
  };
  
  currentUserReaction?: ReactionType | null;
};

// 2. GLOBAL FEED (For /discover)
export async function getGlobalFeed(currentUserId?: string): Promise<FeedPost[]> {
  const posts = await prisma.post.findMany({
    take: 20,
    orderBy: { createdAt: 'desc' },
    select: {
      id: true, title: true, content: true, createdAt: true, isVerified: true,
      contentHash: true, signature: true, embedUrl: true, mediaUrl: true, type: true,
      likesCount: true, dislikesCount: true,
      author: { select: { id: true, username: true, name: true, image: true } },
      channel: { select: { id: true, name: true, slug: true, creatorId: true } },
      comments: {
        orderBy: { createdAt: 'asc' },
        select: { id: true, content: true, parentId: true, author: { select: { id: true, username: true } } }
      },
      likes: currentUserId ? { where: { userId: currentUserId }, select: { type: true } } : false,
      _count: { select: { comments: true } }
    }
  });

  return transformPosts(posts);
}

// 3. PERSONAL FEED (For /home)
export async function getPersonalFeed(userId: string): Promise<FeedPost[]> {
  const posts = await prisma.post.findMany({
    where: {
      channel: {
        subscribers: {
          some: { userId: userId }
        }
      }
    },
    take: 20,
    orderBy: { createdAt: 'desc' },
    select: {
      id: true, title: true, content: true, createdAt: true, isVerified: true,
      contentHash: true, signature: true, embedUrl: true, mediaUrl: true, type: true,
      likesCount: true, dislikesCount: true,
      author: { select: { id: true, username: true, name: true, image: true } },
      channel: { select: { id: true, name: true, slug: true, creatorId: true } },
      comments: {
        orderBy: { createdAt: 'asc' },
        select: { id: true, content: true, parentId: true, author: { select: { id: true, username: true } } }
      },
      likes: { where: { userId: userId }, select: { type: true } },
      _count: { select: { comments: true } }
    }
  });

  return transformPosts(posts);
}

// --- HELPER: Transform Prisma Result to FeedPost ---
// Now strictly typed to return FeedPost[]
function transformPosts(posts: any[]): FeedPost[] {
  return posts.map(post => {
    const userReaction = post.likes?.[0]?.type || null;

    return {
      // Spread basic fields
      id: post.id,
      title: post.title,
      content: post.content,
      createdAt: post.createdAt,
      isVerified: post.isVerified,
      contentHash: post.contentHash,
      signature: post.signature,
      embedUrl: post.embedUrl,
      mediaUrl: post.mediaUrl,
      type: post.type as PostType, // Ensure Enum match

      // Map Counts
      likesCount: post.likesCount,
      dislikesCount: post.dislikesCount,
      
      // Map Relations
      author: post.author,
      channel: post.channel,
      comments: post.comments,

      _count: {
        comments: post._count.comments,
        likes: post.likesCount,
        dislikes: post.dislikesCount
      },
      currentUserReaction: userReaction as ReactionType | null
    };
  });
}
import { prisma } from '@/lib/db';
import { PostType, ReactionType, Prisma } from '@prisma/client';

// 1. Define FeedPost Type
export type FeedPost = {
  id: string;
  title: string | null;
  content: string;
  // ✅ FIX: Type is now 'string', not 'Date'
  createdAt: string; 
  isVerified: boolean;
  contentHash: string | null;
  signature: string | null;
  embedUrl: string | null;
  mediaUrl: string | null;
  type: PostType;
  
  likesCount: number;
  dislikesCount: number;

  author: {
    id: string;
    username: string | null;
    name: string | null;
    image: string | null;
    role: string | null;
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

// 2. Shared Selection Logic (keeps things consistent)
const feedSelect = {
  id: true, title: true, content: true, createdAt: true, isVerified: true,
  contentHash: true, signature: true, embedUrl: true, mediaUrl: true, type: true,
  likesCount: true, dislikesCount: true,
  author: { 
    select: { id: true, username: true, name: true, image: true, role: true } 
  },
  channel: { select: { id: true, name: true, slug: true, creatorId: true } },
  comments: {
    orderBy: { createdAt: 'asc' as const },
    select: { id: true, content: true, parentId: true, author: { select: { id: true, username: true } } }
  },
  _count: { select: { comments: true } }
} satisfies Prisma.PostSelect;

// 3. Global Feed
export async function getGlobalFeed(currentUserId?: string): Promise<FeedPost[]> {
  const posts = await prisma.post.findMany({
    take: 20,
    orderBy: { createdAt: 'desc' },
    select: {
      ...feedSelect,
      likes: currentUserId 
        ? { where: { userId: currentUserId }, select: { type: true } } 
        : undefined,
    }
  });

  return transformPosts(posts);
}

// 4. Personal Feed
export async function getPersonalFeed(userId: string): Promise<FeedPost[]> {
  const posts = await prisma.post.findMany({
    where: {
      channel: { subscribers: { some: { userId: userId } } }
    },
    take: 20,
    orderBy: { createdAt: 'desc' },
    select: {
      ...feedSelect,
      likes: { where: { userId: userId }, select: { type: true } },
    }
  });

  return transformPosts(posts);
}

// --- HELPER: Transform & Serialize ---
function transformPosts(posts: any[]): FeedPost[] {
  return posts.map(post => {
    const userReaction = post.likes?.[0]?.type || null;

    return {
      id: post.id,
      title: post.title,
      content: post.content,
      
      // ✅ FIX: Convert Date to ISO String
      createdAt: post.createdAt.toISOString(), 

      isVerified: post.isVerified,
      contentHash: post.contentHash,
      signature: post.signature,
      embedUrl: post.embedUrl,
      mediaUrl: post.mediaUrl,
      type: post.type as PostType,

      likesCount: post.likesCount ?? 0,
      dislikesCount: post.dislikesCount ?? 0,
      
      author: {
          ...post.author,
          role: post.author.role ?? 'USER' 
      },

      channel: post.channel,
      comments: post.comments,

      _count: {
        comments: post._count.comments,
        likes: post.likesCount ?? 0,
        dislikes: post.dislikesCount ?? 0
      },
      currentUserReaction: userReaction as ReactionType | null
    };
  });
}
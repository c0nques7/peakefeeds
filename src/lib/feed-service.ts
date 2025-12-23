import { prisma } from '@/lib/db';
import { PostType, ReactionType, Prisma } from '@prisma/client';

// 1. Define FeedPost Type
export type FeedPost = {
  id: string;
  title: string | null;
  content: string;
  createdAt: string; 
  isVerified: boolean;
  isLocked: boolean;
  contentHash: string | null;
  signature: string | null;
  embedUrl: string | null;
  mediaUrl: string | null;
  
  // 🟢 ADD THESE 4 FIELDS
  linkTitle: string | null;
  linkDescription: string | null;
  linkImage: string | null;
  linkDomain: string | null;

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
  viewerCanDelete?: boolean;
  viewerChannelRole?: string | null;
};

// 2. Shared Selection Logic
const feedSelect = {
  id: true, title: true, content: true, createdAt: true, isVerified: true, isLocked: true,
  contentHash: true, signature: true, embedUrl: true, mediaUrl: true, type: true,
  likesCount: true, dislikesCount: true,
  
  // 🟢 ADD THESE TO THE DB SELECT
  linkTitle: true,
  linkDescription: true,
  linkImage: true,
  linkDomain: true,

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

  const [posts, user] = await Promise.all([

    prisma.post.findMany({

      take: 20,

      orderBy: { createdAt: 'desc' },

      select: {

        ...feedSelect,

        likes: currentUserId 

          ? { where: { userId: currentUserId }, select: { type: true } } 

          : undefined,

      }

    }),

    currentUserId ? prisma.user.findUnique({

      where: { id: currentUserId },

      select: { role: true, subscriptions: { select: { channelId: true, role: true, canDeletePosts: true } } }

    }) : null

  ]);



  return transformPosts(posts, user);

}



// 4. Personal Feed

export async function getPersonalFeed(userId: string): Promise<FeedPost[]> {

  const [posts, user] = await Promise.all([

    prisma.post.findMany({

      where: {

        channel: { subscribers: { some: { userId: userId } } }

      },

      take: 20,

      orderBy: { createdAt: 'desc' },

      select: {

        ...feedSelect,

        likes: { where: { userId: userId }, select: { type: true } },

      }

    }),

    prisma.user.findUnique({

      where: { id: userId },

      select: { role: true, subscriptions: { select: { channelId: true, role: true, canDeletePosts: true } } }

    })

  ]);



  return transformPosts(posts, user);

}



// --- HELPER: Transform & Serialize ---

function transformPosts(posts: any[], user?: any): FeedPost[] {

  const isGlobalAdmin = user?.role === 'ADMIN';

  

  return posts.map(post => {

    const userReaction = post.likes?.[0]?.type || null;

    

    // Find subscription for this specific post's channel

    const sub = user?.subscriptions?.find((s: any) => s.channelId === post.channelId);

    const isCreator = post.channel.creatorId === user?.id;

    

    const viewerCanDelete = isGlobalAdmin || isCreator || sub?.canDeletePosts === true;

    const viewerChannelRole = isGlobalAdmin ? 'ADMIN' : (isCreator ? 'OWNER' : (sub?.role || null));



    return {

      id: post.id,

      title: post.title,

      content: post.content,

      createdAt: post.createdAt.toISOString(), 



      isVerified: post.isVerified,

      isLocked: post.isLocked,

      contentHash: post.contentHash,

      signature: post.signature,

      embedUrl: post.embedUrl,

      mediaUrl: post.mediaUrl,

      

      // 🟢 PASS THE DATA THROUGH

      linkTitle: post.linkTitle,

      linkDescription: post.linkDescription,

      linkImage: post.linkImage,

      linkDomain: post.linkDomain,



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

      currentUserReaction: userReaction as ReactionType | null,

      viewerCanDelete,

      viewerChannelRole

    };

  });

}

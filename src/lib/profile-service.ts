import { prisma } from '@/lib/db';
import { PostType, ReactionType, UserRole } from '@prisma/client';

// 1. UPDATED TYPE DEFINITION
export type ProfileData = {
    id: string;
    username: string | null;
    name: string | null;
    // ✅ ADDED IMAGE
    image: string | null; 
    walletAddress: string | null;
    createdAt: Date;
    role: UserRole; 
    
    _count: {
        posts: number;
        channelsCreated: number;
    };

    posts: {
        id: string;
        title: string | null;
        content: string;
        createdAt: Date;
        isVerified: boolean;
        contentHash: string | null;
        signature: string | null;
        embedUrl: string | null;
        mediaUrl: string | null;
        type: PostType;
        
        // ✅ ADDED COUNTS TO TYPE (So page.tsx can access them)
        likesCount: number;
        dislikesCount: number;
        
        _count: {
            comments: number;
            likes: number;
            dislikes: number; 
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

        currentUserReaction?: ReactionType | null;
    }[];

    channelsCreated: {
        id: string;
        name: string;
        slug: string;
        _count: {
            subscribers: number;
        };
    }[];
} | null;


export async function getProfileData(username: string, currentUserId?: string): Promise<ProfileData> {
    
    if (!username || typeof username !== 'string') {
        return null;
    }

    const user = await prisma.user.findFirst({
        // Use findFirst with insensitive mode for better UX
        where: { 
            username: {
                equals: username,
                mode: 'insensitive'
            }
        },
        select: {
            id: true,
            username: true,
            name: true,
            // ✅ SELECT IMAGE
            image: true,
            walletAddress: true,
            createdAt: true,
            role: true,
            
            _count: {
                select: {
                    posts: true,
                    channelsCreated: true,
                }
            },
            
            posts: {
                take: 50, // Increased from 10 to fill the grid better
                orderBy: { createdAt: 'desc' },
                select: {
                    id: true, title: true, content: true, createdAt: true, isVerified: true,
                    contentHash: true, signature: true, embedUrl: true, mediaUrl: true, type: true,
                    
                    // Counts
                    likesCount: true,
                    dislikesCount: true,

                    channel: { select: { id: true, name: true, slug: true, creatorId: true } }, 
                    
                    comments: {
                        orderBy: { createdAt: 'asc' }, 
                        select: {
                            id: true, content: true, parentId: true, 
                            author: { select: { id: true, username: true } }
                        }
                    },

                    likes: currentUserId ? {
                        where: { userId: currentUserId },
                        select: { type: true }
                    } : false,
                    
                    _count: { select: { comments: true } } 
                }
            },

            channelsCreated: {
                orderBy: { createdAt: 'desc' },
                select: {
                    id: true, name: true, slug: true,
                    _count: { select: { subscribers: true } }
                }
            }
        }
    });

    if (!user) return null;

    // 🛑 TRANSFORM DATA
    const formattedPosts = user.posts.map(post => {
        // @ts-ignore 
        const userReaction = post.likes?.[0]?.type || null;

        return {
            ...post,
            // ✅ Ensure we return these so the page can map them if needed
            likesCount: post.likesCount ?? 0,
            dislikesCount: post.dislikesCount ?? 0,

            _count: {
                comments: post._count.comments,
                likes: post.likesCount ?? 0,
                dislikes: post.dislikesCount ?? 0
            },
            currentUserReaction: userReaction
        };
    });

    // @ts-ignore - TS might complain about 'likes' property being left over, but that's fine for runtime
    return { ...user, posts: formattedPosts };
}
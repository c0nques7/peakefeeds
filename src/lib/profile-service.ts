import { prisma } from '@/lib/db';
import { PostType, ReactionType } from '@prisma/client';

export type ProfileData = {
    id: string;
    username: string | null;
    name: string | null;
    walletAddress: string | null;
    createdAt: Date;
    
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
        
        // 🛑 NEW COUNTS
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
            author: { id: string; username: string | null; };
        }[];
        currentUserReaction?: ReactionType | null;
    }[];

    channelsCreated: {
        id: string;
        name: string;
        slug: string;
        _count: { subscribers: number; };
    }[];
} | null;

export async function getProfileData(username: string, currentUserId?: string): Promise<ProfileData> {
    if (!username || typeof username !== 'string') return null;

    const user = await prisma.user.findUnique({
        where: { username },
        select: {
            id: true, username: true, name: true, walletAddress: true, createdAt: true,
            _count: { select: { posts: true, channelsCreated: true } },
            
            posts: {
                take: 10,
                orderBy: { createdAt: 'desc' },
                select: {
                    id: true, title: true, content: true, createdAt: true, isVerified: true, 
                    contentHash: true, signature: true, embedUrl: true, mediaUrl: true, type: true,
                    
                    // ⚡ 1. SELECT OPTIMIZED COLUMNS
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
                    
                    // ⚡ 2. ONLY SELECT CURRENT USER REACTION (Efficiency)
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

    // ⚡ 3. SIMPLIFIED TRANSFORM
    const formattedPosts = user.posts.map(post => {
        // @ts-ignore
        const userReaction = post.likes?.[0]?.type || null;
        // @ts-ignore
        const { likes, likesCount, dislikesCount, _count, ...rest } = post;

        return {
            ...rest,
            _count: {
                comments: _count.comments,
                // Use DB columns
                likes: likesCount,       
                dislikes: dislikesCount 
            },
            currentUserReaction: userReaction
        };
    });

    return { ...user, posts: formattedPosts } as unknown as ProfileData;
}
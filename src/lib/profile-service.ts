import { prisma } from '@/lib/db';
import { PostType, ReactionType, UserRole } from '@prisma/client';
import { getBucketAuthToken } from '@/lib/b2';

// 1. UPDATED TYPE DEFINITION
export type ProfileData = {
    id: string;
    username: string | null;
    name: string | null;
    image: string | null; 
    walletAddress: string | null;
    createdAt: Date;
    role: UserRole; 
    isLocked: boolean;
    
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
        
        // 🆕 LINK PREVIEW DATA
        linkTitle: string | null;
        linkDescription: string | null;
        linkImage: string | null;
        linkDomain: string | null;

        // Counts
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
            createdAt: Date;
            parentId: string | null;
            author: {
                id: string;
                username: string | null;
                image: string | null;
                role: UserRole;
            };
        }[];

        currentUserReaction?: ReactionType | null;
        viewerCanDelete?: boolean;
        viewerChannelRole?: string | null;
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

    // 1. Fetch Token & Current User Context
    let bucketAuthToken = '';
    try { bucketAuthToken = await getBucketAuthToken(); } catch(e) {}

    const [user, currentUserContext] = await Promise.all([
        prisma.user.findFirst({
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
                image: true,
                walletAddress: true,
                createdAt: true,
                role: true,
                isLocked: true,
                
                _count: {
                    select: {
                        posts: true,
                        channelsCreated: true,
                    }
                },
                
                posts: {
                    take: 50,
                    orderBy: { createdAt: 'desc' },
                    select: {
                        id: true, title: true, content: true, createdAt: true, isVerified: true, isLocked: true,
                        contentHash: true, signature: true, embedUrl: true, mediaUrl: true, type: true,
                        
                        // 🆕 SELECT LINK METADATA
                        linkTitle: true,
                        linkDescription: true,
                        linkImage: true,
                        linkDomain: true,

                        // Counts
                        likesCount: true,
                        dislikesCount: true,

                        channel: { select: { id: true, name: true, slug: true, creatorId: true } }, 
                        
                        comments: {
                            orderBy: { createdAt: 'asc' }, 
                            select: {
                                id: true, content: true, parentId: true, createdAt: true,
                                author: { select: { id: true, username: true, image: true, role: true } }
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
        }),
        currentUserId ? prisma.user.findUnique({
            where: { id: currentUserId },
            select: { 
                id: true,
                role: true, 
                subscriptions: { select: { channelId: true, role: true, canDeletePosts: true } } 
            }
        }) : null
    ]);

    if (!user) return null;

    const isGlobalAdmin = currentUserContext?.role === 'ADMIN';

    // TRANSFORM DATA
    const formattedPosts = user.posts.map(post => {
        // @ts-ignore 
        const userReaction = post.likes?.[0]?.type || null;

        // Find subscription for this specific post's channel
        const sub = currentUserContext?.subscriptions?.find((s: any) => s.channelId === post.channel.id);
        const isCreator = post.channel.creatorId === currentUserContext?.id;

        const viewerCanDelete = isGlobalAdmin || isCreator || sub?.canDeletePosts === true;
        const viewerChannelRole = isGlobalAdmin ? 'ADMIN' : (isCreator ? 'OWNER' : (sub?.role || null));

        // 🟢 FIX: Handle Private B2 Bucket URLs
        let finalMediaUrl = post.mediaUrl ?? null;
        if (finalMediaUrl && finalMediaUrl.includes('backblazeb2.com') && bucketAuthToken) {
            if (finalMediaUrl.includes('s3.us-east-005')) {
                finalMediaUrl = finalMediaUrl.replace('s3.us-east-005', 'f005');
            }
            finalMediaUrl = `${finalMediaUrl}?Authorization=${bucketAuthToken}`;
        }

        return {
            ...post,
            mediaUrl: finalMediaUrl,
            // Ensure counts are safe
            likesCount: post.likesCount ?? 0,
            dislikesCount: post.dislikesCount ?? 0,

            _count: {
                comments: post._count.comments,
                likes: post.likesCount ?? 0,
                dislikes: post.dislikesCount ?? 0
            },
            currentUserReaction: userReaction,
            viewerCanDelete,
            viewerChannelRole
        };
    });

    // @ts-ignore 
    return { ...user, posts: formattedPosts };
}
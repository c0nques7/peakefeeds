import { prisma } from '@/lib/db';
import { PostType, ReactionType, UserRole } from '@prisma/client';

// Define the required shape of the data for clarity
export type ProfileData = {
    id: string;
    username: string | null;
    name: string | null;
    walletAddress: string | null;
    createdAt: Date;
    
    // 🆕 ADDED ROLE
    role: UserRole; 
    
    // Total posts and channels created
    _count: {
        posts: number;
        channelsCreated: number;
    };

    // Data for the 'My Posts' Tab
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
        
        // Optimized Counts
        _count: {
            comments: number;
            likes: number;
            dislikes: number; 
        };
        
        // Channel Data for PostCard Header
        channel: {
            id: string;
            name: string;
            slug: string;
            creatorId: string;
        };

        // Comment Data for Threading
        comments: {
            id: string;
            content: string;
            parentId: string | null;
            author: {
                id: string;
                username: string | null;
            };
        }[];

        // Context for current viewer
        currentUserReaction?: ReactionType | null;
    }[];

    // Data for the 'My Channels' Tab
    channelsCreated: {
        id: string;
        name: string;
        slug: string;
        _count: {
            subscribers: number;
        };
    }[];
} | null;


/**
 * Fetches comprehensive data for a user's profile page based on username.
 * Includes role, post history, and channel ownership.
 */
export async function getProfileData(username: string, currentUserId?: string): Promise<ProfileData> {
    
    if (!username || typeof username !== 'string') {
        console.error("Attempted to call getProfileData with invalid username:", username);
        return null;
    }

    const user = await prisma.user.findUnique({
        where: { username },
        select: {
            id: true,
            username: true,
            name: true,
            walletAddress: true,
            createdAt: true,
            role: true, // 🆕 SELECT ROLE
            
            // 1. Core Counts
            _count: {
                select: {
                    posts: true,
                    channelsCreated: true,
                }
            },
            
            // 2. Posts (Taking the 10 most recent posts for initial view)
            posts: {
                take: 10,
                orderBy: { createdAt: 'desc' },
                select: {
                    id: true,
                    title: true,
                    content: true,
                    createdAt: true,
                    isVerified: true,
                    contentHash: true,
                    signature: true,
                    embedUrl: true,
                    mediaUrl: true,
                    type: true,
                    
                    // Optimized Count Columns
                    likesCount: true,
                    dislikesCount: true,

                    // Critical Channel Data
                    channel: { 
                        select: { id: true, name: true, slug: true, creatorId: true } 
                    }, 
                    
                    // Comments for Threading
                    comments: {
                        orderBy: { createdAt: 'asc' }, 
                        select: {
                            id: true,
                            content: true,
                            parentId: true, 
                            author: { select: { id: true, username: true } }
                        }
                    },

                    // Reaction Status for Viewer
                    likes: currentUserId ? {
                        where: { userId: currentUserId },
                        select: { type: true }
                    } : false,
                    
                    _count: { select: { comments: true } } 
                }
            },

            // 3. Channels Created
            channelsCreated: {
                orderBy: { createdAt: 'desc' },
                select: {
                    id: true,
                    name: true,
                    slug: true,
                    _count: { select: { subscribers: true } }
                }
            }
        }
    });

    if (!user) return null;

    // 🛑 TRANSFORM DATA
    // Map the raw DB response to the clean ProfileData shape
    const formattedPosts = user.posts.map(post => {
        // 1. Determine Viewer's Reaction
        // @ts-ignore - 'likes' exists in query but isn't in the final return type
        const userReaction = post.likes?.[0]?.type || null;

        // 2. Clean up object
        // @ts-ignore
        const { likes, likesCount, dislikesCount, _count, ...rest } = post;

        return {
            ...rest,
            _count: {
                comments: _count.comments,
                likes: likesCount,       // Direct from DB
                dislikes: dislikesCount  // Direct from DB
            },
            currentUserReaction: userReaction
        };
    });

    return { ...user, posts: formattedPosts } as unknown as ProfileData;
}
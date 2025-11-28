import { prisma } from '@/lib/db';

// Define the required shape of the data for clarity
export type ProfileData = {
    id: string;
    username: string | null;
    name: string | null;
    walletAddress: string | null;
    createdAt: Date;
    
    // Total posts and reactions received
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
        contentHash: string | null; // Added for verification card
        signature: string | null;   // Added for verification card
        embedUrl: string | null;    // Added for media handling
        mediaUrl: string | null;    // Added for media handling
        type: "TEXT" | "IMAGE" | "VIDEO" | "LINK" | "QUOTE" | "POLL" | "REPOST"; // typed strictly
        
        _count: {
            comments: number;
            likes: number;
        };
        
        // Critical for PostCard Header
        channel: {
            id: string;
            name: string;
            slug: string;
            creatorId: string;
        };

        // 🆕 ADDED: Critical for Comment Threading
        comments: {
            id: string;
            content: string;
            parentId: string | null;
            author: {
                id: string;
                username: string | null;
            };
        }[];
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
 */
export async function getProfileData(username: string): Promise<ProfileData> {
    
    if (!username || typeof username !== 'string') {
        console.error("Attempted to call getProfileData with invalid username:", username);
        return null;
    }

    // Cast the result to ProfileData because Prisma's generated types 
    // can be strict about Enums vs Strings for 'type'.
    const user = await prisma.user.findUnique({
        where: { username },
        select: {
            id: true,
            username: true,
            name: true,
            walletAddress: true,
            createdAt: true,
            
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
                    
                    // Critical Channel Data
                    channel: { 
                        select: { id: true, name: true, slug: true, creatorId: true } 
                    }, 
                    
                    _count: { select: { comments: true, likes: true } },

                    // 🛑 FIX: Fetch Comments for Threading
                    comments: {
                        orderBy: { createdAt: 'asc' }, // Oldest first helps tree logic
                        select: {
                            id: true,
                            content: true,
                            parentId: true, // 👈 REQUIRED for nesting
                            author: {
                                select: { id: true, username: true }
                            }
                        }
                    }
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

    return user as ProfileData;
}
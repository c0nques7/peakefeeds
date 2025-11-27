import { prisma } from '@/lib/db';
import { notFound } from 'next/navigation';

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
        _count: {
            comments: number;
            likes: number;
        };
    channel: {
        id: string;
        name: string;
        slug: string;
        creatorId: string;
        };
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
        // Log the error for server-side debugging
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
                    


                    channel: { select: { id: true, name: true, slug: true, creatorId: true} },

                    _count: { select: { comments: true, likes: true } },
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

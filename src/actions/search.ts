'use server'

import { prisma } from '@/lib/db';

interface SearchResult {
    id: string;
    name: string;
    slug: string;
}

export async function searchChannels(query: string): Promise<SearchResult[]> {
    if (!query || query.length < 2) {
        return [];
    }
    
    // Case-insensitive search requires the 'mode: insensitive' flag, available in Prisma with PostgreSQL
    const results = await prisma.channel.findMany({
        where: {
            OR: [
                {
                    name: {
                        contains: query,
                        mode: 'insensitive', 
                    },
                },
                {
                    slug: {
                        contains: query,
                        mode: 'insensitive',
                    },
                },
            ],
        },
        select: {
            id: true,
            name: true,
            slug: true,
        },
        take: 5, // Limit results for quick display
        orderBy: {
            // Prioritize channels with more posts (higher engagement)
            posts: {
                _count: 'desc',
            },
        },
    });

    return results;
}
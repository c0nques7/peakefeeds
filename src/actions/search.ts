'use server'

import { prisma } from '@/lib/db';

interface SearchResult {
    id: string;
    name: string;
    slug: string;
}

export async function searchChannels(rawQuery: string): Promise<SearchResult[]> {
    // "#ai" searches the same as "ai"
    const query = (rawQuery ?? '').trim().replace(/^#/, '');
    if (query.length < 2) {
        return [];
    }

    // Tags are a text[] column, which Prisma can only match exactly, so partial,
    // case-insensitive tag matches come from SQL
    const pattern = `%${query.replace(/[\\%_]/g, '\\$&')}%`;
    const tagMatches = await prisma.$queryRaw<{ id: string }[]>`
        SELECT id FROM "Channel" WHERE EXISTS (SELECT 1 FROM unnest(tags) AS t WHERE t ILIKE ${pattern}) LIMIT 50`;
    
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
                { id: { in: tagMatches.map(t => t.id) } },
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

export async function searchUsers(query: string) {
    if (!query || query.length < 2) {
        return [];
    }

    const results = await prisma.user.findMany({
        where: {
            OR: [
                {
                    username: {
                        contains: query,
                        mode: 'insensitive',
                    },
                },
                {
                    name: {
                        contains: query,
                        mode: 'insensitive',
                    },
                },
            ],
        },
        select: {
            id: true,
            username: true,
            name: true,
            image: true,
        },
        take: 5,
        orderBy: {
            createdAt: 'desc',
        },
    });

    return results;
}
import { Prisma } from '@/generated/prisma/client';
import { prisma } from '@/lib/db';

export type SidebarChannel = {
    id: string;
    name: string;
    slug: string;
    subscribersCount: number;
    latest: { title: string | null; content: string } | null;
};

export type SidebarTrendingPost = {
    id: string;
    title: string | null;
    content: string;
    likesCount: number;
    channelSlug: string | undefined;
};

type ChannelRow = {
    id: string;
    name: string;
    slug: string;
    subscribersCount: number;
    latestTitle: string | null;
    latestContent: string | null;
};

// The right sidebar's shared data in two queries, run one after the other. It used to take seven
// (five of them at once), which could use up Prisma's small connection pool on a serverless cold start.
export async function loadSidebarData(channelLimit = 5, trendingLimit = 4) {
    // Newest channels with subscriber counts and each one's latest post. The LATERAL subquery
    // reads one row per channel from the (channelId, createdAt DESC) index.
    const channelRows = await prisma.$queryRaw<ChannelRow[]>(Prisma.sql`
        SELECT c.id, c.name, c.slug,
               (SELECT COUNT(*)::int FROM "Subscription" s WHERE s."channelId" = c.id) AS "subscribersCount",
               lp.title AS "latestTitle", lp.content AS "latestContent"
        FROM "Channel" c
        LEFT JOIN LATERAL (
            SELECT p.title, p.content FROM "Post" p
            WHERE p."channelId" = c.id
            ORDER BY p."createdAt" DESC
            LIMIT 1
        ) lp ON true
        ORDER BY c."createdAt" DESC
        LIMIT ${channelLimit}`);

    // Most-liked posts from the last 7 days
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 3600 * 1000);
    const trending = await prisma.post.findMany({
        where: { createdAt: { gte: sevenDaysAgo } },
        take: trendingLimit,
        orderBy: { likesCount: 'desc' },
        select: { id: true, title: true, content: true, likesCount: true, channel: { select: { slug: true } } },
    });

    return {
        channels: channelRows.map((r): SidebarChannel => ({
            id: r.id,
            name: r.name,
            slug: r.slug,
            subscribersCount: r.subscribersCount,
            latest: r.latestContent === null ? null : { title: r.latestTitle, content: r.latestContent },
        })),
        trendingPosts: trending.map((p): SidebarTrendingPost => ({
            id: p.id,
            title: p.title,
            content: p.content,
            likesCount: p.likesCount ?? 0,
            channelSlug: p.channel?.slug,
        })),
    };
}

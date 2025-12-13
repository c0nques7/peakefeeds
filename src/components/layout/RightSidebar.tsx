import Link from "next/link";
import { ArrowUpRight, Hash, ShieldCheck } from "lucide-react";
import styles from "../../app/(dashboard)/dashboard.module.css";
import { prisma } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth.config";
import { SubscribeButton } from "@/components/SubscribeButton";

type ChannelSummary = {
    id: string;
    name: string;
    slug: string;
    subscribersCount: number;
}

type PostPreview = {
    id: string;
    title: string | null;
    content: string;
    createdAt: string;
    likesCount: number;
}

export async function RightSidebar() {
    // Fetch top channels by subscriber count
    const channels = await prisma.channel.findMany({
        take: 10,
        include: { _count: { select: { subscribers: true } } }
    });

    const channelSummaries: ChannelSummary[] = channels
        .map(c => ({ id: c.id, name: c.name, slug: c.slug, subscribersCount: c._count?.subscribers ?? 0 }))
        .sort((a, b) => b.subscribersCount - a.subscribersCount)
        .slice(0, 6);

    // get current session to check subscriptions
    const session = await getServerSession(authOptions);
    const currentUserId = session?.user?.id;

    // For each recommended channel, fetch latest and top post
    const channelPostsPromises = channelSummaries.map(async (ch) => {
        const latest = await prisma.post.findFirst({
            where: { channelId: ch.id },
            orderBy: { createdAt: 'desc' },
            select: { id: true, title: true, content: true, createdAt: true, likesCount: true }
        });

        const top = await prisma.post.findFirst({
            where: { channelId: ch.id },
            orderBy: { likesCount: 'desc' },
            select: { id: true, title: true, content: true, createdAt: true, likesCount: true }
        });

        return { channel: ch, latest: latest ?? null, top: top ?? null };
    });

    const channelPosts = await Promise.all(channelPostsPromises);

    // If user is signed in, fetch which of these channels they're subscribed to
    let subscribedSet = new Set<string>();
    if (currentUserId && channelSummaries.length > 0) {
        const subs = await prisma.subscription.findMany({
            where: { userId: currentUserId, channelId: { in: channelSummaries.map(c => c.id) } },
            select: { channelId: true }
        });
        subscribedSet = new Set(subs.map(s => s.channelId));
    }

    // Trending posts globally (top by likes in the last 7 days)
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 3600 * 1000);
    const trendingPostsRaw = await prisma.post.findMany({
        where: { createdAt: { gte: sevenDaysAgo } },
        take: 6,
        orderBy: { likesCount: 'desc' },
        select: { id: true, title: true, content: true, createdAt: true, likesCount: true, channel: { select: { slug: true, name: true } } }
    });

    const trendingPosts: (PostPreview & { channelName?: string; channelSlug?: string })[] = trendingPostsRaw.map(p => ({
        id: p.id,
        title: p.title,
        content: p.content,
        createdAt: p.createdAt.toISOString(),
        likesCount: p.likesCount ?? 0,
        channelName: p.channel?.name,
        channelSlug: p.channel?.slug
    }));

    return (
        <aside className={`${styles.rightSidebar} flex flex-col gap-6 p-6 overflow-y-auto bg-[var(--glass-panel)] backdrop-blur-md`}>

             {/* --- BLOCK 1: TRENDING CHANNELS & POSTS --- */}
             <div className="rounded-2xl p-4 border border-[var(--glass-border)] bg-[var(--glass-card)] shadow-sm">
                    <h2 className="text-lg font-bold mb-4 flex items-center gap-2 text-[var(--text-primary)]">
                        <ArrowUpRight size={20} className="text-[var(--accent-primary)]" /> Trending
                    </h2>

                    <div className="space-y-3">
                        {channelSummaries.map(ch => (
                            <Link key={ch.id} href={`/channels/${ch.slug}`} className="flex items-center justify-between p-2 rounded-lg hover:bg-[var(--glass-card-hover)] transition-colors">
                                <div>
                                    <div className="text-sm font-semibold text-[var(--text-primary)]">{ch.name}</div>
                                    <div className="text-[10px] text-[var(--text-muted)]">{ch.subscribersCount.toLocaleString()} subscribers</div>
                                </div>
                                <div className="text-[12px] text-[var(--accent-primary)]">View</div>
                            </Link>
                        ))}
                    </div>

                    <div className="mt-4 pt-4 border-t border-[var(--glass-border)]">
                        <div className="text-sm font-semibold text-[var(--text-primary)] mb-2">Hot posts this week</div>
                        <div className="space-y-2">
                            {trendingPosts.map(p => (
                                <Link key={p.id} href={`/posts/${p.id}`} className="block p-2 rounded hover:bg-[var(--glass-card-hover)] transition-colors">
                                    <div className="text-xs font-semibold text-[var(--text-primary)] truncate">{p.title ?? p.content.slice(0, 60)}</div>
                                    <div className="text-[10px] text-[var(--text-muted)]">{p.channelName} • {p.likesCount} likes</div>
                                </Link>
                            ))}
                        </div>
                    </div>
             </div>

             {/* --- BLOCK 2: SUGGESTED CHANNELS + PREVIEWS --- */}
             <div className="rounded-2xl p-4 border border-[var(--glass-border)] bg-[var(--glass-card)] shadow-sm">
                    <h2 className="text-lg font-bold mb-4 text-[var(--text-primary)]">Suggested Channels</h2>

                    <div className="space-y-3">
                        {channelPosts.map(({ channel, latest, top }) => (
                            <div key={channel.id} className="p-2 rounded-lg hover:bg-[var(--glass-card-hover)] transition-colors">
                                <div className="flex items-center justify-between">
                                    <Link href={`/channels/${channel.slug}`} className="flex items-center gap-3">
                                        <div className="h-8 w-8 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-500">
                                            <ShieldCheck size={14} />
                                        </div>
                                        <div>
                                            <div className="text-sm font-semibold text-[var(--text-primary)]">{channel.name}</div>
                                            <div className="text-[10px] text-[var(--text-muted)]">@{channel.slug}</div>
                                        </div>
                                    </Link>
                                    <div>
                                        <SubscribeButton channelId={channel.id} channelSlug={channel.slug} isSubscribedInitial={subscribedSet.has(channel.id)} small={true} />
                                    </div>
                                </div>

                                <div className="mt-2 text-[12px] text-[var(--text-muted)]">
                                    {latest ? (
                                        <div className="truncate">Latest: {latest.title ?? latest.content.slice(0, 80)}</div>
                                    ) : (
                                        <div className="italic">No recent posts</div>
                                    )}
                                    {top && (
                                        <div className="text-[11px] text-[var(--text-muted)] mt-1">Top: {top.title ?? top.content.slice(0, 60)} • {top.likesCount} likes</div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
             </div>

             {/* Footer */}
             <div className="text-[10px] text-[var(--text-muted)] flex flex-wrap gap-x-3 gap-y-1 px-2">
                    <span className="hover:underline cursor-pointer">Terms</span>
                    <span className="hover:underline cursor-pointer">Privacy</span>
                    <span className="hover:underline cursor-pointer">© 2025 PeakeFeeds</span>
             </div>

        </aside>
    )
}

import Link from "next/link";
import { TrendingUp, Users, ArrowRight, ShieldCheck } from "lucide-react";
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
    // 1. DATA FETCHING -------------------------------------
    
    // A. Fetch top channels (for suggestions)
    const channels = await prisma.channel.findMany({
        take: 5, // Reduced from 10 to fit UI better
        include: { _count: { select: { subscribers: true } } },
        orderBy: { createdAt: 'desc' } // Just fetching some distinct channels for now
    });

    const channelSummaries: ChannelSummary[] = channels
        .map(c => ({ id: c.id, name: c.name, slug: c.slug, subscribersCount: c._count?.subscribers ?? 0 }));

    // B. Check User Subscriptions
    const session = await getServerSession(authOptions);
    const currentUserId = session?.user?.id;

    let subscribedSet = new Set<string>();
    if (currentUserId && channelSummaries.length > 0) {
        const subs = await prisma.subscription.findMany({
            where: { userId: currentUserId, channelId: { in: channelSummaries.map(c => c.id) } },
            select: { channelId: true }
        });
        subscribedSet = new Set(subs.map(s => s.channelId));
    }

    // C. Fetch Context for Channels (Latest Post)
    const channelContextPromises = channelSummaries.map(async (ch) => {
        const latest = await prisma.post.findFirst({
            where: { channelId: ch.id },
            orderBy: { createdAt: 'desc' },
            select: { title: true, content: true }
        });
        return { channel: ch, latest: latest ?? null };
    });
    const suggestedChannels = await Promise.all(channelContextPromises);

    // D. Fetch Trending Posts (Global Hot List)
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 3600 * 1000);
    const trendingPostsRaw = await prisma.post.findMany({
        where: { createdAt: { gte: sevenDaysAgo } },
        take: 4,
        orderBy: { likesCount: 'desc' },
        select: { id: true, title: true, content: true, likesCount: true, channel: { select: { slug: true } } }
    });

    const trendingPosts = trendingPostsRaw.map(p => ({
        id: p.id,
        title: p.title,
        content: p.content,
        likesCount: p.likesCount ?? 0,
        channelSlug: p.channel?.slug
    }));

    // 2. RENDER UI -----------------------------------------
    return (
        <div className="flex flex-col gap-6 w-full max-w-[320px] pb-20">
            
            {/* --- CARD 1: TRENDING POSTS --- */}
            <div className="flex flex-col rounded-2xl bg-[var(--glass-card)] border border-[var(--glass-border)] overflow-hidden shadow-sm">
                <div className="p-4 border-b border-[var(--glass-border)] flex items-center gap-2">
                    <TrendingUp size={18} className="text-[var(--accent-secondary)]" />
                    <span className="font-bold text-sm text-[var(--text-primary)]">Trending Now</span>
                </div>
                
                <div className="flex flex-col">
                    {trendingPosts.length > 0 ? trendingPosts.map((post) => (
                        <Link 
                            key={post.id} 
                            href={`/posts/${post.id}`}
                            className="group flex items-center justify-between px-4 py-3 hover:bg-[var(--glass-card-hover)] transition-colors border-b border-[var(--glass-border)] last:border-0"
                        >
                            <div className="flex flex-col min-w-0 pr-2">
                                <span className="font-bold text-sm text-[var(--text-primary)] truncate">
                                    {post.title || post.content.slice(0, 30)}
                                </span>
                                <span className="text-xs text-[var(--text-muted)] flex items-center gap-1">
                                    {post.channelSlug && <span className="opacity-70">#{post.channelSlug}</span>}
                                    <span>•</span>
                                    <span>{post.likesCount} likes</span>
                                </span>
                            </div>
                            <ArrowRight size={14} className="text-[var(--text-muted)] opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                        </Link>
                    )) : (
                        <div className="p-4 text-xs text-[var(--text-muted)] text-center">No trending posts yet.</div>
                    )}
                </div>
            </div>

            {/* --- CARD 2: WHO TO FOLLOW (SUGGESTED) --- */ }
            <div className="flex flex-col rounded-2xl bg-[var(--glass-card)] border border-[var(--glass-border)] overflow-hidden shadow-sm">
                <div className="p-4 border-b border-[var(--glass-border)] flex items-center gap-2">
                    <Users size={18} className="text-[var(--accent-primary)]" />
                    <span className="font-bold text-sm text-[var(--text-primary)]">Who to Follow</span>
                </div>

                <div className="flex flex-col">
                    {suggestedChannels.map(({ channel, latest }) => (
                        <div key={channel.id} className="flex flex-col px-4 py-3 hover:bg-[var(--glass-card-hover)] transition-colors border-b border-[var(--glass-border)] last:border-0">
                            
                            {/* Top Row: Channel Info + Subscribe */}
                            <div className="flex items-center gap-3 mb-2">
                                <Link href={`/channels/${channel.slug}`} className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500/10 to-teal-500/10 border border-[var(--glass-border)] flex items-center justify-center font-bold text-xs text-[var(--text-primary)] flex-shrink-0">
                                    {channel.name[0].toUpperCase()}
                                </Link>
                                
                                <div className="flex-1 min-w-0">
                                    <Link href={`/channels/${channel.slug}`} className="flex items-center gap-1 hover:underline">
                                        <span className="font-bold text-xs text-[var(--text-primary)] truncate">{channel.name}</span>
                                        {/* Assuming these are top channels, we give them a 'verified' check visually */}
                                        <ShieldCheck size={10} className="text-emerald-500" />
                                    </Link>
                                    <div className="text-[10px] text-[var(--text-muted)] truncate">@{channel.slug}</div>
                                </div>

                                <SubscribeButton 
                                    channelId={channel.id} 
                                    channelSlug={channel.slug} 
                                    isSubscribedInitial={subscribedSet.has(channel.id)} 
                                    small={true} 
                                />
                            </div>

                            {/* Bottom Row: Context (Latest Post) */}
                            {latest && (
                                <div className="pl-11 text-[10px] text-[var(--text-secondary)] italic truncate opacity-80">
                                    "{latest.title || latest.content.slice(0, 40)}..."
                                </div>
                            )}
                        </div>
                    ))}
                </div>

                <div className="p-3 text-center">
                    <Link href="/discover" className="text-xs text-[var(--accent-primary)] font-bold hover:underline">
                        View More
                    </Link>
                </div>
            </div>

            {/* --- FOOTER --- */}
            <div className="px-4 text-[10px] text-[var(--text-muted)] text-center leading-relaxed">
                 © 2025 PeakeFeeds. Built on Optimism.
                 <div className="flex gap-2 justify-center mt-1">
                     <Link href="/privacy" className="hover:text-[var(--text-primary)]">Privacy</Link>
                     <span>•</span>
                     <Link href="/terms" className="hover:text-[var(--text-primary)]">Terms</Link>
                 </div>
            </div>

        </div>
    )
}
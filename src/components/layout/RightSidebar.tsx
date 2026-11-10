import Link from "next/link";
import { TrendingUp, Users, ArrowRight } from "lucide-react";
import { prisma } from "@/lib/db";
import { unstable_cache } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth.config";
import { SubscribeButton } from "@/components/SubscribeButton";
import { loadSidebarData } from "@/lib/sidebar-data";

// Same for every visitor, so cached for a minute instead of querying on every page render
const getSidebarData = unstable_cache(() => loadSidebarData(), ['right-sidebar-v2'], { revalidate: 60 });

export async function RightSidebar() {
    // 1. DATA FETCHING -------------------------------------
    
    // A. Shared data (cached)
    const { channels: channelSummaries, trendingPosts } = await getSidebarData();

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

    const suggestedChannels = channelSummaries.map(ch => ({ channel: ch, latest: ch.latest }));

    // 2. RENDER UI -----------------------------------------
    return (
        <div className="flex flex-col gap-6 w-full max-w-[320px]">
            
            {/* --- CARD 1: TRENDING POSTS --- */}
            <div className="flex flex-col rounded-(--radius-card) bg-(--glass-card) border border-(--glass-border) overflow-hidden shadow-(--glass-shadow)">
                <div className="p-4 border-b border-(--glass-border) flex items-center gap-2">
                    <TrendingUp size={18} className="text-(--accent-secondary)" />
                    <span className="font-bold text-sm text-(--text-primary)">Trending Now</span>
                </div>
                
                <div className="flex flex-col">
                    {trendingPosts.length > 0 ? trendingPosts.map((post) => (
                        <Link 
                            key={post.id} 
                            // Opens the channel scrolled to this post (there's no separate post page)
                            href={post.channelSlug ? `/channels/${post.channelSlug}?highlight=${post.id}` : '/discover'}
                            className="group flex items-center justify-between px-4 py-3 hover:bg-(--glass-card-hover) transition-colors border-b border-(--glass-border) last:border-0"
                        >
                            <div className="flex flex-col min-w-0 pr-2">
                                <span className="font-bold text-sm text-(--text-primary) truncate">
                                    {post.title || post.content}
                                </span>
                                <span className="text-xs text-(--text-muted) flex items-center gap-1">
                                    {post.channelSlug && <span className="opacity-70">#{post.channelSlug}</span>}
                                    <span>•</span>
                                    <span>{post.likesCount} {post.likesCount === 1 ? 'like' : 'likes'}</span>
                                </span>
                            </div>
                            <ArrowRight size={14} className="text-(--text-muted) opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                        </Link>
                    )) : (
                        <div className="p-4 text-xs text-(--text-muted) text-center">No trending posts yet.</div>
                    )}
                </div>
            </div>

            {/* --- CARD 2: CHANNELS TO FOLLOW --- */}
            <div className="flex flex-col rounded-(--radius-card) bg-(--glass-card) border border-(--glass-border) overflow-hidden shadow-(--glass-shadow)">
                <div className="p-4 border-b border-(--glass-border) flex items-center gap-2">
                    <Users size={18} className="text-(--accent-primary)" />
                    <span className="font-bold text-sm text-(--text-primary)">Channels to follow</span>
                </div>

                <div className="flex flex-col">
                    {suggestedChannels.map(({ channel, latest }) => (
                        <div key={channel.id} className="flex flex-col px-4 py-3 hover:bg-(--glass-card-hover) transition-colors border-b border-(--glass-border) last:border-0">
                            
                            {/* Top Row: Channel Info + Subscribe */}
                            <div className="flex items-center gap-3 mb-2">
                                <Link href={`/channels/${channel.slug}`} className="w-8 h-8 rounded-full bg-(--glass-card-hover) border border-(--glass-border) flex items-center justify-center font-bold text-xs text-(--text-primary) shrink-0">
                                    {channel.name[0].toUpperCase()}
                                </Link>
                                
                                <div className="flex-1 min-w-0">
                                    <Link href={`/channels/${channel.slug}`} className="block hover:underline">
                                        <span className="block font-bold text-xs text-(--text-primary) truncate">{channel.name}</span>
                                    </Link>
                                    <div className="text-[10px] text-(--text-muted) truncate">@{channel.slug}</div>
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
                                <div className="pl-11 text-[11px] text-(--text-muted) truncate">
                                    {latest.title || latest.content}
                                </div>
                            )}
                        </div>
                    ))}
                </div>

                <div className="p-3 text-center">
                    <Link href="/discover" className="text-xs text-(--accent-primary) font-bold hover:underline">
                        Discover more
                    </Link>
                </div>
            </div>

            {/* --- FOOTER --- */}
            <div className="px-4 text-[10px] text-(--text-muted) text-center leading-relaxed">
                 © {new Date().getFullYear()} PeakeFeeds.
                 <div className="flex gap-2 justify-center mt-1">
                     <Link href="/privacy" className="hover:text-(--text-primary)">Privacy</Link>
                     <span>•</span>
                     <Link href="/terms" className="hover:text-(--text-primary)">Terms</Link>
                 </div>
            </div>

        </div>
    )
}
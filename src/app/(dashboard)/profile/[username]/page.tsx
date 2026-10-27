import { notFound } from 'next/navigation';
import { getProfileData } from '@/lib/profile-service';
import { ShieldCheck, Calendar, Users, LayoutGrid } from 'lucide-react';
import Link from 'next/link';
import { PostCard } from "@/components/PostCard";
import { getServerSession } from "next-auth"; 
import { authOptions } from "@/lib/auth.config";
import { ConnectWalletButton } from "@/components/ConnectWalletButton"; 
import { SearchBar } from "@/components/SearchBar"; 
import MessageButton from "@/components/messaging/MessageButton"; 
import BlockUserButton from "@/components/profile/BlockUserButton";
import ReportUserButton from "@/components/profile/ReportUserButton";
import LockedOverlay from "@/components/moderation/LockedOverlay";

// Shared Layout Styles
import styles from "../../dashboard.module.css"; 
import { EmptyState } from "@/components/ui";
import { prisma } from "@/lib/db";

interface ProfilePageProps {
    params: Promise<{ username: string }>;
    searchParams: Promise<{ tab?: 'posts' | 'channels' }>;
}

// --- SUB-COMPONENTS ---
const StatBadge = ({ count, label }: { count: number, label: string }) => (
    <div className="flex flex-col items-center justify-center p-4 rounded-2xl bg-[var(--glass-card)] border border-[var(--glass-border)] shadow-sm">
        <span className="text-2xl font-bold text-[var(--accent-primary)]">{count}</span>
        <span className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider mt-1">{label}</span>
    </div>
);

type ActiveTabType = 'posts' | 'channels';

const ProfileTabs = ({ activeTab, username, postCount, channelCount }: 
    { activeTab: ActiveTabType, username: string, postCount: number, channelCount: number }) => {
    
    const baseClass = "flex items-center gap-2 px-6 py-3 border-b-2 transition-all text-sm font-medium";
    const activeClass = "border-[var(--accent-primary)] text-[var(--accent-primary)] font-bold";
    const inactiveClass = "border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--glass-card-hover)]";

    return (
        <nav className="flex w-full border-b border-[var(--glass-border)] mb-6">
            <Link 
                href={`/profile/${username}?tab=posts`} 
                className={`${baseClass} ${activeTab === 'posts' ? activeClass : inactiveClass} flex-1 justify-center`}
            >
                <LayoutGrid size={16} />
                Posts ({postCount})
            </Link>
            <Link 
                href={`/profile/${username}?tab=channels`} 
                className={`${baseClass} ${activeTab === 'channels' ? activeClass : inactiveClass} flex-1 justify-center`}
            >
                <Users size={16} />
                Channels ({channelCount})
            </Link>
        </nav>
    );
}

// --- MAIN PAGE ---
export default async function ProfilePage({ params, searchParams }: ProfilePageProps) {
    const { username } = await params;
    const { tab } = await searchParams;
    const activeTab: ActiveTabType = tab === 'channels' ? 'channels' : 'posts';
    
    const session = await getServerSession(authOptions);
    const currentUserId = session?.user?.id;

    // Fetch Profile Data
    const profile = await getProfileData(username, currentUserId);

    if (!profile) {
        notFound();
    }

    // Profile stats: verified ("signed") posts, and reactions their posts have received
    const [signedCount, reactionTotals] = await Promise.all([
        prisma.post.count({ where: { authorId: profile.id, isVerified: true } }),
        prisma.post.aggregate({ where: { authorId: profile.id }, _sum: { likesCount: true, dislikesCount: true } }),
    ]);
    const reactionCount = (reactionTotals._sum.likesCount ?? 0) + (reactionTotals._sum.dislikesCount ?? 0);

    const isOwnProfile = currentUserId === profile.id;

    // Transform Data
    const formattedPosts = profile.posts.map((post) => ({
        ...post,
        createdAt: post.createdAt.toISOString(),
        mediaUrl: post.mediaUrl ?? null,
        embedUrl: post.embedUrl ?? null,
        signature: post.signature ?? null,
        contentHash: post.contentHash ?? null,
        
        // 🟢 UNCOMMENTED: Link Metadata is now passed to the Client Component
        linkTitle: post.linkTitle ?? null,
        linkDescription: post.linkDescription ?? null,
        linkImage: post.linkImage ?? null,
        linkDomain: post.linkDomain ?? null,

        // 🟢 SERIALIZE COMMENTS DATES
        comments: post.comments.map(c => ({
            ...c,
            createdAt: c.createdAt.toISOString() 
        })),

        // 🟢 PASS MODERATION FLAGS
        viewerCanEdit: post.viewerCanEdit,
        viewerCanDelete: post.viewerCanDelete,
        viewerChannelRole: post.viewerChannelRole,
        
        author: { 
            id: profile.id, 
            username: profile.username, 
            name: profile.name, 
            image: profile.image ?? null,
            role: profile.role ?? 'USER' 
        },

        _count: {
            comments: post._count.comments,
            likes: post.likesCount ?? 0,
            dislikes: post.dislikesCount ?? 0
        },
        
        // @ts-ignore
        currentUserReaction: post.likes?.[0]?.type || null
    }));
    
    return (
        <div className={styles.feedWrapper}>
            
            {/* SEARCH BAR */}
            <div className={styles.searchWrapper}>
                <SearchBar />
            </div>

            {/* PROFILE HEADER */}
            <header className="mb-6 rounded-[var(--radius-card)] p-6 sm:p-8 text-center relative overflow-hidden bg-[var(--glass-card)] border border-[var(--glass-border)] shadow-[var(--glass-shadow)]">
                
                {profile.isLocked && <LockedOverlay message="This Account is Under Review by PeakeFeeds Admins. Interaction with this user is temporarily disabled." />}
                
                <div className="relative z-10">
                    <div className="w-24 h-24 mx-auto rounded-full mb-4 flex items-center justify-center text-4xl font-bold bg-[var(--accent-secondary)] text-white ring-4 ring-[var(--bg-app)] overflow-hidden">
                        {profile.image ? (
                            <img src={profile.image} alt={profile.username || 'User'} className="w-full h-full object-cover" />
                        ) : (
                            profile.username?.[0]?.toUpperCase() || 'U'
                        )}
                    </div>

                    <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight mb-1 text-[var(--text-primary)] break-all">
                        @{profile.username}
                    </h1>
                    
                    <div className="flex items-center justify-center gap-2 text-sm text-[var(--text-muted)] mb-6">
                        <Calendar size={14} aria-hidden="true" />
                        <span>Joined {new Date(profile.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</span>
                    </div>
                    
                    {/* ACTION AREA (Wallet + Message) */}
                    <div className="flex flex-wrap items-center justify-center gap-2">
                        {isOwnProfile ? (
                            <ConnectWalletButton />
                        ) : (
                            <>
                                <span className="inline-flex h-10 items-center gap-2 px-3 text-sm font-medium text-[var(--text-muted)]">
                                    <ShieldCheck size={16} aria-hidden="true" className={profile.walletAddress ? "text-[var(--status-success)]" : ""} />
                                    {profile.walletAddress ? 'Wallet verified' : 'No wallet linked'}
                                </span>
                                
                                <MessageButton recipientId={profile.id} />
                                <BlockUserButton userId={profile.id} />
                                <ReportUserButton userId={profile.id} />
                            </>
                        )}
                    </div>

                </div>
            </header>

            {/* STATS */}
            <section className="mb-8 grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatBadge count={profile._count.posts} label="Posts" />
                <StatBadge count={profile._count.channelsCreated} label="Channels" />
                <StatBadge count={reactionCount} label="Reactions" />
                <StatBadge count={signedCount} label="Signed" />
            </section>

            {/* CONTENT */}
            <section className="relative">
                {profile.isLocked && <LockedOverlay className="z-20" message="Interacting with this user's content is disabled during review." />}
                
                <ProfileTabs 
                    activeTab={activeTab} 
                    username={profile.username || 'user'} 
                    postCount={profile._count.posts} 
                    channelCount={profile._count.channelsCreated} 
                />
                
                {activeTab === 'posts' && (
                    <div className={styles.feedStream}>
                        {formattedPosts.length > 0 ? (
                            formattedPosts.map(post => (
                                <PostCard key={post.id} post={post} initialReaction={post.currentUserReaction} />
                            ))
                        ) : (
                            <EmptyState title="No posts yet" description={isOwnProfile ? "Post in a channel and it will show up here." : undefined} />
                        )}
                    </div>
                )}
                
                {activeTab === 'channels' && (
                    <div className={styles.feedStream}>
                        {profile.channelsCreated.length > 0 ? (
                            profile.channelsCreated.map(channel => (
                                <Link 
                                    key={channel.id} 
                                    href={`/channels/${channel.slug}`} 
                                    className="group block p-5 rounded-[var(--radius-card)] bg-[var(--glass-card)] border border-[var(--glass-border)] hover:border-[var(--accent-primary)] transition-colors"
                                >
                                    <div className="flex justify-between items-start mb-2">
                                        <h4 className="font-bold text-lg text-[var(--text-primary)]">{channel.name}</h4>
                                        <Users size={18} className="text-[var(--text-muted)]" />
                                    </div>
                                    <p className="text-sm text-[var(--text-muted)] mb-4">/c/{channel.slug}</p>
                                    <div className="text-xs font-bold px-3 py-1 rounded-full bg-[var(--glass-panel)] w-fit text-[var(--text-muted)] transition-colors">
                                        {channel._count.subscribers} {channel._count.subscribers === 1 ? 'Verifier' : 'Verifiers'}
                                    </div>
                                </Link>
                            ))
                        ) : (
                            <EmptyState
                                title="No channels yet"
                                description={isOwnProfile ? "To start a channel, search for its name and choose Create." : undefined}
                            />
                        )}
                    </div>
                )}
            </section>
        </div>
    );
}
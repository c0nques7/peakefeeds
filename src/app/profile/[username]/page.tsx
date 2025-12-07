import { notFound } from 'next/navigation';
import { getProfileData } from '@/lib/profile-service';
import { ShieldCheck, Calendar, Users, LayoutGrid } from 'lucide-react';
import Link from 'next/link';
import { PostCard } from "@/components/PostCard";
import { getServerSession } from "next-auth"; 
import { authOptions } from "@/lib/auth.config";
import { ConnectWalletButton } from "@/components/ConnectWalletButton"; 
import { SearchBar } from "@/components/SearchBar"; // Keep SearchBar here

// Shared Layout Styles
import styles from "../../home/dashboard.module.css"; 

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
    const activeClass = "border-[var(--accent-primary)] text-[var(--accent-primary)] font-bold bg-[var(--accent-primary)]/5";
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

    const isOwnProfile = currentUserId === profile.id;

    // Transform Data
    const formattedPosts = profile.posts.map((post) => ({
        ...post,
        createdAt: post.createdAt.toISOString(),
        mediaUrl: post.mediaUrl ?? null,
        embedUrl: post.embedUrl ?? null,
        signature: post.signature ?? null,
        contentHash: post.contentHash ?? null,
        
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
            
            {/* 🔍 SEARCH BAR */}
            <div className="mb-6 w-full pt-4 relative z-20">
                <SearchBar />
            </div>

            {/* PROFILE HEADER */}
            <header className="mb-8 rounded-[2rem] p-8 text-center relative overflow-hidden bg-[var(--glass-card)] border border-[var(--glass-border)] shadow-xl">
                
                <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-[var(--accent-primary)]/10 to-transparent pointer-events-none" />

                <div className="relative z-10">
                    <div className="w-28 h-28 mx-auto rounded-full mb-4 flex items-center justify-center text-4xl font-bold bg-[var(--accent-secondary)] text-white shadow-lg ring-4 ring-[var(--bg-app)] overflow-hidden">
                        {profile.image ? (
                            <img src={profile.image} alt={profile.username || 'User'} className="w-full h-full object-cover" />
                        ) : (
                            profile.username?.[0]?.toUpperCase() || 'U'
                        )}
                    </div>

                    <h1 className="text-3xl font-extrabold tracking-tight mb-1 text-[var(--text-primary)]">
                        @{profile.username}
                    </h1>
                    
                    <div className="flex items-center justify-center gap-2 text-sm text-[var(--text-muted)] mb-6">
                        <Calendar size={14} />
                        <span>Joined {new Date(profile.createdAt).toLocaleDateString()}</span>
                    </div>
                    
                    <div className="flex items-center justify-center">
                        {isOwnProfile ? (
                            <ConnectWalletButton />
                        ) : (
                            <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-[var(--glass-panel)] border border-[var(--glass-border)] text-sm font-medium">
                                <ShieldCheck size={16} className={profile.walletAddress ? "text-emerald-400" : "text-gray-500"} />
                                <span className={profile.walletAddress ? "text-[var(--text-primary)]" : "text-[var(--text-muted)]"} >
                                    {profile.walletAddress ? `Verified: ${profile.walletAddress.slice(0, 6)}...` : 'Unlinked Wallet'}
                                </span>
                            </div>
                        )}
                    </div>
                </div>
            </header>

            {/* STATS */}
            <section className="mb-8 grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatBadge count={profile._count.posts} label="Posts" />
                <StatBadge count={profile._count.channelsCreated} label="Channels" />
                <StatBadge count={0} label="Reactions" />
                <StatBadge count={0} label="Signed" />
            </section>

            {/* CONTENT */}
            <section>
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
                            <div className="col-span-full py-16 text-center border border-dashed border-[var(--glass-border)] rounded-3xl bg-[var(--glass-card)]">
                                <p className="text-[var(--text-muted)]">No posts yet.</p>
                            </div>
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
                                    className="group block p-6 rounded-2xl bg-[var(--glass-card)] border border-[var(--glass-border)] hover:border-[var(--accent-primary)] transition-all hover:-translate-y-1"
                                >
                                    <div className="flex justify-between items-start mb-2">
                                        <h4 className="font-bold text-lg text-[var(--accent-primary)]">#{channel.slug}</h4>
                                        <Users size={18} className="text-[var(--text-muted)]" />
                                    </div>
                                    <p className="text-sm text-[var(--text-primary)] line-clamp-2 mb-4">{channel.name}</p>
                                    <div className="text-xs font-bold px-3 py-1 rounded-full bg-[var(--glass-panel)] w-fit text-[var(--text-muted)] group-hover:bg-[var(--accent-primary)] group-hover:text-white transition-colors">
                                        {channel._count.subscribers} Subscribers
                                    </div>
                                </Link>
                            ))
                        ) : (
                            <div className="col-span-full py-16 text-center border border-dashed border-[var(--glass-border)] rounded-3xl bg-[var(--glass-card)]">
                                <p className="text-[var(--text-muted)]">No channels created.</p>
                            </div>
                        )}
                    </div>
                )}
            </section>
        </div>
    );
}

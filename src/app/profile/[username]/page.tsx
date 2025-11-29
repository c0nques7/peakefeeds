import { notFound } from 'next/navigation';
import { getProfileData } from '@/lib/profile-service';
import { ShieldCheck } from 'lucide-react';
import Link from 'next/link';
import { PostCard } from "@/components/PostCard";
import { getServerSession } from "next-auth"; 
import { authOptions } from "@/lib/auth.config";
import { ConnectWalletButton } from "@/components/ConnectWalletButton"; // 👈 IMPORT

interface ProfilePageProps {
    params: Promise<{ username: string }>;
    searchParams: Promise<{ tab?: 'posts' | 'channels' }>;
}

const StatBadge = ({ count, label }: { count: number, label: string }) => (
    <div className="flex flex-col items-center justify-center p-3 rounded-xl"
         style={{ background: 'var(--glass-card)', border: '1px solid var(--glass-border)', boxShadow: 'var(--shadow-card)' }}>
        <span className="text-xl font-bold" style={{ color: 'var(--accent-primary)' }}>{count}</span>
        <span className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>{label}</span>
    </div>
);

type ActiveTabType = 'posts' | 'channels';

const ProfileTabs = ({ activeTab, username, postCount, channelCount }: 
    { activeTab: ActiveTabType, username: string, postCount: number, channelCount: number }) => {
    const baseClass = "px-6 py-2 border-b-2 transition-colors text-sm font-medium";
    const activeStyle = { color: 'var(--accent-primary)', borderColor: 'var(--accent-primary)', fontWeight: 700 };
    const defaultStyle = { color: 'var(--text-muted)', borderColor: 'transparent' };

    return (
        <nav className="flex justify-start border-b" style={{ borderColor: 'var(--glass-border)' }}>
            <Link href={`/profile/${username}?tab=posts`} className={baseClass} style={activeTab === 'posts' ? activeStyle : defaultStyle}>
                Posts ({postCount})
            </Link>
            <Link href={`/profile/${username}?tab=channels`} className={baseClass} style={activeTab === 'channels' ? activeStyle : defaultStyle}>
                Channels ({channelCount})
            </Link>
        </nav>
    );
}

export default async function ProfilePage({ params, searchParams }: ProfilePageProps) {
    const { username } = await params;
    const { tab } = await searchParams;
    const activeTab: ActiveTabType = tab === 'channels' ? 'channels' : 'posts';
    
    const session = await getServerSession(authOptions);
    const currentUserId = session?.user?.id;

    const profile = await getProfileData(username, currentUserId);

    if (!profile) {
        notFound();
    }

    // Check if viewing own profile
    const isOwnProfile = currentUserId === profile.id;
    
    return (
        <div className="min-h-screen pt-4 pb-24">
            <div className="max-w-4xl mx-auto px-4">
                
                {/* PROFILE HEADER */}
                <header className="mb-12 rounded-[2rem] p-8 text-center"
                        style={{ background: 'var(--glass-card)', border: '1px solid var(--glass-border)', boxShadow: 'var(--shadow-glass)' }}>
                    
                    <div className="w-24 h-24 mx-auto rounded-full mb-4 flex items-center justify-center text-3xl font-bold"
                         style={{ background: 'var(--accent-secondary)', color: 'white' }}>
                        {profile.username?.[0]?.toUpperCase() || 'U'}
                    </div>

                    <h1 className="text-3xl font-extrabold tracking-tight mb-1" style={{ color: 'var(--text-primary)' }}>
                        @{profile.username}
                    </h1>
                    
                    {/* 🛡️ WALLET SECTION */}
                    <div className="flex items-center justify-center mt-4">
                        {isOwnProfile ? (
                            // Interactive Button for Owner
                            <ConnectWalletButton />
                        ) : (
                            // Static Badge for Visitors
                            <div className="flex items-center gap-2 text-sm font-medium" 
                                 style={{ color: profile.walletAddress ? 'var(--accent-primary)' : 'var(--text-muted)' }}>
                                <ShieldCheck size={18} />
                                {profile.walletAddress ? 
                                    `Verified: ${profile.walletAddress.slice(0, 6)}...` : 
                                    'Unlinked Wallet'
                                }
                            </div>
                        )}
                    </div>

                </header>

                <section className="mb-12 grid grid-cols-2 md:grid-cols-4 gap-4">
                    <StatBadge count={profile._count.posts} label="Total Posts" />
                    <StatBadge count={profile._count.channelsCreated} label="Channels Created" />
                    <StatBadge count={0} label="Total Reactions" />
                    <StatBadge count={0} label="Signed Posts" />
                </section>

                <section>
                    <ProfileTabs activeTab={activeTab} username={profile.username || 'user'} postCount={profile._count.posts} channelCount={profile._count.channelsCreated} />
                    
                    {activeTab === 'posts' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pt-6">
                            {profile.posts.length > 0 ? (
                                profile.posts.map(post => (
                                    <PostCard 
                                        key={post.id} 
                                        post={{ 
                                            ...post, 
                                            author: { id: profile.id, username: profile.username, name: profile.name, image: null }
                                        }}
                                        initialReaction={post.currentUserReaction}
                                    />
                                ))
                            ) : (
                                <div className="col-span-full p-8 text-center" style={{ color: 'var(--text-muted)' }}>No posts found.</div>
                            )}
                        </div>
                    )}
                    
                    {activeTab === 'channels' && (
                        <div className="p-8 text-center pt-6 space-y-4" style={{ color: 'var(--text-muted)' }}>
                            <p className="font-bold text-lg" style={{ color: 'var(--text-primary)' }}>Channels Created ({profile.channelsCreated.length})</p>
                            {profile.channelsCreated.length > 0 ? (
                                profile.channelsCreated.map(channel => (
                                    <Link key={channel.id} href={`/channels/${channel.slug}`} className="block p-4 rounded-xl text-left"
                                          style={{ background: 'var(--glass-card)', border: '1px solid var(--glass-border)' }}>
                                        <h4 className="font-semibold" style={{ color: 'var(--accent-primary)' }}>#{channel.slug}</h4>
                                        <p className="text-sm" style={{ color: 'var(--text-primary)' }}>{channel.name}</p>
                                        <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>{channel._count.subscribers} subscribers</p>
                                    </Link>
                                ))
                            ) : (
                                <p>This user has not created any channels yet.</p>
                            )}
                        </div>
                    )}
                </section>
            </div>
        </div>
    );
}
import { notFound } from 'next/navigation';
import { getProfileData, ProfileData } from '@/lib/profile-service';
import { ShieldCheck, User as UserIcon } from 'lucide-react';
import Link from 'next/link';
import { PostCard } from "@/components/PostCard"; // Assuming PostCard is here

interface ProfilePageProps {
    params: { username: string };
    searchParams: { tab?: 'posts' | 'channels' }; // Get tab from URL
}

// Helper component for stat badges
const StatBadge = ({ count, label }: { count: number, label: string }) => (
    <div className="flex flex-col items-center justify-center p-3 rounded-xl"
         style={{ background: 'var(--glass-card)', border: '1px solid var(--glass-border)', boxShadow: 'var(--shadow-card)' }}>
        <span className="text-xl font-bold" style={{ color: 'var(--accent-primary)' }}>{count}</span>
        <span className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>{label}</span>
    </div>
);

type ActiveTabType = 'posts' | 'channels';

// Helper component for the content tabs/navigation
const ProfileTabs = ({ activeTab, username, postCount, channelCount }: 
    { activeTab: ActiveTabType, username: string, postCount: number, channelCount: number }) => {

    const baseClass = "px-6 py-2 border-b-2 transition-colors text-sm font-medium";
    
    // Define explicit style objects
    const activeStyle = { 
        color: 'var(--accent-primary)', 
        borderColor: 'var(--accent-primary)',
        fontWeight: 700,
    };
    const defaultStyle = { 
        color: 'var(--text-muted)',
        borderColor: 'transparent',
    };

    return (
        <nav className="flex justify-start border-b" style={{ borderColor: 'var(--glass-border)' }}>
            
            {/* 1. Posts Tab */}
            <Link 
                href={`/profile/${username}?tab=posts`} 
                className={baseClass} 
                style={activeTab === 'posts' ? activeStyle : defaultStyle}
            >
                Posts ({postCount})
            </Link>

            {/* 2. Channels Tab */}
            <Link 
                href={`/profile/${username}?tab=channels`} 
                className={baseClass} 
                style={activeTab === 'channels' ? activeStyle : defaultStyle}
            >
                Channels ({channelCount})
            </Link>
        </nav>
    );
}

export default async function ProfilePage({ params, searchParams }: ProfilePageProps) {
    const { username } = params;
    
    // Determine the active tab from the URL query parameter, default to 'posts'
    const activeTab: ActiveTabType = searchParams.tab === 'channels' ? 'channels' : 'posts';
    
    const profile = await getProfileData(username);

    if (!profile) {
        notFound();
    }
    
    return (
        <div className="min-h-screen pt-4 pb-24">
            <div className="max-w-4xl mx-auto px-4">
                
                {/* 1. PROFILE HEADER / BANNER */}
                <header className="mb-12 rounded-[2rem] p-8 text-center"
                        style={{ 
                            background: 'var(--glass-card)', 
                            border: '1px solid var(--glass-border)', 
                            boxShadow: 'var(--shadow-glass)' 
                        }}>
                    
                    {/* Avatar Placeholder */}
                    <div className="w-24 h-24 mx-auto rounded-full mb-4 flex items-center justify-center text-3xl font-bold"
                         style={{ background: 'var(--accent-secondary)', color: 'white' }}>
                        {profile.username?.[0]?.toUpperCase() || 'U'}
                    </div>

                    <h1 className="text-3xl font-extrabold tracking-tight mb-1" style={{ color: 'var(--text-primary)' }}>
                        @{profile.username}
                    </h1>
                    
                    {/* Wallet Status / Verification Chip */}
                    <div className="flex items-center justify-center text-sm font-medium mt-2" 
                         style={{ color: profile.walletAddress ? 'var(--accent-primary)' : 'var(--text-muted)' }}>
                        <ShieldCheck size={18} style={{ marginRight: '6px' }} />
                        {profile.walletAddress ? 
                            `Verified Wallet: ${profile.walletAddress.slice(0, 6)}...` : 
                            'Unlinked Wallet (Unverified)'
                        }
                    </div>
                </header>

                {/* 2. STATS & METADATA SECTION */}
                <section className="mb-12 grid grid-cols-2 md:grid-cols-4 gap-4">
                    <StatBadge count={profile._count.posts} label="Total Posts" />
                    <StatBadge count={profile._count.channelsCreated} label="Channels Created" />
                    <StatBadge count={120} label="Total Reactions" /> {/* Placeholder stat */}
                    <StatBadge count={0} label="Signed Posts" /> {/* Placeholder stat */}
                </section>

                {/* 3. CONTENT TABS */}
                <section>
                    <ProfileTabs 
                        activeTab={activeTab} 
                        username={profile.username || 'user'} 
                        postCount={profile._count.posts}
                        channelCount={profile._count.channelsCreated}
                    />
                    
                    {/* POSTS FEED */}
                    {activeTab === 'posts' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pt-6">
                            {profile.posts.length > 0 ? (
                                profile.posts.map(post => (
                                    <PostCard 
                                        key={post.id} 
                                        post={{ 
                                            // Mock required fields for PostCard interface compliance
                                            ...post, 
                                            type: post.title ? 'LONGFORM' : 'TEXT',
                                            mediaUrl: null, 
                                            mediaHash: null,
                                            embedUrl: null,
                                            signature: null,
                                            contentHash: null,
                                            author: { id: profile.id, username: profile.username, name: profile.name },
                                            // Mock required channel structure
                                            channel: { id: 'mock', name: 'User Post', slug: post.channel.slug, creatorId: profile.id } 
                                        }} 
                                    />
                                ))
                            ) : (
                                <div className="col-span-full p-8 text-center" style={{ color: 'var(--text-muted)' }}>
                                    No posts found.
                                </div>
                            )}
                        </div>
                    )}
                    
                    {/* CHANNELS FEED */}
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
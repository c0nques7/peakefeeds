import { prisma } from '@/lib/db';
import { notFound } from 'next/navigation';
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth.config";
import { PostCard } from "@/components/PostCard";
import CreatePostForm from "@/components/posts/CreatePostForm";
import { SubscribeButton } from "@/components/SubscribeButton";
// Import dashboard styles for the background logic
import styles from "../../dashboard.module.css"; 

interface ChannelPageProps {
  params: Promise<{ slug: string }>;
}

export default async function ChannelPage({ params }: ChannelPageProps) {
  const { slug } = await params; 
  const session = await getServerSession(authOptions);
  const currentUserId = session?.user?.id || '';

  const channel = await prisma.channel.findUnique({
    where: { slug: slug },
    include: {
      posts: {
        orderBy: { createdAt: 'desc' },
        include: {
          author: true,
          channel: true, 
          comments: {
            take: 50,
            orderBy: { createdAt: 'asc' },
            include: { author: { select: { id: true, username: true } } }
          },
          likes: currentUserId ? { where: { userId: currentUserId }, select: { type: true } } : false,
          _count: { select: { comments: true } }
        }
      },
      subscribers: { where: { userId: currentUserId }, select: { userId: true }, take: 1 },
      _count: { select: { subscribers: true } }
    }
  });

  if (!channel) notFound();

  // Transform Data
  const formattedPosts = channel.posts.map((post) => {
      // @ts-ignore
      const userReaction = post.likes?.[0]?.type || null;
      return {
          ...post,
          _count: {
              comments: post._count.comments,
              likes: post.likesCount,
              dislikes: post.dislikesCount
          },
          currentUserReaction: userReaction
      }
  });

  const isSubscribedInitial = channel.subscribers.length > 0;
  const isCreator = channel.creatorId === currentUserId;

  return (
    <div className="min-h-screen pb-24 pt-4 relative"> 
      
      {/* 🌬️ ANIMATED BACKGROUND */}
      <div className={styles.backgroundLayer}>
          <div className={styles.orbTeal} />
          <div className={styles.orbPurple} />
      </div>

      {/* --- CHANNEL HEADER --- */}
      <div className="max-w-5xl mx-auto px-4 mb-12 relative z-10"> 
        <div 
            className="backdrop-blur-xl rounded-[2rem] p-8 text-center shadow-xl"
            style={{ 
                background: 'var(--glass-card)', 
                border: '1px solid var(--glass-border)' 
            }}
        >
          <h1 className="text-4xl font-extrabold tracking-tight mb-2 text-[var(--text-primary)]">
            {channel.name}
          </h1>
          <p className="text-lg max-w-2xl mx-auto text-[var(--text-secondary)]">
            {channel.description}
          </p>
          
          <div className="mt-6 flex flex-wrap items-center justify-center gap-4">
             <div className="px-4 py-1.5 rounded-full border text-sm font-semibold"
                  style={{ 
                      borderColor: 'var(--accent-secondary)', 
                      color: 'var(--accent-secondary)',
                      background: 'rgba(45, 212, 191, 0.1)' 
                  }}
             >
                {channel._count.subscribers} Verifiers
             </div>

             {currentUserId && !isCreator && (
                <SubscribeButton
                    channelId={channel.id}
                    channelSlug={channel.slug}
                    isSubscribedInitial={isSubscribedInitial}
                />
             )}
             
             {isCreator && (
                <span className="px-4 py-1.5 rounded-full border text-sm font-bold"
                      style={{ 
                          borderColor: 'var(--accent-primary)', 
                          color: 'var(--accent-primary)',
                          background: 'rgba(168, 85, 247, 0.1)' 
                      }}
                >
                    You are the Creator
                </span>
             )}
          </div>
        </div>
      </div>

      {/* --- MAIN FEED --- */}
      <main className="max-w-5xl mx-auto px-4 relative z-10">
        
        {/* Composer */}
        {currentUserId && 
            <div className="mb-12 rounded-2xl p-4 shadow-lg"
                 style={{ background: 'var(--glass-panel)', border: '1px solid var(--glass-border)' }}>
                <CreatePostForm channelId={channel.id} />
            </div>
        }

        <div className={styles.postsGrid}>
            {formattedPosts.length === 0 ? (
                <div className="col-span-full p-16 border-2 border-dashed border-[var(--glass-border)] rounded-3xl text-center text-[var(--text-muted)] bg-[var(--glass-card)]">
                  <p className="text-lg font-medium">No verified truth here yet.</p>
                  <p className="text-sm opacity-70">Be the first to post.</p>
                </div>
            ) : (
                formattedPosts.map(post => (
                    <PostCard 
                        key={post.id} 
                        post={{
                            ...post, 
                            mediaUrl: post.mediaUrl || null, 
                            embedUrl: post.embedUrl || null,
                            signature: post.signature || null,
                            contentHash: post.contentHash || null
                        }} 
                        initialReaction={post.currentUserReaction}
                    />
                ))
            )}
        </div>
      </main>
    </div>
  );
}
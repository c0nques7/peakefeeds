import { prisma } from '@/lib/db';
import { notFound } from 'next/navigation';
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth.config";
import { PostCard } from "@/components/PostCard";
import CreatePostForm from "@/components/posts/CreatePostForm"; 
import { SubscribeButton } from "@/components/SubscribeButton";

// ⚡️ IMPORT THE SHARED LAYOUT STYLES
// Make sure this path points to your actual CSS file location
import styles from "@/app/(dashboard)/dashboard.module.css"; 

interface ChannelPageProps {
  params: Promise<{ slug: string }>;
}

export default async function ChannelPage({ params }: ChannelPageProps) {
  const { slug } = await params; 
  const session = await getServerSession(authOptions);
  const currentUserId = session?.user?.id || '';

  // 1. Fetch Channel Data
  const channel = await prisma.channel.findUnique({
    where: { slug: slug },
    select: {
      id: true, name: true, description: true, slug: true, creatorId: true,
      _count: { select: { subscribers: true } },

      // Check subscription status
      subscribers: {
        where: { userId: currentUserId },
        select: { userId: true }, 
        take: 1, 
      },

      // Fetch Posts
      posts: {
        orderBy: { createdAt: 'desc' },
        select: {
            id: true, title: true, content: true, createdAt: true, isVerified: true,
            contentHash: true, signature: true, embedUrl: true, mediaUrl: true, type: true,
            likesCount: true, dislikesCount: true,
            
            author: { 
                select: { 
                    id: true, name: true, username: true, image: true, role: true 
                } 
            },
            channel: { select: { id: true, name: true, slug: true, creatorId: true } },
            comments: {
                take: 50,
                orderBy: { createdAt: 'asc' },
                select: {
                    id: true, content: true, parentId: true,
                    author: { select: { id: true, username: true } }
                }
            },
            likes: currentUserId ? {
                where: { userId: currentUserId },
                select: { type: true }
            } : false,
            _count: { select: { comments: true } }
        }
      }
    }
  });

  if (!channel) {
    notFound();
  }

  // 2. Data Transformation (Fixes Date & Nulls)
  const formattedPosts = channel.posts.map((post) => {
      // @ts-ignore
      const userReaction = post.likes?.[0]?.type || null;
      
      return {
          ...post,
          // ⚡️ FIX: Convert Date to String for Client Component
          createdAt: post.createdAt.toISOString(),
          
          // ⚡️ FIX: Handle Nulls safely
          mediaUrl: post.mediaUrl ?? null,
          embedUrl: post.embedUrl ?? null,
          signature: post.signature ?? null,
          contentHash: post.contentHash ?? null,
          
          author: {
             ...post.author,
             role: post.author.role ?? 'USER'
          },

          _count: {
              comments: post._count.comments,
              likes: post.likesCount ?? 0,
              dislikes: post.dislikesCount ?? 0
          },
          currentUserReaction: userReaction
      }
  });

  const isSubscribedInitial = channel.subscribers.length > 0;
  const isCreator = channel.creatorId === currentUserId;

  return (
    // ⚡️ FIX: Use standard wrapper for Sidebar offset & Layout
    <div className={styles.feedWrapper}>
      
      {/* CHANNEL HEADER */}
      <div className="mb-10 relative z-10 pt-4"> 
        <div className="backdrop-blur-xl rounded-[2rem] p-8 text-center shadow-xl border border-[var(--glass-border)] bg-[var(--glass-card)]">
          <h1 className="text-4xl font-extrabold tracking-tight mb-2 text-[var(--text-primary)]">
            {channel.name}
          </h1>
          <p className="text-lg max-w-2xl mx-auto text-[var(--text-secondary)]">
            {channel.description}
          </p>

          <div className="mt-6 flex flex-wrap items-center justify-center gap-4">
             <div className="px-4 py-1.5 rounded-full border border-[var(--accent-secondary)] text-[var(--accent-secondary)] bg-teal-500/10 text-sm font-semibold">
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
                <span className="px-4 py-1.5 rounded-full border border-purple-500 text-purple-500 bg-purple-500/10 text-sm font-bold">
                    You are the Creator
                </span>
             )}
          </div>
        </div>
      </div>

      {/* CREATE POST FORM (If Logged In) */}
      {currentUserId && (
          <div className="mb-8 rounded-2xl p-4 shadow-lg border border-[var(--glass-border)] bg-[var(--glass-panel)]">
              <CreatePostForm 
                  channelId={channel.id} 
                  userImage={session?.user?.image}
                  username={session?.user?.username || 'user'} 
                  linkedWallet={session?.user?.walletAddress}
              />
          </div>
      )}

      {/* FEED STREAM (Grid) */}
      <div className={styles.feedStream}>
          {formattedPosts.length === 0 ? (
            <div className="col-span-full p-16 border border-dashed border-[var(--glass-border)] rounded-3xl text-center text-[var(--text-muted)] bg-[var(--glass-card)]">
              <p className="text-lg font-medium">No verified truth here yet.</p>
              <p className="text-sm opacity-70">Be the first to post.</p>
            </div>
          ) : (
            formattedPosts.map(post => (
                <PostCard 
                    key={post.id} 
                    // ⚡️ Types now match perfectly
                    post={post} 
                    initialReaction={post.currentUserReaction}
                />
            ))
          )}
      </div>
      
    </div>
  );
}
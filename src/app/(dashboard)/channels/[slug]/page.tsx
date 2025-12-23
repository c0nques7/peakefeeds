// Trivial change to force recompilation after Prisma generate
import { prisma } from '@/lib/db';
import { notFound } from 'next/navigation';
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth.config";
import { PostCard } from "@/components/PostCard";
import CreatePostForm from "@/components/posts/CreatePostForm"; 
import { SubscribeButton } from "@/components/SubscribeButton";
import { SearchBar } from "@/components/SearchBar"; 
import ReportChannelButton from "@/components/channels/ReportChannelButton";
import LockedOverlay from "@/components/moderation/LockedOverlay";
import { Settings } from "lucide-react";
import Link from "next/link";

// ⚡️ SHARED LAYOUT STYLES
import styles from "../../../(dashboard)/dashboard.module.css"; 

interface ChannelPageProps {
  params: Promise<{ slug: string }>;
}

export default async function ChannelPage({ params }: ChannelPageProps) {
  const { slug } = await params; 
  const session = await getServerSession(authOptions);
  const currentUserId = session?.user?.id || '';
  const isGlobalAdmin = session?.user?.role === 'ADMIN';

  // 1. Fetch Channel Data
  const channel = await prisma.channel.findUnique({
    where: { slug: slug },
    select: {
      id: true, name: true, description: true, slug: true, creatorId: true, isLocked: true,
      _count: { select: { subscribers: true } },
      
      subscribers: {
        where: { userId: currentUserId },
        select: { 
          userId: true, 
          role: true,
          canPost: true,
          canComment: true,
          canDeletePosts: true,
          canPinPosts: true
        }, 
        take: 1, 
      },

      posts: {
        orderBy: { createdAt: 'desc' },
        select: {
            id: true, title: true, content: true, createdAt: true, isVerified: true, isLocked: true,
            contentHash: true, signature: true, embedUrl: true, mediaUrl: true, type: true,
            likesCount: true, dislikesCount: true,
            
            // 🟢 ADDED: Link Metadata Selection
            linkTitle: true,
            linkDescription: true,
            linkImage: true,
            linkDomain: true,
            
            author: { 
                select: { 
                    id: true, 
                    name: true, 
                    username: true, 
                    image: true, 
                    role: true,
                    subscriptions: {
                        where: { channel: { slug: slug } },
                        select: { role: true }
                    }
                } 
            },
            channel: { select: { id: true, name: true, slug: true, creatorId: true } },
            comments: {
                take: 50,
                orderBy: { createdAt: 'asc' },
                select: {
                    id: true, content: true, parentId: true,
                    author: { 
                        select: { 
                            id: true, 
                            username: true,
                            subscriptions: {
                                where: { channel: { slug: slug } },
                                select: { role: true }
                            }
                        } 
                    }
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

  // 2. Transform Data (Fix Dates & Nulls)
  const viewerSubscription = channel.subscribers[0];
  
  const formattedPosts = channel.posts.map((post) => {
      // @ts-ignore
      const userReaction = post.likes?.[0]?.type || null;
      
      return {
          ...post,
          createdAt: post.createdAt.toISOString(),
          mediaUrl: post.mediaUrl ?? null,
          embedUrl: post.embedUrl ?? null,
          signature: post.signature ?? null,
          contentHash: post.contentHash ?? null,
          
          // 🟢 ADDED: Viewer context for permissions
          viewerChannelRole: isGlobalAdmin ? 'ADMIN' : (isCreator ? 'OWNER' : (viewerSubscription?.role || null)),
          viewerCanDelete: isGlobalAdmin || isCreator || viewerSubscription?.canDeletePosts || false,
          
          author: {
             ...post.author,
             role: post.author.role ?? 'USER',
             channelRole: post.author.subscriptions?.[0]?.role || null
          },

          comments: post.comments.map((c: any) => ({
              ...c,
              author: {
                  ...c.author,
                  channelRole: c.author.subscriptions?.[0]?.role || null
              }
          })),

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
    <div className={styles.feedWrapper}>
      <div className={styles.searchWrapper}>
        <SearchBar />
      </div>
      {/* CHANNEL HEADER */}
      <div className="mb-10 relative z-10"> 
        <div className="relative backdrop-blur-xl rounded-[2rem] p-8 text-center shadow-xl border border-[var(--glass-border)] bg-[var(--glass-card)] w-full overflow-hidden">
          {channel.isLocked && <LockedOverlay message="This Channel is Under Review by PeakeFeeds Admins. You can still view its content, but new posts and interactions are disabled." />}
          
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
                <>
                  <SubscribeButton
                      channelId={channel.id}
                      channelSlug={channel.slug}
                      isSubscribedInitial={isSubscribedInitial}
                  />
                  <ReportChannelButton channelId={channel.id} />
                </>
             )}

             {(isCreator || isGlobalAdmin) && (
                <Link 
                  href={`/channels/${channel.slug}/settings`}
                  className="px-4 py-1.5 rounded-full border border-purple-500 text-purple-500 bg-purple-500/10 text-sm font-bold flex items-center gap-2 hover:bg-purple-500/20 transition-all"
                >
                    <Settings size={14} /> Manage Channel
                </Link>
             )}
          </div>
        </div>
      </div>

      {/* CREATE POST FORM */}
      {currentUserId && (
          <div className="relative mb-8 rounded-2xl p-4 shadow-lg border border-[var(--glass-border)] bg-[var(--glass-panel)] overflow-hidden">
              {channel.isLocked && <LockedOverlay message="New posts are disabled while this channel is under review." />}
              <CreatePostForm 
                  channelId={channel.id} 
                  userImage={session?.user?.image}
                  username={session?.user?.username || 'user'} 
                  linkedWallet={session?.user?.walletAddress}
              />
          </div>
      )}

      {/* FEED STREAM */}
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
                    post={post} 
                    initialReaction={post.currentUserReaction}
                    currentUserId={currentUserId}
                />
            ))
          )}
      </div>
      
    </div>
  );
}


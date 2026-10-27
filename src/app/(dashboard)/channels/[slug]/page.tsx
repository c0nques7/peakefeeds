import { prisma } from '@/lib/db';
import { notFound } from 'next/navigation';
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth.config";
import { signMediaUrl } from "@/lib/b2";
import { getPostPermissions } from "@/lib/permissions";
import { UserRole } from "@prisma/client";
import { PostCard } from "@/components/PostCard";
import CreatePostForm from "@/components/posts/CreatePostForm"; 
import { SubscribeButton } from "@/components/SubscribeButton";
import { SearchBar } from "@/components/SearchBar"; 
import ReportChannelButton from "@/components/channels/ReportChannelButton";
import LockedOverlay from "@/components/moderation/LockedOverlay";
import { Settings, Users, ChevronDown } from "lucide-react";
import { ButtonLink, EmptyState } from "@/components/ui";
import styles from "../../dashboard.module.css";

// Posts are shown 20 at a time; "Show more" asks for the next 20.
const PAGE_SIZE = 20;
const MAX_SHOWN = 500;

interface ChannelPageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ show?: string; highlight?: string }>;
}

export default async function ChannelPage({ params, searchParams }: ChannelPageProps) {
  const { slug } = await params;
  const { show: showParam, highlight } = await searchParams;
  let show = Math.min(Math.max(Number(showParam) || PAGE_SIZE, PAGE_SIZE), MAX_SHOWN);

  // A link to one post (e.g. from Trending) must include it: show enough posts to reach it
  if (highlight) {
    const target = await prisma.post.findFirst({
      where: { id: highlight, channel: { slug } },
      select: { createdAt: true },
    });
    if (target) {
      const newer = await prisma.post.count({ where: { channel: { slug }, createdAt: { gt: target.createdAt } } });
      show = Math.min(Math.max(show, newer + 1), MAX_SHOWN);
    }
  }
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
        // One extra tells us whether there are more to show
        take: show + 1,
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
  const isCreator = channel.creatorId === currentUserId;
  const viewer = session?.user?.id ? { id: session.user.id, role: session.user.role as UserRole } : null;
  const isSubscribedInitial = channel.subscribers.length > 0;
  
  const hasMore = channel.posts.length > show;
  const formattedPosts = await Promise.all(channel.posts.slice(0, show).map(async (post) => {
      // @ts-ignore
      const userReaction = post.likes?.[0]?.type || null;

      const finalMediaUrl = await signMediaUrl(post.mediaUrl);
      const perms = getPostPermissions(viewer, { authorId: post.author.id, isVerified: post.isVerified, channel }, viewerSubscription);
      
      return {
          ...post,
          createdAt: post.createdAt.toISOString(),
          mediaUrl: finalMediaUrl,
          embedUrl: post.embedUrl ?? null,
          signature: post.signature ?? null,
          contentHash: post.contentHash ?? null,
          
          // 🟢 ADDED: Viewer context for permissions
          viewerChannelRole: perms.channelRole,
          viewerCanEdit: perms.canEdit,
          viewerCanDelete: perms.canDelete,
          
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
  }));

  return (
    <div className={styles.feedWrapper}>
      <div className={styles.searchWrapper}>
        <SearchBar />
      </div>
      {/* CHANNEL HEADER */}
      <header className="relative mb-6 overflow-hidden rounded-[var(--radius-card)] border border-[var(--glass-border)] bg-[var(--glass-card)] p-6 sm:p-8 text-center shadow-[var(--glass-shadow)]">
        {channel.isLocked && <LockedOverlay message="This Channel is Under Review by PeakeFeeds Admins. You can still view its content, but new posts and interactions are disabled." />}

        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-[var(--text-primary)] [text-wrap:balance]">
          {channel.name}
        </h1>
        {channel.description && (
          <p className="mx-auto mt-2 max-w-prose text-base text-[var(--text-secondary)]">{channel.description}</p>
        )}

        <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
          <span className="inline-flex h-10 items-center gap-2 px-3 text-sm font-medium text-[var(--text-muted)]">
            <Users size={16} aria-hidden="true" />
            {channel._count.subscribers.toLocaleString('en-US')} {channel._count.subscribers === 1 ? 'Verifier' : 'Verifiers'}
          </span>

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
            <ButtonLink href={`/channels/${channel.slug}/settings`} variant="secondary" icon={<Settings size={16} aria-hidden="true" />}>
              Manage channel
            </ButtonLink>
          )}
        </div>
      </header>

      {/* NEW POST: posting happens right here in the channel */}
      {currentUserId && (
        <section aria-label="New post" className="relative mb-6 overflow-hidden rounded-[var(--radius-card)] border border-[var(--glass-border)] bg-[var(--glass-card)] p-4 shadow-[var(--glass-shadow)]">
          {channel.isLocked && <LockedOverlay message="New posts are disabled while this channel is under review." />}
          <CreatePostForm
            channelId={channel.id}
            userImage={session?.user?.image}
            username={session?.user?.username || 'user'}
            linkedWallet={session?.user?.walletAddress}
          />
        </section>
      )}

      {/* FEED STREAM */}
      <div className={styles.feedStream}>
        {formattedPosts.length === 0 ? (
          <EmptyState
            title="No posts yet"
            description={currentUserId ? "Be the first to post in this channel." : "Log in to start the conversation."}
          />
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

        {hasMore && show < MAX_SHOWN && (
          <div className="flex justify-center">
            <ButtonLink
              href={`/channels/${channel.slug}?show=${show + PAGE_SIZE}`}
              scroll={false}
              variant="secondary"
              icon={<ChevronDown size={16} aria-hidden="true" />}
            >
              Show more posts
            </ButtonLink>
          </div>
        )}
      </div>
    </div>
  );
}


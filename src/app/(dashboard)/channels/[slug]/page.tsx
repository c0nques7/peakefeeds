import { prisma } from '@/lib/db';
import { notFound } from 'next/navigation';
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth.config";
import { PostCard } from "@/components/PostCard";
import CreatePostForm from "@/components/posts/CreatePostForm";
import { SubscribeButton } from "@/components/SubscribeButton";

interface ChannelPageProps {
  params: Promise<{ slug: string }>;
}

export default async function ChannelPage({ params }: ChannelPageProps) {
  const { slug } = await params; 
  const session = await getServerSession(authOptions);
  const currentUserId = session?.user?.id;

  const channel = await prisma.channel.findUnique({
    where: { slug: slug },
    include: {
      posts: {
        orderBy: { createdAt: 'desc' },
        // 🆕 We can't use 'include' easily with specific column selects for counts 
        // without getting messy, so we use 'select' pattern or just rely on the mapped data below.
        // However, since we defined the columns on the model, 'include' fetches them by default!
        include: {
          author: true,
          channel: true,
          
          // Fetch Comments
          comments: {
            take: 50,
            orderBy: { createdAt: 'asc' },
            include: { author: { select: { id: true, username: true } } }
          },

          // Fetch User Status
          likes: currentUserId ? {
             where: { userId: currentUserId },
             select: { type: true }
          } : false,
          
          // Basic Counts
          _count: { select: { comments: true } }
        }
      },
      subscribers: {
        where: { userId: currentUserId },
        select: { userId: true }, 
        take: 1, 
      },
      _count: {
        select: { subscribers: true }
      }
    }
  });

  if (!channel) {
    notFound();
  }

  // 🛠️ TRANSFORM POSTS to use the new DB columns
  const formattedPosts = channel.posts.map((post) => {
      // @ts-ignore
      const userReaction = post.likes?.[0]?.type || null;
      return {
          ...post,
          _count: {
              comments: post._count.comments,
              likes: post.likesCount,       // 🆕 Use new DB Column
              dislikes: post.dislikesCount  // 🆕 Use new DB Column
          },
          currentUserReaction: userReaction
      }
  });

  const isSubscribedInitial = channel.subscribers.length > 0;
  const isCreator = channel.creatorId === currentUserId;

  return (
    <div className="min-h-screen pb-24 pt-4"> 
      <div className="max-w-5xl mx-auto px-4 mb-12"> 
        <div className="bg-sky-100/70 dark:bg-teal-950/70 backdrop-blur-xl border border-white/40 dark:border-white/10 rounded-[2rem] p-8 text-center shadow-xl">
          <h1 className="text-4xl font-extrabold tracking-tight text-gray-900 dark:text-white sm:text-5xl mb-2">{channel.name}</h1>
          <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">{channel.description}</p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-4">
             <div className="px-4 py-1.5 rounded-full bg-cyan-600/10 border border-cyan-600/20 text-cyan-600 dark:text-cyan-400 text-sm font-semibold">
                {channel._count.subscribers} Verifiers
             </div>
             {currentUserId && !isCreator && (
                <SubscribeButton channelId={channel.id} channelSlug={channel.slug} isSubscribedInitial={isSubscribedInitial} />
             )}
             {isCreator && (
                <span className="px-4 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-sm font-bold">
                    You are the Creator
                </span>
             )}
          </div>
        </div>
      </div>

      <main className="max-w-5xl mx-auto px-4">
        {currentUserId && 
            <div className="mb-12 bg-cyan-100/90 dark:bg-cyan-900/50 rounded-2xl p-4 shadow-lg">
                <CreatePostForm channelId={channel.id} />
            </div>
        }

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {formattedPosts.length === 0 ? (
                <div className="col-span-full p-16 border-2 border-dashed border-gray-400/30 rounded-3xl text-center text-gray-500 bg-white/20 dark:bg-white/5">
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
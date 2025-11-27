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
  const currentUserId = session?.user?.id || '';

  const channel = await prisma.channel.findUnique({
    where: { slug: slug },
    include: {
      posts: {
        orderBy: { createdAt: 'desc' },
        include: {
          author: true,
          channel: true, 
          _count: { select: { comments: true, likes: true } },
          comments: {
            take: 3,
            orderBy: { createdAt: 'desc' },
            include: { author: { select: { username: true } } }
          }
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

  const isSubscribedInitial = channel.subscribers.length > 0;
  const isCreator = channel.creatorId === currentUserId;

  return (
    <div className="min-h-screen pb-24 pt-4"> 
      
      {/* --- CHANNEL HEADER (Glass Card: Allows Background Gradient Show-Through) --- */}
      <div className="max-w-5xl mx-auto px-4 mb-12"> 
        {/* NEW COLOR: bg-white/40 (Light) | dark:bg-black/40 (Dark) - Returning to lighter transparency for better gradient viewing */}
        <div className="bg-white/40 dark:bg-black/40 backdrop-blur-xl border border-white/40 dark:border-white/10 rounded-[2rem] p-8 text-center shadow-xl">
          
          <h1 className="text-4xl font-extrabold tracking-tight text-gray-900 dark:text-white sm:text-5xl mb-2">
            {channel.name}
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">{channel.description}</p>
          
          <div className="mt-6 flex flex-wrap items-center justify-center gap-4">
             
             {/* Stat Badge - Uses ACCENT PRIMARY (Fuchsia/Pink) for theme consistency */}
             <div className="px-4 py-1.5 rounded-full bg-pink-600/10 border border-pink-600/20 text-pink-600 dark:text-pink-400 text-sm font-semibold">
                {channel._count.subscribers} Verifiers
             </div>

             {/* Action Button - Uses ACCENT PRIMARY (Fuchsia/Pink) for theme consistency */}
             {currentUserId && !isCreator && (
                <SubscribeButton
                    channelId={channel.id}
                    channelSlug={channel.slug}
                    isSubscribedInitial={isSubscribedInitial}
                />
             )}
             
             {isCreator && (
                <span className="px-4 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-sm font-bold">
                    You are the Creator
                </span>
             )}
          </div>
        </div>
      </div>

      {/* --- MAIN FEED --- */}
      <main className="max-w-5xl mx-auto px-4">
        
        {/* Composer - Uses a light, visible accent color (CYAN/Secondary) for distinction */}
        {currentUserId && 
            <div className="mb-12 bg-cyan-100/70 dark:bg-cyan-900/50 rounded-2xl p-4 shadow-lg">
                <CreatePostForm channelId={channel.id} />
            </div>
        }

        {/* Post Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {channel.posts.length === 0 ? (
                <div className="col-span-full p-16 border-2 border-dashed border-gray-400/30 rounded-3xl text-center text-gray-500 bg-white/20 dark:bg-white/5">
                  <p className="text-lg font-medium">No verified truth here yet.</p>
                  <p className="text-sm opacity-70">Be the first to post.</p>
                </div>
            ) : (
                channel.posts.map(post => (
                    <PostCard 
                        key={post.id} 
                        post={{...post, mediaUrl: post.mediaUrl || null}} 
                    />
                ))
            )}
        </div>
      </main>
    </div>
  );
}
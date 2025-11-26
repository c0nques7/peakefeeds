import { prisma } from '@/lib/db';
import { notFound } from 'next/navigation';
import { getServerSession } from "next-auth"; // 👈 NextAuth v4
import { authOptions } from "@/lib/auth.config"; // 👈 Your config
import { PostCard } from "@/components/PostCard";
import CreatePostForm from "@/components/posts/CreatePostForm";
import { SubscribeButton } from "@/components/SubscribeButton"; // 👈 NEW IMPORT

interface ChannelPageProps {
  params: Promise<{ slug: string }>;
}

export default async function ChannelPage({ params }: ChannelPageProps) {
  const { slug } = await params; 
  
  // 1. Get Session/User ID (Server Side)
  const session = await getServerSession(authOptions);
  const currentUserId = session?.user?.id || '';

  // 2. Fetch Channel Data with Subscription Status Check
  const channel = await prisma.channel.findUnique({
    where: { slug: slug },
    include: {
      posts: {
        orderBy: { createdAt: 'desc' },
        include: {
          author: true,
          channel: true, 
          _count: { select: { comments: true, likes: true } }
        }
      },
      // 💡 Check if the CURRENT USER has a subscription record
      subscribers: {
        where: { userId: currentUserId },
        select: { userId: true }, // Only need to check if a record exists
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

  // 3. Determine Initial State
  const isSubscribedInitial = channel.subscribers.length > 0;
  const isCreator = channel.creatorId === currentUserId;

  return (
    <div className="min-h-screen bg-black text-white pb-24">
      
      {/* Channel Header */}
      <div className="bg-white/5 border-b border-white/10 pt-24 pb-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl mx-auto text-center">
          <h1 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
            #{channel.name}
          </h1>
          <p className="mt-2 text-lg text-gray-400">{channel.description}</p>
          
          <div className="mt-4 inline-flex items-center gap-4">
             <div className="px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-sm">
                <span>{channel._count.subscribers} Verifiers</span>
             </div>

             {/* 👇 RENDER THE BUTTON HERE (Only if logged in and not the creator) */}
             {currentUserId && !isCreator && (
                <SubscribeButton
                    channelId={channel.id}
                    channelSlug={channel.slug}
                    isSubscribedInitial={isSubscribedInitial}
                />
             )}
             
             {isCreator && (
                <span className="px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm font-semibold">
                    You are the Creator
                </span>
             )}
          </div>
        </div>
      </div>

      {/* Main Feed Area */}
      <main className="max-w-2xl mx-auto py-8 px-4">
        
        {/* Only show the composer if the user is logged in */}
        {currentUserId && <CreatePostForm channelId={channel.id} />}

        {/* Post List */}
        <div className="space-y-6">
            {channel.posts.length === 0 ? (
                <div className="p-12 border border-dashed border-gray-800 rounded-2xl text-center text-gray-500">
                  <p>No verified truth here yet.</p>
                </div>
            ) : (
                channel.posts.map(post => (
                    <PostCard key={post.id} post={post} />
                ))
            )}
        </div>
      </main>
    </div>
  );
}
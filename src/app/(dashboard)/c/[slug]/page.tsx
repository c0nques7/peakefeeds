import { prisma } from '@/lib/db';
import { notFound } from 'next/navigation';
import { PostCard } from "@/components/PostCard";
import CreatePostForm from "@/components/posts/CreatePostForm";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth.config";

interface ChannelPageProps {
  params: Promise<{ slug: string }>;
}

export default async function ChannelPage({ params }: ChannelPageProps) {
  const { slug } = await params;
  const session = await getServerSession(authOptions);

  const channel = await prisma.channel.findUnique({
    where: { slug },
    include: {
      posts: {
        orderBy: { createdAt: 'desc' },
        include: {
          author: true,
          channel: true,
          
          // 1. Get Counts (for the heart/bubble icons)
          _count: { select: { comments: true, likes: true } },

          // 2. 👇 FIX: Actually fetch the comments array for the drawer
          comments: {
            orderBy: { createdAt: 'desc' },
            include: {
                author: {
                    select: { username: true } // Only need username for UI
                }
            }
          }
        }
      },
      _count: {
        select: { subscribers: true }
      }
    }
  });

  if (!channel) notFound();

  return (
    <div className="min-h-screen bg-black text-white pb-24">
      
      {/* Channel Header */}
      <div className="bg-white/5 border-b border-white/10 pt-24 pb-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl mx-auto text-center">
          <h1 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
            #{channel.name}
          </h1>
          <p className="mt-2 text-lg text-gray-400">{channel.description}</p>
          <div className="mt-4 inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-sm">
             <span>{channel._count.subscribers} Verifiers</span>
          </div>
        </div>
      </div>

      {/* Main Feed Area */}
      <main className="max-w-2xl mx-auto py-8 px-4">
        
        <CreatePostForm channelId={channel.id} />

        <div className="space-y-6">
            {channel.posts.length === 0 ? (
                <div className="p-12 border border-dashed border-gray-800 rounded-2xl text-center text-gray-500">
                  <p>No verified truth here yet.</p>
                  <p className="text-sm">Be the first to post.</p>
                </div>
            ) : (
                channel.posts.map(post => (
                    <PostCard 
                        key={post.id} 
                        // We don't need to manually pass comments: [] anymore
                        // because the query above now guarantees it exists.
                        post={post}
                        currentUserId={session?.user?.id} 
                    />
                ))
            )}
        </div>
      </main>
    </div>
  );
}
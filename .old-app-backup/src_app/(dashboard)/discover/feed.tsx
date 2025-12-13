import { getGlobalFeed } from "@/lib/feed-service";
import { PostCard } from "@/components/PostCard";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth.config";

export default async function GlobalFeed() {
  const session = await getServerSession(authOptions);
  const currentUserId = session?.user?.id;

  // ⚡ Fetch Global Feed
  const posts = await getGlobalFeed(currentUserId);

  if (!posts || posts.length === 0) {
    // Return a single item that spans all columns
    return (
      <div className="col-span-full p-12 text-center text-[var(--text-muted)] border border-dashed border-[var(--glass-border)] rounded-3xl bg-[var(--glass-card)]">
        <p className="text-lg font-medium">No posts found.</p>
        <p className="text-sm opacity-70">The truth layer is quiet right now.</p>
      </div>
    );
  }

  // ⚡️ FIX: Return a Fragment so cards are direct children of the Grid
  return (
    <>
      {posts.map((post) => (
        <PostCard 
          key={post.id} 
          // We can pass 'post' directly now because types match
          post={post}
          initialReaction={post.currentUserReaction}
        />
      ))}
    </>
  );
}
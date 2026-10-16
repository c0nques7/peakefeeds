import { getGlobalFeed } from "@/lib/feed-service";
import { PostCard } from "@/components/PostCard";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth.config";
import { EmptyState } from "@/components/ui";

export default async function GlobalFeed() {
  const session = await getServerSession(authOptions);
  const currentUserId = session?.user?.id;

  // ⚡ Fetch Global Feed
  const posts = await getGlobalFeed(currentUserId);

  if (!posts || posts.length === 0) {
    // Return a single item that spans all columns
    return (
      <EmptyState title="No posts yet" description="Posts from every channel will show up here." />
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
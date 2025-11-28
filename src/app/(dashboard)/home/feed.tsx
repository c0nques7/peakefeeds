import { getGlobalFeed } from "@/lib/feed-service";
import { PostCard } from "@/components/PostCard";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth.config";
import styles from "../dashboard.module.css"; // Matches your existing import path

export default async function Feed() {
  // 1. Get Session so we know if the user liked the posts
  const session = await getServerSession(authOptions);
  const currentUserId = session?.user?.id;

  // 2. Fetch Data (This is the slow part that we want to suspend)
  const posts = await getGlobalFeed(currentUserId);

  // 3. Render the Grid
  return (
    <div className={styles.postsGrid}>
      {posts.length > 0 ? (
        posts.map((post) => (
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
      ) : (
        <div className="col-span-full p-12 text-center text-[var(--text-muted)]">
          <p>No posts found. Be the first to post!</p>
        </div>
      )}
    </div>
  );
}
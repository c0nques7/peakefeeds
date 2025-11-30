import { getGlobalFeed } from "@/lib/feed-service";
import { PostCard } from "@/components/PostCard";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth.config";
import styles from "../dashboard.module.css";

export default async function GlobalFeed() {
  const session = await getServerSession(authOptions);
  const currentUserId = session?.user?.id;

  // ⚡ Fetch Global Feed
  const posts = await getGlobalFeed(currentUserId);

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
          <p>No posts found.</p>
        </div>
      )}
    </div>
  );
}
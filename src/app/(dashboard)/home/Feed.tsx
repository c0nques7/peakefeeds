// src/app/home/Feed.tsx

import { getGlobalFeed } from "@/lib/feed-service";
import { PostCard } from "@/components/PostCard";
import { PostCardSkeleton } from "@/components/SkeletonLoader/PostCardSkeleton";
import styles from "./home.module.css";

/**
 * Renders the actual feed content after data is resolved.
 * This is still a Server Component, but separated for Suspense structuring.
 */
export default async function Feed() {
  // 💡 Note: This is where the long-running database call happens.
  const posts = await getGlobalFeed(); 

  return (
    <div className={styles.postsGrid}>
      {posts.length > 0 ? (
        posts.map((post) => (
          <PostCard key={post.id} post={post} />
        ))
      ) : (
        <div className={styles.emptyState}>
          <p>No posts found. Be the first to post!</p>
        </div>
      )}
    </div>
  );
}


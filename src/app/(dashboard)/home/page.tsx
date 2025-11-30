import { getPersonalFeed } from "@/lib/feed-service";
import { PostCard } from "@/components/PostCard";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth.config";
import Link from "next/link";
import styles from "../dashboard.module.css";

export default async function PersonalFeed() {
  const session = await getServerSession(authOptions);
  const currentUserId = session?.user?.id;

  if (!currentUserId) {
     return (
        <div className="col-span-full p-12 text-center text-[var(--text-muted)]">
          <p>Please log in to view your feed.</p>
        </div>
     );
  }

  // ⚡ Fetch Personal Feed
  const posts = await getPersonalFeed(currentUserId);

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
        <div className="col-span-full flex flex-col items-center justify-center p-12 text-center text-[var(--text-muted)] border border-dashed border-[var(--glass-border)] rounded-3xl bg-[var(--glass-card)]">
          <p className="text-lg font-medium mb-2">Your feed is empty.</p>
          <p className="text-sm opacity-70 mb-6">Subscribe to channels to see their truth here.</p>
          <Link href="/discover" className="px-6 py-2 rounded-full bg-[var(--accent-primary)] text-white font-bold text-sm hover:opacity-90 transition-opacity">
            Go to Discover
          </Link>
        </div>
      )}
    </div>
  );
}
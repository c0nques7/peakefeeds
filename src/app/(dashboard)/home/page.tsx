// 1. Import the type definition
import { getPersonalFeed, type FeedPost } from "@/lib/feed-service"; 
import { PostCard } from "@/components/PostCard";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth.config";
import Link from "next/link";
import { SearchBar } from "@/components/SearchBar"; 
import styles from "../../(dashboard)/dashboard.module.css";

export default async function PersonalFeed() {
  const session = await getServerSession(authOptions);
  const currentUserId = session?.user?.id;

  if (!currentUserId) {
    return (
      <div className={styles.feedWrapper}>
        <div className="mb-8 w-full pt-4 relative z-20">
            <SearchBar />
        </div>
        <div className={styles.feedStream}>
          <div className="col-span-full p-12 text-center text-[var(--text-muted)] border border-dashed border-[var(--glass-border)] rounded-3xl bg-[var(--glass-card)]">
            <p className="text-lg font-medium mb-2">Please log in.</p>
            <p className="text-sm opacity-70">Sign in to view your personalized feed.</p>
          </div>
        </div>
      </div>
    );
  }

  // ⚡️ FIX: Explicitly type the array so TypeScript knows what to expect
  let posts: FeedPost[] = [];
  
  try {
    posts = await getPersonalFeed(currentUserId);
  } catch (error) {
    console.error("Failed to fetch personal feed:", error);
  }

  return (
    <div className={styles.feedWrapper}>
      <div className="mb-8 w-full pt-4 relative z-20">
        <SearchBar />
      </div>

      <div className={styles.feedStream}>
        {(!posts || posts.length === 0) ? (
          <div className="col-span-full flex flex-col items-center justify-center p-12 text-center text-[var(--text-muted)] border border-dashed border-[var(--glass-border)] rounded-3xl bg-[var(--glass-card)]">
            <p className="text-lg font-medium mb-2">Your feed is empty.</p>
            <p className="text-sm opacity-70 mb-6">Subscribe to channels to see their truth here.</p>
            <Link href="/discover" className="px-6 py-2 rounded-full bg-[var(--accent-primary)] text-white font-bold text-sm hover:opacity-90 transition-opacity">
              Go to Discover
            </Link>
          </div>
        ) : (
          posts.map((post) => (
            <PostCard 
                key={post.id} 
                post={post} 
                initialReaction={post.currentUserReaction}
                currentUserId={currentUserId} // 🟢 ADDED THIS
            />
          ))
        )}
      </div>
    </div>
  );
}
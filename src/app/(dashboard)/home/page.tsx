import { getPersonalFeed, type FeedPost } from "@/lib/feed-service"; 
import { PostCard } from "@/components/PostCard";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth.config";
import Link from "next/link";
import { SearchBar } from "@/components/SearchBar"; 
import styles from "../../(dashboard)/dashboard.module.css"; // 🟢 Ensure path is correct

export default async function PersonalFeed() {
  const session = await getServerSession(authOptions);
  const currentUserId = session?.user?.id;

  // 1. GUEST VIEW
  if (!currentUserId) {
    return (
      <div className={styles.feedWrapper}>
        <div className="mb-8 w-full pt-4 sticky top-4 z-30">
            <SearchBar />
        </div>
        <div className={styles.feedStream}>
          <div className="flex flex-col items-center justify-center p-12 text-center text-[var(--text-muted)] border border-dashed border-[var(--glass-border)] rounded-3xl bg-[var(--glass-card)]">
            <div className="w-12 h-12 rounded-full bg-[var(--glass-border)] flex items-center justify-center mb-4">
                <span className="text-2xl">🔒</span>
            </div>
            <p className="text-lg font-bold text-[var(--text-primary)] mb-2">Member Access Only</p>
            <p className="text-sm opacity-70 mb-6 max-w-xs mx-auto">
                Sign in to view your personalized feed and interact with the Truth Layer.
            </p>
            <Link href="/signin" className="px-8 py-3 rounded-full bg-[var(--accent-primary)] text-white font-bold text-sm hover:opacity-90 transition-all shadow-lg hover:shadow-xl">
              Sign In
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // 2. FETCH DATA
  let posts: FeedPost[] = [];
  try {
    posts = await getPersonalFeed(currentUserId);
  } catch (error) {
    console.error("Failed to fetch personal feed:", error);
  }

  // 3. RENDER FEED
  return (
    <div className={styles.feedWrapper}>
      <div className={styles.searchWrapper}>
                <SearchBar />
            </div>
      <div className={styles.feedStream}>
        {(!posts || posts.length === 0) ? (
          <div className="flex flex-col items-center justify-center p-16 text-center text-[var(--text-muted)] border border-dashed border-[var(--glass-border)] rounded-3xl bg-[var(--glass-card)] animate-in fade-in zoom-in-95 duration-500">
            <div className="w-16 h-16 rounded-2xl bg-[var(--glass-border)] flex items-center justify-center mb-6">
                 <span className="text-3xl grayscale opacity-50">📡</span>
            </div>
            <h3 className="text-xl font-bold text-[var(--text-primary)] mb-2">Your feed is quiet</h3>
            <p className="text-sm opacity-70 mb-8 max-w-sm mx-auto leading-relaxed">
                It looks like you haven't subscribed to any channels yet. 
                Explore the network to start building your graph.
            </p>
            <Link href="/discover" className="px-6 py-3 rounded-full bg-gradient-to-r from-[var(--grad-start)] to-[var(--grad-end)] text-white font-bold text-sm hover:scale-105 transition-transform shadow-lg">
              Explore Channels
            </Link>
          </div>
        ) : (
          posts.map((post) => (
            <div key={post.id} className="animate-in slide-in-from-bottom-4 duration-700 fade-in">
                <PostCard 
                    post={post} 
                    initialReaction={post.currentUserReaction}
                    currentUserId={currentUserId}
                />
            </div>
          ))
        )}
      </div>
    </div>
  );
}
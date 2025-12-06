import { getPersonalFeed } from "@/lib/feed-service";
import { PostCard } from "@/components/PostCard";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth.config";
import Link from "next/link";
import styles from "../dashboard.module.css"; // Ensure this path points to your CSS file

export default async function PersonalFeed() {
  const session = await getServerSession(authOptions);
  const currentUserId = session?.user?.id;

  // 1. Auth Guard (Not Logged In)
  if (!currentUserId) {
    return (
      <div className={styles.feedWrapper}>
        <div className={styles.feedStream}>
          {/* Wrapper ensures grid context exists so col-span-full works */}
          <div className="col-span-full p-12 text-center text-[var(--text-muted)] border border-dashed border-[var(--glass-border)] rounded-3xl bg-[var(--glass-card)]">
            <p className="text-lg font-medium mb-2">Please log in.</p>
            <p className="text-sm opacity-70">Sign in to view your personalized feed.</p>
          </div>
        </div>
      </div>
    );
  }

  // 2. Data Fetching
  let posts = [];
  try {
    posts = await getPersonalFeed(currentUserId);
  } catch (error) {
    console.error("Failed to fetch personal feed:", error);
    return (
      <div className={styles.feedWrapper}>
        <div className={styles.feedStream}>
          <div className="col-span-full p-12 text-center text-red-400 border border-red-500/20 rounded-3xl bg-red-500/5">
            <p>Unable to load feed at this time.</p>
          </div>
        </div>
      </div>
    );
  }

  // 3. Empty State (Logged in but no posts)
  if (!posts || posts.length === 0) {
    return (
      <div className={styles.feedWrapper}>
        <div className={styles.feedStream}>
          <div className="col-span-full flex flex-col items-center justify-center p-12 text-center text-[var(--text-muted)] border border-dashed border-[var(--glass-border)] rounded-3xl bg-[var(--glass-card)]">
            <p className="text-lg font-medium mb-2">Your feed is empty.</p>
            <p className="text-sm opacity-70 mb-6">
              Subscribe to channels to see their truth here.
            </p>
            <Link
              href="/discover"
              className="px-6 py-2 rounded-full bg-[var(--accent-primary)] text-white font-bold text-sm hover:opacity-90 transition-opacity"
            >
              Go to Discover
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // 4. Render Feed
  return (
    <div className={styles.feedWrapper}>
      <div className={styles.feedStream}>
        {posts.map((post) => (
          <PostCard
            key={post.id}
            // ⚡️ Simplified: types now match perfectly (String -> String)
            post={post}
            initialReaction={post.currentUserReaction}
          />
        ))}
      </div>
    </div>
  );
}
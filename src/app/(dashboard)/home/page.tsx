import { getPersonalFeed, type FeedPost } from "@/lib/feed-service"; 
import { PostCard } from "@/components/PostCard";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth.config";
import { Lock, Radio } from "lucide-react";
import { SearchBar } from "@/components/SearchBar";
import { ButtonLink, EmptyState } from "@/components/ui";
import styles from "../dashboard.module.css";

export default async function PersonalFeed() {
  const session = await getServerSession(authOptions);
  const currentUserId = session?.user?.id;

  // 1. GUEST VIEW
  if (!currentUserId) {
    return (
      <div className={styles.feedWrapper}>
        <div className={styles.searchWrapper}>
          <SearchBar />
        </div>
        <EmptyState
          icon={<Lock size={22} aria-hidden="true" />}
          title="Log in to see your feed"
          description="Your feed shows posts from the channels you subscribe to."
          action={<ButtonLink href="/login">Log in</ButtonLink>}
        />
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
          <EmptyState
            icon={<Radio size={22} aria-hidden="true" />}
            title="Your feed is empty"
            description="Follow channels and their posts will show up here. Find some on Discover, or search for a topic or tag above."
            action={<ButtonLink href="/discover">Explore channels</ButtonLink>}
          />
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
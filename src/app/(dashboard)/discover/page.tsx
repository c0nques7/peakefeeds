import GlobalFeed from "./feed";
import { ChannelsToFollow } from "./ChannelsToFollow";
import { Suspense } from "react";
import { SearchBar } from "@/components/SearchBar";
import { PostCardSkeleton } from "@/components/SkeletonLoader/PostCardSkeleton";
import { PageHeader } from "@/components/ui";
import styles from "../dashboard.module.css";

export default function DiscoverPage() {
  return (
    <div className={styles.feedWrapper}>
      <div className={styles.searchWrapper}>
        <SearchBar />
      </div>

      <PageHeader title="Discover" description="Find channels to follow and the latest posts from every channel." />

      <Suspense fallback={null}>
        <ChannelsToFollow />
      </Suspense>

      <div className={styles.feedStream}>
        <Suspense fallback={<PostCardSkeleton count={6} />}>
          <GlobalFeed />
        </Suspense>
      </div>
    </div>
  )
}

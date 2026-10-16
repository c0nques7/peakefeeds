import GlobalFeed from "./feed";
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

      <PageHeader title="Discover" description="The latest posts from every channel." />

      <div className={styles.feedStream}>
        <Suspense fallback={<PostCardSkeleton count={6} />}>
          <GlobalFeed />
        </Suspense>
      </div>
    </div>
  )
}

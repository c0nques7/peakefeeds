import GlobalFeed from "./feed";
import { Suspense } from "react";
import { SearchBar } from "@/components/SearchBar";
import { PostCardSkeleton } from "@/components/SkeletonLoader/PostCardSkeleton";
import styles from "../../(dashboard)/dashboard.module.css"; 

export default function DiscoverPage() {
  return (
    <div className={styles.feedWrapper}>

        {/* Search Bar */}
       <div className={styles.searchWrapper}>
                <SearchBar />
        </div>
        <section className="relative z-10">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-[var(--text-primary)]">
                    Live Content From the Peake
                </h2>
                <div className="text-xs font-mono px-3 py-1 rounded-full border border-[var(--accent-secondary)] text-[var(--accent-secondary)] bg-[var(--accent-secondary)]/10">
                    Discover
                </div>
            </div>

            {/* Feed Stream */}
            <div className={styles.feedStream}>
                <Suspense fallback={<PostCardSkeleton count={6} />}>
                    <GlobalFeed />
                </Suspense>
            </div>
            
        </section>
    </div>
  )
}

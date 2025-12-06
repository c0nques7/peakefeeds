import GlobalFeed from "./feed";
import { Suspense } from "react";
import { SearchBar } from "@/components/SearchBar";
import { PostCardSkeleton } from "@/components/SkeletonLoader/PostCardSkeleton";

// ⚡️ SHARED LAYOUT STYLES
// Adjust this path if your dashboard.module.css is located elsewhere
import styles from "../../(dashboard)/dashboard.module.css"; 

export default function DiscoverPage() {
  return (
    // ⚡️ LAYOUT WRAPPER (Full Width + Sidebar Offsets)
    <div className={styles.feedWrapper}>
        
        {/* Background Layers */}
        <div className={styles.backgroundLayer}>
            <div className={styles.orbTeal} />
            <div className={styles.orbPurple} />
        </div>

        {/* Search Bar - Spans Full Width */}
        <div className="mb-8 relative z-10 w-full pt-6">
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

            {/* ⚡️ FEED STREAM (Responsive Grid) 
               This applies the 1-column (mobile) to 5-column (4k) logic.
               Ensure <GlobalFeed /> returns a Fragment of items, not a wrapping div.
            */}
            <div className={styles.feedStream}>
                <Suspense fallback={<PostCardSkeleton count={6} />}>
                    <GlobalFeed />
                </Suspense>
            </div>
            
        </section>
    </div>
  )
}
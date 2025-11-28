import { Suspense } from "react";
import { SearchBar } from "@/components/SearchBar";
import Feed from "./feed"; // This imports the async component we just created
import { PostCardSkeleton } from "@/components/SkeletonLoader/PostCardSkeleton";
import styles from "../dashboard.module.css";

export default function HomePage() {
  return (
    <div className="max-w-5xl mx-auto pt-6 px-4 relative">
        
        {/* 🌬️ ANIMATED BACKGROUND */}
        <div className={styles.backgroundLayer}>
            <div className={styles.orbTeal} />
            <div className={styles.orbPurple} />
        </div>

        <div className="mb-8 relative z-10">
            <SearchBar />
        </div>

        <section className="relative z-10">
            <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-[var(--text-primary)]">
                    Live Content At The Peake
                </h2>
                <div className="text-xs font-mono px-3 py-1 rounded-full border border-[var(--accent-secondary)] text-[var(--accent-secondary)] bg-[var(--accent-secondary)]/10">
                    Live
                </div>
            </div>

            {/* 🚀 SUSPENSE BOUNDARY 
                1. Shows <PostCardSkeleton /> immediately.
                2. Swaps to <Feed /> (the post grid) once data is ready.
            */}
            <Suspense fallback={<PostCardSkeleton count={6} />}>
                <Feed />
            </Suspense>
            
        </section>
    </div>
  )
}
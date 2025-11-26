import { getGlobalFeed } from "@/lib/feed-service"
import { PostCard } from "@/components/PostCard"
import { SearchBar } from "@/components/SearchBar"
// 🛑 REMOVED: MobileBottomNav (Handled by Layout)
// 🛑 REMOVED: Sidebar (Handled by Layout)
import styles from "../dashboard.module.css"

export default async function HomePage() {
  const posts = await getGlobalFeed()

  return (
    // We just return the content now, no layout wrappers needed here
    <div className="max-w-5xl mx-auto pt-6 px-4">
        <div className="mb-8">
            <SearchBar />
        </div>

        <section>
            <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Fresh Content</h2>
                <div className="text-xs font-mono px-3 py-1 rounded-full border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10">
                    Live
                </div>
            </div>

            <div className={styles.postsGrid}>
                {posts.length > 0 ? (
                    posts.map((post) => (
                        // @ts-expect-error - MediaURL fix pending
                        <PostCard key={post.id} post={{...post, mediaUrl: null}} />
                    ))
                ) : (
                    <div className="p-12 text-center text-gray-500">
                        <p>No posts found.</p>
                    </div>
                )}
            </div>
        </section>
    </div>
  )
}
import { getGlobalFeed } from "@/lib/feed-service"
import { PostCard } from "@/components/PostCard"
import { SearchBar } from "@/components/SearchBar"
import Link from "next/link"
import { Compass, LayoutGrid, LogOut, User, Plus } from "lucide-react" 
import styles from '@/app/(dashboard)/home/home.module.css';

export default async function HomePage() {
  // 1. Server-Side Data Fetching
  const posts = await getGlobalFeed()

  return (
    <main className={styles.dashboard}>
        
        {/* === MOBILE HEADER (Fixed Top) === */}
        <div className={styles.mobileHeader}>
            {/* Clean & Simple: Just the Brand Name */}
            <h1 className={styles.brand}>PeakeFeeds</h1>
        </div>

        {/* === DESKTOP SIDEBAR (Hidden on Mobile) === */}
        <aside className={styles.sidebar}>
            <div className={styles.glassPanel}>
                <div className={styles.navHeader}>
                    <h1 className={styles.brand}>PeakeFeeds</h1> 
                </div>
                
                <nav className={styles.navMenu}>
                    <Link href="/home" className={`${styles.navItem} ${styles.navItemActive}`}>
                        <Compass size={20} />
                        <span>Discover</span>
                    </Link>
                    <Link href="/my-feed" className={styles.navItem}>
                        <LayoutGrid size={20} />
                        <span>My Feed</span>
                    </Link>
                    <Link href="/profile" className={styles.navItem}>
                        <User size={20} />
                        <span>Profile</span>
                    </Link>

                    {/* Desktop "Create Channel" Button */}
                    <Link href="/channels/create" className={styles.navItem}>
                        <div className="bg-indigo-600/20 p-1 rounded text-indigo-400">
                            <Plus size={16} />
                        </div> 
                        <span>Create Channel</span>
                    </Link>

                    <Link href="/api/auth/signout" className={styles.navItem}>
                        <LogOut size={20} />
                        <span>Sign Out</span>
                    </Link>
                </nav>
            </div>
            <div className={`${styles.glassPanel} text-sm`} style={{ color: 'var(--text-muted)' }}>
                <p>🔥 Trending: <strong>#Web3Auth</strong></p>
            </div>
        </aside>

        {/* === MAIN CONTENT AREA === */}
        <div className={styles.contentArea}>
            
            <div className={styles.searchSection}>
               <SearchBar />
            </div>

            <section className={styles.feedContainer}>
                <div className={styles.feedHeader}>
                    <h2 className={styles.feedTitle}>Fresh Content</h2>
                    
                    <div className="text-xs font-mono px-3 py-1 rounded-full border" 
                         style={{ 
                           color: 'var(--accent-primary)',
                           backgroundColor: 'var(--glass-card-hover)',
                           borderColor: 'var(--accent-primary)'
                         }}>
                      Live
                    </div>
                </div>

                <div className={styles.postsGrid}>
                    {posts.length > 0 ? (
                        posts.map((post) => (
                            <PostCard key={post.id} post={post} />
                        ))
                    ) : (
                        <div className={styles.emptyState}>
                            <p>No posts found. Be the first to post!</p>
                        </div>
                    )}
                </div>
            </section>
        </div>

        {/* === MOBILE BOTTOM NAV === */}
        {/* Handles the slide-up animation for "Create" actions */}

    </main>
  )
}


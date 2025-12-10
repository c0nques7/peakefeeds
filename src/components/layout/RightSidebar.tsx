import Link from "next/link";
import { ArrowUpRight, Hash, ShieldCheck } from "lucide-react";
import styles from "@/app/home/dashboard.module.css"; 

export function RightSidebar() {
  return (
    // 1. Use the CSS Module class for layout (Visibility, Fixed Position, Width)
    // 2. Use Tailwind for internal styling (Flex col, Padding, Glass effect)
    <aside className={`${styles.rightSidebar} flex flex-col gap-6 p-6 overflow-y-auto bg-[var(--glass-panel)] backdrop-blur-md`}>

       {/* --- BLOCK 1: TRENDING --- */}
       <div className="rounded-2xl p-4 border border-[var(--glass-border)] bg-[var(--glass-card)] shadow-sm">
          <h2 className="text-lg font-bold mb-4 flex items-center gap-2 text-[var(--text-primary)]">
            <ArrowUpRight size={20} className="text-[var(--accent-primary)]" /> Trending
          </h2>

          <div className="space-y-4">
            {['DeepfakeDetection', 'OptimismGrants', 'Ethereum', 'Identity'].map(tag => (
                <div key={tag} className="flex justify-between items-start group cursor-pointer hover:bg-[var(--glass-card-hover)] p-2 rounded-lg transition-colors">
                    <div>
                        <div className="text-sm font-bold text-[var(--text-secondary)] group-hover:text-[var(--accent-primary)] transition-colors">#{tag}</div>
                        <div className="text-[10px] text-[var(--text-muted)]">12.5k Posts</div>
                    </div>
                    <div className="p-1 rounded text-[var(--text-muted)]">
                        <Hash size={14} />
                    </div>
                </div>
            ))}
          </div>
       </div>

       {/* --- BLOCK 2: SUGGESTED CHANNELS --- */}
       <div className="rounded-2xl p-4 border border-[var(--glass-border)] bg-[var(--glass-card)] shadow-sm">
          <h2 className="text-lg font-bold mb-4 text-[var(--text-primary)]">Verified Channels</h2>

          <div className="space-y-4">
             {[
                 { name: 'Official News', slug: 'official-news' },
                 { name: 'Web3 Security', slug: 'web3-security' },
                 { name: 'Fact Checkers', slug: 'fact-checkers' }
             ].map(c => (
                 <Link href={`/channels/${c.slug}`} key={c.slug} className="flex items-center gap-3 group hover:bg-[var(--glass-card-hover)] p-2 rounded-lg transition-all">
                    <div className="h-8 w-8 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-500">
                        <ShieldCheck size={14} />
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold text-[var(--text-primary)] truncate">{c.name}</div>
                        <div className="text-[10px] text-[var(--text-muted)]">@{c.slug}</div>
                    </div>
                    <button className="text-xs bg-[var(--accent-secondary)] text-white px-3 py-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity font-bold">
                        Join
                    </button>
                 </Link>
             ))}
          </div>
       </div>

       {/* Footer */}
       <div className="text-[10px] text-[var(--text-muted)] flex flex-wrap gap-x-3 gap-y-1 px-2">
          <span className="hover:underline cursor-pointer">Terms</span>
          <span className="hover:underline cursor-pointer">Privacy</span>
          <span className="hover:underline cursor-pointer">© 2025 PeakeFeeds</span>
       </div>

    </aside>
  )
}
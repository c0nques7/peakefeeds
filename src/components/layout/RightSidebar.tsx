import Link from "next/link";
import { ArrowUpRight, Hash, ShieldCheck } from "lucide-react";

export function RightSidebar() {
  return (
    <div className="h-full p-6 w-[350px] hidden xl:flex flex-col gap-6 border-l sticky top-0 h-screen overflow-y-auto">
       
       {/* Search could technically go here on Desktop if you wanted to move it from the feed */}
       
       {/* --- BLOCK 1: TRENDING --- */}
       <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
          <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <ArrowUpRight size={20} className="text-indigo-400" /> Trending
          </h2>
          
          <div className="space-y-4">
            {['DeepfakeDetection', 'OptimismGrants', 'Ethereum', 'Identity'].map(tag => (
                <div key={tag} className="flex justify-between items-start group cursor-pointer">
                    <div>
                        <div className="text-sm font-bold text-gray-300 group-hover:text-indigo-400 transition-colors">#{tag}</div>
                        <div className="text-[10px] text-gray-500">12.5k Posts</div>
                    </div>
                    <div className="p-1 rounded hover:bg-white/10 text-gray-500">
                        <Hash size={14} />
                    </div>
                </div>
            ))}
          </div>
       </div>

       {/* --- BLOCK 2: SUGGESTED CHANNELS --- */}
       <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
          <h2 className="text-lg font-bold text-white mb-4">Verified Channels</h2>
          
          <div className="space-y-4">
             {[
                 { name: 'Official News', slug: 'official-news' },
                 { name: 'Web3 Security', slug: 'web3-security' },
                 { name: 'Fact Checkers', slug: 'fact-checkers' }
             ].map(c => (
                 <Link href={`/channels/${c.slug}`} key={c.slug} className="flex items-center gap-3 group">
                    <div className="h-8 w-8 rounded-full bg-gradient-to-br from-emerald-500/20 to-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                        <ShieldCheck size={14} />
                    </div>
                    <div className="flex-1">
                        <div className="text-sm font-semibold text-gray-200 group-hover:text-white">{c.name}</div>
                        <div className="text-[10px] text-gray-500">@{c.slug}</div>
                    </div>
                    <button className="text-xs bg-white/10 hover:bg-white/20 text-white px-3 py-1 rounded-full transition-colors">
                        Join
                    </button>
                 </Link>
             ))}
          </div>
       </div>

       {/* Footer Links */}
       <div className="text-[10px] text-gray-600 flex flex-wrap gap-x-3 gap-y-1 px-2">
          <span>Terms of Service</span>
          <span>Privacy Policy</span>
          <span>Cookie Policy</span>
          <span>© 2025 PeakeFeeds</span>
       </div>

    </div>
  )
}
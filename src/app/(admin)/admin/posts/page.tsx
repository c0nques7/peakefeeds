import { getAdminPosts } from "@/actions/admin-posts";
import Link from "next/link";
import { Search, Filter, MessageSquare, Heart, AlertTriangle } from "lucide-react";
import styles from "../admin.module.css"; // Reusing your existing admin CSS
import { PostActions } from "./_components/post-actions";

export default async function AdminPostsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; sort?: string; page?: string }>;
}) {
  const params = await searchParams;
  const query = params.q || "";
  const sort = params.sort || "latest";
  const page = Number(params.page) || 1;

  const { posts, totalPages } = await getAdminPosts({ query, sort, page });

  return (
    <div className="space-y-6">
      {/* HEADER & FILTERS */}
      <div className="flex flex-col md:flex-row gap-4 justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold text-white">Post Management</h1>
          <p className="text-[var(--text-muted)]">Moderate content, check reports, and manage feed safety.</p>
        </div>

        {/* Filter Toolbar */}
        <form className="flex flex-col md:flex-row gap-2 w-full md:w-auto">
          <div className="relative group w-full md:w-auto">
            <Search className="absolute left-3 top-2.5 text-[var(--text-muted)] group-focus-within:text-[var(--accent-primary)]" size={18} />
            <input
              name="q"
              defaultValue={query}
              placeholder="Search content or author..."
              className="pl-10 pr-4 py-2 bg-[var(--glass-panel)] border border-[var(--glass-border)] rounded-lg text-white placeholder:text-gray-500 focus:outline-none focus:border-[var(--accent-primary)] w-full md:w-64 transition-all"
            />
          </div>
          
          <select 
            name="sort" 
            defaultValue={sort}
            className="px-4 py-2 bg-[var(--glass-panel)] border border-[var(--glass-border)] rounded-lg text-white focus:outline-none focus:border-[var(--accent-primary)] appearance-none cursor-pointer w-full md:w-auto"
          >
            <option value="latest">Latest</option>
            <option value="oldest">Oldest</option>
            <option value="popular">Most Popular</option>
            <option value="reported">Most Reported</option>
          </select>

          <button type="submit" className="hidden">Submit</button>
        </form>
      </div>

      {/* DATA TABLE */}
      <div className={styles.tableWrapper}>
        <table className="w-full text-left border-collapse min-w-[800px] md:min-w-0">
          <thead>
            <tr>
              <th className={`p-4 ${styles.tableHeader} w-1/3`}>Content Preview</th>
              <th className={`p-4 ${styles.tableHeader}`}>Author</th>
              <th className={`p-4 ${styles.tableHeader}`}>Engagement</th>
              <th className={`p-4 ${styles.tableHeader}`}>Safety Status</th>
              <th className={`p-4 ${styles.tableHeader} text-right`}>Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--glass-border)]">
            {posts.map((post) => (
              <tr key={post.id} className={styles.tableRow}>
                
                {/* Content Preview */}
                <td className="p-4 align-top">
                  <div className="flex flex-col gap-1">
                    <p className="text-sm text-white line-clamp-2 leading-relaxed">
                      {post.content || <span className="italic text-gray-500">No text content (Media only)</span>}
                    </p>
                    <span className="text-xs text-[var(--text-muted)] font-mono">
                      ID: {post.id.slice(0, 8)}... • {new Date(post.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </td>

                {/* Author */}
                <td className="p-4 align-top">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-[var(--glass-border)] overflow-hidden">
                       {/* Optional: Add Next/Image here if you have one, falling back to initial */}
                       <div className="w-full h-full flex items-center justify-center bg-slate-800 text-xs font-bold text-white">
                          {post.author.username?.[0]?.toUpperCase() || "?"}
                       </div>
                    </div>
                    <div className="flex flex-col">
                      <span className="font-medium text-white text-sm">@{post.author.username || "Anon"}</span>
                      <span className="text-xs text-[var(--text-muted)]">{post.author.email}</span>
                    </div>
                  </div>
                </td>

                {/* Engagement */}
                <td className="p-4 align-top">
                  <div className="flex gap-4 text-xs text-[var(--text-muted)]">
                    <div className="flex items-center gap-1">
                        <Heart size={14} /> {post._count.likes}
                    </div>
                    <div className="flex items-center gap-1">
                        <MessageSquare size={14} /> {post._count.comments}
                    </div>
                  </div>
                </td>

                {/* Safety Status */}
                <td className="p-4 align-top">
                  <div className="flex flex-col gap-2">
                    {post._count.reports > 0 ? (
                      <span className={`${styles.badge} ${styles.badgeRed} flex items-center gap-1 w-fit`}>
                        <AlertTriangle size={12} />
                        {post._count.reports} Report{post._count.reports > 1 ? 's' : ''}
                      </span>
                    ) : (
                      <span className={`${styles.badge} ${styles.badgeGreen} w-fit`}>
                        Clean
                      </span>
                    )}
                    
                    <div className="flex flex-wrap gap-1">
                      {post.isVerified && (
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 uppercase">
                          Verified
                        </span>
                      )}
                      {post.isLocked && (
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 uppercase">
                          Locked
                        </span>
                      )}
                    </div>
                  </div>
                </td>

                {/* Actions */}
                <td className="p-4 align-top text-right">
                  <PostActions post={post} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        
        {posts.length === 0 && (
          <div className="p-12 text-center text-[var(--text-muted)]">
             <Filter size={48} className="mx-auto mb-4 opacity-20" />
             <p>No posts found matching your criteria.</p>
          </div>
        )}
      </div>

      {/* PAGINATION */}
      <div className="flex justify-between items-center text-sm text-[var(--text-muted)]">
        <span>Page {page} of {totalPages}</span>
        <div className="flex gap-2">
           {page > 1 && (
             <Link href={`?page=${page - 1}&q=${query}&sort=${sort}`} className="px-4 py-2 rounded-lg bg-[var(--glass-panel)] hover:bg-[var(--glass-card-hover)] transition-colors">Previous</Link>
           )}
           {page < totalPages && (
             <Link href={`?page=${page + 1}&q=${query}&sort=${sort}`} className="px-4 py-2 rounded-lg bg-[var(--glass-panel)] hover:bg-[var(--glass-card-hover)] transition-colors">Next</Link>
           )}
        </div>
      </div>
    </div>
  );
}
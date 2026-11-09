"use client";

import { useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { MessageSquare, FileText, Heart, Clock, X, ExternalLink, Shield } from "lucide-react";
import styles from "@/app/(admin)/admin/admin.module.css";
import Link from "next/link";

interface ActivityItem {
  id: string;
  type: string;
  content: string;
  date: Date;
  metadata: {
    postType?: string;
    postId?: string;
    postTitle?: string;
    channelSlug: string;
  };
}

export function ActivityLog({ activity }: { activity: ActivityItem[] }) {
  const [selectedItem, setSelectedItem] = useState<ActivityItem | null>(null);

  const getIcon = (type: string) => {
    switch (type) {
      case "POST": return <FileText size={14} className="text-blue-400" />;
      case "COMMENT": return <MessageSquare size={14} className="text-emerald-400" />;
      case "REACTION": return <Heart size={14} className="text-(--accent-primary)" />;
      default: return <Clock size={14} className="text-(--text-muted)" />;
    }
  };

  // Helper to get target ID for management and viewing
  const getPostId = (item: ActivityItem) => {
    if (item.type === "POST") return item.id;
    return item.metadata?.postId || null;
  };

  return (
    <>
      <div className={styles.glassPanel}>
        <div className="p-4 border-b border-(--glass-border)">
          <h3 className="font-bold text-(--text-primary) flex items-center gap-2">
            <Clock size={18} className="text-(--accent-primary)" />
            Recent Activity
          </h3>
        </div>
        <div className="p-0">
          {activity.length === 0 ? (
            <div className="p-8 text-center text-(--text-muted) italic">
              No recent activity found.
            </div>
          ) : (
            <div className="divide-y divide-(--glass-border)">
              {activity.map((item) => (
                <button
                  key={`${item.type}-${item.id}`}
                  onClick={() => setSelectedItem(item)}
                  className="w-full text-left p-4 hover:bg-(--glass-card-hover) transition-colors focus:outline-hidden focus:bg-(--glass-card-hover) focus:ring-2 focus:ring-inset focus:ring-(--accent-primary) group"
                  aria-label={`View details for ${item.type.toLowerCase()}`}
                >
                  <div className="flex items-start gap-3">
                    <div className="mt-1 p-2 rounded-sm bg-(--glass-panel) border border-(--glass-border) group-hover:border-(--accent-primary) transition-colors">
                      {getIcon(item.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-[10px] font-bold text-(--text-muted) uppercase tracking-wider">
                          {item.type}
                        </span>
                        <span className="text-[10px] text-(--text-muted)">
                          {formatDistanceToNow(new Date(item.date), { addSuffix: true })}
                        </span>
                      </div>
                      <p className="text-sm text-(--text-primary) line-clamp-2">
                        {item.type === "REACTION" ? (
                          <>Reacted {item.content.toLowerCase()} to <span className="italic font-medium">&quot;{item.metadata.postTitle}&quot;</span></>
                        ) : (
                          item.content
                        )}
                      </p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Detail Modal */}
      {selectedItem && (
        <div className="fixed inset-0 z-100 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div 
            className={`${styles.glassPanel} w-full max-w-lg shadow-2xl animate-in zoom-in-95 duration-200`}
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-title"
          >
            <div className="p-4 border-b border-(--glass-border) flex justify-between items-center">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-sm bg-(--glass-panel) border border-(--glass-border)">
                  {getIcon(selectedItem.type)}
                </div>
                <div>
                  <h3 id="modal-title" className="font-bold text-(--text-primary)">
                    {selectedItem.type === "REACTION" ? "Reaction Detail" : `${selectedItem.type.charAt(0) + selectedItem.type.slice(1).toLowerCase()} Detail`}
                  </h3>
                  <p className="text-[10px] text-(--text-muted) uppercase tracking-widest">
                    {new Date(selectedItem.date).toLocaleString()}
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setSelectedItem(null)}
                className="p-2 hover:bg-(--glass-card-hover) rounded-lg text-(--text-muted) hover:text-(--text-primary) transition-colors"
                aria-label="Close modal"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-(--text-muted) uppercase tracking-wider">Content</label>
                <div className="p-4 rounded-lg bg-black/20 border border-(--glass-border) text-(--text-primary) text-sm whitespace-pre-wrap leading-relaxed">
                  {selectedItem.type === "REACTION" ? (
                    <span>User reacted <strong>{selectedItem.content}</strong> to the post: &quot;{selectedItem.metadata.postTitle}&quot;</span>
                  ) : (
                    selectedItem.content
                  )}
                </div>
              </div>

              <div className="pt-4 border-t border-(--glass-border) flex flex-wrap gap-4 items-center justify-between">
                 <div className="text-[10px] text-(--text-muted) font-mono">
                   ID: {selectedItem.id}
                 </div>
                 
                 <div className="flex gap-4">
                   {getPostId(selectedItem) && (
                     <>
                       <Link 
                          href={`/admin/posts?search=${getPostId(selectedItem)}`}
                          className="flex items-center gap-2 text-xs font-bold text-(--accent-primary) hover:underline"
                          onClick={() => setSelectedItem(null)}
                       >
                          <Shield size={12} /> Manage in Admin
                       </Link>
                       <Link 
                          href={`/channels/${selectedItem.metadata.channelSlug}?highlight=${getPostId(selectedItem)}#post-${getPostId(selectedItem)}`}
                          target="_blank"
                          className="flex items-center gap-2 text-xs font-bold text-(--text-muted) hover:text-(--text-primary) hover:underline"
                       >
                          <ExternalLink size={12} /> View on Site
                       </Link>
                     </>
                   )}
                 </div>
              </div>
            </div>

            <div className="p-4 border-t border-(--glass-border) flex justify-end">
              <button
                onClick={() => setSelectedItem(null)}
                className="px-6 py-2 bg-(--glass-panel) hover:bg-(--glass-card-hover) text-(--text-primary) font-bold rounded-lg border border-(--glass-border) transition-all text-sm"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
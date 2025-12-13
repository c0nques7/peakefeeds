'use client'

import { useState } from 'react'
import { 
  MessageCircle, Heart, Share2, MoreHorizontal, 
  ShieldCheck, AlertCircle, X, Zap
} from 'lucide-react'
import clsx from 'clsx'

// ⚡️ Import your existing styles and components
import styles from '../PostCard/PostCard.module.css' 
import { PostEmbed } from '../PostCard/PostEmbed'

// ✅ FIX: Import the shared type from your new types file
import { VerificationMethod } from '@/lib/types'

// Keep hook-specific types here (unless you moved these to @/lib/types too)
import { LinkStatus, LinkMetadata } from '@/hooks/useLinkPreview' 

interface PostPreviewProps {
  content: string;
  verificationMethod: VerificationMethod;
  linkStatus: LinkStatus;
  linkMetadata?: LinkMetadata; 
  previewUrl?: string | null;  
  authorName?: string;
  authorHandle?: string;
  authorAvatar?: string;
  authorRole?: string;
}

// Helper: Role Badge
const RoleBadge = ({ role }: { role: string }) => {
    if (!role || role === 'STANDARD' || role === 'USER') return null;
    let label = role;
    let colorClass = "text-gray-400 bg-gray-500/10 border-gray-500/20"; 
    switch (role) {
        case 'ADMIN': label = 'ADMIN'; colorClass = "text-red-400 bg-red-500/10 border-red-500/20"; break;
        case 'MODERATOR': label = 'MOD'; colorClass = "text-orange-400 bg-orange-500/10 border-orange-500/20"; break;
    }
    return <span className={clsx("text-[10px] font-bold px-1.5 py-0.5 rounded-md border ml-2 align-middle", colorClass)}>{label}</span>;
};

export default function PostPreview({
  content,
  verificationMethod,
  linkStatus,
  linkMetadata,
  previewUrl,
  authorName = "Anon User",
  authorHandle = "anon",
  authorAvatar,
  authorRole = "USER"
}: PostPreviewProps) {
  
  const [isFlipped, setIsFlipped] = useState(false);

  const isVerified = verificationMethod === 'AD' || verificationMethod === 'WALLET';
  const isGold = verificationMethod === 'AD';
  
  const verificationColorClass = isGold ? "text-amber-400" : "text-emerald-400";
  const verificationBorderClass = isGold ? "border-amber-500/50" : ""; 

  // ⚡️ Strip the URL from the text preview so it looks like the final feed
  const displayContent = content; 

  return (
    <div className={styles.cardContainer}>
      <div className={clsx(styles.cardInner, isFlipped && styles.flipped)}>
        
        {/* ================= FRONT FACE ================= */}
        <div className={styles.cardFront}> 
          
          <div className={styles.header}>
            <div className={styles.authorInfo}>
                <div className={styles.avatar}>
                    {authorAvatar ? (
                        <img src={authorAvatar} className="w-full h-full object-cover" alt="avatar" /> 
                    ) : (
                        <span className="text-sm font-bold">{authorName[0]}</span>
                    )}
                </div>
                <div>
                    <div className="flex items-center">
                        <span className={styles.authorName}>@{authorHandle}</span>
                        <RoleBadge role={authorRole} />
                    </div>
                    <div className={styles.timestamp}>
                       <span>Just now</span>
                       <span className="mx-1">•</span>
                       <span className={styles.channelTag}>#preview</span>
                    </div>
                </div>
            </div>
            <div className="text-[var(--text-muted)] p-1"><MoreHorizontal size={18} /></div>
          </div>

          <div className={styles.contentWrapper}>
              <div className={styles.content}>
                  {displayContent || <span className="opacity-40 italic">Type something...</span>}
              </div>
          </div>

          {/* ⚡️ REAL EMBED COMPONENT */}
          {/* This delegates all logic to your existing system (Spotify/YT/Image/Link) */}
          {previewUrl && (
             <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
                <PostEmbed 
                  url={previewUrl} 
                  fallbackData={linkMetadata} // Used if it falls back to GenericLinkCard
                />
             </div>
          )}

          <div className="flex items-center justify-between pt-3 border-t border-[var(--glass-border)] mt-auto">
             <div className={styles.actionBar} style={{borderTop: 'none', marginTop: 0, paddingTop: 0}}>
                 <button className={styles.actionBtn} disabled><Heart size={18} /> <span>0</span></button>
                 <button className={styles.actionBtn} disabled><MessageCircle size={18} /> <span>0</span></button>
                 <button className={styles.actionBtn} disabled><Share2 size={18} /></button>
             </div>

             <button 
                type="button"
                onClick={(e) => { e.stopPropagation(); setIsFlipped(true); }} 
                className={clsx(
                    styles.verifyChip, 
                    !isVerified && styles.unverified,
                    isGold && verificationBorderClass
                )}
             >
                {isVerified ? (
                    <>
                        {isGold ? <Zap size={14} className="text-amber-400" /> : <ShieldCheck size={14} className="text-emerald-400" />}
                        <span className={verificationColorClass}>{isGold ? 'SPONSORED' : 'VERIFIED'}</span>
                    </>
                ) : (
                    <>
                        <AlertCircle size={14} />
                        <span>Unverified</span>
                    </>
                )}
             </button>
          </div>
        </div> 

        {/* ================= BACK FACE ================= */}
        <div className={styles.cardBack}>
             <button type="button" onClick={(e) => { e.stopPropagation(); setIsFlipped(false); }} className={styles.absoluteCloseBtn}><X size={20} /></button>
             <div className={styles.verificationContainer}>
                {isGold ? <Zap size={48} className="mb-4 text-amber-400" /> : <ShieldCheck size={48} className={clsx("mb-4", isVerified ? "text-emerald-400" : "text-[var(--text-muted)]")} />}
                <h3 className={styles.verifyTitle}>{isVerified ? (isGold ? "Sponsored Content" : "On-Chain Verification") : "Unverified Content"}</h3>
                <p className={styles.verifyText}>
                    {isVerified 
                        ? (isGold ? "This content is sponsored via Ad Watch." : "This content will be cryptographically signed on Optimism.")
                        : "This content lives off-chain and is not verified."}
                </p>
             </div>
        </div>

      </div>
    </div>
  )
}
'use client'

import { useMemo, useState } from 'react'
import Image from 'next/image'
import { ExternalLink, Loader2, Music, Video, MessageCircle } from 'lucide-react'
import clsx from 'clsx'
import { parseMediaUrl } from '@/lib/media-parser'
import { OEmbedPlayer } from './OEmbedPlayer'

// --- 1. SIMPLE REUSABLE FALLBACK ---
export const GenericLinkCard = ({ url, data, icon, label }: any) => (
  <a 
    href={url} 
    target="_blank" 
    rel="noopener noreferrer" 
    className="group relative z-10 flex mt-3 h-24 overflow-hidden rounded-xl border border-[var(--glass-border)] bg-[var(--glass-panel)] hover:bg-white/5 transition-all"
  >
      {data?.linkImage ? (
          <div className="w-24 h-full flex-shrink-0 relative">
              <Image 
                src={data.linkImage} 
                className="object-cover" 
                alt="" 
                fill
                sizes="96px"
              />
          </div>
      ) : (
          <div className="w-20 h-full flex-shrink-0 bg-[var(--surface-elevated)] flex items-center justify-center border-r border-[var(--glass-border)] text-[var(--text-muted)]">
               {icon || <ExternalLink size={24} />}
          </div>
      )}
      <div className="flex-1 p-3 min-w-0 flex flex-col justify-center">
          <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-[var(--text-muted)] mb-1">
              <span>{label || new URL(url).hostname.replace('www.','')}</span>
              <ExternalLink size={10} />
          </div>
          <h3 className="font-bold text-sm text-[var(--text-primary)] truncate pr-2">
              {data?.linkTitle || label || "External Link"}
          </h3>
          {data?.linkDescription && (
            <p className="text-xs text-gray-500 truncate">{data.linkDescription}</p>
          )}
      </div>
  </a>
);

// --- 2. LOCAL IMAGE RENDERER (Keep this simple & fast) ---
const ImageEmbed = ({ url }: { url: string }) => {
    const [status, setStatus] = useState<'loading' | 'loaded' | 'error'>('loading');

    if (status === 'error') return null;

    return (
        <div className="w-full mt-3 relative z-10 rounded-xl overflow-hidden border border-[var(--glass-border)] bg-black/5 flex justify-center min-h-[200px]">
             {status === 'loading' && (
                 <div className="absolute inset-0 flex items-center justify-center text-[var(--text-muted)]">
                     <Loader2 className="animate-spin" />
                 </div>
             )}
            <Image 
                src={url} 
                alt="Post content" 
                fill
                className={clsx(
                    "object-contain transition-opacity duration-500",
                    status === 'loaded' ? 'opacity-100' : 'opacity-0'
                )}
                sizes="(max-width: 768px) 100vw, 600px"
                onLoad={() => setStatus('loaded')}
                onError={() => setStatus('error')}
            />
        </div>
    );
};

// --- 2.5 LOCAL VIDEO RENDERER ---
const VideoEmbed = ({ url }: { url: string }) => {
    return (
        <div className="w-full mt-3 relative z-10 rounded-xl overflow-hidden border border-[var(--glass-border)] bg-black/5 flex justify-center bg-black">
            <video 
                src={url} 
                controls 
                preload="metadata"
                className="w-full h-auto max-h-[600px]"
            />
        </div>
    );
};

// --- 2.6 YOUTUBE RENDERER ---
const YouTubeEmbed = ({ id, url, fallbackData }: { id: string, url: string, fallbackData?: any }) => {
    return (
        <div className="w-full mt-3 relative z-10 rounded-xl overflow-hidden border border-[var(--glass-border)] bg-black aspect-video group">
            <iframe
                src={`https://www.youtube.com/embed/${id}?origin=${typeof window !== 'undefined' ? window.location.origin : ''}`}
                title="YouTube video player"
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
                className="absolute inset-0 w-full h-full z-10"
            />
            {/* Fallback/Overlay Link (visible if iframe fails or behind it) */}
            <a 
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="absolute inset-0 flex items-center justify-center bg-black/50 text-white opacity-0 group-hover:opacity-100 transition-opacity z-20 pointer-events-none"
            >
                <div className="flex items-center gap-2 bg-black/70 px-4 py-2 rounded-full backdrop-blur-sm pointer-events-auto">
                    <ExternalLink size={16} />
                    <span className="text-xs font-bold">Open in YouTube</span>
                </div>
            </a>
        </div>
    );
};

// --- 3. MAIN CONTROLLER ---
export const PostEmbed = ({ url, fallbackData, forcedType }: { url: string, fallbackData?: any, forcedType?: string }) => {
    const { type: detectedType, id } = useMemo(() => parseMediaUrl(url), [url]);
    
    // Logic: Use forcedType unless it's just a generic 'link' or 'video' and we detected something better (like YouTube)
    let type = forcedType || detectedType;
    if ((type === 'link' || type === 'video') && detectedType !== 'link' && detectedType !== 'video') {
        type = detectedType;
    }

    if (!url) return null;

    // CASE A: Images (Handle locally for speed)
    if (type === 'image') {
        return <ImageEmbed url={url} />;
    }

    // CASE A.5: Videos
    if (type === 'video') {
        return <VideoEmbed url={url} />;
    }

    // CASE A.6: YouTube
    if (type === 'youtube' && id) {
        return <YouTubeEmbed id={id} url={url} fallbackData={fallbackData} />;
    }

    // CASE B: Rich Media (Delegate to OEmbed Proxy)
    // This covers Spotify, TikTok, SoundCloud, Reddit
    if (['spotify', 'tiktok', 'soundcloud', 'reddit'].includes(type)) {
        return (
            <div className="mt-3 relative z-10 w-full max-w-[650px]">
                <OEmbedPlayer 
                    url={url} 
                    // Pass the fallback card in case the API fails or limits are hit
                    fallback={<GenericLinkCard url={url} data={fallbackData} icon={getIconForType(type)} />} 
                />
            </div>
        );
    }

    // CASE C: Default Link
    return <GenericLinkCard url={url} data={fallbackData} />;
};

// Helper to pick a fallback icon
function getIconForType(type: string) {
    switch (type) {
        case 'spotify': return <Music />;
        case 'youtube': 
        case 'tiktok': return <Video />;
        case 'reddit': 
        case 'discord': return <MessageCircle />;
        default: return <ExternalLink />;
    }
}
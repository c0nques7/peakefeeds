'use client'

import { useMemo, useState } from 'react'
import { ExternalLink, Loader2, Music, Video, MessageCircle } from 'lucide-react'
import clsx from 'clsx'
import { parseMediaUrl } from '@/lib/media-parser'
import { OEmbedPlayer } from './OEmbedPlayer' // <--- The new component you created

// --- 1. SIMPLE REUSABLE FALLBACK ---
export const GenericLinkCard = ({ url, data, icon, label }: any) => (
  <a 
    href={url} 
    target="_blank" 
    rel="noopener noreferrer" 
    className="group relative z-10 flex mt-3 h-24 overflow-hidden rounded-xl border border-[var(--glass-border)] bg-[var(--glass-panel)] hover:bg-white/5 transition-all"
  >
      {data?.linkImage ? (
          <div className="w-24 h-full flex-shrink-0">
              <img src={data.linkImage} className="w-full h-full object-cover" alt="" />
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

    return (
        <div className="w-full mt-3 relative z-10 rounded-xl overflow-hidden border border-[var(--glass-border)] bg-black/5 flex justify-center min-h-[200px]">
             {status === 'loading' && (
                 <div className="absolute inset-0 flex items-center justify-center text-[var(--text-muted)]">
                     <Loader2 className="animate-spin" />
                 </div>
             )}
             {status === 'error' && (
                 <div className="absolute inset-0 flex flex-col items-center justify-center text-[var(--text-muted)] bg-red-500/5">
                     <ExternalLink className="opacity-20 mb-2" size={32} />
                     <span className="text-[10px] uppercase font-bold opacity-40">Failed to load image</span>
                 </div>
             )}
            <img 
                src={url} 
                alt="Post content" 
                className={clsx(
                    "w-full h-auto object-contain max-h-[600px] transition-opacity duration-500",
                    status === 'loaded' ? 'opacity-100' : 'opacity-0',
                    status !== 'loaded' && 'absolute invisible'
                )} 
                onLoad={() => setStatus('loaded')}
                onError={() => {
                    console.error('Image load failed for URL:', url);
                    setStatus('error');
                }}
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
                className="w-full h-auto max-h-[600px]"
            />
        </div>
    );
};

// --- 3. MAIN CONTROLLER ---
export const PostEmbed = ({ url, fallbackData, forcedType }: { url: string, fallbackData?: any, forcedType?: string }) => {
    const { type: detectedType } = useMemo(() => parseMediaUrl(url), [url]);
    const type = forcedType || detectedType;

    if (!url) return null;

    // CASE A: Images (Handle locally for speed)
    if (type === 'image') {
        return <ImageEmbed url={url} />;
    }

    // CASE A.5: Videos
    if (type === 'video') {
        return <VideoEmbed url={url} />;
    }

    // CASE B: Rich Media (Delegate to OEmbed Proxy)
    // This covers Spotify, YouTube, TikTok, SoundCloud, Reddit
    if (['spotify', 'youtube', 'tiktok', 'soundcloud', 'reddit'].includes(type)) {
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
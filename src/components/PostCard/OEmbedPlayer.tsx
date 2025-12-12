'use client'

import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import clsx from 'clsx';
// Ensure this path points to your CSS module
import styles from './PostCard.module.css'; 

interface OEmbedPlayerProps {
  url: string;
  className?: string;
  fallback?: React.ReactNode;
}

export function OEmbedPlayer({ url, className, fallback }: OEmbedPlayerProps) {
  const [html, setHtml] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    setError(false);

    fetch(`/api/oembed?url=${encodeURIComponent(url)}`)
      .then(async (res) => {
        if (!res.ok) throw new Error('Failed to load');
        const data = await res.json();
        if (isMounted) {
          if (data.html) {
             setHtml(data.html);
          } else {
             setError(true);
          }
        }
      })
      .catch(() => {
        if (isMounted) setError(true);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => { isMounted = false; };
  }, [url]);

  if (error) return <>{fallback}</>;

  if (loading) {
    return (
      <div className={clsx("w-full h-32 flex items-center justify-center bg-black/5 rounded-xl border border-[var(--glass-border)]", className)}>
        <Loader2 className="animate-spin text-[var(--text-muted)]" />
      </div>
    );
  }

  if (!html) return null;

  return (
    <div 
      // 🟢 CRITICAL: Applies the .oembedWrapper class from your CSS module
      // This activates the specific iframe overrides for Spotify/TikTok
      className={clsx(styles.oembedWrapper, className)}
      dangerouslySetInnerHTML={{ __html: html }} 
    />
  );
}
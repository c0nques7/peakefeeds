import { useState, useEffect } from 'react';
import { parseMediaUrl } from '@/lib/media-parser'; // ⚡️ Uses your existing parser

export type LinkStatus = 'IDLE' | 'LOADING' | 'SUCCESS' | 'ERROR';

export interface LinkMetadata {
  linkTitle?: string;
  linkDescription?: string;
  linkImage?: string;
  domain?: string;
}

export function useLinkPreview(text: string) {
  const [status, setStatus] = useState<LinkStatus>('IDLE');
  const [metadata, setMetadata] = useState<LinkMetadata | undefined>(undefined);
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    // 1. Extract URL
    const urlRegex = /(https?:\/\/[^\s]+)/;
    const match = text.match(urlRegex);
    const foundUrl = match ? match[0] : null;

    // Reset if no URL
    if (!foundUrl) {
      if (status !== 'IDLE') {
        setStatus('IDLE');
        setMetadata(undefined);
        setUrl(null);
      }
      return;
    }

    if (foundUrl === url) return; // Dedupe

    // 2. Analyze URL Type
    const { type } = parseMediaUrl(foundUrl);
    setUrl(foundUrl);

    // ⚡️ CASE A: Rich Media (YouTube, Spotify, etc.) or Image
    // We don't need to fetch metadata for these because PostEmbed handles them internally
    if (type !== 'link') {
        setStatus('SUCCESS');
        setMetadata(undefined); 
        return;
    }

    // ⚡️ CASE B: Generic Link
    // We need to fetch OpenGraph tags so GenericLinkCard looks good
    setStatus('LOADING');

    const timer = setTimeout(() => {
        // MOCK DATA: In production, replace this with: 
        // const data = await fetch(`/api/meta?url=${foundUrl}`).then(res => res.json());
        
        setMetadata({
            linkTitle: "Live Preview: The Future of Truth",
            linkDescription: "This is a simulated link preview. Connect your OpenGraph scraper API here.",
            linkImage: "https://images.unsplash.com/photo-1639762681485-074b7f938ba0?q=80&w=2832&auto=format&fit=crop",
            domain: new URL(foundUrl).hostname
        });
        setStatus('SUCCESS');
    }, 1000);

    return () => clearTimeout(timer);
  }, [text, url, status]);

  return { status, metadata, url };
}
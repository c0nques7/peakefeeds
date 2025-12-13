// app/api/oembed/route.ts
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const targetUrl = searchParams.get('url');

  if (!targetUrl) {
    return NextResponse.json({ error: 'Missing URL' }, { status: 400 });
  }

  try {
    const oembedUrl = getProviderEndpoint(targetUrl);
    if (!oembedUrl) {
      return NextResponse.json({ error: 'Unsupported provider' }, { status: 400 });
    }

    // Server-side fetch bypasses CORS restrictions
    const response = await fetch(oembedUrl);
    
    if (!response.ok) {
      throw new Error(`Provider returned ${response.status}`);
    }

    const data = await response.json();
    return NextResponse.json(data);

  } catch (error) {
    console.error('oEmbed Proxy Error:', error);
    return NextResponse.json({ error: 'Failed to fetch oEmbed data' }, { status: 500 });
  }
}

function getProviderEndpoint(url: string): string | null {
  // 1. Spotify
  if (url.match(/spotify\.com/)) {
    return `https://open.spotify.com/oembed?url=${encodeURIComponent(url)}`;
  }
  
  // 2. YouTube (oEmbed is often safer than direct iframe parsing)
  if (url.match(/(youtube\.com|youtu\.be)/)) {
    return `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`;
  }

  // 3. TikTok
  if (url.match(/tiktok\.com/)) {
    return `https://www.tiktok.com/oembed?url=${encodeURIComponent(url)}`;
  }

  // 4. Reddit
  if (url.match(/reddit\.com/)) {
    return `https://www.reddit.com/oembed?url=${encodeURIComponent(url)}`;
  }

  // 5. SoundCloud
  if (url.match(/soundcloud\.com/)) {
    return `https://soundcloud.com/oembed?url=${encodeURIComponent(url)}&format=json`;
  }

  return null;
}
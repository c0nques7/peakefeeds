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

    // Server-side fetch with timeout + retries to avoid long hangs
    const response = await fetchWithRetry(oembedUrl, { retries: 2, timeoutMs: 5000 });

    if (!response.ok) {
      console.error(`oEmbed provider returned non-OK status ${response.status} for ${oembedUrl}`);
      return NextResponse.json({ error: `Provider returned ${response.status}` }, { status: 502 });
    }

    try {
      const data = await response.json();
      return NextResponse.json(data);
    } catch (err) {
      console.error('oEmbed JSON parse error for', oembedUrl, err);
      return NextResponse.json({ error: 'Invalid oEmbed response' }, { status: 502 });
    }

  } catch (error) {
    console.error('oEmbed Proxy Error:', error);
    return NextResponse.json({ error: 'Failed to fetch oEmbed data' }, { status: 500 });
  }
}

async function fetchWithRetry(url: string, opts: { retries?: number; timeoutMs?: number } = {}) {
  const retries = opts.retries ?? 1;
  const timeoutMs = opts.timeoutMs ?? 5000;

  for (let attempt = 0; attempt <= retries; attempt++) {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const res = await fetch(url, { signal: controller.signal });
      clearTimeout(id);
      return res;
    } catch (err: any) {
      clearTimeout(id);
      // If aborted or network error, retry unless out of attempts
      const isAbort = err?.name === 'AbortError';
      console.warn(`oEmbed fetch attempt ${attempt + 1} failed for ${url}:`, err?.message || err);
      if (attempt === retries) {
        // rethrow for the caller to handle
        throw err;
      }
      // Backoff before retrying (simple linear backoff)
      await new Promise((r) => setTimeout(r, 300 * (attempt + 1)));
    }
  }

  // Should never reach here
  throw new Error('Failed to fetch');
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
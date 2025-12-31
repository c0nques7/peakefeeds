export type MediaType = 'youtube' | 'spotify' | 'soundcloud' | 'instagram' | 'tiktok' | 'image' | 'video' | 'link';

export interface MediaMeta {
  type: MediaType;
  id: string | null;
  url: string;
  subtype?: string; // Required for Spotify
}

export const parseMediaUrl = (url: string): MediaMeta => {
  if (!url) return { type: 'link', id: null, url: '' };

  // 1. IMAGES
  if (url.match(/\.(jpeg|jpg|gif|png|webp|svg)(\?.*)?$/i) || url.match(/(picsum\.photos|i\.imgur\.com)/) || url.startsWith('blob:')) {
    return { type: 'image', id: null, url };
  }

  // 1.5 VIDEOS
  if (url.match(/\.(mp4|webm|ogg|mov)(\?.*)?$/i)) {
    return { type: 'video', id: null, url };
  }

  // 2. YOUTUBE
  // Supports: youtube.com, www.youtube.com, m.youtube.com, music.youtube.com, youtu.be
  const ytMatch = url.match(/(?:youtu\.be\/|(?:www\.|m\.|music\.)?youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=)|shorts\/)([^#&?]*).*/);
  if (ytMatch && ytMatch[1].length === 11) {
    return { type: 'youtube', id: ytMatch[1], url };
  }

  // 3. SPOTIFY
  // Standard: https://open.spotify.com/track/ID
  // URI: spotify:track:ID
const spMatch = url.match(/(?:open\.spotify\.com|spotify)(?:\/|:)(track|album|playlist|episode|show)(?:\/|:)([a-zA-Z0-9]+)/);
  if (spMatch) {
    return { type: 'spotify', subtype: spMatch[1], id: spMatch[2], url };
  }

  // 4. SOUNDCLOUD
  if (url.match(/(soundcloud\.com)/)) {
    return { type: 'soundcloud', id: null, url };
  }

  // 5. INSTAGRAM
  const igMatch = url.match(/instagram\.com\/(?:p|reel|tv)\/([a-zA-Z0-9_-]+)/);
  if (igMatch) {
    return { type: 'instagram', id: igMatch[1], url };
  }

  // 6. TIKTOK
  const ttMatch = url.match(/tiktok\.com\/.*\/video\/(\d+)/);
  if (ttMatch) {
    return { type: 'tiktok', id: ttMatch[1], url };
  }

  // Fallback
  return { type: 'link', id: null, url };
};
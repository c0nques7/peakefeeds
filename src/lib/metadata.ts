import * as cheerio from 'cheerio';

export interface LinkMetadata {
  url: string | null;
  title: string | null;
  description: string | null;
  image: string | null;
  domain: string | null;
}

// Helper: Find the first URL in a string
export function extractUrl(text: string): string | null {
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const match = text.match(urlRegex);
  return match ? match[0] : null;
}

export async function fetchLinkMetadata(text: string): Promise<LinkMetadata> {
  // 1. Extract URL from the post content
  const url = extractUrl(text);
  
  // 2. If no URL found, return empty metadata
  if (!url) {
    return { url: null, title: null, description: null, image: null, domain: null };
  }

  try {
    const response = await fetch(url, { 
      headers: { 'User-Agent': 'PeakeFeeds-Bot/1.0' },
      next: { revalidate: 3600 } // Cache results for 1 hour
    });
    
    // Check if the response is valid HTML
    const contentType = response.headers.get("content-type");
    if (!response.ok || !contentType || !contentType.includes("text/html")) {
        return { url, title: null, description: null, image: null, domain: null };
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    // 3. Extract Metadata
    const title = $('meta[property="og:title"]').attr('content') || $('title').text() || null;
    const description = $('meta[property="og:description"]').attr('content') || $('meta[name="description"]').attr('content') || null;
    const image = $('meta[property="og:image"]').attr('content') || null;
    
    let domain = null;
    try {
      const urlObj = new URL(url);
      domain = urlObj.hostname.replace('www.', '');
    } catch (e) {
      // Ignore invalid URLs
    }

    return { url, title, description, image, domain };

  } catch (error) {
    console.error("Failed to fetch metadata:", error);
    return { url, title: null, description: null, image: null, domain: null };
  }
}
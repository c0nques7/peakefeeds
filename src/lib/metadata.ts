import * as cheerio from 'cheerio';

export interface LinkMetadata {
  title: string | null;
  description: string | null;
  image: string | null;
  domain: string | null;
}

export async function fetchLinkMetadata(url: string): Promise<LinkMetadata> {
  try {
    const response = await fetch(url, { 
      headers: { 'User-Agent': 'PeakeFeeds-Bot/1.0' },
      next: { revalidate: 3600 } // Cache results for 1 hour
    });
    
    const html = await response.text();
    const $ = cheerio.load(html);

    // Prioritize OG tags, fall back to standard tags
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

    return { title, description, image, domain };

  } catch (error) {
    console.error("Failed to fetch metadata:", error);
    return { title: null, description: null, image: null, domain: null };
  }
}
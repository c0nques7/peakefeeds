import * as cheerio from 'cheerio';
import { lookup } from 'node:dns';
import http from 'node:http';
import https from 'node:https';
import { BlockList, isIP, type LookupFunction } from 'node:net';

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

// Link previews are fetched from our server, so they must never reach private networks,
// the host itself or cloud metadata endpoints (SSRF).
const MAX_REDIRECTS = 3;
const TIMEOUT_MS = 3000;
// YouTube watch pages put og:title ~830 KB in
const MAX_BYTES = 2 * 1024 * 1024;

const blocked = new BlockList();
for (const [net, prefix] of [
  ['0.0.0.0', 8], ['10.0.0.0', 8], ['100.64.0.0', 10], ['127.0.0.0', 8], ['169.254.0.0', 16],
  ['172.16.0.0', 12], ['192.0.0.0', 24], ['192.0.2.0', 24], ['192.168.0.0', 16], ['198.18.0.0', 15],
  ['198.51.100.0', 24], ['203.0.113.0', 24], ['224.0.0.0', 4], ['240.0.0.0', 4],
] as const) blocked.addSubnet(net, prefix, 'ipv4');
for (const [net, prefix] of [
  ['::', 128], ['::1', 128], ['64:ff9b::', 96], ['100::', 64], ['2001:db8::', 32],
  ['fc00::', 7], ['fe80::', 10], ['ff00::', 8],
] as const) blocked.addSubnet(net, prefix, 'ipv6');

export function isPublicAddress(address: string): boolean {
  // IPv4-mapped IPv6 (::ffff:10.0.0.1, or ::ffff:a00:1 as URLs write it) is checked as the IPv4 address it carries
  let ip = address;
  const dotted = address.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/i);
  const hex = address.match(/^::ffff:([0-9a-f]{1,4}):([0-9a-f]{1,4})$/i);
  if (dotted) ip = dotted[1];
  else if (hex) {
    const [hi, lo] = [parseInt(hex[1], 16), parseInt(hex[2], 16)];
    ip = [hi >> 8, hi & 255, lo >> 8, lo & 255].join('.');
  }
  const family = isIP(ip);
  if (family === 0) return false;
  return !blocked.check(ip, family === 4 ? 'ipv4' : 'ipv6');
}

// Resolves like the default lookup but fails if any address is non-public. Used as the socket's
// lookup, so the address we check is the one we connect to (no DNS-rebinding gap).
const safeLookup: LookupFunction = (hostname, options, callback) => {
  lookup(hostname, { ...options, all: true }, (err, addresses) => {
    if (err) return callback(err, '', 4);
    const list = addresses as unknown as { address: string; family: number }[];
    if (list.length === 0 || !list.every(a => isPublicAddress(a.address))) {
      return callback(Object.assign(new Error(`Blocked address for ${hostname}`), { code: 'EBLOCKED' }), '', 4);
    }
    if (options.all) return callback(null, list);
    callback(null, list[0].address, list[0].family);
  });
};

function isFetchableUrl(url: URL): boolean {
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return false;
  if (url.username || url.password) return false;
  if (url.port && url.port !== '80' && url.port !== '443') return false;
  // Literal IPs skip DNS, so check them here
  const host = url.hostname.replace(/^\[|\]$/g, '');
  return isIP(host) === 0 || isPublicAddress(host);
}

type FetchResult = { status: number; location?: string; contentType?: string; body?: string };

function request(url: URL, signal: AbortSignal): Promise<FetchResult> {
  const client = url.protocol === 'https:' ? https : http;
  return new Promise((resolve, reject) => {
    const req = client.get(url, {
      headers: { 'User-Agent': 'PeakeFeeds-Bot/1.0', Accept: 'text/html' },
      lookup: safeLookup,
      signal,
    }, res => {
      const status = res.statusCode ?? 0;
      const contentType = res.headers['content-type'];
      if (status >= 300 && status < 400) {
        res.resume();
        return resolve({ status, location: res.headers.location });
      }
      if (status < 200 || status >= 300 || !contentType?.includes('text/html')) {
        res.resume();
        return resolve({ status, contentType });
      }
      const chunks: Buffer[] = [];
      let size = 0;
      res.on('data', (chunk: Buffer) => {
        // Only the <head> matters; stop reading big pages
        const room = MAX_BYTES - size;
        chunks.push(chunk.subarray(0, room));
        size += Math.min(chunk.length, room);
        if (size >= MAX_BYTES) {
          res.destroy();
          resolve({ status, contentType, body: Buffer.concat(chunks).toString('utf8') });
        }
      });
      res.on('end', () => resolve({ status, contentType, body: Buffer.concat(chunks).toString('utf8') }));
      res.on('error', reject);
    });
    req.on('error', reject);
  });
}

/** Fetches an HTML page, re-checking every redirect hop; null if it's unsafe, not HTML or fails. */
export async function fetchPublicHtml(rawUrl: string): Promise<string | null> {
  const signal = AbortSignal.timeout(TIMEOUT_MS);
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    return null;
  }

  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    if (!isFetchableUrl(url)) return null;
    const res = await request(url, signal);
    if (res.status >= 300 && res.status < 400) {
      if (!res.location) return null;
      try {
        url = new URL(res.location, url);
      } catch {
        return null;
      }
      continue;
    }
    return res.body ?? null;
  }
  return null;
}

export async function fetchLinkMetadata(text: string): Promise<LinkMetadata> {
  // 1. Extract URL from the post content
  const url = extractUrl(text);

  // 2. If no URL found, return empty metadata
  if (!url) {
    return { url: null, title: null, description: null, image: null, domain: null };
  }

  try {
    const html = await fetchPublicHtml(url);
    if (!html) {
        return { url, title: null, description: null, image: null, domain: null };
    }

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

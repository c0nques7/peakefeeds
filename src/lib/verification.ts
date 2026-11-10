import { keccak256, toBytes } from 'viem';

/**
 * 1. GENERATE SALT (The "Pepper")
 * Isomorphic: Works on Client (window.crypto) and Server (node:crypto)
 */
export function generateSalt(): string {
  const array = new Uint8Array(32);
  globalThis.crypto.getRandomValues(array);
  return Array.from(array).map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * 2. GENERATE CONTENT HASH (The "Truth Fingerprint")
 * Keccak256(Content + "|" + Salt)
 */
export function generateContentHash(content: string, salt: string): string {
  const payload = `${content.trim()}|${salt}`;
  return keccak256(toBytes(payload));
}

import { keccak256, toBytes, recoverMessageAddress } from 'viem';

/**
 * 1. GENERATE SALT (The "Pepper")
 * Isomorphic: Works on Client (window.crypto) and Server (node:crypto)
 */
export function generateSalt(): string {
  if (typeof window !== 'undefined' && window.crypto) {
    const array = new Uint8Array(32);
    window.crypto.getRandomValues(array);
    return Array.from(array).map(b => b.toString(16).padStart(2, '0')).join('');
  } else {
    // Dynamic require to prevent Webpack build errors on client
    return require('crypto').randomBytes(32).toString('hex');
  }
}

/**
 * 2. GENERATE CONTENT HASH (The "Truth Fingerprint")
 * Keccak256(Content + "|" + Salt)
 */
export function generateContentHash(content: string, salt: string): string {
  const payload = `${content.trim()}|${salt}`;
  return keccak256(toBytes(payload));
}

/**
 * 3. VERIFY SIGNATURE (Server-Side Check)
 * 🛑 CRITICAL FIX: Added '{ raw: ... }'
 * We must treat the contentHash as raw bytes to match the client-side signing.
 */
export async function recoverSignerAddress(contentHash: string, signature: string): Promise<string | null> {
  try {
    const validSignature = signature.startsWith('0x') 
      ? signature as `0x${string}` 
      : `0x${signature}` as `0x${string}`;

    const validHash = contentHash.startsWith('0x')
      ? contentHash as `0x${string}`
      : `0x${contentHash}` as `0x${string}`;

    // 🟢 THE FIX: Tell Viem this is a RAW hash
    return await recoverMessageAddress({
      message: { raw: validHash }, 
      signature: validSignature,
    });
  } catch (error) {
    console.error("Crypto Verification Failed:", error);
    return null;
  }
}


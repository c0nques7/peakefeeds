import { keccak256, toBytes, recoverMessageAddress } from 'viem';

/**
 * 1. GENERATE SALT (The "Pepper")
 * ⚠️ FIXED: Now Isomorphic (Works on Client AND Server)
 * We check for window.crypto (Browser) first, then fallback to require('crypto') (Node).
 */
export function generateSalt(): string {
  if (typeof window !== 'undefined' && window.crypto) {
    // Browser environment
    const array = new Uint8Array(32);
    window.crypto.getRandomValues(array);
    return Array.from(array).map(b => b.toString(16).padStart(2, '0')).join('');
  } else {
    // Server environment (Dynamic require avoids Webpack build errors)
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
 * ⚠️ FIXED: Removed '{ raw: ... }'
 * We now treat the hash as a string message. This forces Viem to apply the 
 * "Ethereum Signed Message" prefix, matching MetaMask's behavior.
 */
export async function recoverSignerAddress(contentHash: string, signature: string): Promise<string | null> {
  try {
    const validSignature = signature.startsWith('0x') 
      ? signature as `0x${string}` 
      : `0x${signature}` as `0x${string}`;

    // RECOVERY LOGIC FIX:
    // We pass 'contentHash' directly as the message property.
    // This tells Viem: "The user signed this string with the standard Prefix."
    return await recoverMessageAddress({
      message: contentHash, 
      signature: validSignature,
    });
  } catch (error) {
    console.error("Crypto Verification Failed:", error);
    return null;
  }
}
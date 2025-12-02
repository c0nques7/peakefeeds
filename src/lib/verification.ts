import { keccak256, toBytes, recoverMessageAddress } from 'viem';
import { randomBytes } from 'crypto';

/**
 * 1. GENERATE SALT (The "Pepper")
 */
export function generateSalt(): string {
  return randomBytes(32).toString('hex');
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
 */
export async function recoverSignerAddress(contentHash: string, signature: string): Promise<string | null> {
  try {
    const validSignature = signature.startsWith('0x') 
      ? signature as `0x${string}` 
      : `0x${signature}` as `0x${string}`;

    return await recoverMessageAddress({
      message: { raw: contentHash as `0x${string}` },
      signature: validSignature,
    });
  } catch (error) {
    console.error("Crypto Verification Failed:", error);
    return null;
  }
}


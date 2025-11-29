import { keccak256, toBytes } from 'viem';

/**
 * Generates a consistent KECCAK-256 hash for post content.
 * This is the "Fingerprint" used for signing and L2 verification.
 * * We verify the content AND the author to prevent signature replays.
 */
export function generateContentHash(content: string, authorId: string): string {
  // 1. Trim whitespace to ensure consistency
  const cleanContent = content.trim();
  
  // 2. Combine with Author ID to ensure uniqueness per user
  // Format: "CONTENT|AUTHOR_ID"
  const payload = `${cleanContent}|${authorId}`;
  
  // 3. Convert to bytes
  const contentBytes = toBytes(payload);
  
  // 4. Hash
  return keccak256(contentBytes);
}
import { id, verifyMessage } from "ethers";

/**
 * 1. GENERATE CONTENT HASH (The "Truth Fingerprint")
 * * We combine the content text and the author's ID into a JSON object
 * and then hash it using Keccak-256. This ensures that:
 * A) The hash is unique to this specific user (even if they post the same text as someone else).
 * B) It matches the format expected by Solidity smart contracts (bytes32).
 */
export function generateContentHash(content: string, authorId: string): string {
  const payload = JSON.stringify({
    content: content.trim(),
    authorId: authorId
  });
  
  // 'id' in ethers v6 is a shortcut for keccak256(toUtf8Bytes(str))
  return id(payload);
}

/**
 * 2. VERIFY SIGNATURE (Server-Side Check)
 * * This function takes a hash and a signature and cryptographically recovers
 * the wallet address that signed it. 
 * * Returns the signer's address if valid, or null if invalid.
 */
export function recoverSignerAddress(contentHash: string, signature: string): string | null {
  try {
    // verifyMessage performs the Elliptic Curve recovery
    const recoveredAddress = verifyMessage(contentHash, signature);
    return recoveredAddress;
  } catch (error) {
    console.error("Crypto Verification Failed:", error);
    return null;
  }
}


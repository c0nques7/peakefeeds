'use server'

import { z } from 'zod';
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth.config"; 
import { prisma } from '@/lib/db'; 
import { revalidatePath } from 'next/cache';
import { generateContentHash, recoverSignerAddress } from "@/lib/verification"; 

// --- 1. NEW ZOD SCHEMA ---
const FinalPostSchema = z.object({
  content: z.string()
    .min(1, "Post cannot be empty")
    .max(2000, "Post is too long (max 2000 chars)"),
  channelId: z.string(),
  
  // Verification fields (passed by the refactored form)
  verificationMethod: z.enum(['WALLET', 'AD', 'SKIP']), 
  contentHash: z.string().optional(),
  salt: z.string().optional(),
  signature: z.string().optional(),
});

// --- 2. UPDATED STATE TYPE ---
// We keep the old shape for the form's useActionState
export type CreatePostState = {
  errors?: {
    content?: string[];
    channelId?: string[];
    _form?: string[];
  };
  message?: string | null;
  success?: boolean;
}

// --- 3. THE SERVER ACTION ---
export async function createPost(
  prevState: CreatePostState,
  formData: FormData
): Promise<CreatePostState> {

  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return { message: "You must be signed in to post." };
  }

  // A. Input Validation
  const validatedFields = FinalPostSchema.safeParse({
    content: formData.get('content'),
    channelId: formData.get('channelId'),
    verificationMethod: formData.get('verificationMethod'),
    contentHash: formData.get('contentHash'),
    salt: formData.get('salt'),
    signature: formData.get('signature'),
  });

  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
      message: "Invalid input. Missing critical verification data.",
    };
  }

  const { content, channelId, verificationMethod, contentHash, salt, signature } = validatedFields.data;

  // B. Case: User Chose to Skip Verification
  if (verificationMethod === 'SKIP') {
      return await savePost({ content, channelId, authorId: session.user.id });
  }

  // C. Case: User Chose Wallet or Ad (Requires Verification)
  if (!contentHash || !salt || !signature || !session.user.walletAddress) {
      return { message: "Verification failed: Missing cryptographic data or wallet link." };
  }

  // D. Perform Server-Side Verification Checks
  
  // 1. Re-calculate the hash to ensure the content hasn't been tampered with since client-signing
  const serverRecalculatedHash = generateContentHash(content, salt);
  
  if (serverRecalculatedHash !== contentHash) {
      console.error("Hash Mismatch: Client hash does not match server re-calculation.");
      return { message: "Verification failed: Content integrity compromised." };
  }

  // 2. Recover the signer's public address from the signature
  const recoveredAddress = await recoverSignerAddress(contentHash, signature);

  if (!recoveredAddress) {
      return { message: "Verification failed: Invalid cryptographic signature." };
  }

  // 3. Final Security Check: Recovered address must match the authenticated user's wallet
  if (recoveredAddress.toLowerCase() !== session.user.walletAddress.toLowerCase()) {
      console.error("Address Mismatch:", { recovered: recoveredAddress, expected: session.user.walletAddress });
      return { message: "Verification failed: Signature does not belong to your connected wallet." };
  }

  // E. Final Save (Verification Passed)
  return await savePost({ 
    content, 
    channelId, 
    authorId: session.user.id,
    isVerified: true,
    contentHash,
    salt,
    signature,
    verificationSource: verificationMethod === 'AD' ? 'HYPELAB' : 'WALLET' // Assuming HYPELAB handles AD relay
  });
}

// --- 4. DATABASE HELPER FUNCTION ---
interface PostData {
    content: string;
    channelId: string;
    authorId: string;
    isVerified?: boolean;
    contentHash?: string;
    salt?: string;
    signature?: string;
    verificationSource?: string;
}

async function savePost(data: PostData): Promise<CreatePostState> {
    try {
        const newPost = await prisma.post.create({
            data: {
                content: data.content,
                channelId: data.channelId,
                authorId: data.authorId,
                
                isVerified: data.isVerified || false, // Defaults to false
                contentHash: data.contentHash,
                salt: data.salt,
                signature: data.signature,
                verificationSource: data.verificationSource,

                type: "TEXT",
                mediaUrl: null,
                mediaHash: null,
            }
        });

        // Revalidate Paths
        const channel = await prisma.channel.findUnique({ where: { id: data.channelId }, select: { slug: true } });
        if (channel) {
            revalidatePath(`/channels/${channel.slug}`);
            revalidatePath('/home'); 
        }

        return { success: true, message: "Posted successfully!" };

    } catch (error) {
        console.error("❌ CRITICAL DB ERROR:", error);
        return { message: "Database Error: Could not publish post." };
    }
}


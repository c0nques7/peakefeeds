'use server'

import { z } from 'zod';
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth.config"; 
import { prisma } from '@/lib/db'; 
import { revalidatePath } from 'next/cache';
import { generateContentHash, recoverSignerAddress } from "@/lib/verification"; 
import { fetchLinkMetadata } from "@/lib/metadata"; 

// 1. UPDATE SCHEMA
const FinalPostSchema = z.object({
  content: z.string().min(1).max(2000),
  channelId: z.string(),
  verificationMethod: z.enum(['WALLET', 'AD', 'SKIP']), 
  contentHash: z.string().nullable().optional(),
  salt: z.string().nullable().optional(),
  signature: z.string().nullable().optional(),
  adProofToken: z.string().nullable().optional(),
  mediaUrl: z.string().nullable().optional(),
  mediaType: z.enum(['IMAGE', 'VIDEO']).nullable().optional(),
});

export type CreatePostState = {
  errors?: {
    content?: string[];
    channelId?: string[];
    _form?: string[];
  };
  message?: string | null;
  success?: boolean;
}

export async function createPost(
  prevState: CreatePostState,
  formData: FormData
): Promise<CreatePostState> {

  console.log("🚀 Action Started: createPost");

  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id) {
    return { message: "You must be signed in to post." };
  }

  // 2. PARSE DATA
  const validatedFields = FinalPostSchema.safeParse({
    content: formData.get('content'),
    channelId: formData.get('channelId'),
    verificationMethod: formData.get('verificationMethod'),
    contentHash: formData.get('contentHash'),
    salt: formData.get('salt'),
    signature: formData.get('signature'),
    adProofToken: formData.get('adProofToken'),
    mediaUrl: formData.get('mediaUrl'),
    mediaType: formData.get('mediaType'),
  });

  if (!validatedFields.success) {
    console.error("❌ Validation Failed:", validatedFields.error.flatten());
    return {
      errors: validatedFields.error.flatten().fieldErrors,
      message: "Invalid input data.",
    };
  }

  const { content, channelId, verificationMethod, contentHash, salt, signature, adProofToken, mediaUrl, mediaType } = validatedFields.data;

  // Case: SKIP (Unverified)
  if (verificationMethod === 'SKIP') {
      return await savePost({ content, channelId, authorId: session.user.id, mediaUrl, mediaType });
  }

  // Case: WALLET/AD - Verification Logic
  if (!contentHash || !salt || !signature) {
      return { message: "Verification failed: Missing cryptographic data." };
  }

  if (!session.user.walletAddress) {
      return { message: "Session out of sync. Please Sign Out and Sign In again." };
  }

  // A. Integrity Check (Has content been tampered with?)
  const serverRecalculatedHash = generateContentHash(content, salt);
  if (serverRecalculatedHash !== contentHash) {
      return { message: "Verification failed: Content integrity compromised." };
  }

  // B. Signature Check (Did THIS user sign it?)
  const recoveredAddress = await recoverSignerAddress(contentHash, signature);
  if (!recoveredAddress) {
      return { message: "Verification failed: Invalid signature." };
  }

  // C. Ownership Check (Does signature match profile?)
  const sessionWallet = session.user.walletAddress.toLowerCase();
  const signerWallet = recoveredAddress.toLowerCase();

  if (signerWallet !== sessionWallet) {
      return { message: "Verification failed: Signature wallet does not match profile wallet." };
  }

  // 🆕 D. AD PROOF CHECK (The Paywall Guard)
  if (verificationMethod === 'AD') {
      if (!adProofToken) {
          console.warn("⚠️ Ad exploit attempt: Method is AD but no token provided.");
          return { message: "Ad verification failed: Missing proof of view." };
      }

      // Basic Validation Logic
      const isDevToken = process.env.NODE_ENV === 'development' && adProofToken.startsWith('DEV_PROOF_');
      const isProdToken = adProofToken.length > 5; // Simple length check for now

      if (!isDevToken && !isProdToken) {
          return { message: "Ad verification failed: Invalid proof token." };
      }
      
      console.log(`✅ Ad Token Verified: ${adProofToken.slice(0, 15)}...`);
  }

  console.log("✅ All Verification Passed. Saving to DB...");

  return await savePost({ 
    content, 
    channelId, 
    authorId: session.user.id,
    isVerified: true,
    contentHash,
    salt,
    signature,
    verificationSource: verificationMethod === 'AD' ? 'HYPELAB' : 'WALLET',
    mediaUrl,
    mediaType
  });
}

// --- DB HELPER ---
interface PostData {
    content: string;
    channelId: string;
    authorId: string;
    isVerified?: boolean;
    contentHash?: string;
    salt?: string;
    signature?: string;
    verificationSource?: string;
    mediaUrl?: string;
    mediaType?: 'IMAGE' | 'VIDEO';
}

async function savePost(data: PostData): Promise<CreatePostState> {
    try {
        // 1. DETECT LINK METADATA
        const metadata = await fetchLinkMetadata(data.content);
        
        // Determine Post Type
        let postType: any = "TEXT";
        if (data.mediaType) {
            postType = data.mediaType;
        } else if (metadata.title) {
            postType = "LINK";
        }

        const newPost = await prisma.post.create({
            data: {
                content: data.content,
                channelId: data.channelId,
                authorId: data.authorId,
                isVerified: data.isVerified || false,
                contentHash: data.contentHash,
                salt: data.salt,
                signature: data.signature,
                verificationSource: data.verificationSource,
                
                // 2. SAVE DYNAMIC TYPE & METADATA
                type: postType,
                mediaUrl: data.mediaUrl || metadata.url,
                linkTitle: metadata.title,
                linkDescription: metadata.description,
                linkImage: metadata.image,
                linkDomain: metadata.domain,
            }
        });

        // Revalidate
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
'use server'

import { z } from 'zod';
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth.config"; 
import { prisma } from '@/lib/db'; 
import { revalidatePath } from 'next/cache';
import { generateContentHash, recoverSignerAddress } from "@/lib/verification"; 
import { fetchLinkMetadata } from "@/lib/metadata"; 
import { getInteractionBlockReason } from "@/lib/interaction-guard";
import { fileNameFromUrl } from "@/lib/b2";

// 1. UPDATE SCHEMA
const FinalPostSchema = z.object({
  content: z.string().min(1).max(2000),
  channelId: z.string(),
  // 'AD' (sponsored) is off until ad proofs can be verified server-side
  verificationMethod: z.enum(['WALLET', 'SKIP']), 
  contentHash: z.string().nullable().optional(),
  salt: z.string().nullable().optional(),
  signature: z.string().nullable().optional(),
  // Only files uploaded to our bucket; link previews live in the link* fields
  mediaUrl: z.string().refine(url => fileNameFromUrl(url) !== null, 'Media must be an uploaded file.').nullable().optional(),
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
  console.log("📝 FormData Keys:", Array.from(formData.keys()));

  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id) {
    return { message: "You must be signed in to post." };
  }

  // 2. PARSE DATA
  // Helper to convert empty strings to null
  const getString = (key: string) => {
      const val = formData.get(key);
      return (val && val !== '') ? val : null;
  };

  const validatedFields = FinalPostSchema.safeParse({
    content: formData.get('content'),
    channelId: formData.get('channelId'),
    verificationMethod: formData.get('verificationMethod'),
    contentHash: getString('contentHash'),
    salt: getString('salt'),
    signature: getString('signature'),
    mediaUrl: getString('mediaUrl'),
    mediaType: getString('mediaType'),
  });

  if (!validatedFields.success) {
    console.error("❌ Validation Failed:", validatedFields.error.flatten());
    return {
      errors: validatedFields.error.flatten().fieldErrors,
      message: "Invalid input data.",
    };
  }

  const { content, channelId, verificationMethod, contentHash, salt, signature, mediaUrl, mediaType } = validatedFields.data;

  const blocked = await getInteractionBlockReason({ userId: session.user.id, action: 'post', channelId });
  if (blocked) return { message: blocked };

  // Case: SKIP (Unverified)
  if (verificationMethod === 'SKIP') {
      return await savePost({ content, channelId, authorId: session.user.id, mediaUrl, mediaType });
  }

  // Case: WALLET - Verification Logic
  if (!contentHash || !salt || !signature) {
      return { message: "Verification failed: Missing cryptographic data." };
  }

  if (!session.user.walletAddress) {
      return { message: "Session out of sync. Please Sign Out and Sign In again." };
  }

  // A. Integrity Check (Has content been tampered with?)
  // 🟢 NORMALIZE NEWLINES: Client (browser) uses LF, but FormData might have CRLF.
  // We normalize to LF (\n) to match client-side React state behavior.
  const normalizedContent = content.replace(/\r\n/g, '\n');
  const serverRecalculatedHash = generateContentHash(normalizedContent, salt);
  
  if (serverRecalculatedHash !== contentHash) {
      console.error("❌ Hash Mismatch!", { 
          serverHash: serverRecalculatedHash, 
          clientHash: contentHash,
          contentPreview: normalizedContent.substring(0, 20),
          originalContentLen: content.length,
          normalizedContentLen: normalizedContent.length 
      });
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

  console.log("✅ All Verification Passed. Saving to DB...", { 
      contentLength: content.length, 
      channelId, 
      verificationMethod,
      mediaType,
      hasMediaUrl: !!mediaUrl 
  });

  return await savePost({ 
    content, 
    channelId, 
    authorId: session.user.id,
    isVerified: true,
    contentHash,
    salt,
    signature,
    verificationSource: 'WALLET',
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
    mediaUrl?: string | null;
    mediaType?: 'IMAGE' | 'VIDEO' | null;
}

async function savePost(data: PostData): Promise<CreatePostState> {
    try {
        console.log("💾 savePost called. Fetching metadata...");
        // 1. DETECT LINK METADATA
        const metadata = await fetchLinkMetadata(data.content);
        console.log("🔗 Metadata fetched:", { title: metadata.title, url: metadata.url });
        
        // Determine Post Type
        let postType: any = "TEXT";
        if (data.mediaType) {
            postType = data.mediaType;
        } else if (metadata.title) {
            postType = "LINK";
        }
        console.log("📌 Determined Post Type:", postType);

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
                mediaUrl: data.mediaUrl,
                linkTitle: metadata.title,
                linkDescription: metadata.description,
                linkImage: metadata.image,
                linkDomain: metadata.domain,
            }
        });
        console.log("✅ DB Insert Success! New Post ID:", newPost.id);

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
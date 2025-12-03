'use server'

import { z } from 'zod';
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth.config"; 
import { prisma } from '@/lib/db'; 
import { revalidatePath } from 'next/cache';
import { generateContentHash, recoverSignerAddress } from "@/lib/verification"; 

const FinalPostSchema = z.object({
  content: z.string().min(1).max(2000),
  channelId: z.string(),
  verificationMethod: z.enum(['WALLET', 'AD', 'SKIP']), 
  contentHash: z.string().optional(),
  salt: z.string().optional(),
  signature: z.string().optional(),
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
  
  // DEBUG LOG 1: Check Session
  console.log("👤 Session User:", { 
      id: session?.user?.id, 
      wallet: session?.user?.walletAddress // <--- CHECK IF THIS IS UNDEFINED
  });

  if (!session?.user?.id) {
    return { message: "You must be signed in to post." };
  }

  const validatedFields = FinalPostSchema.safeParse({
    content: formData.get('content'),
    channelId: formData.get('channelId'),
    verificationMethod: formData.get('verificationMethod'),
    contentHash: formData.get('contentHash'),
    salt: formData.get('salt'),
    signature: formData.get('signature'),
  });

  if (!validatedFields.success) {
    console.error("❌ Validation Failed:", validatedFields.error.flatten());
    return {
      errors: validatedFields.error.flatten().fieldErrors,
      message: "Invalid input data.",
    };
  }

  const { content, channelId, verificationMethod, contentHash, salt, signature } = validatedFields.data;

  // Case: SKIP
  if (verificationMethod === 'SKIP') {
      return await savePost({ content, channelId, authorId: session.user.id });
  }

  // Case: WALLET/AD
  // DEBUG LOG 2: Check Incoming Cryptographic Data
  console.log("🔐 Verification Data:", { verificationMethod, contentHash, salt, signatureExists: !!signature });

  // 1. Check for Missing Data
  if (!contentHash || !salt || !signature) {
      console.error("❌ Missing crypto fields");
      return { message: "Verification failed: Missing cryptographic data." };
  }

  // 2. Check for Wallet in Session
  if (!session.user.walletAddress) {
      console.error("❌ No wallet in session. User needs to relogin.");
      return { message: "Session out of sync. Please Sign Out and Sign In again." };
  }

  // 3. Re-calculate Hash
  const serverRecalculatedHash = generateContentHash(content, salt);
  
  if (serverRecalculatedHash !== contentHash) {
      console.error("❌ Hash Mismatch:", { client: contentHash, server: serverRecalculatedHash });
      return { message: "Verification failed: Content integrity compromised." };
  }

  // 4. Recover Address
  const recoveredAddress = await recoverSignerAddress(contentHash, signature);
  console.log("🕵️ Recovered Signer:", recoveredAddress);

  if (!recoveredAddress) {
      return { message: "Verification failed: Invalid signature." };
  }

  // 5. Match Address
  // Normalize strings for comparison
  const sessionWallet = session.user.walletAddress.toLowerCase();
  const signerWallet = recoveredAddress.toLowerCase();

  if (signerWallet !== sessionWallet) {
      console.error("❌ Address Mismatch:", { session: sessionWallet, signer: signerWallet });
      return { message: "Verification failed: Signature wallet does not match profile wallet." };
  }

  console.log("✅ Verification Passed. Saving to DB...");

  return await savePost({ 
    content, 
    channelId, 
    authorId: session.user.id,
    isVerified: true,
    contentHash,
    salt,
    signature,
    verificationSource: verificationMethod === 'AD' ? 'HYPELAB' : 'WALLET'
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
}

async function savePost(data: PostData): Promise<CreatePostState> {
    try {
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
                type: "TEXT",
                mediaUrl: null,
                mediaHash: null,
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
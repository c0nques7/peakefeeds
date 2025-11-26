'use server'

import { z } from 'zod';
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth.config";
import { prisma } from '@/lib/db';
import { revalidatePath } from 'next/cache';
import { generateContentHash } from "@/lib/verification"; // Ensure this exists

// 1. Validation Schema
const CreatePostSchema = z.object({
  content: z.string()
    .min(1, "Post cannot be empty")
    .max(2000, "Post is too long (max 2000 chars)"),
  channelId: z.string(), 
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

// 2. The Server Action
export async function createPost(
  prevState: CreatePostState,
  formData: FormData
): Promise<CreatePostState> {
  
  console.log("🚀 Action Started: createPost");

  // A. Auth Check
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    console.log("❌ Auth Failed: No user session found");
    return { message: "You must be signed in to post." };
  }

  // B. Input Validation
  const validatedFields = CreatePostSchema.safeParse({
    content: formData.get('content'),
    channelId: formData.get('channelId'),
  });

  if (!validatedFields.success) {
    console.log("❌ Validation Failed:", validatedFields.error.flatten().fieldErrors);
    return {
      errors: validatedFields.error.flatten().fieldErrors,
      message: "Invalid input.",
    };
  }

  const { content, channelId } = validatedFields.data;

  // 1. Generate the Truth Fingerprint 🛡️
  const contentHash = generateContentHash(content, session.user.id);
  
  console.log("🔍 DEBUG: Post Data Prepared", { 
      authorId: session.user.id, 
      channelId, 
      contentLength: content.length,
      generatedHash: contentHash 
  });

  try {
    // 2. Save to Database
    const newPost = await prisma.post.create({
      data: {
        content,
        channelId,
        authorId: session.user.id,
        
        // ✅ The Truth Fields
        contentHash: contentHash,
        isVerified: false, // Remains false until Wallet Signing (Phase 5)
        type: "TEXT",      // Explicit Enum
        mediaUrl: null,    // Explicit Null to satisfy Schema
        mediaHash: null,
      }
    });

    console.log("✅ DB Write Success. New Post ID:", newPost.id);

    // 3. Revalidate Paths
    // We need the channel slug to refresh the specific channel page
    const channel = await prisma.channel.findUnique({
        where: { id: channelId },
        select: { slug: true }
    });

    if (channel) {
        const channelPath = `/channels/${channel.slug}`;
        console.log("🔄 Revalidating Paths:", channelPath, "and /home");
        
        revalidatePath(channelPath);
        revalidatePath('/home'); // Refresh global feed
        revalidatePath('/my-feed'); // Refresh personal feed
    } else {
        console.warn("⚠️ Warning: Channel not found for ID:", channelId);
    }
    
    return { message: "Posted successfully!", success: true };

  } catch (error) {
    console.error("❌ CRITICAL DB ERROR:", error);
    return { message: "Database Error: Could not publish post." };
  }
}
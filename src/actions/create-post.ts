'use server'

import { z } from 'zod';
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth.config";
import { prisma } from '@/lib/db';
import { revalidatePath } from 'next/cache';

// --- Helper: Type Detection Logic ---
function detectTypeAndMedia(content: string) {
  const clean = content.trim();
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const match = clean.match(urlRegex);
  const url = match ? match[0] : null;

  // Default
  let type: 'TEXT' | 'IMAGE' | 'VIDEO' | 'LINK' = 'TEXT';
  let finalMediaUrl = null;

  if (url) {
    if (/\.(jpeg|jpg|gif|png|webp)$/i.test(url)) {
      type = 'IMAGE';
      finalMediaUrl = url;
    } else if (/(youtube\.com|youtu\.be|vimeo\.com)/i.test(url) || /\.(mp4|webm)$/i.test(url)) {
      type = 'VIDEO';
      finalMediaUrl = url;
    } else {
      type = 'LINK';
      finalMediaUrl = url;
    }
  }

  return { type, mediaUrl: finalMediaUrl };
}
// ------------------------------------

const CreatePostSchema = z.object({
  content: z.string().min(1).max(2000),
  channelId: z.string(), 
});

export type CreatePostState = {
  errors?: { content?: string[]; channelId?: string[]; _form?: string[] };
  message?: string | null;
  success?: boolean;
}

export async function createPost(
  prevState: CreatePostState,
  formData: FormData
): Promise<CreatePostState> {
  
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return { message: "Unauthorized" };

  const validatedFields = CreatePostSchema.safeParse({
    content: formData.get('content'),
    channelId: formData.get('channelId'),
  });

  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
      message: "Invalid input.",
    };
  }

  const { content, channelId } = validatedFields.data;

  // 1. Detect Type Server-Side
  const { type, mediaUrl } = detectTypeAndMedia(content);

  // 2. Clean Content (Optional: Remove the URL from text if it's just a raw link)
  // For now, we'll keep the text as is to preserve context.

  try {
    await prisma.post.create({
      data: {
        content,
        channelId,
        authorId: session.user.id,
        // 3. Save the Detected Metadata
        type,      
        mediaUrl, 
        // mediaHash will be null until we implement file upload hashing
      }
    });

    const channel = await prisma.channel.findUnique({
        where: { id: channelId },
        select: { slug: true }
    });

    if (channel) {
        revalidatePath(`/channels/${channel.slug}`);
    }
    
    return { message: "Posted!", success: true };

  } catch (error) {
    console.error("Create Post Error:", error);
    return { message: "Database Error." };
  }
}
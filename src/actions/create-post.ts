'use server'

import { z } from 'zod';
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth.config";
import { prisma } from '@/lib/db';
import { revalidatePath } from 'next/cache';
import { generateContentHash } from "@/lib/verification";

const CreatePostSchema = z.object({
  content: z.string().min(1, "Post cannot be empty").max(2000, "Post is too long (max 2000 chars)"),
  channelId: z.string(),
  // Client overrides
  type: z.enum(['TEXT', 'IMAGE', 'VIDEO', 'LINK']).optional(),
  mediaUrl: z.string().optional().nullable().transform((e) => e === "" ? null : e) // Ensure empty string becomes null
    .pipe(z.string().url("Link must be a valid URL if present.").optional().nullable()), // Zod URL check
});

export type CreatePostState = {
  errors?: { content?: string[]; channelId?: string[]; _form?: string[]; mediaUrl?: string[]; };
  message?: string | null;
  success?: boolean;
}

// 🧠 HELPER: Robustly analyzes content for URLs and determines type
function analyzeContentServerSide(content: string) {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const match = content.match(urlRegex);
    
    if (!match) return { type: 'TEXT' as const, mediaUrl: null };

    const url = match[0]; 

    // Combine all checks into simple booleans for clarity
    const isImage = /\.(jpg|jpeg|png|gif|webp|bmp|tiff)$/i.test(url);
    const isVideo = /\.(mp4|webm|ogg|mov)$/i.test(url) || url.includes('youtube.com') || url.includes('youtu.be');

    if (isVideo) return { type: 'VIDEO' as const, mediaUrl: url };
    if (isImage) return { type: 'IMAGE' as const, mediaUrl: url };
    
    return { type: 'LINK' as const, mediaUrl: url };
}

function getYouTubeEmbedUrlServerSide(url: string | null | undefined): string | null {
    if (!url) return null;
    let videoId = '';

    // Handle 'youtu.be/ID'
    if (url.includes('youtu.be/')) {
        videoId = url.split('youtu.be/')[1]?.split('?')[0];
    } 
    // Handle 'youtube.com/watch?v=ID'
    else if (url.includes('v=')) {
        videoId = url.split('v=')[1]?.split('&')[0];
    }
    // Handle 'youtube.com/embed/ID'
    else if (url.includes('embed/')) {
        videoId = url.split('embed/')[1]?.split('?')[0];
    }

    if (videoId) {
        // Adds necessary security parameters for embedding
        return `https://www.youtube.com/embed/${videoId}?rel=0&showinfo=0&modestbranding=1`;
    }
    return null;
}

export async function createPost(prevState: CreatePostState, formData: FormData): Promise<CreatePostState> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return { message: "You must be signed in to post." };

  const validatedFields = CreatePostSchema.safeParse({
    content: formData.get('content'),
    channelId: formData.get('channelId'),
    type: formData.get('type'),
    mediaUrl: formData.get('mediaUrl'),
  });

  if (!validatedFields.success) {
    return { 
        errors: validatedFields.error.flatten().fieldErrors, 
        message: "Invalid input. Check the URL format." 
    };
  }

  // 1. Destructure all fields, using client's input
  const { content, channelId, type: clientType, mediaUrl: clientUrl } = validatedFields.data;

  // 2. DETERMINE FINAL MEDIA TYPE/URL
  let finalType = clientType || 'TEXT';
  let finalUrl = clientUrl || null;

  // If client sent no URL (or sent TEXT), run server analysis as fallback
  if (!finalUrl || finalType === 'TEXT') {
     const analysis = analyzeContentServerSide(content);
     finalType = analysis.type;
     finalUrl = analysis.mediaUrl;
  }

  const contentHash = generateContentHash(content, session.user.id);

  try {
    await prisma.post.create({
      data: {
        content,
        channelId,
        authorId: session.user.id,
        contentHash: contentHash,
        isVerified: false,
        
        // Final determined values
        type: finalType, 
        mediaUrl: finalUrl,
        // Since mediaUrl is now correct, let's update embedUrl
        embedUrl: (finalType === 'VIDEO' && finalUrl) ? getYouTubeEmbedUrlServerSide(finalUrl) : null,
        mediaHash: null, 
      }
    });

    const channel = await prisma.channel.findUnique({
        where: { id: channelId },
        select: { slug: true }
    });

    if (channel) {
        revalidatePath(`/channels/${channel.slug}`);
        revalidatePath('/home'); 
    }
    
    return { message: "Posted successfully!", success: true };

  } catch (error) {
    console.error("Create Post Error:", error);
    return { message: "Database Error: Could not publish post." };
  }
}
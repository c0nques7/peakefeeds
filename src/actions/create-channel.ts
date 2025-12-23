'use server'

import { z } from 'zod';
import { getServerSession } from "next-auth"; 
import { authOptions } from "@/lib/auth.config"; 
import { prisma } from '@/lib/db'; 
import { revalidatePath } from 'next/cache';
import slugify from 'slugify';
import { redirect } from 'next/navigation';
import { ChannelRole } from '@prisma/client';

// ---------------------------------------------------------
// 1. Zod Validation Schema
// ---------------------------------------------------------
const CreateChannelSchema = z.object({
  name: z.string()
    .min(3, "Channel name must be at least 3 characters")
    .max(30, "Channel name must be under 30 characters")
    .regex(/^[a-zA-Z0-9 ]+$/, "Only letters, numbers, and spaces allowed"),
  description: z.string()
    .max(500, "Description cannot exceed 500 characters")
    .optional(),
  tags: z.string().optional(), 
});

// ---------------------------------------------------------
// 2. State Type Definition (MUST BE EXPORTED)
// ---------------------------------------------------------
export type CreateChannelState = {
  errors?: {
    name?: string[];
    description?: string[];
    tags?: string[];
    _form?: string[];
  };
  message?: string | null;
}

// ---------------------------------------------------------
// 3. Helper: Unique Slug Generator
// ---------------------------------------------------------
async function generateUniqueSlug(name: string): Promise<string> {
  // strict: true removes special characters
  let slug = slugify(name, { lower: true, strict: true });
  let uniqueSlug = slug;
  let count = 1;

  // Check database for existing slug, append number if found
  while (await prisma.channel.findUnique({ where: { slug: uniqueSlug } })) {
    uniqueSlug = `${slug}-${count}`;
    count++;
  }
  
  return uniqueSlug;
}

// ---------------------------------------------------------
// 4. The Server Action (MUST BE EXPORTED)
// ---------------------------------------------------------
export async function createChannel(
  prevState: CreateChannelState,
  formData: FormData
): Promise<CreateChannelState> {
  
  // A. Authentication Check (NextAuth v4)
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id) {
    return {
      message: "You must be signed in to create a channel."
    };
  }

  // B. Parse & Validate Data
  const validatedFields = CreateChannelSchema.safeParse({
    name: formData.get('name'),
    description: formData.get('description'),
    tags: formData.get('tags'),
  });

  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
      message: "Missing Fields. Failed to Create Channel.",
    };
  }

  const { name, description, tags } = validatedFields.data;

  // C. Process Tags (Split comma string into array)
  const tagsArray = tags 
    ? tags.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0)
    : [];

  let newSlug = '';

  try {
    newSlug = await generateUniqueSlug(name);

    // D. Database Insertion
    await prisma.channel.create({
      data: {
        name,
        slug: newSlug,
        description: description || '',
        tags: tagsArray,
        creatorId: session.user.id,
        // Auto-subscribe the creator as OWNER
        subscribers: {
            create: {
                userId: session.user.id,
                role: ChannelRole.OWNER
            }
        }
      },
    });

  } catch (error) {
    console.error("Database Error:", error);
    return {
      message: "Database Error: Failed to create channel."
    };
  }

  revalidatePath('/channels');
  redirect(`/channels/${newSlug}`);
}


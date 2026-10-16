'use server'

import { z } from 'zod';
import { getServerSession } from "next-auth"; 
import { authOptions } from "@/lib/auth.config"; 
import { prisma } from '@/lib/db'; 
import { revalidatePath } from 'next/cache';
import slugify from 'slugify';
import { redirect } from 'next/navigation';
import { ChannelRole, Prisma } from '@prisma/client';
import { randomBytes } from 'crypto';
import { getPostingBlockReason } from "@/lib/penalties";

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
  // strict: true removes special characters, so names made only of emoji or
  // non-Latin text come out empty; fall back to "channel" for those
  const slug = slugify(name, { lower: true, strict: true }) || 'channel';

  // One query for every taken variant, instead of one query per suffix
  const taken = new Set(
    (await prisma.channel.findMany({ where: { slug: { startsWith: slug } }, select: { slug: true } }))
      .map(c => c.slug)
  );
  if (!taken.has(slug)) return slug;

  let count = 1;
  while (taken.has(`${slug}-${count}`)) count++;
  return `${slug}-${count}`;
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

  const blocked = await getPostingBlockReason(session.user.id);
  if (blocked) return { message: blocked };

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

    // D. Database Insertion. If someone took the same slug in the meantime,
    // retry once with a random suffix.
    const createWithSlug = (slug: string) => prisma.channel.create({
      data: {
        name,
        slug,
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

    try {
      await createWithSlug(newSlug);
    } catch (error) {
      if (!(error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002')) throw error;
      newSlug = `${newSlug}-${randomBytes(3).toString('hex')}`;
      await createWithSlug(newSlug);
    }

  } catch (error) {
    console.error("Database Error:", error);
    return {
      message: "Database Error: Failed to create channel."
    };
  }

  revalidatePath('/channels');
  redirect(`/channels/${newSlug}`);
}


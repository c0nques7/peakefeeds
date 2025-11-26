'use server'

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth.config";
import { prisma } from '@/lib/db';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

const SubscribeSchema = z.object({
  channelId: z.string().cuid("Invalid Channel ID"),
  channelSlug: z.string(), // Used for revalidation
});

export type SubscribeState = {
    message?: string | null;
};

export async function toggleSubscription(
  prevState: SubscribeState,
  formData: FormData
): Promise<SubscribeState> {
  
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return { message: "Unauthorized. Please log in." };
  }

  const validatedFields = SubscribeSchema.safeParse({
    channelId: formData.get('channelId'),
    channelSlug: formData.get('channelSlug'),
  });

  if (!validatedFields.success) {
    return { message: "Invalid Channel ID provided." };
  }

  const { channelId, channelSlug } = validatedFields.data;
  const userId = session.user.id;

  try {
    // 1. Check if the user is already subscribed
    const existingSubscription = await prisma.subscription.findUnique({
      where: {
        userId_channelId: {
          userId,
          channelId,
        },
      },
    });

    let action: 'subscribed' | 'unsubscribed';

    if (existingSubscription) {
      // 2. Action: UNSUBSCRIBE (Delete the record)
      await prisma.subscription.delete({
        where: {
          userId_channelId: {
            userId,
            channelId,
          },
        },
      });
      action = 'unsubscribed';

    } else {
      // 3. Action: SUBSCRIBE (Create the record)
      await prisma.subscription.create({
        data: {
          userId,
          channelId,
        },
      });
      action = 'subscribed';
    }

    // 4. Revalidate paths to update UI (Channel page and My Feed)
    revalidatePath(`/channels/${channelSlug}`);
    revalidatePath(`/my-feed`);

    return { message: action };

  } catch (error) {
    console.error("Subscription DB Error:", error);
    return { message: "Database Error: Failed to update subscription." };
  }
}
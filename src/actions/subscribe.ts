'use server'

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth.config";
import { prisma } from '@/lib/db';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { ChannelRole } from '@prisma/client';

const SubscribeSchema = z.object({
  channelId: z.string().cuid("Invalid Channel ID"),
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
  });

  if (!validatedFields.success) {
    return { message: "Invalid Channel ID provided." };
  }

  const { channelId } = validatedFields.data;
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

    const channel = await prisma.channel.findUnique({ where: { id: channelId }, select: { slug: true, creatorId: true } });
    if (!channel) return { message: "Channel not found." };

    let action: 'subscribed' | 'unsubscribed';

    if (existingSubscription) {
      // The owner can't leave (the channel would have no one to manage it)
      if (channel.creatorId === userId || existingSubscription.role === ChannelRole.OWNER) {
        return { message: "Channel owners can't unsubscribe from their own channel." };
      }

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
    revalidatePath(`/channels/${channel.slug}`);
    revalidatePath(`/my-feed`);

    return { message: action };

  } catch (error) {
    console.error("Subscription DB Error:", error);
    return { message: "Database Error: Failed to update subscription." };
  }
}
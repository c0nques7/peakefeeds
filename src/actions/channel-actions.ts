'use server'

import { prisma } from "@/lib/db" // Uses the singleton we created earlier
import { revalidatePath } from "next/cache"

export async function toggleSubscription(userId: string, channelId: string) {
  if (!userId || !channelId) throw new Error("Missing parameters");

  // 1. Check if subscription exists
  const existingSub = await prisma.subscription.findUnique({
    where: {
      userId_channelId: {
        userId,
        channelId
      }
    }
  });

  // 2. Toggle Logic
  if (existingSub) {
    // Unsubscribe
    await prisma.subscription.delete({
      where: {
        userId_channelId: { userId, channelId }
      }
    });
  } else {
    // Subscribe
    await prisma.subscription.create({
      data: {
        userId,
        channelId
      }
    });
  }

  // 3. Revalidate Cache
  // This updates the button state on the Global Feed
  revalidatePath('/home'); 
  
  // This updates the button state on ALL channel pages
  // (We use the generic page pattern because we don't have the slug passed here yet)
  revalidatePath('/channels/[slug]', 'page'); 
  
  return { success: true };
}
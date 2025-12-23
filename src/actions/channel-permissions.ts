"use server";

import { prisma } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth.config";
import { ChannelRole, AdminLogType } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { createAdminLog } from "@/lib/admin-logger";

/**
 * Checks if the current user has moderator or owner permissions in a channel.
 */
async function requireChannelMod(channelId: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) throw new Error("Unauthorized");

  const subscription = await prisma.subscription.findUnique({
    where: {
      userId_channelId: {
        userId: session.user.id,
        channelId: channelId,
      },
    },
  });

  const channel = await prisma.channel.findUnique({
    where: { id: channelId },
    select: { creatorId: true }
  });

  // Global Admins can also manage permissions
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true }
  });

  const isGlobalAdmin = user?.role === "ADMIN";
  const isCreator = channel?.creatorId === session.user.id;
  const isChannelMod = subscription?.role === ChannelRole.MODERATOR || subscription?.role === ChannelRole.OWNER;

  if (!isChannelMod && !isGlobalAdmin && !isCreator) {
    throw new Error("You do not have permission to manage this channel.");
  }

  return session.user;
}

export async function getChannelPermissions(channelId: string) {
  await requireChannelMod(channelId);

  return await prisma.subscription.findMany({
    where: { channelId },
    include: {
      user: {
        select: {
          id: true,
          username: true,
          image: true,
          role: true,
        },
      },
    },
    orderBy: {
      joinedAt: "asc",
    },
  });
}

export async function updateChannelPermissions({
  channelId,
  userId,
  role,
  permissions,
}: {
  channelId: string;
  userId: string;
  role: ChannelRole;
  permissions: {
    canPost: boolean;
    canComment: boolean;
    canDeletePosts: boolean;
    canPinPosts: boolean;
  };
}) {
  const admin = await requireChannelMod(channelId);

  const updated = await prisma.subscription.update({
    where: {
      userId_channelId: {
        userId,
        channelId,
      },
    },
    data: {
      role,
      ...permissions,
    },
  });

  // Log the action if it's a role change or major permission change
  await createAdminLog({
    adminId: admin.id,
    eventType: AdminLogType.ADMIN_ACTION,
    targetResource: `ChannelPermission:${channelId}:${userId}`,
    details: { action: "UPDATE_PERMISSIONS", role, permissions }
  });

  revalidatePath(`/channels/${channelId}/settings`); // Assuming a settings page
  return { success: true, data: updated };
}

export async function removeChannelUser(channelId: string, userId: string) {
  const admin = await requireChannelMod(channelId);

  await prisma.subscription.delete({
    where: {
      userId_channelId: {
        userId,
        channelId,
      },
    },
  });

  await createAdminLog({
    adminId: admin.id,
    eventType: AdminLogType.ADMIN_ACTION,
    targetResource: `ChannelPermission:${channelId}:${userId}`,
    details: { action: "REMOVE_USER" }
  });

  revalidatePath(`/channels/${channelId}/settings`);
  return { success: true };
}

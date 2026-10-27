"use server";

import { prisma } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth.config";
import { ChannelRole, AdminLogType } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { createAdminLog } from "@/lib/admin-logger";

/**
 * Checks if the current user has moderator or owner permissions in a channel.
 * `isOwner` is true for the channel creator, an OWNER subscriber or a site admin.
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
  const isCreator = !!channel && channel.creatorId === session.user.id;
  const isChannelMod = subscription?.role === ChannelRole.MODERATOR || subscription?.role === ChannelRole.OWNER;

  if (!channel || (!isChannelMod && !isGlobalAdmin && !isCreator)) {
    throw new Error("You do not have permission to manage this channel.");
  }

  const isOwner = isGlobalAdmin || isCreator || subscription?.role === ChannelRole.OWNER;
  return { user: session.user, isOwner, creatorId: channel.creatorId };
}

const STAFF_ROLES: ChannelRole[] = [ChannelRole.MODERATOR, ChannelRole.OWNER];

/**
 * Why the acting user may not change `userId`'s membership (null when allowed). Nobody touches the
 * creator's row or their own; only owners may touch moderators/owners or hand out those roles.
 */
async function targetBlockReason(
  actor: Awaited<ReturnType<typeof requireChannelMod>>,
  channelId: string,
  userId: string,
  newRole?: ChannelRole,
): Promise<string | null> {
  if (userId === actor.creatorId) return "The channel creator's membership can't be changed.";
  if (userId === actor.user.id) return "You can't change your own membership.";

  const target = await prisma.subscription.findUnique({
    where: { userId_channelId: { userId, channelId } },
    select: { role: true },
  });
  if (!target) return "That user is not a member of this channel.";

  if (!actor.isOwner && (STAFF_ROLES.includes(target.role) || (newRole && STAFF_ROLES.includes(newRole)))) {
    return "Only the channel owner can manage moderators.";
  }
  return null;
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
  const actor = await requireChannelMod(channelId);
  const blocked = await targetBlockReason(actor, channelId, userId, role);
  if (blocked) return { success: false as const, error: blocked };

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
    adminId: actor.user.id,
    eventType: AdminLogType.ADMIN_ACTION,
    targetResource: `ChannelPermission:${channelId}:${userId}`,
    details: { action: "UPDATE_PERMISSIONS", role, permissions }
  });

  revalidatePath(`/channels/${channelId}/settings`); // Assuming a settings page
  return { success: true as const, data: updated };
}

export async function removeChannelUser(channelId: string, userId: string) {
  const actor = await requireChannelMod(channelId);
  const blocked = await targetBlockReason(actor, channelId, userId);
  if (blocked) return { success: false as const, error: blocked };

  await prisma.subscription.delete({
    where: {
      userId_channelId: {
        userId,
        channelId,
      },
    },
  });

  await createAdminLog({
    adminId: actor.user.id,
    eventType: AdminLogType.ADMIN_ACTION,
    targetResource: `ChannelPermission:${channelId}:${userId}`,
    details: { action: "REMOVE_USER" }
  });

  revalidatePath(`/channels/${channelId}/settings`);
  return { success: true as const };
}

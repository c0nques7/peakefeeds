"use server";

import { prisma } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth.config";
import { ChannelRole, AdminLogType } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { createAdminLog } from "@/lib/admin-logger";
import { z } from "zod";

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
    select: { creatorId: true, slug: true }
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
  return { user: session.user, isOwner, creatorId: channel.creatorId, slug: channel.slug };
}

const STAFF_ROLES: ChannelRole[] = [ChannelRole.MODERATOR, ChannelRole.OWNER];

/**
 * Why the acting user may not change `userId`'s membership (null when allowed). Nobody touches the
 * creator's row or their own; only owners may touch moderators/owners, hand out those roles, or
 * change the delete/pin flags (a member with `canDeletePosts` can delete anyone's unverified post).
 */
async function targetBlockReason(
  actor: Awaited<ReturnType<typeof requireChannelMod>>,
  channelId: string,
  userId: string,
  newRole?: ChannelRole,
  newFlags?: { canDeletePosts: boolean; canPinPosts: boolean },
): Promise<string | null> {
  if (userId === actor.creatorId) return "The channel creator's membership can't be changed.";
  if (userId === actor.user.id) return "You can't change your own membership.";

  const target = await prisma.subscription.findUnique({
    where: { userId_channelId: { userId, channelId } },
    select: { role: true, canDeletePosts: true, canPinPosts: true },
  });
  if (!target) return "That user is not a member of this channel.";

  if (!actor.isOwner && (STAFF_ROLES.includes(target.role) || (newRole && STAFF_ROLES.includes(newRole)))) {
    return "Only the channel owner can manage moderators.";
  }
  if (
    !actor.isOwner && newFlags &&
    (newFlags.canDeletePosts !== target.canDeletePosts || newFlags.canPinPosts !== target.canPinPosts)
  ) {
    return "Only the channel owner can change delete or pin permissions.";
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

// Server-action arguments arrive unchecked, so the payload is parsed strictly: an extra key
// (say `permissions.role`) must not slip past the role check below.
const UpdatePermissionsSchema = z.object({
  channelId: z.string().min(1),
  userId: z.string().min(1),
  role: z.nativeEnum(ChannelRole),
  permissions: z.object({
    canPost: z.boolean(),
    canComment: z.boolean(),
    canDeletePosts: z.boolean(),
    canPinPosts: z.boolean(),
  }).strict(),
}).strict();

export async function updateChannelPermissions(input: z.infer<typeof UpdatePermissionsSchema>) {
  const parsed = UpdatePermissionsSchema.safeParse(input);
  if (!parsed.success) return { success: false as const, error: "Invalid request." };
  const { channelId, userId, role, permissions } = parsed.data;

  const actor = await requireChannelMod(channelId);
  const blocked = await targetBlockReason(actor, channelId, userId, role, permissions);
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
      canPost: permissions.canPost,
      canComment: permissions.canComment,
      canDeletePosts: permissions.canDeletePosts,
      canPinPosts: permissions.canPinPosts,
    },
  });

  // Log the action if it's a role change or major permission change
  await createAdminLog({
    adminId: actor.user.id,
    eventType: AdminLogType.ADMIN_ACTION,
    targetResource: `ChannelPermission:${channelId}:${userId}`,
    details: { action: "UPDATE_PERMISSIONS", role, permissions }
  });

  revalidatePath(`/channels/${actor.slug}/settings`);
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

  revalidatePath(`/channels/${actor.slug}/settings`);
  return { success: true as const };
}

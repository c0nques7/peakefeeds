"use server";

import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/rbac";
import { revalidatePath } from "next/cache";
import { AdminLogType } from "@prisma/client";
import { createAdminLog } from "@/lib/admin-logger";

export async function getAllChannels() {
  await requireRole(["ADMIN"]);

  return await prisma.channel.findMany({
    include: {
      _count: {
        select: { subscribers: true, posts: true }
      },
      creator: {
        select: { id: true, username: true }
      }
    },
    orderBy: {
      createdAt: "desc"
    }
  });
}

export async function updateChannel(channelId: string, data: { name?: string, description?: string }) {
  const session = await requireRole(["ADMIN"]);

  try {
    const updated = await prisma.channel.update({
      where: { id: channelId },
      data
    });

    await createAdminLog({
      adminId: session.user.id,
      eventType: AdminLogType.ADMIN_ACTION,
      targetResource: `Channel:${channelId}`,
      details: { action: "CHANNEL_UPDATE", ...data }
    });

    revalidatePath("/admin/channels");
    return { success: true, data: updated };
  } catch (error) {
    return { error: "Failed to update channel." };
  }
}

export async function deleteChannel(channelId: string) {
  const session = await requireRole(["ADMIN"]);

  try {
    await prisma.channel.delete({
      where: { id: channelId }
    });

    await createAdminLog({
      adminId: session.user.id,
      eventType: AdminLogType.ADMIN_ACTION,
      targetResource: `Channel:${channelId}`,
      details: { action: "CHANNEL_DELETE" }
    });

    revalidatePath("/admin/channels");
    return { success: true };
  } catch (error) {
    return { error: "Failed to delete channel." };
  }
}

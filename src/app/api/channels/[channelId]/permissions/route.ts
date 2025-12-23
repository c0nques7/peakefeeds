import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth.config";
import { ChannelRole, AdminLogType } from "@prisma/client";
import { createAdminLog } from "@/lib/admin-logger";
import { z } from "zod";

/**
 * Authorization Helper
 */
async function checkAuth(channelId: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return { error: "Unauthorized", status: 401 };

  const [subscription, channel, user] = await Promise.all([
    prisma.subscription.findUnique({
      where: { userId_channelId: { userId: session.user.id, channelId } },
    }),
    prisma.channel.findUnique({
      where: { id: channelId },
      select: { creatorId: true },
    }),
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true },
    }),
  ]);

  const isGlobalAdmin = user?.role === "ADMIN";
  const isCreator = channel?.creatorId === session.user.id;
  const isChannelMod = subscription?.role === ChannelRole.MODERATOR || subscription?.role === ChannelRole.OWNER;

  if (!isChannelMod && !isGlobalAdmin && !isCreator) {
    return { error: "Forbidden", status: 403 };
  }

  return { user: session.user };
}

/**
 * GET /api/channels/[channelId]/permissions
 * Returns all user permissions for a specific channel.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { channelId: string } }
) {
  const { channelId } = await params;
  const auth = await checkAuth(channelId);
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  try {
    const permissions = await prisma.subscription.findMany({
      where: { channelId },
      include: {
        user: {
          select: { id: true, username: true, image: true, role: true },
        },
      },
      orderBy: { joinedAt: "asc" },
    });

    return NextResponse.json(permissions);
  } catch (error) {
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

const UpdatePermissionSchema = z.object({
  userId: z.string(),
  role: z.nativeEnum(ChannelRole),
  permissions: z.object({
    canPost: z.boolean(),
    canComment: z.boolean(),
    canDeletePosts: z.boolean(),
    canPinPosts: z.boolean(),
  }),
});

/**
 * POST /api/channels/[channelId]/permissions
 * Updates or sets permissions for a user in a channel.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { channelId: string } }
) {
  const { channelId } = await params;
  const auth = await checkAuth(channelId);
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  try {
    const body = await req.json();
    const validated = UpdatePermissionSchema.safeParse(body);

    if (!validated.success) {
      return NextResponse.json({ error: "Invalid Data", details: validated.error.format() }, { status: 400 });
    }

    const { userId, role, permissions } = validated.data;

    const updated = await prisma.subscription.update({
      where: { userId_channelId: { userId, channelId } },
      data: {
        role,
        ...permissions,
      },
    });

    await createAdminLog({
      adminId: auth.user.id,
      eventType: AdminLogType.ADMIN_ACTION,
      targetResource: `ChannelPermission:${channelId}:${userId}`,
      details: { action: "API_UPDATE_PERMISSIONS", role, permissions }
    });

    return NextResponse.json(updated);
  } catch (error) {
    return NextResponse.json({ error: "Failed to update permissions" }, { status: 500 });
  }
}

/**
 * DELETE /api/channels/[channelId]/permissions?userId=...
 * Removes a user from a channel.
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: { channelId: string } }
) {
  const { channelId } = await params;
  const auth = await checkAuth(channelId);
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("userId");

  if (!userId) {
    return NextResponse.json({ error: "Missing userId parameter" }, { status: 400 });
  }

  try {
    await prisma.subscription.delete({
      where: { userId_channelId: { userId, channelId } },
    });

    await createAdminLog({
      adminId: auth.user.id,
      eventType: AdminLogType.ADMIN_ACTION,
      targetResource: `ChannelPermission:${channelId}:${userId}`,
      details: { action: "API_REMOVE_USER" }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Failed to remove user" }, { status: 500 });
  }
}

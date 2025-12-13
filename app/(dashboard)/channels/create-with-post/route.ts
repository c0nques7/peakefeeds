import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth.config";

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { channelName, firstPost } = await request.json();
  
  // Convert "My Cool Channel" -> "my-cool-channel"
  const slug = channelName.toLowerCase().replace(/ /g, "-").replace(/[^a-z0-9-]/g, "");

  try {
    // Atomic Transaction: Create Channel -> Add Member -> Create Post
    await prisma.$transaction(async (tx) => {
      
      // 1. Create Channel
      const channel = await tx.channel.create({
        data: {
          name: channelName,
          slug,
          description: `Created by ${session.user.name}`,
          creatorId: session.user.id,
        }
      });

      // 2. Join Channel
      await tx.subscription.create({
        data: {
          userId: session.user.id,
          channelId: channel.id,
        },
      });

      // 3. Create First Post
      await tx.post.create({
        data: {
          content: firstPost,
          channelId: channel.id,
          authorId: session.user.id
        }
      });
    });

    return NextResponse.json({ success: true, slug });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Channel likely exists already" }, { status: 500 });
  }
}

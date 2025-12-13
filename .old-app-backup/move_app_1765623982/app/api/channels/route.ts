import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth.config";

// GET: List all channels
export async function GET() {
  try {
    const channels = await prisma.channel.findMany({
      take: 20,
      include: { _count: { select: { posts: true } } } // Count posts in each channel
    });
    return NextResponse.json(channels);
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch" }, { status: 500 });
  }
}

// POST: Create a new channel
export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { name, description, slug } = await request.json();

    const channel = await prisma.channel.create({
      data: {
        name,
        description,
        slug: slug.toLowerCase(), // Ensure URL-safe
        creatorId: session.user.id, 
      }
    });

    return NextResponse.json(channel);
  } catch (error) {
    return NextResponse.json({ error: "Channel slug already exists" }, { status: 500 });
  }
}

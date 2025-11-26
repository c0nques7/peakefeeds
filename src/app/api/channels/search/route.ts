import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q");

  if (!query || query.length < 2) return NextResponse.json([]);

  const channels = await prisma.channel.findMany({
    where: {
      OR: [
        { name: { contains: query, mode: 'insensitive' } },
        { slug: { contains: query, mode: 'insensitive' } }
      ]
    },
    take: 5,
    select: { id: true, name: true, slug: true, description: true }
  });

  return NextResponse.json(channels);
}

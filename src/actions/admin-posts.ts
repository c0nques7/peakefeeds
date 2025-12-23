"use server";

import { prisma } from "@/lib/db";
import { requireStaff } from "@/lib/rbac";

const ITEMS_PER_PAGE = 10;

export async function getAdminPosts({
  query = "",
  sort = "latest",
  page = 1,
}: {
  query?: string;
  sort?: string;
  page?: number;
}) {
  await requireStaff();
  const skip = (page - 1) * ITEMS_PER_PAGE;

  // Build the filter
  const where: any = {};
  
  if (query) {
    where.OR = [
      { content: { contains: query, mode: "insensitive" } },
      { author: { username: { contains: query, mode: "insensitive" } } },
    ];
  }

  // Build the sorter
  let orderBy: any = { createdAt: "desc" };
  if (sort === "reported") {
    orderBy = { reports: { _count: "desc" } };
  } else if (sort === "oldest") {
    orderBy = { createdAt: "asc" };
  } else if (sort === "popular") {
    orderBy = { likes: { _count: "desc" } };
  }

  try {
    const [posts, totalCount] = await Promise.all([
      prisma.post.findMany({
        where,
        take: ITEMS_PER_PAGE,
        skip,
        orderBy,
        include: {
          author: {
            select: { id: true, username: true, email: true, image: true },
          },
          channel: {
            select: { id: true, name: true, slug: true },
          },
          _count: {
            select: { likes: true, comments: true, reports: true },
          },
        },
      }),
      prisma.post.count({ where }),
    ]);

    const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);

    return { posts, totalPages };
  } catch (error) {
    console.error("Error fetching admin posts:", error);
    return { posts: [], totalPages: 0 };
  }
}

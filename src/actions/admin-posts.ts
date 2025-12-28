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

  // Build the filter for posts
  const postWhere: any = {};
  if (query) {
    postWhere.OR = [
      { id: query },
      { content: { contains: query, mode: "insensitive" } },
      { author: { username: { contains: query, mode: "insensitive" } } },
    ];
  }

  // Build the filter for comments
  const commentWhere: any = {};
  if (query) {
    commentWhere.OR = [
      { id: query },
      { content: { contains: query, mode: "insensitive" } },
      { author: { username: { contains: query, mode: "insensitive" } } },
    ];
  }

  // Build the sorter for posts
  let postOrderBy: any = { createdAt: "desc" };
  if (sort === "reported") {
    postOrderBy = { reports: { _count: "desc" } };
  } else if (sort === "oldest") {
    postOrderBy = { createdAt: "asc" };
  } else if (sort === "popular") {
    postOrderBy = { likesCount: "desc" };
  }

  try {
    const [posts, comments, postCount, commentCount] = await Promise.all([
      prisma.post.findMany({
        where: postWhere,
        take: ITEMS_PER_PAGE,
        skip,
        orderBy: postOrderBy,
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
      query ? prisma.comment.findMany({
        where: commentWhere,
        take: 5, // Just a few comments if searching
        include: {
          author: { select: { id: true, username: true } },
          post: { select: { id: true, content: true } }
        }
      }) : Promise.resolve([]),
      prisma.post.count({ where: postWhere }),
      query ? prisma.comment.count({ where: commentWhere }) : Promise.resolve(0),
    ]);

    const totalPages = Math.ceil(postCount / ITEMS_PER_PAGE);

    return { 
      posts, 
      comments: comments.map(c => ({
        ...c,
        type: 'COMMENT' as const
      })),
      totalPages,
      totalPosts: postCount,
      totalComments: commentCount
    };
  } catch (error) {
    console.error("Error fetching admin posts:", error);
    return { posts: [], comments: [], totalPages: 0 };
  }
}
"use server";

import { prisma } from "@/lib/db";
import { requireStaff } from "@/lib/rbac";
import { UserRole, Prisma } from "@prisma/client";

/**
 * Fetches a paginated list of users for the Admin Registry.
 * Supports filtering by Search Query (Username/Email), Role, and Ban Status.
 */
export async function getAdminUsers({
  query,
  role,
  status,
  page = 1,
}: {
  query?: string;
  role?: string;
  status?: "banned" | "active";
  page?: number;
}) {
  await requireStaff();

  const PAGE_SIZE = 20;
  const skip = (page - 1) * PAGE_SIZE;

  // Build the dynamic WHERE clause
  const where: Prisma.UserWhereInput = {};

  // 1. Text Search (Case insensitive)
  if (query) {
    where.OR = [
      { username: { contains: query, mode: "insensitive" } },
      { email: { contains: query, mode: "insensitive" } },
    ];
  }

  // 2. Role Filter
  if (role && role !== "ALL") {
    where.role = role as UserRole;
  }

  // 3. Status Filter
  if (status === "banned") {
    where.isBanned = true;
  } else if (status === "active") {
    where.isBanned = false;
  }

  // Execute queries in parallel
  const [users, totalCount] = await Promise.all([
    prisma.user.findMany({
      where,
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
        isBanned: true,
        strikeCount: true,
        createdAt: true,
        _count: {
            select: { 
                posts: true, 
                reportsAgainst: true 
            }
        }
      },
      orderBy: { createdAt: "desc" },
      take: PAGE_SIZE,
      skip,
    }),
    prisma.user.count({ where }),
  ]);

  return { users, totalCount, totalPages: Math.ceil(totalCount / PAGE_SIZE) };
}
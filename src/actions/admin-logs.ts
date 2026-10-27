"use server";

import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/rbac";
import { AdminLogType, Prisma } from "@prisma/client";

export async function getAdminLogs({
  adminId,
  eventType,
  search,
  page = 1,
  pageSize = 50,
}: {
  adminId?: string;
  eventType?: AdminLogType;
  search?: string;
  page?: number;
  pageSize?: number;
}) {
  await requireRole(["ADMIN"]);
  // Client-supplied paging: keep it to sane numbers
  const size = Math.min(Math.max(Math.trunc(pageSize) || 50, 1), 100);
  const current = Math.max(Math.trunc(page) || 1, 1);

  const where: Prisma.AdminLogWhereInput = {};

  if (adminId) {
    where.adminId = adminId;
  }

  if (eventType) {
    where.eventType = eventType;
  }

  if (search) {
    where.OR = [
      { targetResource: { contains: search, mode: "insensitive" } },
      { admin: { username: { contains: search, mode: "insensitive" } } },
    ];
  }

  const [logs, totalCount] = await Promise.all([
    prisma.adminLog.findMany({
      where,
      include: {
        admin: {
          select: {
            username: true,
            email: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      take: size,
      skip: (current - 1) * size,
    }),
    prisma.adminLog.count({ where }),
  ]);

  return {
    logs,
    totalCount,
    totalPages: Math.ceil(totalCount / size),
  };
}

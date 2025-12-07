"use server";

import { prisma } from "@/lib/db";
import { requireStaff } from "@/lib/rbac";

export async function getAdminDashboardStats() {
  // 1. Gatekeeper: Ensure only Admin/Mods can run this query
  await requireStaff();

  // 2. Run independent queries in parallel for performance
  const [
    pendingReports,
    totalUsers,
    bannedUsers,
    recentSignups
  ] = await Promise.all([
    // Count reports that are PENDING
    prisma.report.count({ 
      where: { status: "PENDING" } 
    }),
    
    // Count total registered users
    prisma.user.count(),
    
    // Count users who are banned
    prisma.user.count({ 
      where: { isBanned: true } 
    }),
    
    // Count users created in the last 24 hours
    prisma.user.count({
      where: {
        createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
      }
    })
  ]);

  return {
    pendingReports,
    totalUsers,
    bannedUsers,
    recentSignups
  };
}
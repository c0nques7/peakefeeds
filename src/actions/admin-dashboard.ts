"use server";

import { prisma } from "@/lib/db";
import { requireStaff } from "@/lib/rbac";

export async function getAdminDashboardStats() {
  await requireStaff();

  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

  // Run queries in parallel for speed
  const [
    waitlistCount,
    totalUsers,
    totalPosts,
    pendingReports,
    recentSignups // 🟢 Add this variable
  ] = await Promise.all([
    // 1. Demand
    prisma.waitlist.count({ where: { status: "PENDING" } }),
    
    // 2. Supply (Total)
    prisma.user.count(),
    
    // 3. Engagement
    prisma.post.count(),

    // 4. Safety
    prisma.report.count({ where: { status: "PENDING" } }),

    // 5. 🟢 Growth (Last 24h)
    prisma.user.count({
      where: {
        createdAt: {
          gte: twentyFourHoursAgo
        }
      }
    })
  ]);

  return {
    waitlistCount,
    totalUsers,
    totalPosts,
    pendingReports,
    recentSignups // 🟢 Return it here
  };
}
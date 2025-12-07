"use server";

import { prisma } from "@/lib/db";
import { requireStaff } from "@/lib/rbac";

export async function getAdminDashboardStats() {
  await requireStaff();

  // Run queries in parallel for speed
  const [
    waitlistCount,   // DEMAND: People waiting in line
    totalUsers,      // SUPPLY: Active registered users
    totalPosts,      // ENGAGEMENT: Content velocity
    pendingReports   // SAFETY: Work for moderators
  ] = await Promise.all([
    // 1. Demand
    prisma.waitlist.count({ 
      where: { status: "PENDING" } 
    }),
    
    // 2. Supply
    prisma.user.count(),
    
    // 3. Engagement
    prisma.post.count(),

    // 4. Safety
    prisma.report.count({ 
      where: { status: "PENDING" } 
    }),
  ]);

  return {
    waitlistCount,
    totalUsers,
    totalPosts,
    pendingReports
  };
}
import { getServerAuthSession } from "@/lib/auth.config";
import { UserRole } from "@prisma/client";
import { redirect } from "next/navigation";

/**
 * Verifies the current user has one of the given roles.
 * Returns the session if valid, or throws/redirects if not.
 */
export async function requireRole(requiredRoles: UserRole[]) {
  const session = await getServerAuthSession();

  if (!session || !session.user) {
    redirect("/api/auth/signin");
  }

  const userRole = session.user.role as UserRole;

  // Exact membership, no hierarchy: requireRole(["ADMIN"]) refuses moderators
  if (!requiredRoles.includes(userRole)) {
    throw new Error("Unauthorized: Insufficient permissions.");
  }

  return session;
}

/**
 * Helper to check if a user is essentially 'Staff' (Mod or Admin)
 */
export async function requireStaff() {
  return requireRole([UserRole.MODERATOR, UserRole.ADMIN]);
}
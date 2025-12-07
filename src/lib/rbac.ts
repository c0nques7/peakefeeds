import { getServerAuthSession } from "@/lib/auth.config"; // Assuming standard NextAuth v5 setup
import { UserRole } from "@prisma/client";
import { redirect } from "next/navigation";

// Define hierarchy for simple checks (optional, but useful)
const ROLE_HIERARCHY: Record<UserRole, number> = {
  STANDARD: 1,
  BUSINESS: 2,
  INFLUENCER: 2,
  FACT_CHECKER: 3,
  BOT: 1,
  GOVERNMENT: 3,
  MODERATOR: 4,
  ADMIN: 5,
};

/**
 * Verifies if the current user has at least the required role level.
 * Returns the session if valid, or throws/redirects if not.
 */
export async function requireRole(requiredRoles: UserRole[]) {
  const session = await getServerAuthSession();

  if (!session || !session.user) {
    redirect("/api/auth/signin");
  }

  const userRole = session.user.role as UserRole;

  if (!requiredRoles.includes(userRole)) {
    // If strict hierarchy check is needed:
    // if (ROLE_HIERARCHY[userRole] < ROLE_HIERARCHY[requiredRole]) ...
    
    // For now, strict inclusion check:
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
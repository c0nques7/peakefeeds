"use server";

import { prisma } from "@/lib/db";
import { requireStaff } from "@/lib/rbac";
import { UserRole, Prisma, AdminLogType } from "@prisma/client";
import { hash } from "argon2";
import { revalidatePath } from "next/cache";
import { randomBytes } from "crypto";
import { createAdminLog } from "@/lib/admin-logger";

// Email Infrastructure
import { Resend } from 'resend';
import { render } from "@react-email/render";
import { AdminWelcomeEmail } from "@/components/emails/AdminWelcomeEmail";

// Initialize Resend (Safe check)
const resend = process.env.RESEND_API_KEY 
  ? new Resend(process.env.RESEND_API_KEY) 
  : null;

/**
 * -------------------------------------------------------
 * 1. GET USERS (Registry Table Logic)
 * -------------------------------------------------------
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

  // Text Search (Case insensitive)
  if (query) {
    where.OR = [
      { username: { contains: query, mode: "insensitive" } },
      { email: { contains: query, mode: "insensitive" } },
    ];
  }

  // Role Filter
  if (role && role !== "ALL") {
    where.role = role as UserRole;
  }

  // Status Filter
  if (status === "banned") {
    where.isBanned = true;
  } else if (status === "active") {
    where.isBanned = false;
  }

  // Execute queries in parallel for performance
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

/**
 * -------------------------------------------------------
 * 2. CREATE USER (Admin Override Logic)
 * -------------------------------------------------------
 * Manually create a user. Skips waitlist.
 * Optionally generates invites and sends email credentials.
 */
export async function createUser(formData: FormData) {
  // 1. Security Check
  await requireStaff(); 

  const email = formData.get("email") as string;
  const username = formData.get("username") as string;
  const password = formData.get("password") as string;
  const role = formData.get("role") as UserRole;
  const shouldGenerateInvites = formData.get("generateInvites") === "on";

  // 2. Validation
  if (!email || !username || !password) {
    return { error: "Missing required fields." };
  }

  const existing = await prisma.user.findFirst({
    where: { OR: [{ email }, { username }] }
  });

  if (existing) {
    return { error: "User with this email or username already exists." };
  }

  try {
    const passwordHash = await hash(password);
    
    // 3. Database Transaction (Create User + Invites)
    await prisma.$transaction(async (tx) => {
      // A. Create the User
      const newUser = await tx.user.create({
        data: {
          email,
          username,
          passwordHash,
          role: role || "STANDARD",
          emailVerified: new Date(), // Auto-verify admin-created users
        }
      });

      // B. Optionally Mint 3 Golden Tickets
      if (shouldGenerateInvites) {
        for (let i = 0; i < 3; i++) {
          const code = `PEAKE-${randomBytes(3).toString("hex").toUpperCase()}`;
          await tx.inviteCode.create({
            data: {
              code: code,
              issuerId: newUser.id,
            }
          });
        }
      }
    });

    // 4. Send Welcome Email (Fire and forget logic / Await if critical)
    if (resend) {
      console.log(`[Resend] Sending Admin Welcome to ${email}...`);
      
      const loginLink = `${process.env.NEXTAUTH_URL}/login`;
      
      // Render the React Template to HTML
      const emailHtml = await render(
        AdminWelcomeEmail({ username, password, loginLink }) as React.ReactElement
      );

      const data = await resend.emails.send({
        from: 'Peake Feeds <onboarding@resend.dev>', // ⚠️ UPDATE THIS to your verified domain in Production
        to: email,
        subject: 'Your Peake Feeds Admin Account',
        html: emailHtml,
      });

      if (data.error) {
        console.error("[Resend] Error:", data.error);
      } else {
        console.log(`[Resend] Success (ID: ${data.data?.id})`);
      }
    } else {
      console.warn("[Resend] API Key missing. Welcome email skipped.");
    }

    revalidatePath("/admin/users");

    await createAdminLog({
      adminId: (await requireStaff()).user.id,
      eventType: AdminLogType.USER_UPDATE, // Or create new USER_CREATE type
      targetResource: `User:${username}`,
      details: { email, role, generatedInvites: shouldGenerateInvites }
    });

    return { success: true };

  } catch (err) {
    console.error("Create User Error:", err);
    return { error: "Failed to create user." };
  }
}
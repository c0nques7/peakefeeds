"use server";

/**
 * ARCHITECTURE NOTE:
 * This file contains "Server Actions" for the User Detail View.
 * It handles sensitive logic like banning users, changing roles, and 
 * triggering manual email notifications for testing/debugging.
 */

import { prisma } from "@/lib/db";
import { requireStaff, requireRole } from "@/lib/rbac";
import { UserRole, PenaltyType, AdminLogType } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { randomBytes } from "crypto";
import { createAdminLog } from "@/lib/admin-logger";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth.config";

// 🟢 NEW: Email Infrastructure
import { Resend } from 'resend';
import { render } from "@react-email/render";
import { WelcomeEmail } from "@/components/emails/WelcomeEmail";
import { ActivationEmail } from "@/components/emails/ActivationEmail";
import { AdminWelcomeEmail } from "@/components/emails/AdminWelcomeEmail";

// Initialize Resend safely
const resend = process.env.RESEND_API_KEY 
  ? new Resend(process.env.RESEND_API_KEY.trim()) 
  : null;

/**
 * 1. FETCH USER DETAILS
 * Fetches the specific user profile + their administrative history.
 */
export async function getUserDetails(userId: string) {
  await requireStaff();

  return await prisma.user.findUnique({
    where: { id: userId },
    include: {
      _count: {
        select: { 
          posts: true, 
          reportsAgainst: true, 
          penaltiesReceived: true 
        }
      },
      penaltiesReceived: {
        orderBy: { createdAt: "desc" },
        take: 5
      }
    }
  });
}

/**
 * 2. UPDATE ROLE
 * Updates a user's role (e.g., Standard -> Moderator).
 * Security: RESTRICTED TO ADMINS ONLY.
 */
export async function updateUserRole(userId: string, newRole: UserRole) {
  await requireRole(["ADMIN"]);

  await prisma.user.update({
    where: { id: userId },
    data: { role: newRole }
  });

  await createAdminLog({
    adminId: (await getServerSession(authOptions))?.user?.id || '', // Need better way to get ID here or pass it
    eventType: AdminLogType.USER_UPDATE,
    targetResource: `User:${userId}`,
    details: { action: "ROLE_CHANGE", newRole }
  });

  revalidatePath(`/admin/users/${userId}`);
  return { success: true };
}

/**
 * 3. BAN / UNBAN
 * The "Kill Switch". Wraps operation in a transaction for audit logging.
 */
export async function toggleBan(userId: string, shouldBan: boolean, reason?: string) {
  const session = await requireStaff();

  await prisma.$transaction(async (tx) => {
    // A. Update User Status
    await tx.user.update({
      where: { id: userId },
      data: { isBanned: shouldBan }
    });

    // B. Log to Penalty Table
    if (shouldBan) {
      await tx.penalty.create({
        data: {
          type: "PERMANENT_BAN",
          reason: reason || "Admin Manual Ban",
          userId: userId,
          issuerId: session.user.id,
          isActive: true
        }
      });
    }
  });

  await createAdminLog({
    adminId: session.user.id,
    eventType: AdminLogType.USER_UPDATE,
    targetResource: `User:${userId}`,
    details: { action: shouldBan ? "BAN" : "UNBAN", reason }
  });

  revalidatePath(`/admin/users/${userId}`);
  return { success: true };
}

/**
 * 4. MANUAL PASSWORD RESET
 * Generates a secure token. Currently logs to console (Update to Resend if you create a Reset Template).
 */
export async function sendManualPasswordReset(userId: string) {
  await requireStaff();

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true }
  });

  if (!user || !user.email) {
    throw new Error("User has no email address.");
  }

  const token = randomBytes(32).toString("hex");
  const expires = new Date(new Date().getTime() + 3600 * 1000); // 1 hour

  await prisma.verificationToken.upsert({
    where: {
      identifier_token: {
        identifier: user.email,
        token: token,
      }
    },
    update: { token, expires },
    create: {
      identifier: user.email,
      token,
      expires
    }
  });

  const resetLink = `${process.env.NEXTAUTH_URL}/reset-password?token=${token}&email=${user.email}`;
  
  // You can upgrade this to use Resend once you have a "ResetPasswordEmail" template.
  console.log("------------------------------------------------");
  console.log(`[ADMIN ACTION] Password Reset Link for ${user.email}:`);
  console.log(resetLink);
  console.log("------------------------------------------------");

  return { success: true, message: "Reset link generated (Check Server Console)" };
}

/**
 * 5. 🟢 NEW: MANUAL EMAIL TRIGGERS
 * Allows Admins to fire specific system emails for testing or onboarding.
 */
export async function triggerManualEmail(userId: string, type: "WELCOME" | "ACTIVATION" | "ADMIN_WELCOME") {
  await requireStaff();

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true, username: true }
  });

  if (!user || !user.email) return { error: "User has no email." };
  if (!resend) return { error: "Resend API Key missing." };

  try {
    let emailHtml;
    let subject;

    if (type === "WELCOME") {
      // 1. Standard Waitlist Welcome
      subject = "Welcome to the Truth Layer";
      emailHtml = await render(
        WelcomeEmail({ userEmail: user.email }) as React.ReactElement
      );
    } 
    else if (type === "ACTIVATION") {
      // 2. "You're In" Activation
      // We generate a dummy code for this manual trigger so the email looks real
      const code = `TEST-${randomBytes(3).toString("hex").toUpperCase()}`;
      const registerLink = `${process.env.NEXTAUTH_URL}/register`;
      
      subject = "You're In! Welcome to Peake Feeds";
      emailHtml = await render(
        ActivationEmail({ inviteCode: code, registerLink }) as React.ReactElement
      );
    } 
    else if (type === "ADMIN_WELCOME") {
      // 3. Admin Credentials
      // We cannot retrieve the password hash, so we send a placeholder prompting a reset.
      const loginLink = `${process.env.NEXTAUTH_URL}/login`;
      
      subject = "Your Peake Feeds Admin Account";
      emailHtml = await render(
        AdminWelcomeEmail({ 
          username: user.username || "Admin", 
          password: "[Hidden - Please Reset]", 
          loginLink 
        }) as React.ReactElement
      );
    }

    if (emailHtml && subject) {
      await resend.emails.send({
        from: 'Peake Feeds <onboarding@resend.dev>', // Update to your verified domain in Prod
        to: user.email,
        subject: subject,
        html: emailHtml,
      });
    }

    return { success: true };
  } catch (err) {
    console.error("Manual Email Error:", err);
    return { error: "Failed to send email." };
  }
}

/**
 * 6. DISCONNECT WALLET
 * Removes the wallet address from a user's profile for troubleshooting.
 */
export async function disconnectWallet(userId: string) {
  const session = await requireStaff();

  await prisma.user.update({
    where: { id: userId },
    data: { walletAddress: null }
  });

  await createAdminLog({
    adminId: session.user.id,
    eventType: AdminLogType.USER_UPDATE,
    targetResource: `User:${userId}`,
    details: { action: "WALLET_DISCONNECT" }
  });

  revalidatePath(`/admin/users/${userId}`);
  return { success: true };
}

/**
 * 7. UPDATE USER DETAILS
 * Modifies basic profile information: name, username, email.
 */
export async function updateUserDetails(userId: string, data: { name?: string | null, username?: string | null, email?: string | null }) {
  const session = await requireStaff();

  try {
    // Check if username or email is already taken by another user
    if (data.username) {
      const existingUsername = await prisma.user.findFirst({
        where: { 
          username: data.username,
          NOT: { id: userId }
        }
      });
      if (existingUsername) return { error: "Username is already taken." };
    }

    if (data.email) {
      const existingEmail = await prisma.user.findFirst({
        where: { 
          email: data.email,
          NOT: { id: userId }
        }
      });
      if (existingEmail) return { error: "Email is already taken." };
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        name: data.name,
        username: data.username,
        email: data.email,
      }
    });

    await createAdminLog({
      adminId: session.user.id,
      eventType: AdminLogType.USER_UPDATE,
      targetResource: `User:${userId}`,
      details: { action: "PROFILE_UPDATE", updatedFields: Object.keys(data) }
    });

    revalidatePath(`/admin/users/${userId}`);
    revalidatePath("/admin/users");
    
    return { success: true, user: updatedUser };
  } catch (err) {
    console.error("Update User Error:", err);
    return { error: "An unexpected error occurred." };
  }
}

/**
 * 8. FETCH USER ACTIVITY
 * Fetches recent actions (posts, comments, likes) to build an activity timeline.
 */
export async function getUserActivity(userId: string) {
  await requireStaff();

  const [posts, comments, reactions] = await Promise.all([
    prisma.post.findMany({
      where: { authorId: userId },
      take: 10,
      orderBy: { createdAt: "desc" },
      include: { channel: { select: { slug: true } } }
    }),
    prisma.comment.findMany({
      where: { authorId: userId },
      take: 10,
      orderBy: { createdAt: "desc" },
      include: { post: { include: { channel: { select: { slug: true } } } } }
    }),
    prisma.reaction.findMany({
      where: { userId: userId },
      take: 10,
      orderBy: { createdAt: "desc" },
      include: { post: { include: { channel: { select: { slug: true } } } } }
    })
  ]);

  const activity = [
    ...posts.map(p => ({ 
      id: p.id, type: "POST", content: p.content, date: p.createdAt, 
      metadata: { postType: p.type, channelSlug: p.channel.slug } 
    })),
    ...comments.map(c => ({ 
      id: c.id, type: "COMMENT", content: c.content, date: c.createdAt, 
      metadata: { postId: c.postId, channelSlug: c.post.channel.slug } 
    })),
    ...reactions.map(r => ({ 
      id: r.id, type: "REACTION", content: r.type, date: r.createdAt, 
      metadata: { postId: r.postId, postTitle: r.post.title || r.post.content.substring(0, 50), channelSlug: r.post.channel.slug } 
    }))
  ].sort((a, b) => b.date.getTime() - a.date.getTime()).slice(0, 15);

  return activity;
}

/**
 * 9. FETCH COMMENT DETAILS
 * Fetches a specific comment and its parent post info for moderation.
 */
export async function getCommentDetails(commentId: string) {
  await requireStaff();

  return await prisma.comment.findUnique({
    where: { id: commentId },
    include: {
      post: {
        select: { id: true, title: true, content: true }
      }
    }
  });
}
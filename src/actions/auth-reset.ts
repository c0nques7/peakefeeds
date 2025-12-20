"use server";

import { prisma } from "@/lib/db";
import { randomBytes } from "crypto";
import * as argon2 from "argon2";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { Resend } from "resend";
import { render } from "@react-email/render";
import { ResetPasswordEmail } from "@/components/emails/ResetPasswordEmail";

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

/**
 * 1. REQUEST FLOW
 * User enters email -> We generate token -> We "send" email
 */
export async function requestPasswordReset(formData: FormData) {
  const email = formData.get("email") as string;

  if (!email || typeof email !== "string") {
    return { error: "Please provide a valid email address." };
  }

  // 1. Check if user exists (Silent fail if not, for security)
  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase() }
  });

  if (user) {
    // RATE LIMIT: check for a recently-created token and short-circuit
    // We don't store createdAt on VerificationToken, but tokens are created with a 1 hour expiry
    // so we can infer createdAt = expires - 1 hour. We'll enforce a 10 minute cooldown.
    const existing = await prisma.verificationToken.findFirst({
      where: { identifier: email.toLowerCase() },
      orderBy: { expires: 'desc' }
    });

    const TOKEN_LIFETIME_MS = 3600 * 1000; // 1 hour
    const COOLDOWN_MS = 10 * 60 * 1000; // 10 minutes

    if (existing) {
      const createdAt = new Date(existing.expires.getTime() - TOKEN_LIFETIME_MS);
      if (Date.now() - createdAt.getTime() < COOLDOWN_MS) {
        // Too soon; silently return success to avoid leaking info
        return { success: true };
      }
    }

    // 2. Generate secure token
    const token = randomBytes(32).toString("hex");
    const expires = new Date(new Date().getTime() + TOKEN_LIFETIME_MS); // 1 hour

    // 3. Upsert in VerificationToken table: delete old tokens for identifier then create new
    // Simpler and more explicit: delete any existing tokens for identifier, then create a new one.
    try {
      await prisma.verificationToken.deleteMany({ where: { identifier: email.toLowerCase() } });
    } catch (err) {
      // ignore
    }

    await prisma.verificationToken.create({
      data: {
        identifier: email.toLowerCase(),
        token,
        expires
      }
    });

    // 4. Build reset link and send via Resend (if configured) or fallback to logging
    let baseUrl = process.env.NEXTAUTH_URL;
    if (!baseUrl) {
      const headersList = headers();
      const host = headersList.get("host");
      const protocol = headersList.get("x-forwarded-proto") || (host?.includes("localhost") ? "http" : "https");
      if (host) {
        baseUrl = `${protocol}://${host}`;
      } else {
        baseUrl = "http://localhost:3000";
      }
    }
    const resetLink = `${baseUrl}/reset-password?token=${token}&email=${encodeURIComponent(email.toLowerCase())}`;

    if (resend) {
      try {
        console.log('[EMAIL] Resend provider configured — attempting to send reset email to', email);
        const html = await render(ResetPasswordEmail({ userEmail: email, resetLink } as any) as React.ReactElement);
        const resp = await resend.emails.send({
          from: 'Peake Feeds <security@peakefeeds.com>',
          to: email,
          subject: 'Reset your Peake Feeds password',
          html
        });
        console.log('[EMAIL] Resend send response:', resp);
      } catch (err) {
        console.error('Password reset email send failed:', err);
        console.log('[EMAIL] Falling back to console link log for', email);
        console.log(`[SELF-SERVICE] Password Reset Requested for ${email}`);
        console.log(`Link: ${resetLink}`);
      }
    } else {
      console.log('[EMAIL] No Resend provider configured (RESEND_API_KEY missing)');
      // No email provider configured — log the reset link for developer/staging
      console.log('------------------------------------------------');
      console.log(`[SELF-SERVICE] Password Reset Requested for ${email}`);
      console.log(`Link: ${resetLink}`);
      console.log('------------------------------------------------');
    }
  }

  // Always return success to prevent Email Enumeration attacks
  return { success: true };
}

/**
 * 2. RESET FLOW
 * User clicks link -> Enters new password -> We update DB
 */
export async function completePasswordReset(token: string, email: string, formData: FormData) {
  const password = formData.get("password") as string;
  const confirm = formData.get("confirm") as string;

  if (!password || password.length < 8) {
    return { error: "Password must be at least 8 characters." };
  }
  if (password !== confirm) {
    return { error: "Passwords do not match." };
  }

  // 1. Verify Token matches Email and is Active
  const record = await prisma.verificationToken.findFirst({
    where: {
      identifier: email.toLowerCase(),
      token: token,
      expires: { gt: new Date() } // Must be in the future
    }
  });

  if (!record) {
    return { error: "Invalid or expired reset token. Please request a new one." };
  }

  // 2. Hash new password
  const passwordHash = await argon2.hash(password);

  // 3. Update User & Delete Token (Transaction)
  await prisma.$transaction([
    prisma.user.update({
      where: { email: email.toLowerCase() },
      data: { passwordHash: passwordHash }
    }),
    prisma.verificationToken.delete({
      where: {
        identifier_token: {
          identifier: email.toLowerCase(),
          token: token
        }
      }
    })
  ]);

  redirect("/login?reset=success");
}
"use server";

import { prisma } from "@/lib/db";
import { randomBytes } from "crypto";
import * as argon2 from "argon2";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { Resend } from "resend";
import { render } from "@react-email/render";
import { ResetPasswordEmail } from "@/components/emails/ResetPasswordEmail";
import React from "react";

// Initialize Resend
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

/**
 * 1. REQUEST FLOW
 * Triggered when user submits the "Forgot Password" form.
 */
export async function requestPasswordReset(formData: FormData) {
  const email = formData.get("email") as string;

  if (!email || typeof email !== "string") {
    return { error: "Please provide a valid email address." };
  }

  // 1. Check if user exists
  const normalizedEmail = email.toLowerCase();
  const user = await prisma.user.findUnique({
    where: { email: normalizedEmail }
  });

  // Security: If user doesn't exist, we still return success to prevent email enumeration.
  if (user) {
    // 2. Rate Limiting (10 minute cooldown)
    const existing = await prisma.verificationToken.findFirst({
      where: { identifier: email.toLowerCase() },
      orderBy: { expires: 'desc' }
    });

    const TOKEN_LIFETIME_MS = 3600 * 1000; // 1 hour
    const COOLDOWN_MS = 10 * 60 * 1000;    // 10 minutes

    if (existing) {
      const createdAt = new Date(existing.expires.getTime() - TOKEN_LIFETIME_MS);
      if (Date.now() - createdAt.getTime() < COOLDOWN_MS) {
        console.log(`[AUTH] Reset requested too soon for ${email}. Cooldown active.`);
        return { success: true }; 
      }
    }

    // 3. Generate Token
    const token = randomBytes(32).toString("hex");
    const expires = new Date(new Date().getTime() + TOKEN_LIFETIME_MS);

    // 4. Save Token to Database
    try {
      await prisma.verificationToken.deleteMany({ where: { identifier: email.toLowerCase() } });
      await prisma.verificationToken.create({
        data: {
          identifier: email.toLowerCase(),
          token,
          expires
        }
      });
    } catch (dbErr) {
      console.error("[DB ERROR] Failed to store reset token:", dbErr);
      return { error: "Database error. Please try again later." };
    }

    // 5. Construct Reset Link
    let baseUrl = process.env.NEXTAUTH_URL;
    if (!baseUrl) {
      // 🟢 NEXT.JS 15 FIX: must await headers()
      const headersList = await headers();
      const host = headersList.get("host");
      const protocol = headersList.get("x-forwarded-proto") || (host?.includes("localhost") ? "http" : "https");
      baseUrl = host ? `${protocol}://${host}` : "http://localhost:3000";
    }
    const resetLink = `${baseUrl}/reset-password?token=${token}&email=${encodeURIComponent(email.toLowerCase())}`;

    // 6. Send Email via Resend
    if (resend) {
      try {
        console.log(`[RESEND] Rendering email template for ${email}...`);
        
        const html = await render(
          React.createElement(ResetPasswordEmail, { 
            userEmail: email, 
            resetLink 
          } as any)
        );

        console.log(`[RESEND] Sending from security@peakefeeds.com to ${email}...`);
        
        const { data, error } = await resend.emails.send({
          from: 'Peake Feeds <security@peakefeeds.com>',
          to: email,
          subject: 'Reset your Peake Feeds password',
          html
        });

        if (error) {
          console.error('[RESEND ERROR] API returned error:', error.name, error.message);
          // If you see "Domain not verified" here, you must verify peakefeeds.com in the Resend dashboard.
          throw new Error(error.message);
        }

        console.log('[RESEND SUCCESS] Email sent successfully. ID:', data?.id);

      } catch (err) {
        console.error('[RESEND CRITICAL] Failed to dispatch email:', err);
        // Fallback: Log link to console so developers can still test if email fails
        console.log(`\n------------------------------------------------`);
        console.log(`[STAGING FALLBACK] RESET LINK for ${email}:`);
        console.log(resetLink);
        console.log(`------------------------------------------------\n`);
      }
    } else {
      console.warn('[CONFIG] RESEND_API_KEY is missing. No email will be sent.');
      console.log(`[LOCAL DEV] Reset Link: ${resetLink}`);
    }
  }

  // Always return success to client for security
  return { success: true };
}

/**
 * 2. RESET FLOW
 * Triggered when user submits the "New Password" form.
 */
export async function completePasswordReset(token: string, email: string, formData: FormData) {
  const password = formData.get("password") as string;
  const confirm = formData.get("confirm") as string;

  // Basic Validation
  if (!password || password.length < 8) {
    return { error: "Password must be at least 8 characters long." };
  }
  if (password !== confirm) {
    return { error: "Passwords do not match." };
  }

  // 1. Verify Token exists and hasn't expired
  const record = await prisma.verificationToken.findFirst({
    where: {
      identifier: email.toLowerCase(),
      token: token,
      expires: { gt: new Date() } 
    }
  });

  if (!record) {
    return { error: "Invalid or expired reset token. Please request a new one." };
  }

  // 2. Hash new password
  const passwordHash = await argon2.hash(password);

  // 3. Update User & Cleanup Token (Transaction)
  try {
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
  } catch (err) {
    console.error("[DB ERROR] Final password update failed:", err);
    return { error: "Failed to update password. Please try again." };
  }

  // Success redirect
  redirect("/login?reset=success");
}


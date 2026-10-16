import { PrismaAdapter } from "@next-auth/prisma-adapter";
import { NextAuthOptions, getServerSession } from "next-auth";
import { prisma } from "@/lib/db";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import * as argon2 from "argon2";
import { authenticator } from "otplib";
import { getSessionAccountStatus, isBanned } from "@/lib/penalties";
import { claimInviteForNewGoogleUser, decideGoogleSignIn } from "@/lib/google-signup";

// Google sign-in is only offered when its credentials are configured
const googleEnabled = !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" },
  // Errors (e.g. a refused Google sign-in) come back to the login page, which explains them
  pages: { signIn: "/login", error: "/login" },
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        twoFactorCode: { label: "2FA Code", type: "text" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const user = await prisma.user.findUnique({
          where: { email: credentials.email.toLowerCase() },
          // Fetch the roles/wallet here
          select: { 
            id: true, 
            email: true, 
            name: true, 
            username: true, 
            passwordHash: true, 
            role: true, 
            walletAddress: true,
            twoFactorEnabled: true,
            twoFactorSecret: true,
            isBanned: true,
            bannedUntil: true,
            mutedUntil: true
          }
        });

        if (!user || !user.passwordHash) return null;
        const isValid = await argon2.verify(user.passwordHash, credentials.password);
        if (!isValid) return null;

        // Checked after the password so the error doesn't reveal ban status to strangers
        if (isBanned(user)) {
          throw new Error(user.bannedUntil && !user.isBanned
            ? `ACCOUNT_SUSPENDED:${user.bannedUntil.toISOString()}`
            : "ACCOUNT_SUSPENDED");
        }

        if (user.twoFactorEnabled) {
          if (!credentials.twoFactorCode || credentials.twoFactorCode === "undefined" || credentials.twoFactorCode === "") {
            throw new Error("2FA_REQUIRED");
          }

          if (!user.twoFactorSecret) {
            return null;
          }

          const isValidToken = authenticator.verify({
            token: credentials.twoFactorCode,
            secret: user.twoFactorSecret
          });

          if (!isValidToken) {
            throw new Error("INVALID_2FA_CODE"); 
          }
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          username: user.username,
          role: user.role, // Prisma Enum
          walletAddress: user.walletAddress,
        };
      }
    }),
    ...(googleEnabled ? [GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      // Google verifies email addresses (checked again in decideGoogleSignIn), so an existing
      // email-and-password account with the same address is linked rather than duplicated
      allowDangerousEmailAccountLinking: true,
    })] : []),
  ],
  events: {
    async createUser({ user }) {
      // Only Google creates users through the adapter; email sign-up creates them directly
      await claimInviteForNewGoogleUser(user.id, user.email);
    },
  },
  callbacks: {
    async signIn({ account, profile }) {
      if (account?.provider !== "google") return true; // the credentials provider checks in authorize()
      return decideGoogleSignIn({
        providerAccountId: account.providerAccountId,
        email: profile?.email,
        emailVerified: (profile as { email_verified?: boolean } | undefined)?.email_verified === true,
      });
    },
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.walletAddress = user.walletAddress;
        token.username = user.username;
      }

      // End sessions of banned or deleted users (throwing makes next-auth clear the session),
      // and pick up role, username and linked-wallet changes. Cached for up to a minute per server instance.
      if (token.id) {
        const status = await getSessionAccountStatus(token.id as string);
        if (!status || isBanned(status)) throw new Error("ACCOUNT_SUSPENDED");
        token.role = status.role;
        token.walletAddress = status.walletAddress;
        token.username = status.username;
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id;
        session.user.role = token.role;
        session.user.walletAddress = token.walletAddress;
        session.user.username = token.username;
      }
      return session;
    }
  }
};

/**
 * Wrapper for getServerSession so you don't need to import authOptions in every file.
 */
export const getServerAuthSession = () => getServerSession(authOptions);
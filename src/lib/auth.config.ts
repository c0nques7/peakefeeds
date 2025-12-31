import { PrismaAdapter } from "@next-auth/prisma-adapter";
import { NextAuthOptions, getServerSession } from "next-auth";
import { prisma } from "@/lib/db";
import CredentialsProvider from "next-auth/providers/credentials";
import * as argon2 from "argon2";
import { authenticator } from "otplib";

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
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
            twoFactorSecret: true
          }
        });

        if (!user || !user.passwordHash) return null;
        const isValid = await argon2.verify(user.passwordHash, credentials.password);
        if (!isValid) return null;

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
    })
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.walletAddress = user.walletAddress;
        token.username = user.username;
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
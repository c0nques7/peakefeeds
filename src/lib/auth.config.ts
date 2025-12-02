import { PrismaAdapter } from "@next-auth/prisma-adapter"
import { NextAuthOptions, DefaultSession } from "next-auth"
import { DefaultJWT } from "next-auth/jwt"
import CredentialsProvider from "next-auth/providers/credentials"
import { prisma } from "@/lib/db"
import * as argon2 from "argon2"

// ---------------------------------------------------------
// 1. TYPE AUGMENTATION (FIXED)
// ---------------------------------------------------------
declare module "next-auth" {
  interface Session {
    user: {
      id: string
      // FIX: Allow null/undefined to match Prisma's "String?" and NextAuth defaults
      username?: string | null 
      role: string
    } & DefaultSession["user"]
  }

  interface User {
    // FIX: Match Prisma's return type exactly
    username?: string | null
    role: string
  }
}

declare module "next-auth/jwt" {
  interface JWT extends DefaultJWT {
    id: string
    username?: string | null
    role: string
  }
}

// ---------------------------------------------------------
// 2. CONFIGURATION
// ---------------------------------------------------------
export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/login",
  },
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
          select: {
            id: true,
            email: true,
            name: true,
            username: true,
            passwordHash: true,
            role: true, 
          }
        })

        if (!user) return null
        if (!user.passwordHash) return null

        const isValid = await argon2.verify(user.passwordHash, credentials.password)

        if (!isValid) return null

        // 💡 FIX: Return object matches interface User exactly now
        return {
          id: user.id,
          email: user.email,
          name: user.name,
          username: user.username, 
          role: user.role as string, // Cast Enum to string to satisfy interface
        }
      }
    })
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.username = user.username
        token.role = user.role
      }
      return token
    },

    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id
        session.user.username = token.username
        session.user.role = token.role
      }
      return session
    },

    async redirect({ url, baseUrl }) {
      if (url === '/login' || url === `${baseUrl}/login`) {
        return `${baseUrl}/home`
      }
      if (url.startsWith("/")) return `${baseUrl}${url}`
      else if (new URL(url).origin === baseUrl) return url
      return `${baseUrl}/home`
    }
  }
}
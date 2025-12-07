import { UserRole } from "@prisma/client" // 👈 Import this
import NextAuth, { DefaultSession } from "next-auth"

declare module "next-auth" {
  interface Session {
    user: {
      id: string
      username?: string | null 
      role: UserRole // 👈 Strict Typing
      walletAddress?: string | null
    } & DefaultSession["user"]
  }

  interface User {
    id: string
    username?: string | null
    role: UserRole // 👈 Strict Typing
    walletAddress?: string | null
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string
    username?: string | null
    role: UserRole // 👈 Strict Typing
    walletAddress?: string | null
  }
}
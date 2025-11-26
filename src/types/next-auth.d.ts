import NextAuth, { DefaultSession } from "next-auth"

declare module "next-auth" {
  /**
   * Returned by `useSession`, `getSession` and received as a prop on the `SessionProvider` React Context
   */
  interface Session {
    user: {
      id: string
      // Allow null/undefined to match Prisma schema
      username?: string | null 
    } & DefaultSession["user"]
  }

  interface User {
    id: string
    // Allow null/undefined to match Prisma schema
    username?: string | null
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string
    username?: string | null
  }
}
import { PrismaAdapter } from "@next-auth/prisma-adapter"
import { NextAuthOptions } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import { prisma } from "@/lib/db"
import * as argon2 from "argon2"

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
            walletAddress: true, // 🟢 1. FETCH FROM DB
          }
        })

        if (!user) return null
        if (!user.passwordHash) return null

        const isValid = await argon2.verify(user.passwordHash, credentials.password)

        if (!isValid) return null

        // 🟢 2. RETURN TO JWT CALLBACK
        return {
          id: user.id,
          email: user.email,
          name: user.name,
          username: user.username, 
          role: user.role as string,
          walletAddress: user.walletAddress, 
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
        token.walletAddress = user.walletAddress // 🟢 3. ADD TO TOKEN
      }
      return token
    },

    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id
        session.user.username = token.username
        session.user.role = token.role
        session.user.walletAddress = token.walletAddress // 🟢 4. ADD TO SESSION
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
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
    signIn: "/login", // Custom login page
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
          where: { email: credentials.email }
        })

        // 1. Check if user exists
        if (!user) return null

        // 2. Check if user has a password (they might have signed up via OAuth)
        if (!user.passwordHash) return null

        // 3. Verify Password (Argon2)
        const isValid = await argon2.verify(user.passwordHash, credentials.password)

        if (!isValid) return null

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          username: user.username
        }
      }
    })
  ],
  callbacks: {
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string
        session.user.username = token.username as string
      }
      return session
    },
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.username = user.username
      }
      return token
    },

    async redirect({ url, baseUrl }) {
      // 1. If the user is coming from the login page, force them to /home
      if (url === '/login' || url === `${baseUrl}/login`) {
        return `${baseUrl}/home`
      }
      
      // 2. Allow relative internal callbacks (e.g., /channels/tech-talks)
      if (url.startsWith("/")) return `${baseUrl}${url}`
      
      // 3. Allow absolute internal callbacks
      else if (new URL(url).origin === baseUrl) return url
      
      // 4. Default fallback
      return `${baseUrl}/home`
    }
  }
}
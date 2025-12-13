import { prisma } from "@/lib/db"
import { NextResponse } from "next/server"
import * as argon2 from "argon2"
import { z } from "zod"

// Strict validation schema
const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  username: z.string().min(3),
  name: z.string().optional()
})

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { email, password, username, name } = registerSchema.parse(body)

    // Check for existing user
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { email },
          { username }
        ]
      }
    })

    if (existingUser) {
      return NextResponse.json({ message: "User already exists" }, { status: 409 })
    }

    // 🔑 HASHING STEP: Critical for the 401 fix
    const passwordHash = await argon2.hash(password)

    const user = await prisma.user.create({
      data: {
        email,
        username,
        name,
        passwordHash, // Writing to the correct schema field
      }
    })

    // Return the user without the sensitive hash
    const { passwordHash: _, ...safeUser } = user

    return NextResponse.json({ user: safeUser, message: "User created successfully" }, { status: 201 })
  } catch (error) {
    console.error("Registration Error:", error)
    return NextResponse.json({ message: "Internal Server Error" }, { status: 500 })
  }
}
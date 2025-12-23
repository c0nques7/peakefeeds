import { PrismaClient } from '@prisma/client'
import { hash } from "argon2";
import { randomBytes } from "crypto";

const prisma = new PrismaClient()

async function registerUserLogic(username: string, email: string, password: string, inviteCode: string) {
  // 2. Validate Invite Code
  const validInvite = await prisma.inviteCode.findUnique({
    where: { code: inviteCode.trim().toUpperCase() }
  });

  if (!validInvite) {
    return { error: "Invalid invite code." };
  }
  if (validInvite.usedAt) {
    return { error: "This invite code has already been claimed." };
  }

  // 3. Check for existing users
  const existingUser = await prisma.user.findFirst({
    where: {
      OR: [
        { email: email },
        { username: username }
      ]
    }
  });

  if (existingUser) {
    return { error: "Email or Username already taken." };
  }

  // 4. Create User & Consume Invite & Mint New Invites
  const passwordHash = await hash(password);

  try {
    const result = await prisma.$transaction(async (tx) => {
      // A. Create the User
      const newUser = await tx.user.create({
        data: {
          username,
          email,
          passwordHash,
          inviteUsed: {
            connect: { id: validInvite.id }
          }
        }
      });

      // B. Mark the Incoming Invite as Used
      await tx.inviteCode.update({
        where: { id: validInvite.id },
        data: {
          usedAt: new Date(),
          usedById: newUser.id
        }
      });

      // C. Mint 3 Golden Tickets
      for (let i = 0; i < 3; i++) {
        const code = `PEAKE-${randomBytes(3).toString("hex").toUpperCase()}`;
        await tx.inviteCode.create({
          data: {
            code: code,
            issuerId: newUser.id,
          }
        });
      }
      return newUser;
    });

    return { success: true, user: result };
  } catch (err) {
    console.error("Registration Error:", err);
    return { error: "Registration failed." };
  }
}

async function test() {
    const res = await registerUserLogic("testuser_" + Date.now(), "test" + Date.now() + "@example.com", "Password123!", "GOLDEN-TICKET");
    console.log(res);
}

test()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect())

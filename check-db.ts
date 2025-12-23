import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
  const userCount = await prisma.user.count()
  const usedInvites = await prisma.inviteCode.findMany({
    where: { usedAt: { not: null } },
    include: { usedBy: true }
  })
  console.log('User Count:', userCount)
  console.log('Used Invites:', JSON.stringify(usedInvites, null, 2))
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect())

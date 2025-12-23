import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
  const codes = await prisma.inviteCode.findMany({
    where: { usedAt: null },
    take: 5
  })
  console.log('Available Codes:', codes.map(c => c.code))
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect())

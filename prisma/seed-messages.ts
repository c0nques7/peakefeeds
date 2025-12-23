import { PrismaClient } from '@prisma/client';
import { faker } from '@faker-js/faker';

const prisma = new PrismaClient();

async function main() {
  console.log('--- Seeding Test Messages ---');

  // 1. Find the target user (you)
  const targetUser = await prisma.user.findUnique({
    where: { username: 'c07' }
  });

  if (!targetUser) {
    console.error('Target user not found. Please make sure you are registered.');
    return;
  }

  console.log(`Targeting user: ${targetUser.username} (${targetUser.id})`);

  // 2. Get some other users to send messages
  const otherUsers = await prisma.user.findMany({
    where: {
      id: { not: targetUser.id },
      role: 'STANDARD'
    },
    take: 5
  });

  if (otherUsers.length < 3) {
    console.error('Not enough other users found to seed messages.');
    return;
  }

  // 3. Create conversations and messages
  for (const sender of otherUsers) {
    // Check if conversation exists
    let conversation = await prisma.conversation.findFirst({
      where: {
        AND: [
          { participants: { some: { id: targetUser.id } } },
          { participants: { some: { id: sender.id } } }
        ]
      }
    });

    if (!conversation) {
      conversation = await prisma.conversation.create({
        data: {
          participants: {
            connect: [
              { id: targetUser.id },
              { id: sender.id }
            ]
          }
        }
      });
    }

    // Add a few messages
    const messageCount = faker.number.int({ min: 2, max: 5 });
    for (let i = 0; i < messageCount; i++) {
      const isFromTarget = i % 3 === 0; // Occasionally from you
      await prisma.directMessage.create({
        data: {
          content: isFromTarget ? faker.lorem.sentence() : faker.lorem.sentences({ min: 1, max: 3 }),
          conversationId: conversation.id,
          senderId: isFromTarget ? targetUser.id : sender.id,
          createdAt: faker.date.recent({ days: 1 })
        }
      });
    }

    // Update lastMessageAt
    await prisma.conversation.update({
      where: { id: conversation.id },
      data: { lastMessageAt: new Date() }
    });
  }

  console.log(`Successfully seeded messages from ${otherUsers.length} users into your inbox.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

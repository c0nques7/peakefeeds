import { prisma } from '@/lib/db';

/**
 * The one-to-one conversation between two different users, created if they have none yet.
 * Matches only conversations whose participants are exactly these two.
 */
export async function findOrCreateDirectConversation(userA: string, userB: string) {
  if (userA === userB) throw new Error('A conversation needs two different users.');

  const existing = await prisma.conversation.findFirst({
    where: {
      AND: [
        { participants: { some: { id: userA } } },
        { participants: { some: { id: userB } } },
        { participants: { every: { id: { in: [userA, userB] } } } },
      ],
    },
  });
  if (existing) return existing;

  return prisma.conversation.create({
    data: { participants: { connect: [{ id: userA }, { id: userB }] } },
  });
}

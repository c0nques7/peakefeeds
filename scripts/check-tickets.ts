
import { prisma } from '../src/lib/db';

async function main() {
  try {
    const tickets = await prisma.supportTicket.findMany({
      take: 5,
      orderBy: { updatedAt: 'desc' },
      include: { 
        messages: { take: 1 }, 
        user: { select: { username: true } } 
      }
    });
    console.log("Found " + tickets.length + " tickets.");
    console.log(JSON.stringify(tickets, null, 2));
  } catch (e) {
    console.error(e);
  }
}

main();

import { prisma } from "@/lib/db"

export async function getGlobalFeed() {
  return await prisma.post.findMany({
    take: 20,
    orderBy: { createdAt: 'desc' },
    include: {
      // 1. Get Author Details (Must include ID for delete permission)
      author: {
        select: {
          id: true, // 👈 WAS MISSING
          name: true,
          username: true,
          image: true,
        }
      },
      
      // 2. Get Channel Details (Must include creatorId for mod permission)
      channel: {
        select: {
          id: true, // Good to have
          name: true,
          slug: true,
          creatorId: true // 👈 WAS MISSING
        }
      },

      // 3. Get Counts
      _count: {
        select: {
          comments: true,
          likes: true
        }
      },

      // 4. Get Comments for the Drawer
      comments: {
        orderBy: { createdAt: 'desc' },
        take: 3, // Optimization: Only fetch a few for the preview
        include: {
            author: {
                select: { username: true }
            }
        }
      }
    }
  })
}
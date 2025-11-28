import { prisma } from "@/lib/db"
import { Prisma } from "@prisma/client"

// -------------------------------------------------------------
// 1. Define the Relational Fields (The 'Includes')
// -------------------------------------------------------------

// This object holds only the necessary relational fields and their nested selections.
const postRelations = {
    author: {
        select: {
            id: true,
            name: true,
            username: true,
            image: true,
        }
    },
    channel: {
        select: {
            id: true,
            name: true,
            slug: true,
            creatorId: true
        }
    },
    _count: {
        select: {
            comments: true,
            likes: true
        }
    },
    comments: {
        orderBy: { createdAt: 'desc' as const }, 
        take: 3,
        select: {
            id: true,
            content: true,
            createdAt: true,
            author: {
                select: { username: true }
            }
        }
    }
};

// The final TypeScript type derived from the query structure.
export type GlobalFeedPost = Prisma.PostGetPayload<{ 
    select: typeof postRelations & { 
        id: true; 
        title: true; 
        content: true;
        createdAt: true;
        updatedAt: true;
        
        // Web3 and Media fields
        type: true;
        isVerified: true;
        contentHash: true;
        signature: true;
    } 
}>;


// -------------------------------------------------------------
// 2. Data Fetching Logic (Global Feed)
// -------------------------------------------------------------

export async function getGlobalFeed() {
  const posts = await prisma.post.findMany({
    take: 20,
    orderBy: { createdAt: 'desc' },
    include: {
      author: true,
      channel: true,
      _count: { select: { comments: true, likes: true } },
      
      // 🛑 FIX: Fetch comments properly for threading
      comments: {
        orderBy: { createdAt: 'asc' }, // Oldest first helps the tree structure logic visually
        // Remove 'take: 3' temporarily to ensure parents load, 
        // or increase it significantly (e.g., take: 50)
        include: {
            author: { select: { id: true, username: true } }
            // Note: 'parentId' is automatically included because we are using 'include'
        }
      }
    }
  });
  
  return posts;
}


// -------------------------------------------------------------
// 3. Data Fetching Logic (Personalized Feed)
// -------------------------------------------------------------

/**
 * Fetches posts ONLY from channels the given userId is actively subscribed to.
 */
export async function getPersonalizedFeed(userId: string): Promise<GlobalFeedPost[]> {
    
    const posts = await prisma.post.findMany({
        take: 20,
        orderBy: { createdAt: 'desc' },
        
        // 💡 CRITICAL: Filters posts based on the Subscription model
        where: { 
           channel: { 
             subscribers: { 
               some: { userId: userId } // Requires at least one matching subscription
             } 
           } 
        },
        
        select: {
            id: true,
            title: true,
            content: true,
            createdAt: true,
            updatedAt: true,
            type: true,
            mediaUrl: true,
            mediaHash: true,
            isVerified: true,
            contentHash: true,
            signature: true,
            ...postRelations
        }
    });

    return posts as GlobalFeedPost[];
}
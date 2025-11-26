import { prisma } from "@/lib/db"
import { Prisma } from "@prisma/client"

// 1. Define the Relational Fields (Omitted for brevity)
const postRelations = { /* ... */ };

// The final TypeScript type derived from the query structure.
export type GlobalFeedPost = Prisma.PostGetPayload<{ 
    select: typeof postRelations & { 
        id: true; 
        title: true; 
        content: true;
        createdAt: true;
        updatedAt: true;
        
        // CRITICAL: New Fields
        type: true;
        mediaUrl: true;
        embedUrl: true; // 👈 SELECTED
        mediaHash: true;

        isVerified: true;
        contentHash: true;
        signature: true;
    } 
}>;


// 2. Global Feed Logic
export async function getGlobalFeed(): Promise<GlobalFeedPost[]> {
    const posts = await prisma.post.findMany({
        take: 20,
        orderBy: { createdAt: 'desc' },
        select: {
            id: true,
            title: true,
            content: true,
            createdAt: true,
            updatedAt: true,
            
            type: true,
            mediaUrl: true, 
            embedUrl: true, // 👈 SELECTED
            mediaHash: true, 

            isVerified: true,
            contentHash: true,
            signature: true,
            
            ...postRelations
        }
    });
    return posts as GlobalFeedPost[];
}

// 3. Personalized Feed Logic (Also selects embedUrl)
export async function getPersonalizedFeed(userId: string): Promise<GlobalFeedPost[]> {
    // ... (Logic remains the same, but the 'select' block includes embedUrl) ...
    // Note: The select logic is identical to getGlobalFeed above.
    const posts = await prisma.post.findMany({
        // ... (query params)
        select: {
            // ... all fields including embedUrl: true ...
        }
    });
    return posts as GlobalFeedPost[];
}


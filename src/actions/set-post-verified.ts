'use server'

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth.config"; // Matches your create-post.ts
import { prisma } from "@/lib/db"; // Matches your create-post.ts

export async function setPostVerified(
  postId: string, 
  txHash: string, 
  contentHash: string, 
  source: string
) {
  // 1. Use getServerSession instead of 'auth()'
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id) {
    return { error: "Unauthorized" };
  }

  try {
    // 2. Update the post
    await prisma.post.update({
      where: { id: postId },
      data: {
        isVerified: true,
        verificationTx: txHash,
        contentHash: contentHash,
        verificationSource: source
      }
    });
    
    return { success: true };
    
  } catch (error) {
    console.error("Failed to update post verification:", error);
    return { error: "Database update failed" };
  }
}


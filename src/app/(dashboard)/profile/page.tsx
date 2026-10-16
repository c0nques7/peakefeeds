// src/app/profile/page.tsx

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth.config";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";

export default async function ProfileRedirectPage() {
  // 1. Get the session
  const session = await getServerSession(authOptions);

  // 2. If not logged in, send to login
  if (!session?.user?.email) {
    redirect("/api/auth/signin");
  }

  // 3. Look up the user to get their latest username
  // (We query the DB just in case the session is stale)
  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { username: true }
  });

  // 4. Redirect to the dynamic profile page
  if (user?.username) {
    redirect(`/profile/${user.username}`);
  }

  // 5. Fallback: If they are logged in but have no username set?
  // Send them to settings to set one up.
  redirect("/settings"); 
}


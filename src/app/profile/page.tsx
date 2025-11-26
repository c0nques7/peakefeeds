import { redirect } from 'next/navigation';
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth.config"; // Ensure this path is correct
import { prisma } from '@/lib/db'; // Ensure this path is correct

export default async function RedirectToProfile() {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
        // If not signed in, redirect to the sign-in page
        redirect('/api/auth/signin');
    }

    // Fetch the user's username using their ID
    const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { username: true }
    });

    const username = user?.username;

    if (username) {
        // Redirect to the dynamic profile page using the username
        redirect(`/profile/${username}`);
    } else {
        // Handle case where user is logged in but has no username
        // (Could redirect to an account creation/setup page)
        redirect('/home'); 
    }
}
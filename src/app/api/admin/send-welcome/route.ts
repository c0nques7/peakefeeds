import { prisma } from "@/lib/db";
import { Resend } from 'resend';
import { WelcomeEmail } from "@/components/emails/WelcomeEmail";
import { NextResponse } from "next/server";

const resend = process.env.RESEND_API_KEY 
  ? new Resend(process.env.RESEND_API_KEY) 
  : null;

export async function GET(request: Request) {
  // 1. Security: Prevent random people from triggering this
  const { searchParams } = new URL(request.url);
  // Use your NEXTAUTH_SECRET as a quick password
  if (searchParams.get('secret') !== process.env.NEXTAUTH_SECRET) {
     return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!resend) return NextResponse.json({ error: 'No Resend Key' }, { status: 500 });

  try {
    // 2. Get all waitlist users
    const users = await prisma.waitlist.findMany();
    const results = [];

    // 3. Loop and Send
    for (const user of users) {
        const { error } = await resend.emails.send({
            from: 'Peake Feeds <welcome@peakefeeds.com>', // Your sender
            to: user.email,
            subject: 'Welcome to the Truth Layer',
            // Reuse your existing component
            react: await WelcomeEmail({ userEmail: user.email }), 
        });

        if (error) {
            console.error(`Failed to send to ${user.email}`, error);
            results.push({ email: user.email, status: 'failed' });
        } else {
            results.push({ email: user.email, status: 'sent' });
        }

        // 4. Slight Delay to respect rate limits (5 emails per second)
        await new Promise(resolve => setTimeout(resolve, 200));
    }

    return NextResponse.json({ 
        success: true, 
        total: users.length, 
        results 
    });

  } catch (error) {
      return NextResponse.json({ error: 'Server Error', details: error }, { status: 500 });
  }
}
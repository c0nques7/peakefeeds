import { Resend } from 'resend';
import { WelcomeEmail } from "@/components/emails/WelcomeEmail";
import { render } from '@react-email/render';
import { NextResponse } from "next/server";

const resend = process.env.RESEND_API_KEY 
  ? new Resend(process.env.RESEND_API_KEY) 
  : null;

// 🎯 THE FAILED EMAILS
const TARGET_EMAILS = [
    "alimarjan6767@gmail.com",
    "jgcastillo9420@gmail.com"
];

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  if (searchParams.get('secret') !== process.env.NEXTAUTH_SECRET) {
     return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!resend) return NextResponse.json({ error: 'No Resend Key' }, { status: 500 });

  const results = [];

  for (const email of TARGET_EMAILS) {
    try {
        const emailHtml = await render(WelcomeEmail({ userEmail: email }) as React.ReactElement);

        const { data, error } = await resend.emails.send({
            from: 'Peake Feeds <hello@peakefeeds.com>',
            to: email,
            subject: 'Welcome to the Truth Layer',
            html: emailHtml, 
        });

        if (error) {
            console.error(`Failed retry for ${email}`, error);
            results.push({ email, status: 'failed', error });
        } else {
            results.push({ email, status: 'sent', id: data?.id });
        }

        // 🛑 RATE LIMIT FIX: Wait 1 full second between sends
        await new Promise(resolve => setTimeout(resolve, 1000));

    } catch (err) {
        results.push({ email, status: 'error', details: err });
    }
  }

  return NextResponse.json({ results });
}

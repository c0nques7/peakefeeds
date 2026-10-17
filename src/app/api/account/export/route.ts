import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth.config';
import { buildAccountExport } from '@/lib/account-export';

// "Download my data" in Settings: the logged-in account's data as a JSON file.
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const data = await buildAccountExport(session.user.id);
  if (!data) return NextResponse.json({ error: 'Account not found' }, { status: 404 });

  const fileName = `peakefeeds-${data.profile.username ?? 'account'}-${data.exportedAt.slice(0, 10)}.json`;
  return new NextResponse(JSON.stringify(data, null, 2), {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Content-Disposition': `attachment; filename="${fileName}"`,
      'Cache-Control': 'no-store',
    },
  });
}

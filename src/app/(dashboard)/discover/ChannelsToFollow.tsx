import Link from "next/link";
import { Users } from "lucide-react";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth.config";
import { prisma } from "@/lib/db";
import { SubscribeButton } from "@/components/SubscribeButton";
import { Card } from "@/components/ui";

// Discover's list of popular channels the viewer doesn't follow yet. New members land here from
// an empty home feed; the right rail has a similar list, but phones don't show the rail.
export async function ChannelsToFollow() {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;

  const channels = await prisma.channel.findMany({
    where: { isLocked: false, ...(userId ? { subscribers: { none: { userId } } } : {}) },
    orderBy: { subscribers: { _count: "desc" } },
    take: 6,
    select: { id: true, name: true, slug: true, tags: true, _count: { select: { subscribers: true } } },
  });
  if (channels.length === 0) return null;

  return (
    <Card padded={false} className="mb-6 overflow-hidden">
      <div className="p-4 border-b border-[var(--glass-border)]">
        <h2 className="flex items-center gap-2 font-bold text-sm text-[var(--text-primary)]">
          <Users size={18} className="text-[var(--accent-primary)]" aria-hidden="true" /> Popular channels
        </h2>
        <p className="mt-1 text-xs text-[var(--text-muted)]">Or search for a topic or tag above.</p>
      </div>
      <ul>
        {channels.map((channel) => (
          <li key={channel.id} className="flex items-center gap-3 px-4 py-3 border-b border-[var(--glass-border)] last:border-0">
            <Link href={`/channels/${channel.slug}`} className="w-8 h-8 rounded-full bg-[var(--glass-card-hover)] border border-[var(--glass-border)] flex items-center justify-center font-bold text-xs text-[var(--text-primary)] flex-shrink-0" aria-hidden="true" tabIndex={-1}>
              {channel.name[0]?.toUpperCase()}
            </Link>
            <div className="flex-1 min-w-0">
              <Link href={`/channels/${channel.slug}`} className="block font-bold text-sm text-[var(--text-primary)] truncate hover:underline">
                {channel.name}
              </Link>
              <div className="text-xs text-[var(--text-muted)] truncate">
                {channel._count.subscribers} {channel._count.subscribers === 1 ? "member" : "members"}
                {channel.tags.length > 0 && <> · {channel.tags.slice(0, 3).map((t) => `#${t}`).join(" ")}</>}
              </div>
            </div>
            <SubscribeButton channelId={channel.id} channelSlug={channel.slug} isSubscribedInitial={false} small />
          </li>
        ))}
      </ul>
    </Card>
  );
}

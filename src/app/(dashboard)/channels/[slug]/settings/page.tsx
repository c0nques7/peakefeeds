import { prisma } from '@/lib/db';
import { notFound, redirect } from 'next/navigation';
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth.config";
import { ArrowLeft, Shield } from "lucide-react";
import Link from "next/link";
import ModeratorChannelPermissions from "@/components/channels/ModeratorChannelPermissions";
import { ChannelRole } from "@prisma/client";

// Shared Layout Styles
import styles from "../../../../(dashboard)/dashboard.module.css"; 

interface ChannelSettingsPageProps {
  params: Promise<{ slug: string }>;
}

export default async function ChannelSettingsPage({ params }: ChannelSettingsPageProps) {
  const { slug } = await params;
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id) {
    redirect(`/channels/${slug}`);
  }

  // 1. Fetch Channel & User Role
  const channel = await prisma.channel.findUnique({
    where: { slug: slug },
    select: {
      id: true,
      name: true,
      slug: true,
      creatorId: true,
      subscribers: {
        where: { userId: session.user.id },
        select: { role: true }
      }
    }
  });

  if (!channel) {
    notFound();
  }

  const isCreator = channel.creatorId === session.user.id;
  const isGlobalAdmin = (session.user as any).role === 'ADMIN';
  const isMod = channel.subscribers[0]?.role === ChannelRole.MODERATOR || channel.subscribers[0]?.role === ChannelRole.OWNER;

  // Security Check: Only owners/mods/admins can see this page
  if (!isCreator && !isGlobalAdmin && !isMod) {
    redirect(`/channels/${slug}`);
  }

  return (
    <div className={styles.feedWrapper}>
      <div className="mb-8 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link 
            href={`/channels/${slug}`}
            className="p-2 rounded-full bg-[var(--glass-panel)] border border-[var(--glass-border)] text-[var(--text-muted)] hover:text-white transition-all"
          >
            <ArrowLeft size={20} />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-white">Channel Management</h1>
            <p className="text-sm text-[var(--text-muted)]">#{channel.slug} • {channel.name}</p>
          </div>
        </div>
        
        <div className="hidden md:flex items-center gap-2 px-4 py-2 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-400 text-xs font-bold uppercase tracking-wider">
          <Shield size={14} />
          {isCreator ? 'Owner Access' : 'Moderator Access'}
        </div>
      </div>

      <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <ModeratorChannelPermissions channelId={channel.id} />
        
        <div className="p-8 rounded-3xl bg-amber-500/5 border border-amber-500/20 text-amber-200/70 text-xs leading-relaxed italic">
          <strong>Note:</strong> As a channel moderator, your actions are logged for protocol transparency. Ensure you adhere to the community standards when modifying user permissions or removing members.
        </div>
      </div>
    </div>
  );
}

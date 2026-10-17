import { prisma } from '@/lib/db';
import { fileNameFromUrl, getAuthorizedDownloadUrl } from '@/lib/b2';

// "Download my data": everything we hold about one account, as JSON. Secrets (password hash,
// 2FA secret, sign-in tokens) and staff-only notes are left out. The bucket is private, so
// uploaded images and videos come as links signed for that one file, valid for a day.
const MEDIA_LINK_SECONDS = 24 * 60 * 60;

async function mediaLink(url: string | null): Promise<string | null> {
  const fileName = fileNameFromUrl(url);
  if (!fileName) return url;
  try {
    return await getAuthorizedDownloadUrl(fileName, MEDIA_LINK_SECONDS);
  } catch {
    return url;
  }
}

export async function buildAccountExport(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true, username: true, name: true, email: true, emailVerified: true, image: true,
      walletAddress: true, role: true, createdAt: true, twoFactorEnabled: true,
      ageConfirmedAt: true, mutedUntil: true, bannedUntil: true, passwordHash: true,
      accounts: { select: { provider: true } },
    },
  });
  if (!user) return null;

  const [posts, comments, reactions, subscriptions, channels, conversations, tickets, reports, penalties, blocks, invites, notifications] = await Promise.all([
    prisma.post.findMany({
      where: { authorId: userId },
      orderBy: { createdAt: 'asc' },
      select: {
        id: true, title: true, content: true, type: true, mediaUrl: true, embedUrl: true, createdAt: true, updatedAt: true,
        isVerified: true, contentHash: true, signature: true, verificationTx: true, likesCount: true, dislikesCount: true,
        channel: { select: { name: true, slug: true } },
      },
    }),
    prisma.comment.findMany({
      where: { authorId: userId },
      orderBy: { createdAt: 'asc' },
      select: { id: true, content: true, createdAt: true, updatedAt: true, postId: true, parentId: true },
    }),
    prisma.reaction.findMany({ where: { userId }, select: { type: true, postId: true, createdAt: true } }),
    prisma.subscription.findMany({ where: { userId }, select: { role: true, joinedAt: true, channel: { select: { name: true, slug: true } } } }),
    prisma.channel.findMany({ where: { creatorId: userId }, select: { name: true, slug: true, description: true, tags: true, createdAt: true } }),
    prisma.conversation.findMany({
      where: { participants: { some: { id: userId } } },
      select: {
        id: true, createdAt: true,
        participants: { select: { username: true } },
        messages: { orderBy: { createdAt: 'asc' }, select: { content: true, createdAt: true, sender: { select: { username: true } } } },
      },
    }),
    prisma.supportTicket.findMany({
      where: { userId },
      select: {
        id: true, status: true, createdAt: true,
        messages: { where: { isInternal: false }, orderBy: { createdAt: 'asc' }, select: { text: true, sender: true, createdAt: true } },
      },
    }),
    prisma.report.findMany({ where: { reporterId: userId }, select: { reason: true, details: true, targetType: true, status: true, createdAt: true } }),
    prisma.penalty.findMany({ where: { userId }, select: { type: true, reason: true, createdAt: true, expiresAt: true, isActive: true } }),
    prisma.block.findMany({ where: { blockerId: userId }, select: { createdAt: true, blocked: { select: { username: true } } } }),
    prisma.inviteCode.findMany({ where: { issuerId: userId }, select: { code: true, createdAt: true, usedAt: true } }),
    prisma.notification.findMany({ where: { userId }, orderBy: { createdAt: 'asc' }, select: { type: true, createdAt: true, isRead: true } }),
  ]);

  const { passwordHash, accounts, image, ...profile } = user;
  return {
    exportedAt: new Date().toISOString(),
    note: 'Links to your uploaded images and videos work for 24 hours from exportedAt. Save the files you want before deleting your account.',
    profile: {
      ...profile,
      image: await mediaLink(image),
      signInMethods: [...(passwordHash ? ['password'] : []), ...accounts.map(a => a.provider)],
    },
    posts: await Promise.all(posts.map(async p => ({ ...p, mediaUrl: await mediaLink(p.mediaUrl) }))),
    comments,
    reactions,
    channelsCreated: channels,
    subscriptions,
    conversations: conversations.map(c => ({
      id: c.id,
      createdAt: c.createdAt,
      participants: c.participants.map(p => p.username),
      messages: c.messages.map(m => ({ from: m.sender.username, content: m.content, createdAt: m.createdAt })),
    })),
    supportTickets: tickets,
    reportsFiled: reports,
    moderationActions: penalties,
    blockedUsers: blocks.map(b => ({ username: b.blocked.username, since: b.createdAt })),
    invitesIssued: invites,
    notifications,
  };
}

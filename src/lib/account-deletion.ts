import { ChannelRole, Prisma, UserRole } from '@prisma/client';
import { prisma } from '@/lib/db';
import { deleteFileByName, fileNameFromUrl } from '@/lib/b2';
import { clearAccountStatusCache } from '@/lib/penalties';

// Deleting an account removes it and everything it made straight away: posts (verified ones too;
// only the fingerprint already recorded on the blockchain stays), comments, reactions, messages,
// support tickets, uploads and moderation records. The Privacy page promises nothing is kept
// more than 30 days after deletion, which leaves room for database backups to roll over.
//
// Two things are kept for other people: channels the account created pass to their next
// moderator or member (deleting the channel would take everyone's posts with it), and invite
// codes it handed out keep working.

/** Why this account can't delete itself, or null if it can. */
export async function getDeletionBlocker(userId: string): Promise<string | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true, _count: { select: { penaltiesIssued: true, adminLogs: true } } },
  });
  if (!user) return 'Account not found.';
  if (user.role === UserRole.ADMIN || user.role === UserRole.MODERATOR) {
    return 'Staff accounts can’t be deleted here. Ask an admin to change your role first.';
  }
  // Penalties and staff logs need the staff member who made them, so an admin handles these
  if (user._count.penaltiesIssued > 0 || user._count.adminLogs > 0) {
    return 'This account has a staff history, so an admin needs to delete it. Open Help and ask for a person.';
  }
  return null;
}

/** The account's channels go to whoever should run them next: owners and moderators first, then the longest-standing member, then the earliest other poster. */
async function handOverChannels(tx: Prisma.TransactionClient, userId: string) {
  const channels = await tx.channel.findMany({ where: { creatorId: userId }, select: { id: true } });
  for (const { id: channelId } of channels) {
    const subscriber = await tx.subscription.findFirst({
      where: { channelId, userId: { not: userId } },
      orderBy: [{ role: 'desc' }, { joinedAt: 'asc' }], // enum order: MEMBER < MODERATOR < OWNER
      select: { userId: true },
    });
    const heir = subscriber?.userId ?? (await tx.post.findFirst({
      where: { channelId, authorId: { not: userId } },
      orderBy: { createdAt: 'asc' },
      select: { authorId: true },
    }))?.authorId;
    if (!heir) continue; // nobody else uses it, so it's deleted with the account

    await tx.channel.update({ where: { id: channelId }, data: { creatorId: heir } });
    const owner = { role: ChannelRole.OWNER, canPost: true, canComment: true, canDeletePosts: true, canPinPosts: true };
    await tx.subscription.upsert({
      where: { userId_channelId: { userId: heir, channelId } },
      update: owner,
      create: { userId: heir, channelId, ...owner },
    });
  }
}

export async function deleteAccount(userId: string): Promise<void> {
  const mediaFiles = await prisma.$transaction(async (tx) => {
    const user = await tx.user.findUniqueOrThrow({ where: { id: userId }, select: { email: true, image: true } });
    const posts = await tx.post.findMany({ where: { authorId: userId }, select: { mediaUrl: true } });

    await handOverChannels(tx, userId);

    // Take this account's reactions off other people's posts (its own posts are deleted anyway)
    const reactions = await tx.reaction.findMany({ where: { userId, post: { authorId: { not: userId } } }, select: { postId: true, type: true } });
    const liked = reactions.filter(r => r.type === 'LIKE').map(r => r.postId);
    const disliked = reactions.filter(r => r.type === 'DISLIKE').map(r => r.postId);
    if (liked.length) await tx.post.updateMany({ where: { id: { in: liked } }, data: { likesCount: { decrement: 1 } } });
    if (disliked.length) await tx.post.updateMany({ where: { id: { in: disliked } }, data: { dislikesCount: { decrement: 1 } } });

    // Reports it filed, and reports about it or its content (they'd point at nothing)
    await tx.report.deleteMany({
      where: {
        OR: [
          { reporterId: userId },
          { reportedProfileId: userId },
          { post: { authorId: userId } },
          { comment: { authorId: userId } },
          { message: { senderId: userId } },
        ],
      },
    });
    await tx.penalty.deleteMany({ where: { userId } });
    await tx.adView.deleteMany({ where: { userId } });

    // Conversations are one-to-one, so each goes with the account, along with its messages
    await tx.conversation.deleteMany({ where: { participants: { some: { id: userId } } } });
    await tx.directMessage.deleteMany({ where: { senderId: userId } });
    await tx.supportTicket.deleteMany({ where: { userId } });

    if (user.email) {
      await tx.waitlist.deleteMany({ where: { email: user.email } });
      await tx.verificationToken.deleteMany({ where: { identifier: user.email } });
    }

    // Everything else (posts, comments, channels nobody took over, sessions, sign-in links...) cascades
    await tx.user.delete({ where: { id: userId } });

    return [user.image, ...posts.map(p => p.mediaUrl)].map(fileNameFromUrl).filter((f): f is string => !!f);
  }, { timeout: 30_000 });

  clearAccountStatusCache(userId);

  // Uploads are removed after the database commit; a failure is logged rather than undoing the deletion
  for (const fileName of new Set(mediaFiles)) {
    await deleteFileByName(fileName).catch(err => console.error(`Account deletion: couldn't remove upload ${fileName}:`, err));
  }
}

import { PrismaClient, PostType, ReactionType, UserRole, ReportReason, ReportTargetType, ReportStatus, PenaltyType, WaitlistStatus } from '@prisma/client';
import { faker } from '@faker-js/faker';

const prisma = new PrismaClient();

// --- Configuration ---
const USER_COUNT = 200;
const POST_COUNT = 1000;
const COMMENT_COUNT = 1500;
const REACTION_COUNT = 5000;
const TICKET_COUNT = 50;   // NEW: Support tickets
const REPORT_COUNT = 30;   // NEW: Moderation reports
const WAITLIST_COUNT = 100; // NEW: Waitlist entries
const VIRAL_POST_COUNT = 10; 

// Channel configurations and their verification probabilities
const THEMED_CHANNELS = [
  { name: 'Optimism News', slug: 'optimism-news', theme: 'Optimism L2, blockchain governance, fast transactions.', types: ['TEXT', 'LINK'], verifyChance: 0.8 },
  { name: 'Deepfake Watch', slug: 'deepfake-watch', theme: 'AI deepfakes, content forensics, verification protocols.', types: ['VIDEO', 'LINK'], verifyChance: 0.6 },
  { name: 'Tech Insights', slug: 'tech-insights', theme: 'Software development, Next.js, TypeScript, new gadgets.', types: ['TEXT', 'IMAGE'], verifyChance: 0.5 },
  { name: 'Crypto Memes', slug: 'crypto-memes', theme: 'Doge, trading, NFTs, decentralized finance.', types: ['IMAGE', 'TEXT'], verifyChance: 0.1 },
  { name: 'Healthy Recipes', slug: 'healthy-recipes', theme: 'Nutrition, cooking, protein, diet plans.', types: ['IMAGE'], verifyChance: 0.3 },
  { name: 'Site Feedback', slug: 'site-feedback', theme: 'Bugs, suggestions, feature requests for PeakeFeeds.', types: ['TEXT'], verifyChance: 0.05 },
];

// --- Helpers ---

function getRandomPostType(allowedTypes: string[]): PostType {
  const typeName = faker.helpers.arrayElement(allowedTypes);
  return PostType[typeName as keyof typeof PostType];
}

function getMockMediaUrl(type: PostType): string | null {
  if (type === PostType.IMAGE) {
    return `https://picsum.photos/640/480?random=${faker.string.uuid()}`; 
  }
  if (type === PostType.VIDEO) {
    const youtubeIds = ['dQw4w9WgXcQ', 'oHg5SJYRHA0', 'k4Xx8-lFh6w', '9bZk6B6rY-0']; 
    return `https://www.youtube.com/watch?v=${faker.helpers.arrayElement(youtubeIds)}`;
  }
  return null;
}

function getYouTubeEmbedUrl(url: string | null): string | null {
    if (!url || (!url.includes('youtube.com') && !url.includes('youtu.be'))) return null;
    
    let videoId = '';
    if (url.includes('youtu.be/')) videoId = url.split('youtu.be/')[1]?.split('?')[0];
    else if (url.includes('v=')) videoId = url.split('v=')[1]?.split('&')[0];
    else if (url.includes('embed/')) videoId = url.split('embed/')[1]?.split('?')[0];

    if (videoId) {
        return `https://www.youtube.com/embed/${videoId}?rel=0&showinfo=0&modestbranding=1`;
    }
    return null;
}

// --- Main Seeder Function ---

async function main() {
  console.log('--- Starting Database Seeder ---');
  
  // ⚠️ Cleanup: Delete existing data
  // Order matters due to foreign key constraints
  await prisma.ticketMessage.deleteMany();
  await prisma.supportTicket.deleteMany();
  await prisma.penalty.deleteMany();
  await prisma.report.deleteMany();
  await prisma.waitlist.deleteMany();
  await prisma.adView.deleteMany();
  await prisma.subscription.deleteMany();
  await prisma.comment.deleteMany();
  await prisma.reaction.deleteMany(); 
  await prisma.post.deleteMany();
  await prisma.channel.deleteMany();
  await prisma.user.deleteMany();
  
  console.log(`Cleaned up old data.`);

  // --- 1. CREATE USERS ---
  // We create normal users first
  const userData = Array.from({ length: USER_COUNT }).map(() => {
    return {
        email: faker.internet.email(),
        name: faker.person.fullName(),
        username: faker.internet.username().toLowerCase(),
        passwordHash: 'mock-argon2-hash', 
        role: UserRole.STANDARD,
    };
  });
  
  await prisma.user.createMany({ data: userData });
  
  // Fetch users back to get IDs
  let users = await prisma.user.findMany();
  
  // Promote the first 5 users to ADMIN/MODERATOR so you have test accounts
  const admins = users.slice(0, 3);
  const moderators = users.slice(3, 6);
  
  await prisma.user.updateMany({
      where: { id: { in: admins.map(u => u.id) } },
      data: { role: UserRole.ADMIN }
  });
  await prisma.user.updateMany({
      where: { id: { in: moderators.map(u => u.id) } },
      data: { role: UserRole.MODERATOR }
  });
  
  console.log(`Created ${users.length} Users (including Admins & Mods).`);

  // --- 2. CREATE CHANNELS ---
  const channels = await Promise.all(
    THEMED_CHANNELS.map(async (data) => {
      const creator = faker.helpers.arrayElement(users); 
      return prisma.channel.create({
        data: {
          name: data.name,
          slug: data.slug,
          description: faker.lorem.sentence(),
          creatorId: creator.id,
          tags: data.name.split(' '),
        },
      });
    })
  );
  console.log(`Created ${channels.length} Themed Channels.`);

  // --- 3. CREATE SUBSCRIPTIONS ---
  const subscriptionPromises = [];
  for (let i = 0; i < 2000; i++) {
    const user = faker.helpers.arrayElement(users);
    const channel = faker.helpers.arrayElement(channels);
    subscriptionPromises.push(
      prisma.subscription.create({ data: { userId: user.id, channelId: channel.id } }).catch(() => null) 
    );
  }
  await Promise.all(subscriptionPromises);
  console.log(`Created 2000 Mock Subscriptions.`);

  // --- 4. CREATE POSTS ---
  const posts = [];
  const viralPosts = []; 
  
  for (let i = 0; i < POST_COUNT; i++) {
    const channel = faker.helpers.arrayElement(channels);
    const channelConfig = THEMED_CHANNELS.find(c => c.slug === channel.slug)!;
    
    const postType = getRandomPostType(channelConfig.types);
    const rawMediaUrl = getMockMediaUrl(postType);
    
    let contentBody = `${channelConfig.theme.split(',')[0].trim()}. ${faker.lorem.paragraphs(faker.number.int({ min: 1, max: 3 }), '\n')}`;
    const urlToInject = rawMediaUrl ? rawMediaUrl : '';
    const content = faker.datatype.boolean(0.7)
        ? `${contentBody.substring(0, 100)} ${urlToInject} ${faker.helpers.arrayElement(['#Truth', '#Optimism', '#Web3'])}`
        : contentBody;

    const embedUrl = getYouTubeEmbedUrl(rawMediaUrl);
    const isVerified = faker.datatype.boolean(channelConfig.verifyChance);

    const post = await prisma.post.create({
        data: {
            title: faker.datatype.boolean(0.5) ? faker.lorem.sentence(3) : null,
            content: content,
            authorId: faker.helpers.arrayElement(users).id,
            channelId: channel.id,
            createdAt: faker.date.recent({ days: 30 }),
            type: postType,
            mediaUrl: rawMediaUrl,
            embedUrl: embedUrl,
            isVerified: isVerified, 
            contentHash: faker.string.hexadecimal({ length: 64, prefix: '0x' }), 
            signature: faker.string.hexadecimal({ length: 130, prefix: '0x' }),
        },
        include: { comments: true } // Include for relations later
    });

    if (i < VIRAL_POST_COUNT) viralPosts.push(post);
    posts.push(post);
  }
  console.log(`Created ${posts.length} Themed Posts.`);

  // --- 5. CREATE COMMENTS ---
  const commentPromises = [];
  for (let i = 0; i < COMMENT_COUNT; i++) {
    const post = faker.datatype.boolean(0.8) 
        ? faker.helpers.arrayElement(posts) 
        : faker.helpers.arrayElement(viralPosts);
    const author = faker.helpers.arrayElement(users);
    // @ts-ignore
    const parentComment = faker.datatype.boolean(0.1) && post.comments && post.comments.length > 0
        // @ts-ignore
        ? faker.helpers.arrayElement(post.comments)
        : null;

    commentPromises.push(
      prisma.comment.create({
          data: {
              content: faker.lorem.sentence(),
              postId: post.id,
              authorId: author.id,
              parentId: parentComment ? parentComment.id : null,
              createdAt: faker.date.between({ from: post.createdAt, to: new Date() }),
          }
      }).catch(() => null)
    );
  }
  await Promise.all(commentPromises);
  console.log(`Created ${COMMENT_COUNT} Mock Comments.`);

  // --- 6. REACTIONS ---
  const reactionPromises = [];
  for (let i = 0; i < REACTION_COUNT; i++) {
      const post = faker.datatype.boolean(0.7) 
        ? faker.helpers.arrayElement(posts) 
        : faker.helpers.arrayElement(viralPosts);
      const user = faker.helpers.arrayElement(users);
      const reactionType = faker.datatype.boolean(0.85) ? ReactionType.LIKE : ReactionType.DISLIKE;

      reactionPromises.push(
          prisma.reaction.create({ 
              data: { userId: user.id, postId: post.id, type: reactionType }
          }).catch(() => null)
      );
  }
  await Promise.all(reactionPromises);
  console.log(`Created ${REACTION_COUNT} Mock Reactions.`);

  // --- 7. NEW: SUPPORT TICKETS (Populate Admin Console) ---
  const ticketPromises = [];
  for (let i = 0; i < TICKET_COUNT; i++) {
      const user = faker.helpers.arrayElement(users);
      // Severity 0 (Low) to 5 (Critical)
      const severity = faker.number.int({ min: 0, max: 5 }); 
      const status = faker.datatype.boolean(0.7) ? 'open' : 'resolved';
      
      // Create Ticket
      const ticket = await prisma.supportTicket.create({
          data: {
              userId: user.id,
              status: status,
              severity: severity,
              createdAt: faker.date.recent({ days: 10 }),
          }
      });

      // Add 1-3 messages per ticket
      const msgCount = faker.number.int({ min: 1, max: 3 });
      for (let j = 0; j < msgCount; j++) {
          await prisma.ticketMessage.create({
              data: {
                  ticketId: ticket.id,
                  sender: j % 2 === 0 ? 'user' : 'admin',
                  text: j === 0 ? faker.lorem.sentence() : faker.lorem.sentences(2),
                  createdAt: faker.date.recent({ days: 1 }),
              }
          });
      }
      ticketPromises.push(ticket);
  }
  console.log(`Created ${TICKET_COUNT} Support Tickets with messages.`);

  // --- 8. NEW: MODERATION REPORTS (Populate Safety Queue) ---
  for (let i = 0; i < REPORT_COUNT; i++) {
      const reporter = faker.helpers.arrayElement(users);
      const targetPost = faker.helpers.arrayElement(posts);
      
      await prisma.report.create({
          data: {
              reporterId: reporter.id,
              reason: faker.helpers.enumValue(ReportReason),
              status: faker.helpers.enumValue(ReportStatus),
              targetType: ReportTargetType.POST,
              postId: targetPost.id,
              details: faker.lorem.sentence(),
          }
      });
  }
  console.log(`Created ${REPORT_COUNT} Moderation Reports.`);

  // --- 9. NEW: WAITLIST (Populate Air Lock) ---
  const waitlistData = Array.from({ length: WAITLIST_COUNT }).map(() => ({
      email: faker.internet.email(),
      status: faker.helpers.enumValue(WaitlistStatus),
      source: faker.helpers.arrayElement(['twitter', 'google', 'direct']),
  }));
  await prisma.waitlist.createMany({ data: waitlistData });
  console.log(`Created ${WAITLIST_COUNT} Waitlist Entries.`);

  console.log('--- Seeding Complete! ---');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
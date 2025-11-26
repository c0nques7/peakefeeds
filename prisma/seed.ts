import { PrismaClient, PostType } from '@prisma/client';
import { faker } from '@faker-js/faker'; // Note: Ensure this import works in your environment

const prisma = new PrismaClient();

// --- Configuration ---
const USER_COUNT = 200;
const POST_COUNT = 1000;
const COMMENT_COUNT = 1500;
const THEMED_CHANNELS = [
  { name: 'Optimism News', slug: 'optimism-news', theme: 'Optimism L2, blockchain governance, fast transactions.', types: ['TEXT', 'LINK'] },
  { name: 'Deepfake Watch', slug: 'deepfake-watch', theme: 'AI deepfakes, content forensics, verification protocols.', types: ['VIDEO', 'LINK'] },
  { name: 'Tech Insights', slug: 'tech-insights', theme: 'Software development, Next.js, TypeScript, new gadgets.', types: ['TEXT', 'IMAGE'] },
  { name: 'Crypto Memes', slug: 'crypto-memes', theme: 'Doge, trading, NFTs, decentralized finance.', types: ['IMAGE', 'TEXT'] },
  { name: 'Healthy Recipes', slug: 'healthy-recipes', theme: 'Nutrition, cooking, protein, diet plans.', types: ['IMAGE'] },
  { name: 'Site Feedback', slug: 'site-feedback', theme: 'Bugs, suggestions, feature requests for PeakeFeeds.', types: ['TEXT'] },
];

// Define Post type for the posts array (to fix 'any' error)
type PostWithComments = {
    id: string;
    content: string;
    createdAt: Date;
    comments: { id: string }[];
}

// --- Helpers ---

function getRandomPostType(allowedTypes: string[]): PostType {
  const typeName = faker.helpers.arrayElement(allowedTypes);
  return PostType[typeName as keyof typeof PostType];
}

function getMockMediaUrl(type: PostType): string | null {
  if (type === PostType.IMAGE) {
    return faker.image.url({ width: 640, height: 480 }); 
  }
  if (type === PostType.VIDEO) {
    const youtubeIds = ['dQw4w9WgXcQ', 'oHg5SJYRHA0', 'k4Xx8-lFh6w']; 
    return `https://www.youtube.com/watch?v=${faker.helpers.arrayElement(youtubeIds)}`;
  }
  return null;
}

// --- Main Seeder Function ---

async function main() {
  console.log('--- Starting Database Seeder ---');
  
  // ⚠️ Cleanup: Delete existing data
  await prisma.subscription.deleteMany();
  await prisma.comment.deleteMany();
  await prisma.post.deleteMany();
  await prisma.channel.deleteMany();
  await prisma.user.deleteMany();
  await prisma.account.deleteMany(); 
  
  console.log(`Cleaned up old data.`);

  // --- 1. CREATE USERS ---
  const userData = Array.from({ length: USER_COUNT }).map(() => {
    return {
        email: faker.internet.email(),
        name: faker.person.fullName(),
        username: faker.internet.username().toLowerCase(),
        passwordHash: 'mock-argon2-hash',
        id: faker.string.uuid(),
    };
  });
  // ✅ FIX 1: Use createManyAndReturn with raw data objects
  const users = await prisma.user.createManyAndReturn({ data: userData });
  console.log(`Created ${users.length} Users.`);

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
      prisma.subscription.create({
        data: {
          userId: user.id,
          channelId: channel.id,
        },
      }).catch(() => null) 
    );
  }
  await Promise.all(subscriptionPromises);
  console.log(`Created 2000 Mock Subscriptions.`);

  // --- 4. CREATE POSTS (1000 Total) ---
  // ✅ FIX 2: Explicitly define the type of the posts array
  const posts: PostWithComments[] = [];
  
  for (let i = 0; i < POST_COUNT; i++) {
    const channel = faker.helpers.arrayElement(channels);
    const channelConfig = THEMED_CHANNELS.find(c => c.slug === channel.slug)!;
    
    const postType = getRandomPostType(channelConfig.types);
    const mediaUrl = getMockMediaUrl(postType);
    
    let content = `${channelConfig.theme.split(',')[0].trim()}. ${faker.lorem.paragraphs(1, '\n')}`;
    if (mediaUrl) content = `${content}\n${mediaUrl}`;

    const post = await prisma.post.create({
        data: {
            title: faker.datatype.boolean(0.6) ? faker.lorem.sentence(3) : null,
            content: content,
            authorId: faker.helpers.arrayElement(users).id,
            channelId: channel.id,
            createdAt: faker.date.recent({ days: 30 }),
            type: postType,
            mediaUrl: mediaUrl,
            isVerified: faker.datatype.boolean(0.5), 
            contentHash: faker.string.hexadecimal({ length: 64, prefix: '0x' }), 
        },
        // We only fetch ID and content for the subsequent comment loop
        select: {
            id: true,
            content: true,
            createdAt: true,
            comments: { select: { id: true } }
        }
    });
    // @ts-ignore
    posts.push(post); 
  }
  console.log(`Created ${posts.length} Themed Posts.`);

  // --- 5. CREATE COMMENTS (1500 Total) ---
  const commentPromises = [];
  for (let i = 0; i < COMMENT_COUNT; i++) {
    const post = faker.helpers.arrayElement(posts);
    const author = faker.helpers.arrayElement(users);

    // ✅ FIX 3: Robust Parent ID check
    const parentComment = faker.datatype.boolean(0.2) && post.comments.length > 0
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
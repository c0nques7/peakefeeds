import { PrismaClient, PostType, ReactionType } from '@prisma/client';
import { faker } from '@faker-js/faker';

const prisma = new PrismaClient();

// --- Configuration ---
const USER_COUNT = 200;
const POST_COUNT = 1000;
const COMMENT_COUNT = 1500;
const REACTION_COUNT = 5000;
const VIRAL_POST_COUNT = 10; // Number of posts that receive concentrated engagement

// Channel configurations and their verification probabilities
const THEMED_CHANNELS = [
  { name: 'Optimism News', slug: 'optimism-news', theme: 'Optimism L2, blockchain governance, fast transactions.', types: ['TEXT', 'LINK'], verifyChance: 0.8 },
  { name: 'Deepfake Watch', slug: 'deepfake-watch', theme: 'AI deepfakes, content forensics, verification protocols.', types: ['VIDEO', 'LINK'], verifyChance: 0.6 },
  { name: 'Tech Insights', slug: 'tech-insights', theme: 'Software development, Next.js, TypeScript, new gadgets.', types: ['TEXT', 'IMAGE'], verifyChance: 0.5 },
  { name: 'Crypto Memes', slug: 'crypto-memes', theme: 'Doge, trading, NFTs, decentralized finance.', types: ['IMAGE', 'TEXT'], verifyChance: 0.1 },
  { name: 'Healthy Recipes', slug: 'healthy-recipes', theme: 'Nutrition, cooking, protein, diet plans.', types: ['IMAGE'], verifyChance: 0.3 },
  { name: 'Site Feedback', slug: 'site-feedback', theme: 'Bugs, suggestions, feature requests for PeakeFeeds.', types: ['TEXT'], verifyChance: 0.05 },
];

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
  await prisma.subscription.deleteMany();
  await prisma.comment.deleteMany();
  await prisma.reaction.deleteMany(); 
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
    };
  });
  await prisma.user.createMany({ data: userData });
  const users = await prisma.user.findMany({ select: { id: true, username: true } });
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
      prisma.subscription.create({ data: { userId: user.id, channelId: channel.id } }).catch(() => null) 
    );
  }
  await Promise.all(subscriptionPromises);
  console.log(`Created 2000 Mock Subscriptions.`);

  // --- 4. CREATE POSTS (1000 Total) ---
  const posts: PostWithComments[] = [];
  const viralPosts: PostWithComments[] = []; // Array to store the few popular posts
  
  for (let i = 0; i < POST_COUNT; i++) {
    const channel = faker.helpers.arrayElement(channels);
    const channelConfig = THEMED_CHANNELS.find(c => c.slug === channel.slug)!;
    
    const postType = getRandomPostType(channelConfig.types);
    const rawMediaUrl = getMockMediaUrl(postType);
    
    // Clean content and embed link naturally
    let contentBody = `${channelConfig.theme.split(',')[0].trim()}. ${faker.lorem.paragraphs(faker.number.int({ min: 1, max: 3 }), '\n')}`;
    
    // Inject link naturally if media exists
    const urlToInject = rawMediaUrl ? rawMediaUrl : '';
    const content = faker.datatype.boolean(0.7)
        ? `${contentBody.substring(0, 100)} ${urlToInject} ${faker.helpers.arrayElement(['#Truth', '#Optimism', '#Web3'])}`
        : contentBody;

    const embedUrl = getYouTubeEmbedUrl(rawMediaUrl);
    
    // Verification is weighted based on channel type
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
        select: {
            id: true, content: true, createdAt: true, comments: { select: { id: true } }
        }
    });

    // Collect initial posts for viral engagement
    if (i < VIRAL_POST_COUNT) {
        // @ts-ignore
        viralPosts.push(post); 
    }
    // @ts-ignore
    posts.push(post); 
  }
  console.log(`Created ${posts.length} Themed Posts.`);

  // --- 5. CREATE COMMENTS (Targeting Viral Posts) ---
  const commentPromises = [];
  for (let i = 0; i < COMMENT_COUNT; i++) {
    // 💡 20% of comments target a few viral posts
    const post = faker.datatype.boolean(0.8) 
        ? faker.helpers.arrayElement(posts) 
        : faker.helpers.arrayElement(viralPosts);
        
    const author = faker.helpers.arrayElement(users);

    const parentComment = faker.datatype.boolean(0.1) && post.comments.length > 0
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
  console.log(`Created ${COMMENT_COUNT} Mock Comments (Weighted).`);

  // --- 6. CREATE LIKES & DISLIKES (Targeting Viral Posts) ---
  const reactionPromises = [];
  for (let i = 0; i < REACTION_COUNT; i++) {
      // 💡 30% of reactions target the viral posts
      const post = faker.datatype.boolean(0.7) 
        ? faker.helpers.arrayElement(posts) 
        : faker.helpers.arrayElement(viralPosts);
        
      const user = faker.helpers.arrayElement(users);
      // Mostly Likes (85%) but some Dislikes (15%)
      const reactionType = faker.datatype.boolean(0.85) ? ReactionType.LIKE : ReactionType.DISLIKE;

      reactionPromises.push(
          prisma.reaction.create({ 
              data: {
                  userId: user.id,
                  postId: post.id,
                  type: reactionType, 
              }
          }).catch(() => null)
      );
  }
  await Promise.all(reactionPromises);
  console.log(`Created ${REACTION_COUNT} Mock Reactions (Weighted).`);


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
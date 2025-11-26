import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// --- Data Generators ---
const USERS_TO_CREATE = 40
const CHANNELS_TO_CREATE = 50
const POSTS_TO_CREATE = 100
const COMMENTS_TO_CREATE = 300

// Helper to pick random item
const random = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)]

// Content Assets
const ADJECTIVES = ['Ancient', 'Modern', 'Creative', 'Hidden', 'Future', 'Broken', 'Electric', 'Silent', 'Rolling', 'Flying']
const NOUNS = ['Machine', 'Garden', 'City', 'Code', 'Dream', 'Forest', 'Ocean', 'Sky', 'Algorithm', 'Network']
const TOPICS = ['React', 'NextJS', 'TypeScript', 'Cooking', 'Gaming', 'Hiking', 'Space', 'Politics', 'Design', 'Music']

const generateName = () => `${random(ADJECTIVES)} ${random(NOUNS)}`
const generateSlug = (name: string) => name.toLowerCase().replace(/ /g, '-') + '-' + Math.floor(Math.random() * 1000)
const generateText = () => `This is a randomly generated post about ${random(TOPICS)}. We are discussing the importance of ${random(ADJECTIVES).toLowerCase()} ${random(NOUNS).toLowerCase()}s.`

async function main() {
  console.log('🌱 Starting massive seed...')

  // 1. Cleanup
  console.log('🧹 Cleaning database...')
  await prisma.comment.deleteMany()
  await prisma.subscription.deleteMany()
  await prisma.post.deleteMany()
  await prisma.channel.deleteMany()
  await prisma.account.deleteMany()
  await prisma.session.deleteMany()
  await prisma.user.deleteMany()

  // 2. Create Users
  console.log(`👤 Creating ${USERS_TO_CREATE} users...`)
  const users = []
  // We use the same password hash for everyone: "s3cret"
  const passwordHash = '$argon2id$v=19$m=65536,t=3,p=4$M3M3M3M3M3M3M3M3$t7+J/'

  for (let i = 0; i < USERS_TO_CREATE; i++) {
    const firstName = random(['Alice', 'Bob', 'Charlie', 'David', 'Eve', 'Frank', 'Grace', 'Hannah'])
    const lastName = random(['Smith', 'Jones', 'Taylor', 'Brown', 'Williams', 'Davis', 'Miller', 'Wilson'])
    const username = `${firstName}${lastName}${i}`.toLowerCase()
    
    users.push(await prisma.user.create({
      data: {
        name: `${firstName} ${lastName}`,
        username: username,
        email: `${username}@example.com`,
        passwordHash,
      }
    }))
  }

  // 3. Create Channels
  console.log(`📺 Creating ${CHANNELS_TO_CREATE} channels...`)
  const channels = []
  for (let i = 0; i < CHANNELS_TO_CREATE; i++) {
    const name = generateName()
    const topic = random(TOPICS)
    
    channels.push(await prisma.channel.create({
      data: {
        name: name,
        slug: generateSlug(name),
        description: `The number one place to discuss ${topic} and ${random(NOUNS)}s.`,
        tags: [topic.toLowerCase(), random(ADJECTIVES).toLowerCase()],
        creatorId: random(users).id
      }
    }))
  }

  // 4. Create Subscriptions (Randomly subscribe users to channels)
  console.log('🔔 Generating subscriptions...')
  for (const user of users) {
    // Each user follows 1-5 random channels
    const subCount = Math.floor(Math.random() * 5) + 1
    for (let i = 0; i < subCount; i++) {
      const channel = random(channels)
      // Use upsert to avoid unique constraint errors if random picks same channel twice
      await prisma.subscription.upsert({
        where: { userId_channelId: { userId: user.id, channelId: channel.id }},
        update: {},
        create: { userId: user.id, channelId: channel.id }
      })
    }
  }

  // 5. Create Posts
  console.log(`📝 Creating ${POSTS_TO_CREATE} posts...`)
  const posts = []
  for (let i = 0; i < POSTS_TO_CREATE; i++) {
    const channel = random(channels)
    const author = random(users)
    
    posts.push(await prisma.post.create({
      data: {
        title: `${random(ADJECTIVES)} ${random(TOPICS)} Guide`,
        content: generateText() + " " + generateText(),
        channelId: channel.id,
        authorId: author.id,
      }
    }))
  }

  // 6. Create Comments
  console.log(`💬 Creating ${COMMENTS_TO_CREATE} comments...`)
  for (let i = 0; i < COMMENTS_TO_CREATE; i++) {
    const post = random(posts)
    const author = random(users)

    await prisma.comment.create({
      data: {
        content: `I totally agree with this! The ${random(NOUNS)} is amazing.`,
        postId: post.id,
        authorId: author.id
      }
    })
  }

  console.log('✅ Seed complete!')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
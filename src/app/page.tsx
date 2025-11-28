import Link from "next/link"
import ThemeLogo from "@/components/ThemeLogo" 
import styles from "./landing.module.css"
import { ArrowRight, Hexagon, Fingerprint, Layers, ShieldCheck } from "lucide-react"
import { PostCard } from "@/components/PostCard"

export default function LandingPage() {
  
  // --- MOCK DATA FOR HERO CARD ---
  const demoPost = {
    id: "demo-hero-1",
    title: "Deepfakes are over.",
    content: "This is what a verified thought looks like. Cryptographically signed, anchored on Optimism, and impossible to fake. The truth engine is live.",
    createdAt: new Date(),
    type: "TEXT" as const,
    mediaUrl: null,
    mediaHash: null,
    embedUrl: null, 
    contentHash: "0x7f83b1657ff1fc53b92dc18148a1d65dfc2d4b1fa3d677284addd200126d9069", 
    isVerified: true, 
    signature: "0xsignature...", 
    author: { 
        id: "official-peake-id",
        name: "PeakeFeeds", 
        username: "peake_official",
        image: null 
    },
    channel: { 
        id: "official-channel-id",
        name: "Announcements", 
        slug: "official-news",
        creatorId: "official-peake-id"
    },
    // Updated counts to match new schema (likes + dislikes)
    _count: { comments: 42, likes: 4096, dislikes: 12 },
    
    comments: [
      {
        id: "c1",
        author: { id: "u1", username: "crypto_alice" },
        content: "Finally! A social graph I actually own. The UI is slick too. 💎",
        replies: []
      },
      {
        id: "c2",
        author: { id: "u2", username: "dev_dave" },
        content: "Is this anchored on L1 or L2?",
        replies: [
            {
                id: "c2-reply",
                author: { id: "official-peake-id", username: "peake_official" },
                content: "Optimism L2. Fast, cheap, and secure. ⚡",
                parentId: "c2"
            }
        ]
      }
    ] 
  }

  return (
    <div className={styles.container}>
      
      {/* 🌬️ BREATHING BACKGROUND LAYERS */}
      <div className={styles.backgroundLayer}>
        <div className={styles.orbTeal} />
        <div className={styles.orbPurple} />
        <div className={styles.orbWhite} />
      </div>

      {/* NAVIGATION */}
      <nav className={styles.nav}>
        <div className={styles.brandContainer}>
            {/* 🔄 Dynamic Theme Logo */}
            <ThemeLogo />
            <span className={styles.brandText}>PeakeFeeds</span>
        </div>
        
        <div className={styles.navLinksContainer}> 
          <Link href="/api/auth/signin" className={styles.navLink}>Login</Link>
        </div>
      </nav>

      {/* HERO SECTION */}
      <section className={styles.hero}>
        
        {/* Left: Copy */}
        <div className={styles.heroContent}>
          <div className={styles.optimismBadge}> 
            <span className={styles.pingEffect}>
              <span className={styles.pingDot}></span>
              <span className={styles.dot}></span>
            </span>
            <span>OPTIMISM L2 LIVE</span>
          </div>
          
          <h1 className={styles.title}>
            The <span className={styles.gradientText}>Truth Layer</span> <br />
            for the Internet.
          </h1>
          
          <p className={styles.subtitle}>
            A decentralized social protocol fighting AI disinformation. 
            We cryptographically verify content origin, making your words 
            immutable on the blockchain.
          </p>

          <div className={styles.ctaButtonContainer}> 
            <Link href="/register" className={styles.ctaButton}>
              Create Account <ArrowRight size={18} />
            </Link>
            <Link href="/home" className={styles.secondaryButton}>
              View Live Feed
            </Link>
          </div>
        </div>

        {/* Right: Product Demo (Single 3D Card) */}
        <div className={styles.heroVisual}>
          <div className={styles.demoCardWrapper}>
            {/* isDemo={true} ensures we don't try to call the database 
                when the user clicks like/dislike/comment 
            */}
            <PostCard 
                post={demoPost} 
                initialReaction="LIKE" 
                isDemo={true} 
            />
            
            <div className={styles.demoLabel}>
                Interactive Demo: Inspect the Verification, View Comments or Like This Post!
            </div>
          </div>
        </div>
      </section>

      {/* FEATURES GRID */}
      <section className={styles.features}>
        <div className={styles.featureCard}>
          <div className={styles.iconWrapper}><Hexagon size={24} /></div>
          <h3 className={styles.featureTitle}>Optimism Secured</h3>
          <p className={styles.featureText}>
            Every post creates a cryptographic proof on the Optimism L2. 
            Low gas fees, Ethereum-level security.
          </p>
        </div>

        <div className={styles.featureCard}>
          <div className={styles.iconWrapper}><Fingerprint size={24} /></div>
          <h3 className={styles.featureTitle}>Proof of Humanity</h3>
          <p className={styles.featureText}>
            Combat AI-generated spam. Our Web3 Auth layer validates organic interaction, 
            making it impossible for bot farms to scale.
          </p>
        </div>

        <div className={styles.featureCard}>
          <div className={styles.iconWrapper}><Layers size={24} /></div>
          <h3 className={styles.featureTitle}>Content Attribution</h3>
          <p className={styles.featureText}>
            Stop copycats. The original creator is stamped on-chain. 
            Derivatives are tracked protecting IP.
          </p>
        </div>
      </section>

      {/* FOOTER */}
      <footer className={styles.footer}>
        <p className={styles.footerText}>
          Built on <span className={styles.footerHighlight}>Ethereum</span> • Powered by <span className={styles.footerHighlightRed}>Optimism</span>
        </p>
      </footer>

    </div>
  )
}
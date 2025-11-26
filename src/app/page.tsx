import Link from "next/link"
import styles from "./landing.module.css" // Ensure this path is correct relative to your file
import { ArrowRight, Hexagon, Fingerprint, Layers } from "lucide-react"
import { PostCard } from "@/components/PostCard"

export default function LandingPage() {
  
  // --- MOCK DATA (UPDATED TO MATCH SCHEMA) ---
  const demoPost = {
    id: "demo-hero-1",
    title: "Deepfakes are over.",
    content: "This is what a verified thought looks like. Cryptographically signed, anchored on Optimism, and impossible to fake. The truth engine is live.",
    createdAt: new Date(),
    
    // ✅ FIX 1: Add the missing Media Fields
    type: "TEXT" as const, // Cast to const so TS knows it's a valid Enum value
    mediaUrl: null,
    mediaHash: null,

    // ✅ FIX 2: Add missing 'id' to Author (Required by PostCard type)
    author: { 
        id: "official-peake-id",
        name: "PeakeFeeds", 
        username: "peake_official",
        image: null // Explicitly null if no image
    },

    // ✅ FIX 3: Add missing 'id' and 'creatorId' to Channel
    channel: { 
        id: "official-channel-id",
        name: "Announcements", 
        slug: "official-news",
        creatorId: "official-peake-id"
    },

    _count: { 
        comments: 128, 
        likes: 4096 
    },
    comments: [] 
  }

  return (
    <div className={styles.container}>
      
      {/* Navigation */}
      <nav className={styles.nav}>
        <div className={styles.brandText}> 
          PeakeFeeds
        </div>
        
        <div className={styles.navLinksContainer}> 
          <Link href="/login" className={styles.navLink}>
            Login
          </Link>
          <Link href="/register" className={styles.ctaNavButton}> 
            Start Verifying
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <section className={styles.hero}>
        <div className={styles.glowOrb} />
        
        {/* Left: Copy */}
        <div className={styles.heroContent}>
          <div className={styles.optimismBadge}> 
            <span className={styles.pingEffect}>
              <span className={styles.pingDot}></span>
              <span className={styles.dot}></span>
            </span>
            OPTIMISM L2 MAINNET LIVE
          </div>
          
          <h1 className={styles.title}>
            The Truth Layer <br />
            for the Internet.
          </h1>
          
          <p className={styles.subtitle}>
            A decentralized social protocol. We cryptographically verify content 
            origin to fight AI disinformation. Your words, immutable on the blockchain.
          </p>

          <div className={styles.ctaButtonContainer}> 
            <Link href="/register" className={styles.ctaButton}>
              Create Account <ArrowRight size={18} />
            </Link>
            <Link href="/home" className={styles.secondaryButton}>
              View Feed
            </Link>
          </div>
        </div>

        {/* Right: Product Demo */}
        <div className={styles.heroVisual}>
          <div className={styles.demoCardWrapper}>
            {/* The Real Component with Valid Mock Data */}
            <PostCard post={demoPost} />
            
            <div className={styles.demoLabel}>
                <ArrowRight className="inline mr-1" size={14} />
                Try tapping the card!
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className={styles.features}>
        <div className={styles.featureCard}>
          <Hexagon className={styles.featureIcon} size={32} />
          <h3 className={styles.featureTitle}>Optimism Secured</h3>
          <p className={styles.featureText}>
            Every post creates a cryptographic proof on the Optimism L2. 
            Low gas fees, Ethereum-level security.
          </p>
        </div>

        <div className={styles.featureCard}>
          <Fingerprint className={styles.featureIcon} size={32} />
          <h3 className={styles.featureTitle}>Proof of Humanity</h3>
          <p className={styles.featureText}>
            Combat AI-generated spam. Our Web3 Auth layer validates organic interaction, 
            making it impossible for bot farms to scale.
          </p>
        </div>

        <div className={styles.featureCard}>
          <Layers className={styles.featureIcon} size={32} />
          <h3 className={styles.featureTitle}>Content Attribution</h3>
          <p className={styles.featureText}>
            Stop copycats. The original creator is stamped on-chain. 
            Derivatives are tracked protecting IP.
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className={styles.footer}>
        <p className={styles.footerText}>
          Built on <span className={styles.footerHighlight}>Ethereum</span> • Powered by <span className={styles.footerHighlightRed}>Optimism</span>
        </p>
      </footer>

    </div>
  )
}
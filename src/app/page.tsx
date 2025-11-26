import Link from "next/link"
import styles from "./landing.module.css" // Ensure this path matches your folder structure
import { ShieldCheck, Database, Fingerprint, ArrowRight, Hexagon, Layers } from "lucide-react"
import { PostCard } from "@/components/PostCard" // Import the real component

export default function LandingPage() {
  
  // --- MOCK DATA FOR THE DEMO CARD ---
  const demoPost = {
    id: "demo-hero-1",
    title: "Deepfakes are over.",
    content: "This is what a verified thought looks like. Cryptographically signed, anchored on Ethereum via Optimism, and impossible to fake. The truth engine is live. Time to join the athenticity revolution.",
    createdAt: new Date(),
    author: { 
        name: "PeakeFeeds", 
        username: "peake_official" 
    },
    channel: { 
        name: "Announcements", 
        slug: "official-news" 
    },
    _count: { 
        comments: 128, 
        likes: 4096 
    },
    // We pass empty comments for the demo to prevent the drawer from breaking the layout if opened
    comments: [] 
  }

  return (
    <div className={styles.container}>
      
      {/* Navigation */}
      <nav className={styles.nav}>
        <div className={styles.brandText}> 
          PeakeFeeds
        </div>
        
        {/* We hide the extra buttons on mobile to prevent overlap with Theme Toggle */}
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

        {/* Right: The Actual Product Demo */}
        <div className={styles.heroVisual}>
          <div className={styles.demoCardWrapper}>
            {/* The Real Component! */}
            <PostCard post={demoPost} />
            
            {/* A floating label to explain it */}
            <div className={styles.demoLabel}>
                <ArrowRight className="inline mr-1" size={14} />
                Try interacting with this card!
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


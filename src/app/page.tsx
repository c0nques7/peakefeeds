'use client'

import { useState, Suspense } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import ThemeLogo from "@/components/ThemeLogo" 
import styles from "./landing.module.css"
import { ArrowRight, Hexagon, Fingerprint, Layers, ShieldCheck, Mail, Check, AlertCircle } from "lucide-react"
import { PostCard } from "@/components/PostCard"
import { subscribeToWaitlist } from "@/actions/subscribe-waitlist"

// --- 1. CLIENT FORM COMPONENT (With Analytics & UTMs) ---
function WaitlistForm() {
    const [email, setEmail] = useState('');
    const [message, setMessage] = useState('');
    const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');

    // Capture Marketing Data from URL
    const searchParams = useSearchParams();
    const source = searchParams.get('utm_source') || '';
    const medium = searchParams.get('utm_medium') || '';
    const campaign = searchParams.get('utm_campaign') || '';

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setStatus('loading');
        setMessage('');

        const formData = new FormData();
        formData.append('email', email);
        
        // Pass attribution data to server
        if (source) formData.append('source', source);
        if (medium) formData.append('medium', medium);
        if (campaign) formData.append('campaign', campaign);

        const result = await subscribeToWaitlist(formData);

        if (result.success) {
            setStatus('success');
            setMessage(result.message);
            
            // 🔥 Fire Analytics Event (Client Side)
            // Checks if GTM/GA4 script is loaded before calling
            if (typeof window !== 'undefined' && (window as any).gtag) {
                (window as any).gtag('event', 'join_waitlist', {
                    event_category: 'engagement',
                    event_label: source || 'organic',
                    value: 1
                });
            }
        } else {
            setStatus('error');
            setMessage(result.message || "Subscription failed.");
        }
    };

    const isSubscribed = status === 'success';

    return (
        <form onSubmit={handleSubmit} className={styles.waitlistForm}>
            
            {/* Feedback Messages */}
            {message && (
                <p className={isSubscribed ? styles.successMessage : styles.errorMessage}>
                    {isSubscribed ? <Check size={14} className="mr-2" /> : <AlertCircle size={14} className="mr-2" />}
                    {message}
                </p>
            )}

            <div className={styles.inputGroup}>
                <Mail size={20} className={styles.mailIcon} />
                <input
                    type="email"
                    name="email"
                    placeholder="Enter your email for beta access"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className={styles.emailInput}
                    disabled={isSubscribed || status === 'loading'}
                />
                <button
                    type="submit"
                    className={styles.waitlistButton}
                    disabled={status === 'loading' || isSubscribed}
                >
                    {status === 'loading' ? 'Sending...' : 'Get Access'}
                </button>
            </div>
        </form>
    );
}


export default function LandingPage() {
  
  // --- MOCK DATA FOR DEMO ---
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
      
      {/* 🌬️ ANIMATED BACKGROUND */}
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
          <Link href="/home" className={styles.secondaryButton}>
            View Feed
          </Link>
        </div>
      </nav>

      {/* HERO SECTION */}
      <section className={styles.hero}>
        
        {/* Left: Copy & Lead Gen */}
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

          {/* ⚠️ SUSPENSE WRAPPER: 
            Crucial for 'useSearchParams' to work without disabling 
            static optimization for the whole page.
          */}
          <Suspense fallback={
            <div className="h-12 w-full max-w-md bg-white/10 animate-pulse rounded-full mb-4" />
          }>
             <WaitlistForm />
          </Suspense>
          
          <p className={styles.smallLegal}>
              Join 1,200+ early verifiers on our private beta list.
          </p>

        </div>

        {/* Right: Product Demo */}
        <div className={styles.heroVisual}>
          <div className={styles.demoCardWrapper}>
            {/* isDemo={true} prevents DB calls on click */}
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
          Built on <span className={styles.footerHighlight}>Next.js</span> • Powered by <span className={styles.footerHighlightRed}>Ethereum</span> and <span className={styles.footerHighlightRed}>Optimism</span>
        </p>
      </footer>

    </div>
  )
}




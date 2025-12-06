'use client'

import { useState, Suspense } from "react"
import ThemeLogo from "@/components/ThemeLogo" 
import styles from "./landing.module.css"
import { Hexagon, Layers, ShieldCheck, Mail, Check, AlertCircle } from "lucide-react"
import { PostCard } from "@/components/PostCard"
import { subscribeToWaitlist } from "@/actions/subscribe-waitlist"
import { useSearchParams } from "next/navigation"

// --- 1. CLIENT FORM COMPONENT ---
function WaitlistForm() {
    const [email, setEmail] = useState('');
    const [message, setMessage] = useState('');
    const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');

    const searchParams = useSearchParams();
    const source = searchParams.get('utm_source') || '';

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setStatus('loading');
        setMessage('');

        const formData = new FormData();
        formData.append('email', email);
        if (source) formData.append('source', source);

        const result = await subscribeToWaitlist(formData);

        if (result.success) {
            setStatus('success');
            setMessage(result.message);
        } else {
            setStatus('error');
            setMessage(result.message || "Subscription failed.");
        }
    };

    const isSubscribed = status === 'success';

    return (
        <form onSubmit={handleSubmit} className={styles.waitlistForm}>
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
                    placeholder="Secure your handle..."
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

  // --- 2. MOCK DATA (UPDATED WITH ROLE) ---
  // --- 2. MOCK DATA (FIXED) ---
  const demoPost = {
    id: "demo-hero-1",
    title: "The algorithm is broken.",
    content: "You are looking at a verified thought. It wasn't curated by a black box. It was cryptographically signed on Optimism and anchored to Ethereum. This is what clarity looks like. #TheTruthLayer",
    
    // ✅ FIX: Convert Date to ISO String to match PostCard type
    createdAt: new Date().toISOString(),
    
    type: "TEXT" as const, // Ensure this matches your Prisma PostType enum string
    mediaUrl: null,
    // mediaHash: null, // You can remove this if PostCard doesn't use it, or keep it if it's optional
    embedUrl: null, 
    contentHash: "0x7f83b1657ff1fc53b92dc18148a1d65dfc2d4b1fa3d677284addd200126d9069", 
    isVerified: true, 
    signature: "0xsignature...", 
    author: { 
        id: "official-peake-id",
        name: "PeakeFeeds", 
        username: "peake_official",
        image: null,
        role: "BUSINESS" 
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
        replies: []
      }
    ] 
  }

  return (
    <div className={styles.container}>
      <div className={styles.backgroundLayer}>
        <div className={styles.orbTeal} />
        <div className={styles.orbPurple} />
        <div className={styles.orbWhite} />
      </div>

      <nav className={styles.nav}>
        <div className={styles.brandContainer}>
            <ThemeLogo />
            <span className={styles.brandText}>PeakeFeeds</span>
        </div>
      </nav>

      <section className={styles.hero}>
        <div className={styles.heroContent}>
          <div className={styles.optimismBadge}> 
            <span className={styles.pingEffect}>
              <span className={styles.pingDot}></span>
              <span className={styles.dot}></span>
            </span>
            <span>BUILT ON OPTIMISM</span>
          </div>

          <h1 className={styles.title}>
            The <span className={styles.gradientText}>Truth Layer</span> <br />
            is finally here.
          </h1>

          <p className={styles.subtitle}>
            The algorithm broke the truth. We built the engine to fix it.
            <br className="hidden md:block" />
            Experience the first social protocol with the <strong>speed of Optimism</strong> and the <strong>security of Ethereum</strong>.
          </p>

          <Suspense fallback={<div className="h-12 w-full bg-white/10 animate-pulse rounded-full" />}>
             <WaitlistForm />
          </Suspense>

          <p className={styles.smallLegal}>
              Join 1,200+ builders migrating to clarity.
          </p>
        </div>

        <div className={styles.heroVisual}>
          <div className={styles.demoCardWrapper}>
            <PostCard 
                post={demoPost} 
                initialReaction="LIKE" 
                isDemo={true} 
            />
            <div className={styles.demoLabel}>
                Interactive Demo: Click the Badge to Inspect Verification
            </div>
          </div>
        </div>
      </section>

      <section className={styles.features}>
        <div className={styles.featureCard}>
          <div className={styles.iconWrapper}><Hexagon size={24} /></div>
          <h3 className={styles.featureTitle}>Verifiable Speed</h3>
          <p className={styles.featureText}>
            We operate at the speed of the Superchain. Posts are verified instantly on Optimism, 
            costing fractions of a penny.
          </p>
        </div>

        <div className={styles.featureCard}>
          <div className={styles.iconWrapper}><ShieldCheck size={24} /></div>
          <h3 className={styles.featureTitle}>The Anti-Bot Layer</h3>
          <p className={styles.featureText}>
            AI trains on noise. We filter for signal. Our cryptographic handshake ensures 
            you are interacting with real humans.
          </p>
        </div>

        <div className={styles.featureCard}>
          <div className={styles.iconWrapper}><Layers size={24} /></div>
          <h3 className={styles.featureTitle}>Ownership by Default</h3>
          <p className={styles.featureText}>
            You own your graph. You own your words. Because your content is signed on-chain, 
            no platform can de-platform your history.
          </p>
        </div>
      </section>

      <footer className={styles.footer}>
        <p className={styles.footerText}>
          Built on <span className={styles.footerHighlight}>Next.js</span> • Powered by <span className={styles.footerHighlightRed}>Ethereum</span> and <span className={styles.footerHighlightRed}>Optimism</span>
        </p>
      </footer>
    </div>
  )
}
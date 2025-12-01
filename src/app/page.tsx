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
                    // UPDATE: Aggressive CTA for higher conversion
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

  // --- MOCK DATA FOR DEMO (UPDATED FOR NARRATIVE) ---
  const demoPost = {
    id: "demo-hero-1",
    // UPDATE: Strong Hook
    title: "The algorithm is broken.",
    // UPDATE: Explaining the tech in plain English
    content: "You are looking at a verified thought. It wasn't curated by a black box. It was cryptographically signed on Optimism and anchored to Ethereum. This is what clarity looks like. #TheTruthLayer",
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
                // UPDATE: Accurate Tech Distinction
                content: "Verified instantly on Optimism (L2). Settled securely on Ethereum (L1). 🔴✨",
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
      </nav>

      {/* HERO SECTION */}
      <section className={styles.hero}>

        {/* Left: Copy & Lead Gen */}
        <div className={styles.heroContent}>
          {/* UPDATE: Signal to the Superchain ecosystem */}
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

          {/* UPDATE: The "Notebook Analogy" - Speed vs Security */}
          <p className={styles.subtitle}>
            The algorithm broke the truth. We built the engine to fix it.
            <br className="hidden md:block" />
            Experience the first social protocol with the <strong>speed of Optimism</strong> and the <strong>security of Ethereum</strong>.
          </p>

          <Suspense fallback={
            <div className="h-12 w-full max-w-md bg-white/10 animate-pulse rounded-full mb-4" />
          }>
             <WaitlistForm />
          </Suspense>

          {/* UPDATE: Social Proof - Make it sound exclusive */}
          <p className={styles.smallLegal}>
              Join 1,200+ builders migrating to clarity.
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
                Interactive Demo: Click the Badge to Inspect Verification, View Comments or Like This Post!
            </div>
          </div>
        </div>
      </section>

      {/* FEATURES GRID */}
      <section className={styles.features}>
        <div className={styles.featureCard}>
          <div className={styles.iconWrapper}><Hexagon size={24} /></div>
          {/* UPDATE: "Verifiable Speed" Hook */}
          <h3 className={styles.featureTitle}>Verifiable Speed</h3>
          <p className={styles.featureText}>
            We operate at the speed of the Superchain. Posts are verified instantly on Optimism, 
            costing fractions of a penny, but inherit the unbreakable security of Ethereum.
          </p>
        </div>

        <div className={styles.featureCard}>
          <div className={styles.iconWrapper}><ShieldCheck size={24} /></div>
          {/* UPDATE: Attack the "Bot" problem directly */}
          <h3 className={styles.featureTitle}>The Anti-Bot Layer</h3>
          <p className={styles.featureText}>
            AI trains on noise. We filter for signal. Our cryptographic handshake ensures 
            you are interacting with real humans, not farming armies.
          </p>
        </div>

        <div className={styles.featureCard}>
          <div className={styles.iconWrapper}><Layers size={24} /></div>
          {/* UPDATE: Focus on Ownership */}
          <h3 className={styles.featureTitle}>Ownership by Default</h3>
          <p className={styles.featureText}>
            You own your graph. You own your words. Because your content is signed on-chain, 
            no platform can de-platform your history.
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


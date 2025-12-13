'use client'

import { useState, Suspense, useEffect } from "react"
import Link from 'next/link'
import { Hexagon, Layers, ShieldCheck, Mail, Check, AlertCircle, Copy, Sun, Moon, LogIn } from "lucide-react"
import { useTheme } from "next-themes" 
import { PostCard } from "@/components/PostCard"
import { subscribeToWaitlist } from "@/actions/subscribe-waitlist"
import { useSearchParams } from "next/navigation"
import styles from "./landing.module.css" 

// --- 1. CONFIGURATION ---
const DEV_WALLET = "0x6714a4e8ba4f584f1ad3b242d34628cd6d146f98";

// --- 2. COMPONENTS ---

function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => setMounted(true), [])
  if (!mounted) return null

  return (
    <button
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
      className="p-3 rounded-full bg-[var(--glass-panel)] border border-[var(--glass-border)] shadow-lg hover:scale-110 transition-transform active:scale-95 group"
      aria-label="Toggle Theme"
    >
      {theme === "dark" ? (
        <Sun className="text-amber-400 fill-amber-400/20" size={24} />
      ) : (
        <Moon className="text-slate-600 fill-slate-400/20" size={24} />
      )}
    </button>
  )
}

function WaitlistForm() {
    const [email, setEmail] = useState('');
    const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
    const [message, setMessage] = useState('');
    
    const searchParams = useSearchParams();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setStatus('loading');
        setMessage('');

        const formData = new FormData();
        formData.append('email', email);
        if(searchParams.get('source')) formData.append('source', searchParams.get('source')!);

        const result = await subscribeToWaitlist(formData);

        if (result.success) {
            setStatus('success');
            setMessage(result.message);
        } else {
            setStatus('error');
            setMessage(result.message || "Something went wrong.");
        }
    };

    return (
        <div className="w-full max-w-md">
            <form onSubmit={handleSubmit}>
                <div className="relative group flex items-center">
                    <div className={styles.inputGroup}>
                        <div className="pl-2 text-[var(--text-muted)] group-focus-within:text-[var(--accent-primary)] transition-colors">
                            <Mail size={20} />
                        </div>
                        <input
                            type="email"
                            placeholder="Secure your handle..."
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            disabled={status === 'success' || status === 'loading'}
                            className={styles.emailInput}
                        />
                        <button
                            type="submit"
                            disabled={status === 'loading' || status === 'success'}
                            className={styles.waitlistButton}
                        >
                            {status === 'loading' ? '...' : status === 'success' ? <Check size={18} /> : 'Get Access'}
                        </button>
                    </div>
                </div>
                
                {message && (
                    <div className={`mt-3 text-sm flex items-center gap-2 animate-in fade-in slide-in-from-top-2 ${status === 'success' ? 'text-emerald-500' : 'text-red-500'}`}>
                        {status === 'success' ? <Check size={14} /> : <AlertCircle size={14} />}
                        {message}
                    </div>
                )}
            </form>

            <div className="mt-6 flex items-center gap-4 text-sm pl-2">
                <span className="text-[var(--text-muted)]">Already have an account?</span>
                <Link 
                    href="/signin" 
                    className="flex items-center gap-2 font-bold text-[var(--accent-primary)] hover:underline hover:text-[var(--accent-secondary)] transition-colors"
                >
                    <LogIn size={16} />
                    Member Login
                </Link>
            </div>
        </div>
    );
}

function DonationFooter() {
    const [copied, setCopied] = useState(false);
    const handleCopy = () => {
        navigator.clipboard.writeText(DEV_WALLET);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="mt-24 pt-12 border-t border-[var(--glass-border)] w-full flex flex-col items-center gap-4 pb-12">
            <p className="text-sm font-medium text-[var(--text-muted)]">
                Built by independent developers.
            </p>
            <button 
                onClick={handleCopy}
                className="group flex items-center gap-3 px-5 py-2.5 rounded-full bg-[var(--glass-panel)] border border-[var(--glass-border)] hover:bg-[var(--glass-card)] hover:border-[var(--accent-primary)] transition-all cursor-pointer shadow-sm hover:shadow-md"
            >
                <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="font-mono text-xs sm:text-sm text-[var(--text-secondary)]">
                    {DEV_WALLET.slice(0, 6)}...{DEV_WALLET.slice(-4)}
                </span>
                {copied ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} className="opacity-40 group-hover:opacity-100 transition-opacity" />}
            </button>
        </div>
    );
}

// --- 3. MAIN PAGE ---

export default function LandingPage() {

  // 📝 MOCK DATA: Updated with Nested Comments
  const demoPost = {
    id: "hero-demo",
    content: "The algorithm is broken.\n\nYou are looking at a verified thought. It wasn't curated by a black box. It was cryptographically signed on Optimism. #TheTruthLayer",
    createdAt: new Date().toISOString(),
    type: "TEXT",
    mediaUrl: null, 
    isVerified: true,
    contentHash: "0x7f83b1657ff1fc53b92dc18148a1d65dfc2d4b1fa3d677284addd200126d9069",
    signature: "0x71283912389123...[Verified]",
    author: { 
        id: "peake-official",
        name: "PeakeFeeds", 
        username: "peake_official", 
        role: "ADMIN",
        image: null 
    },
    channel: { slug: "announcements" },
    _count: { likes: 1242, comments: 4 },
    // 🟢 ADDED: Mock Comment Data (Flat list with parentIds)
    comments: [
        {
            id: "c1",
            content: "Finally! A social graph I actually own. The UI is slick too. 💎",
            createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(), // 2 hours ago
            parentId: null,
            author: {
                id: "u1",
                username: "crypto_alice",
                image: null,
                role: "USER"
            }
        },
        {
            id: "c2",
            content: "The verification speed is insane compared to traditional social apps.",
            createdAt: new Date(Date.now() - 1000 * 60 * 60 * 1).toISOString(), // 1 hour ago
            parentId: "c1", // Reply to Alice
            author: {
                id: "u2",
                username: "builder_bob",
                image: null,
                role: "VERIFIED"
            }
        },
        {
            id: "c3",
            content: "Is this anchored on L1 or L2?",
            createdAt: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(), // 5 hours ago
            parentId: null,
            author: {
                id: "u3",
                username: "dev_dave",
                image: null,
                role: "USER"
            }
        },
         {
            id: "c4",
            content: "Signatures are L2 (Optimism) for speed, batched to L1 for security.",
            createdAt: new Date(Date.now() - 1000 * 60 * 60 * 4).toISOString(), // 4 hours ago
            parentId: "c3", // Reply to Dave
            author: {
                id: "peake-official",
                name: "PeakeFeeds",
                username: "peake_official",
                image: null,
                role: "ADMIN"
            }
        }
    ]
  }

  return (
    <div className={styles.container}>
      
      <div className={styles.backgroundLayer}>
         <div className={styles.orbTeal} />
         <div className={styles.orbPurple} />
      </div>

      <nav className="fixed top-0 right-0 z-50 p-6 flex justify-end">
          <ThemeToggle />
      </nav>

      <section className={styles.hero}>
        
        <div className={`${styles.heroContent} animate-in slide-in-from-left-10 duration-700 fade-in`}>
          
          <div className={styles.optimismBadge}>
            <span className={styles.pingEffect}><span className={styles.pingDot}></span><span className={styles.dot}></span></span>
            <span>Built on Optimism</span>
          </div>

          <h1 className={styles.title}>
            The <span className={styles.gradientText}>Truth Layer</span><br />
            is finally here.
          </h1>

          <p className={styles.subtitle}>
            The algorithm broke the truth. We built the engine to fix it. 
            Experience the first social protocol with the speed of Optimism and the security of Ethereum.
          </p>

          <Suspense fallback={<div className="h-14 w-full bg-gray-100 animate-pulse rounded-2xl" />}>
             <WaitlistForm />
          </Suspense>
          
        </div>

        <div className={`${styles.heroVisual} animate-in slide-in-from-right-10 duration-1000 fade-in`}>
            <div className={styles.demoCardWrapper}>
                <PostCard post={demoPost} isDemo={true} />
            </div>
        </div>
      </section>

      <section className={styles.features}>
        <div className={styles.featureCard}>
          <div className={styles.iconWrapper}><Hexagon size={28} /></div>
          <h3 className={styles.featureTitle}>Verifiable Speed</h3>
          <p className={styles.featureText}>We operate at the speed of the Superchain. Posts are verified instantly costing fractions of a penny.</p>
        </div>

        <div className={styles.featureCard}>
          <div className={styles.iconWrapper}><ShieldCheck size={28} /></div>
          <h3 className={styles.featureTitle}>The Anti-Bot Layer</h3>
          <p className={styles.featureText}>AI trains on noise. We filter for signal. Our cryptographic handshake ensures you interact with humans.</p>
        </div>

        <div className={styles.featureCard}>
          <div className={styles.iconWrapper}><Layers size={28} /></div>
          <h3 className={styles.featureTitle}>Ownership by Default</h3>
          <p className={styles.featureText}>You own your graph. You own your words. No platform can de-platform your history.</p>
        </div>
      </section>

      <footer className={styles.footer}>
        <DonationFooter />
        <div className="text-[var(--text-muted)] text-xs mt-8">
            <Link href="/terms" className="hover:text-[var(--text-primary)] mx-2">Terms</Link> • 
            <Link href="/privacy" className="hover:text-[var(--text-primary)] mx-2">Privacy</Link>
        </div>
      </footer>
    </div>
  )
}
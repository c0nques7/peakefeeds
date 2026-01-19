"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2, AlertCircle, ShieldCheck } from "lucide-react";
import { checkLoginRequirement } from "@/actions/auth-check";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [twoFactorCode, setTwoFactorCode] = useState("");
  const [showTwoFactor, setShowTwoFactor] = useState(false);
  const [error, setError] = useState("");
  const [debugError, setDebugError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setDebugError("");
    setIsLoading(true);

    try {
      // 1. Check if 2FA is required (if not already showing/providing code)
      if (!showTwoFactor) {
        const check = await checkLoginRequirement(email);
        if (check.required) {
          setShowTwoFactor(true);
          setIsLoading(false);
          return;
        }
      }
      
      const result = await signIn("credentials", {
        email,
        password,
        twoFactorCode: showTwoFactor ? twoFactorCode : "",
        redirect: false, 
        callbackUrl: "/home" 
      });
  
      if (result?.error) {
        setDebugError(result.error);
        if (result.error.toLowerCase().includes("2fa_required")) {
          setShowTwoFactor(true);
          setIsLoading(false);
          return;
        }
        
        if (result.error.toLowerCase().includes("invalid_2fa_code")) {
          setError("Invalid authentication code");
        } else {
          setError("Invalid email or password");
        }
        setIsLoading(false);
      } else {
        router.push("/home");
        router.refresh(); 
      }
    } catch (err) {
      console.error(err);
      setError("Something went wrong");
      setIsLoading(false);
    }
  };

  return (
    <>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-[var(--text-primary)] mb-2">
          {showTwoFactor ? "Two-Factor Auth" : "Welcome Back"}
        </h1>
        <p className="text-[var(--text-muted)]">
          {showTwoFactor 
            ? "Please enter the code from your authenticator app." 
            : "Sign in to access your feed."}
        </p>
      </div>

      {error && (
        <div className="flex flex-col gap-1 p-3 mb-6 rounded-lg bg-[var(--status-error-bg)] border border-[var(--status-error)]/20 text-[var(--status-error)] text-sm animate-in slide-in-from-top-2">
          <div className="flex items-center gap-2">
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
          {debugError && <span className="text-xs opacity-50 font-mono ml-6">Raw Error: {debugError}</span>}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {!showTwoFactor ? (
          <>
            <div>
              <input
                type="email"
                placeholder="Email Address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-3 rounded-lg bg-[var(--input-bg)] border border-[var(--glass-border)] text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--accent-primary)] focus:ring-1 focus:ring-[var(--accent-primary)] transition-all"
              />
            </div>
            
            <div>
              <input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full px-4 py-3 rounded-lg bg-[var(--input-bg)] border border-[var(--glass-border)] text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--accent-primary)] focus:ring-1 focus:ring-[var(--accent-primary)] transition-all"
              />
              <div className="flex justify-end mt-2">
                <Link 
                  href="/forgot-password" 
                  className="text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
                >
                  Forgot password?
                </Link>
              </div>
            </div>
          </>
        ) : (
          <div>
            <div className="relative">
              <ShieldCheck className="absolute left-4 top-3.5 text-[var(--text-muted)]" size={20} />
              <input
                type="text"
                placeholder="000000"
                value={twoFactorCode}
                onChange={(e) => setTwoFactorCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                required
                autoFocus
                className="w-full pl-12 pr-4 py-3 rounded-lg bg-[var(--input-bg)] border border-[var(--glass-border)] text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--accent-primary)] focus:ring-1 focus:ring-[var(--accent-primary)] transition-all tracking-widest font-mono text-lg"
              />
            </div>
            <div className="flex justify-end mt-2">
               <button 
                type="button" 
                onClick={() => { setShowTwoFactor(false); setTwoFactorCode(""); setError(""); }}
                className="text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
              >
                Back to login
              </button>
            </div>
          </div>
        )}

        <button 
          type="submit" 
          disabled={isLoading}
          className="w-full py-3 rounded-lg bg-[var(--accent-primary)] text-white font-bold hover:opacity-90 hover:translate-y-[-1px] transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading && <Loader2 className="animate-spin" size={18} />}
          {isLoading ? "Verifying..." : (showTwoFactor ? "Verify Code" : "Log In")}
        </button>
      </form>
      
      {!showTwoFactor && (
        <div className="mt-8 text-center text-sm text-[var(--text-muted)] border-t border-[var(--glass-border)] pt-6">
          <p>
            Need an account?{" "}
            <Link href="/register" className="text-[var(--accent-primary)] font-bold hover:underline">
              Register here
            </Link>
          </p>
        </div>
      )}
    </>
  );
}

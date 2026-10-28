"use client";

import { useEffect, useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2, AlertCircle } from "lucide-react";
import { checkLoginRequirement } from "@/actions/auth-check";
import { Button, TextField } from "@/components/ui";
import { GoogleSignIn } from "@/components/auth/GoogleButton";
import { describeAuthError, readAuthErrorFromUrl } from "@/components/auth/authErrors";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [twoFactorCode, setTwoFactorCode] = useState("");
  const [showTwoFactor, setShowTwoFactor] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Errors sent back here by a Google sign-in (e.g. a suspended account)
  useEffect(() => {
    const code = readAuthErrorFromUrl();
    if (code) setError(describeAuthError(code));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
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
        if (result.error.toLowerCase().includes("2fa_required")) {
          setShowTwoFactor(true);
          setIsLoading(false);
          return;
        }
        
        if (result.error.startsWith("ACCOUNT_SUSPENDED")) {
          const until = result.error.split("ACCOUNT_SUSPENDED:")[1];
          setError(until
            ? `This account is suspended until ${new Date(until).toLocaleString()}.`
            : "This account has been banned.");
        } else if (result.error === "ACCOUNT_UNDERAGE") {
          setError(describeAuthError(result.error));
        } else if (result.error.toLowerCase().includes("2fa_locked")) {
          setError("Too many wrong codes. Try again in 15 minutes.");
        } else if (result.error.toLowerCase().includes("invalid_2fa_code")) {
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
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-[var(--text-primary)]">
          {showTwoFactor ? "Enter your code" : "Log in"}
        </h1>
        <p className="mt-1 text-sm text-[var(--text-muted)]">
          {showTwoFactor
            ? "Enter the 6-digit code from your authenticator app."
            : "Welcome back. Log in to see your feed."}
        </p>
      </div>

      {error && (
        <div role="alert" className="flex items-center gap-2 p-3 mb-5 rounded-[var(--radius-control)] bg-[var(--status-error-bg)] text-[var(--status-error)] text-sm">
          <AlertCircle size={16} aria-hidden="true" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {!showTwoFactor ? (
          <>
            <GoogleSignIn />
            <TextField
              id="email"
              label="Email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <div className="flex flex-col gap-2">
              <TextField
                id="password"
                label="Password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <Link
                href="/forgot-password"
                className="self-end text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
              >
                Forgot password?
              </Link>
            </div>
          </>
        ) : (
          <div className="flex flex-col gap-2">
            <TextField
              id="twoFactorCode"
              label="Authentication code"
              inputMode="numeric"
              autoComplete="one-time-code"
              placeholder="000000"
              value={twoFactorCode}
              onChange={(e) => setTwoFactorCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              required
              autoFocus
              className="[&_input]:font-mono [&_input]:text-lg [&_input]:tracking-widest"
            />
            <button
              type="button"
              onClick={() => { setShowTwoFactor(false); setTwoFactorCode(""); setError(""); }}
              className="self-end text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
            >
              Back to login
            </button>
          </div>
        )}

        <Button type="submit" disabled={isLoading} size="lg" fullWidth icon={isLoading ? <Loader2 className="animate-spin" size={18} aria-hidden="true" /> : undefined}>
          {isLoading ? "Checking…" : (showTwoFactor ? "Verify code" : "Log in")}
        </Button>
      </form>

      {!showTwoFactor && (
        <div className="mt-6 text-center text-sm text-[var(--text-muted)] border-t border-[var(--glass-border)] pt-5">
          <p>
            Need an account?{" "}
            <Link href="/register" className="text-[var(--accent-primary)] font-bold hover:underline">
              Create one
            </Link>
          </p>
        </div>
      )}
    </>
  );
}

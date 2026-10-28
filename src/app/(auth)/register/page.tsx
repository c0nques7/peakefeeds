"use client";

import { useEffect, useState, useTransition } from "react";
import { registerUser } from "@/actions/auth-register";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2, AlertCircle, CheckCircle } from "lucide-react";
import { Button, TextField } from "@/components/ui";
import { GoogleSignIn } from "@/components/auth/GoogleButton";
import { describeAuthError, readAuthErrorFromUrl } from "@/components/auth/authErrors";
import { prepareGoogleSignup } from "@/actions/oauth-invite";

export default function RegisterPage() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");

  // Sent back here by Google sign-in when there's no account and no invite code yet
  useEffect(() => {
    const code = readAuthErrorFromUrl();
    if (code) setError(describeAuthError(code));
  }, []);
  
  // State for the multi-step wizard
  const [step, setStep] = useState(1); // 1 = Code Check, 2 = Details
  const [formData, setFormData] = useState({
    inviteCode: "",
    username: "",
    email: "",
    password: ""
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  // Step 1 only collects the invite code; Enter should move on, not submit the hidden email form
  const continueFromCode = () => {
    if (formData.inviteCode.trim().length < 5) {
      setError("Enter the invite code from your email, for example PEAKE-1A2B3C.");
    } else {
      setError("");
      setStep(2);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (step === 1) {
      continueFromCode();
      return;
    }
    setError("");

    startTransition(async () => {
      // Create FormData to send to the Server Action
      const submission = new FormData();
      Object.entries(formData).forEach(([key, value]) => submission.append(key, value));

      const result = await registerUser(submission);
      console.log("Registration result:", result);

      if (result?.error) {
        setError(result.error);
        // If the server says the code is invalid (even if it passed client checks), go back
        if (result.error.toLowerCase().includes("invite") || result.error.toLowerCase().includes("code")) {
             setStep(1);
        }
      } else {
        // Success! Redirect to login
        router.push("/login?registered=true");
      }
    });
  };

  return (
    <>
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-[var(--text-primary)]">Create an account</h1>
        <p className="mt-1 text-sm text-[var(--text-muted)]">
          PeakeFeeds is in private beta, so you&apos;ll need an invite code.
        </p>
      </div>

      {error && (
        <div role="alert" className="flex items-center gap-2 p-3 mb-5 rounded-[var(--radius-control)] bg-[var(--status-error-bg)] text-[var(--status-error)] text-sm">
          <AlertCircle size={16} aria-hidden="true" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">

        {/* --- STEP 1: INVITE CODE --- */}
        <div className={step === 1 ? 'flex flex-col gap-4' : 'hidden'}>
          <TextField
            id="inviteCode"
            name="inviteCode"
            label="Invite code"
            placeholder="PEAKE-XXXXXX"
            autoComplete="off"
            value={formData.inviteCode}
            onChange={handleChange}
            className="[&_input]:font-mono [&_input]:uppercase [&_input]:tracking-widest"
            hint={<>No code yet? <Link href="/" className="underline hover:text-[var(--text-primary)]">Join the waitlist</Link>.</>}
          />

          <Button size="lg" fullWidth onClick={continueFromCode}>
            Continue
          </Button>
        </div>

        {/* --- STEP 2: GOOGLE OR EMAIL --- */}
        <div className={step === 2 ? 'flex flex-col gap-4' : 'hidden'}>
           <div className="flex items-center gap-2 p-2.5 rounded-[var(--radius-control)] bg-[var(--status-success-bg)] text-[var(--status-success)] text-xs">
                <CheckCircle size={14} aria-hidden="true" />
                <span className="font-mono">Invite code {formData.inviteCode.toUpperCase()}</span>
                <button type="button" onClick={() => setStep(1)} className="ml-auto underline">Change</button>
           </div>

           <GoogleSignIn
             label="Sign up with Google"
             callbackUrl="/welcome"
             beforeSignIn={async () => {
               // Keep the invite code for the round trip through Google
               const res = await prepareGoogleSignup(formData.inviteCode);
               if ('error' in res) { setError(res.error); return false; }
               return true;
             }}
           />

           <TextField id="username" name="username" label="Username" autoComplete="username" required={step === 2} value={formData.username} onChange={handleChange} />
           <TextField id="email" name="email" type="email" label="Email" autoComplete="email" required={step === 2} value={formData.email} onChange={handleChange} />
           <TextField id="password" name="password" type="password" label="Password" autoComplete="new-password" required={step === 2} value={formData.password} onChange={handleChange} />

           <Button type="submit" disabled={isPending} size="lg" fullWidth icon={isPending ? <Loader2 className="animate-spin" size={18} aria-hidden="true" /> : undefined}>
            {isPending ? "Creating account…" : "Create account"}
           </Button>
        </div>

      </form>

      <div className="mt-6 text-center text-sm text-[var(--text-muted)] border-t border-[var(--glass-border)] pt-5">
        <p>
          Already have an account?{" "}
          <Link href="/login" className="text-[var(--accent-primary)] font-bold hover:underline">
            Log in
          </Link>
        </p>
      </div>
    </>
  );
}
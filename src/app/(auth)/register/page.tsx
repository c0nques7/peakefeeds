"use client";

import { useState, useTransition } from "react";
import { registerUser } from "@/actions/auth-register";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2, Ticket, AlertCircle, CheckCircle } from "lucide-react";

export default function RegisterPage() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");
  
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-[var(--text-primary)] mb-2">Create Account</h1>
        <p className="text-[var(--text-muted)]">
          PeakeFeeds is currently in private beta.
        </p>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 mb-6 rounded-lg bg-[var(--status-error-bg)] border border-[var(--status-error)]/20 text-[var(--status-error)] text-sm animate-in slide-in-from-top-2">
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        
        {/* --- STEP 1: THE INVITE CODE GATE --- */}
        <div className={`space-y-4 ${step === 1 ? 'block' : 'hidden'}`}>
          <div>
            <label className="text-xs font-bold text-[var(--accent-primary)] uppercase tracking-wider mb-1 block">
               Required for Access
            </label>
            <div className="relative">
                <Ticket className="absolute left-3 top-3.5 text-[var(--accent-primary)]" size={18} />
                <input
                    name="inviteCode"
                    type="text"
                    placeholder="ENTER-INVITE-CODE"
                    value={formData.inviteCode}
                    onChange={handleChange}
                    className="w-full pl-10 pr-4 py-3 rounded-lg bg-[var(--glass-panel)] border border-[var(--glass-border)] text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--accent-primary)] font-mono uppercase tracking-widest transition-all"
                />
            </div>
            <p className="text-xs text-[var(--text-muted)] mt-2">
                Don't have one? <Link href="/" className="hover:text-[var(--text-primary)] underline">Join the Waitlist.</Link>
            </p>
          </div>

          <button 
            type="button"
            onClick={() => {
                // Client-side basic validation
                if(formData.inviteCode.trim().length < 5) {
                    setError("Please enter a valid code format.");
                } else { 
                    setError(""); 
                    setStep(2); 
                }
            }}
            className="w-full py-3 rounded-lg bg-[var(--glass-panel)] hover:bg-[var(--glass-card-hover)] text-[var(--text-primary)] font-bold border border-[var(--glass-border)] transition-all"
          >
            Continue
          </button>
        </div>

        {/* --- STEP 2: USER DETAILS --- */}
        <div className={`space-y-4 animate-in slide-in-from-right-8 ${step === 2 ? 'block' : 'hidden'}`}>
           {/* Code Confirmation Badge */}
           <div className="flex items-center gap-2 mb-4 p-2 bg-[var(--status-success-bg)] rounded border border-[var(--status-success)]/20 text-[var(--status-success)] text-xs">
                <CheckCircle size={14} />
                <span className="font-mono">CODE: {formData.inviteCode.toUpperCase()}</span>
                <button type="button" onClick={() => setStep(1)} className="ml-auto hover:underline opacity-70">Change</button>
           </div>

           <div className="grid grid-cols-1 gap-4">
             <input
                name="username"
                type="text"
                placeholder="Username"
                required={step === 2}
                value={formData.username}
                onChange={handleChange}
                className="w-full px-4 py-3 rounded-lg bg-[var(--input-bg)] border border-[var(--glass-border)] text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--accent-primary)] transition-all"
              />
              <input
                name="email"
                type="email"
                placeholder="Email Address"
                required={step === 2}
                value={formData.email}
                onChange={handleChange}
                className="w-full px-4 py-3 rounded-lg bg-[var(--input-bg)] border border-[var(--glass-border)] text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--accent-primary)] transition-all"
              />
              <input
                name="password"
                type="password"
                placeholder="Password"
                required={step === 2}
                value={formData.password}
                onChange={handleChange}
                className="w-full px-4 py-3 rounded-lg bg-[var(--input-bg)] border border-[var(--glass-border)] text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--accent-primary)] transition-all"
              />
           </div>

           <button 
            type="submit" 
            disabled={isPending}
            className="w-full py-3 rounded-lg bg-[var(--accent-primary)] text-white font-bold hover:opacity-90 hover:translate-y-[-1px] transition-all flex items-center justify-center gap-2"
          >
            {isPending && <Loader2 className="animate-spin" size={18} />}
            {isPending ? "Verifying & Creating..." : "Complete Registration"}
          </button>
        </div>

      </form>
      
      <div className="mt-8 text-center text-sm text-[var(--text-muted)] border-t border-[var(--glass-border)] pt-6">
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
// src/app/register/page.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react"; // 1. Import signIn
import styles from "../login/auth.module.css"; 

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({ email: "", username: "", password: "" });
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false); // 2. Add loading state for UX

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      // Step 1: Create the User
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "Registration failed");
      }

      // Step 2: Auto-Login immediately
      // We use the same credentials we just sent to the register API
      const signInResult = await signIn("credentials", {
        email: form.email,
        password: form.password,
        redirect: false, // We handle the redirect manually
        callbackUrl: "/home", // 3. Explicitly set the destination
      });

      if (signInResult?.ok) {
        router.push("/home");
        router.refresh(); // 4. Ensure the server components know we are logged in
      } else {
        // Fallback: If registration worked but login failed (rare), go to login
        router.push("/login");
      }
    } catch (err: any) {
      setError(err.message);
      setIsLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.glassCard}>
        <h2 className="text-2xl font-bold mb-6 text-center text-white">Join PeakeFeeds</h2>
        
        {error && <p className="text-red-400 text-sm mb-4 text-center">{error}</p>}

        <form onSubmit={handleSubmit}>
          <input
            className={styles.input}
            type="email"
            placeholder="Email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            required
            disabled={isLoading}
          />
          <input
            className={styles.input}
            type="text"
            placeholder="Username"
            value={form.username}
            onChange={(e) => setForm({ ...form, username: e.target.value })}
            required
            disabled={isLoading}
          />
          <input
            className={styles.input}
            type="password"
            placeholder="Password"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            required
            disabled={isLoading}
          />
          <button 
            type="submit" 
            className={styles.button}
            disabled={isLoading}
          >
            {isLoading ? "Creating Account..." : "Create Account"}
          </button>
        </form>
      </div>
    </div>
  );
}
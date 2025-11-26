"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import styles from "./auth.module.css";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(""); // Clear previous errors on new submission
    
    // 1. Call NextAuth signIn
    const result = await signIn("credentials", {
      email,
      password,
      redirect: false, 
      callbackUrl: "/home" 
    })

    if (result?.error) {
      // 2. ✅ FIXED: Use the setError state to show feedback to the user
      setError("Invalid email or password");
      console.error(result.error);
    } else {
      // 3. Force the navigation
      router.push("/home");
      router.refresh(); 
    } 
  };

  return (
    <div className={styles.container}>
      <div className={styles.glassCard}>
        <h2 className="text-2xl font-bold mb-6 text-center">Welcome Back</h2>
        
        {error && <p className="text-red-400 text-sm mb-4 text-center">{error}</p>}

        <form onSubmit={handleSubmit}>
          <input
            className={styles.input}
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <input
            className={styles.input}
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <button type="submit" className={styles.button}>
            Log In
          </button>
        </form>
        
        <p className="text-gray-400 text-sm mt-4 text-center">
          Need an account? <a href="/register" className="text-blue-400 hover:underline">Register</a>
        </p>
      </div>
    </div>
  );
}
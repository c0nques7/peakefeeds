'use client'

import styles from './SearchBar.module.css'
import { Search } from 'lucide-react'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation' // 👈 For navigation

const SUGGESTIONS = [
  "Search channels...",
  "Try 'Next.js Tips'...",
  "Find 'Healthy Recipes'...",
  "Look for 'Tech News'...",
  "Discover 'React Tricks'..."
]

export function SearchBar() {
  const router = useRouter()
  const [query, setQuery] = useState("")
  const [placeholder, setPlaceholder] = useState("Search channels...")

  // Placeholder Animation
  useEffect(() => {
    let index = 0;
    const interval = setInterval(() => {
        index = (index + 1) % SUGGESTIONS.length;
        setPlaceholder(SUGGESTIONS[index]);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  // 🚀 NAVIGATION LOGIC
  const handleSearch = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && query.trim()) {
      // 1. Convert text to slug (e.g. "Tech News" -> "tech-news")
      const slug = query
        .trim()
        .toLowerCase()
        .replace(/[^\w\s-]/g, '') // Remove special chars
        .replace(/\s+/g, '-')     // Replace spaces with dashes
        .replace(/-+/g, '-');     // Remove duplicate dashes

      // 2. Navigate
      // Note: If we had a dedicated search page, we'd go to /search?q=...
      // But for now, we treat this as a "Jump to Channel" bar.
      router.push(`/channels/${slug}`);
      
      // Optional: Clear bar after search
      // setQuery(""); 
    }
  }

  return (
    <div className={styles.container}>
      <Search className={styles.icon} size={24} />
      <input 
        type="text" 
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={handleSearch} // 👈 Listen for Enter key
        placeholder={placeholder}
        className={styles.input}
      />
    </div>
  )
}
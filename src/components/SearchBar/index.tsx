'use client'

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { Search, ChevronRight } from 'lucide-react';
import { searchChannels } from '@/actions/search'; // Import the new action
import styles from './SearchBar.module.css'; // Assuming this path is correct

interface SearchResult {
    id: string;
    name: string;
    slug: string;
}

export function SearchBar() {
    const [query, setQuery] = useState('');
    const [debouncedQuery, setDebouncedQuery] = useState('');
    const [results, setResults] = useState<SearchResult[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const searchRef = useRef<HTMLDivElement>(null);

    // 1. Debounce Logic (Waits 300ms after user stops typing)
    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedQuery(query);
        }, 300);

        // Cleanup: Clear the timeout if the user types again
        return () => {
            clearTimeout(handler);
        };
    }, [query]);

    // 2. Fetching Logic (Triggers only when debouncedQuery changes)
    useEffect(() => {
        const fetchResults = async () => {
            if (debouncedQuery.length < 2) {
                setResults([]);
                setIsLoading(false);
                return;
            }

            setIsLoading(true);
            const channelResults = await searchChannels(debouncedQuery);
            setResults(channelResults);
            setIsLoading(false);
        };

        fetchResults();
    }, [debouncedQuery]);
    
    // 3. Close results on outside click
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
                setResults([]);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    return (
        <div className={styles.searchContainer} ref={searchRef}>
            <div className={styles.inputWrapper}>
                <Search size={24} className={styles.searchIcon} />
                <input
                    type="text"
                    placeholder="Search channels, topics, or hashes..."
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    className={styles.searchInput}
                />
            </div>
            
            {/* Display Results */}
            {(isLoading || results.length > 0) && (
                <div className={styles.resultsDropdown}>
                    {isLoading && (
                        <div className={styles.resultItem}>
                            Searching...
                        </div>
                    )}
                    
                    {results.map((channel) => (
                        <Link 
                            key={channel.id} 
                            href={`/channels/${channel.slug}`}
                            onClick={() => setResults([])} // Close dropdown on click
                            className={styles.resultItem}
                        >
                            <span className={styles.channelName}>{channel.name}</span>
                            <span className={styles.channelSlug}>#{channel.slug}</span>
                            <ChevronRight size={18} />
                        </Link>
                    ))}
                    
                    {/* Fallback for no results found */}
                    {(!isLoading && results.length === 0 && query.length >= 2) && (
                        <div className={styles.resultItem}>
                            No channels found for "{query}"
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
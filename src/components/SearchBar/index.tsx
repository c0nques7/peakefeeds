'use client'

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { Search, ChevronRight, PlusCircle, Loader2 } from 'lucide-react';
import { searchChannels } from '@/actions/search'; 
import styles from './SearchBar.module.css'; 

interface SearchResult {
    id: string;
    name: string;
    slug: string;
    _count?: { subscribers: number };
}

export function SearchBar() {
    const [query, setQuery] = useState('');
    const [debouncedQuery, setDebouncedQuery] = useState('');
    const [results, setResults] = useState<SearchResult[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    
    // Tracks if a search has been attempted so we don't show dropdown on empty state load
    const [hasSearched, setHasSearched] = useState(false); 
    const searchRef = useRef<HTMLDivElement>(null);

    // 1. Debounce Logic (300ms)
    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedQuery(query);
        }, 300);
        return () => clearTimeout(handler);
    }, [query]);

    // 2. Fetching Logic
    useEffect(() => {
        const fetchResults = async () => {
            if (debouncedQuery.length < 2) {
                setResults([]);
                setIsLoading(false);
                setHasSearched(false);
                return;
            }

            setIsLoading(true);
            setHasSearched(true);
            
            try {
                const channelResults = await searchChannels(debouncedQuery);
                setResults(channelResults);
            } catch (error) {
                console.error("Search failed", error);
                setResults([]);
            } finally {
                setIsLoading(false);
            }
        };

        fetchResults();
    }, [debouncedQuery]);

    // 3. Close results on outside click
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
                // Clear the query on outside click to "reset" the interaction
                // Alternatively, you could just setResults([]) to keep the text
                setResults([]); 
                setHasSearched(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    return (
        <div className={styles.container} ref={searchRef}>
            
            {/* Input Field */}
            <div className={styles.inputWrapper}>
                <Search size={20} className={styles.searchIcon} />
                <input
                    type="text"
                    placeholder="Search channels, topics, or hashes..."
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    className={styles.searchInput}
                />
                {isLoading && <Loader2 size={18} className="animate-spin text-[var(--text-muted)]" />}
            </div>

            {/* Dropdown Results */}
            {(hasSearched && query.length >= 2) && (
                <div className={styles.resultsDropdown}>
                    
                    {/* A. Existing Channels Found */}
                    {results.length > 0 && (
                        <div className={styles.group}>
                            <h4 className={styles.groupTitle}>Channels Found</h4>
                            {results.map((channel) => (
                                <Link 
                                    key={channel.id} 
                                    href={`/channels/${channel.slug}`}
                                    onClick={() => { setQuery(''); setResults([]); }} // Clear on nav
                                    className={styles.resultItem}
                                >
                                    <div className="flex flex-col text-left">
                                        <span className={styles.channelName}>{channel.name}</span>
                                        <span className={styles.channelSlug}>#{channel.slug}</span>
                                    </div>
                                    <ChevronRight size={16} className="text-[var(--text-muted)]" />
                                </Link>
                            ))}
                        </div>
                    )}

                    {/* B. Create New Option */}
                    {/* Shows if no results found, OR always at the bottom as an alternative */}
                    <div className={styles.createOption}>
                         <Link 
                            // ⚡️ Passes the search query to the create page as a pre-filled name
                            href={`/channels/create?name=${encodeURIComponent(query)}`}
                            className={styles.createLink}
                            onClick={() => { setQuery(''); setResults([]); }}
                         >
                            <div className="flex items-center gap-3">
                                <PlusCircle size={20} className="text-[var(--accent-primary)]" />
                                <div className="flex flex-col text-left">
                                    <span className="font-semibold text-[var(--text-primary)]">
                                        Create "{query}"
                                    </span>
                                    <span className="text-xs text-[var(--text-muted)]">
                                        Launch a new truth channel
                                    </span>
                                </div>
                            </div>
                            <ChevronRight size={16} className="text-[var(--text-muted)]" />
                         </Link>
                    </div>

                </div>
            )}
        </div>
    );
}

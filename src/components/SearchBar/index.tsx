'use client'

import { useState, useEffect, useRef, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Search, ChevronRight, PlusCircle, Loader2 } from 'lucide-react';
import { searchChannels } from '@/actions/search'; 
import clsx from 'clsx'; 
import styles from './SearchBar.module.css'; 

interface SearchResult {
    id: string;
    name: string;
    slug: string;
    _count?: { subscribers: number };
}

export function SearchBar() {
    const router = useRouter();
    const [query, setQuery] = useState('');
    const [debouncedQuery, setDebouncedQuery] = useState('');
    const [results, setResults] = useState<SearchResult[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    
    // Tracks if search logic has run
    const [hasSearched, setHasSearched] = useState(false);
    
    // 🆕 Keyboard Navigation State (-1 means input is focused/nothing selected)
    const [selectedIndex, setSelectedIndex] = useState(-1); 

    const searchRef = useRef<HTMLDivElement>(null);

    // --- 1. Debounce Logic ---
    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedQuery(query);
        }, 300);
        return () => clearTimeout(handler);
    }, [query]);

    // --- 2. Fetch Logic ---
    useEffect(() => {
        const fetchResults = async () => {
            if (debouncedQuery.length < 2) {
                setResults([]);
                setIsLoading(false);
                setHasSearched(false);
                setSelectedIndex(-1);
                return;
            }

            setIsLoading(true);
            setHasSearched(true);
            
            try {
                const channelResults = await searchChannels(debouncedQuery);
                setResults(channelResults);
                setSelectedIndex(-1); // Reset selection when new results arrive
            } catch (error) {
                console.error("Search failed", error);
                setResults([]);
            } finally {
                setIsLoading(false);
            }
        };

        fetchResults();
    }, [debouncedQuery]);

    // --- 3. Close on Outside Click ---
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
                setResults([]); 
                setHasSearched(false);
                setSelectedIndex(-1);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // --- 4. 🧠 Intelligence Layer: List Flattening ---
    
    // Check if an EXACT match exists (case insensitive) to prevent duplicate creation prompts
    const exactMatchExists = useMemo(() => {
        const lowerQ = query.toLowerCase();
        return results.some(r => r.name.toLowerCase() === lowerQ || r.slug.toLowerCase() === lowerQ);
    }, [results, query]);

    // Only show "Create" if we have searched, typed enough, AND no exact match exists
    const showCreateOption = hasSearched && query.length >= 2 && !exactMatchExists;

    // Create a single "Virtual List" for the keyboard to traverse
    // This combines [All Results] + [Create Option (if visible)]
    const navigationItems = useMemo(() => {
        const items = results.map(r => ({ 
            type: 'RESULT', 
            data: r, 
            href: `/channels/${r.slug}` 
        }));
        
        if (showCreateOption) {
            items.push({ 
                type: 'CREATE', 
                data: { id: 'create', name: query, slug: 'new' }, 
                href: `/channels/create?name=${encodeURIComponent(query)}` 
            });
        }
        return items;
    }, [results, showCreateOption, query]);

    // --- 5. Keyboard Handler ---
    const handleKeyDown = (e: React.KeyboardEvent) => {
        // If dropdown isn't visible, ignore
        if (!hasSearched || navigationItems.length === 0) return;

        if (e.key === 'ArrowDown') {
            e.preventDefault();
            // Move down, loop back to 0 if at bottom
            setSelectedIndex(prev => (prev < navigationItems.length - 1 ? prev + 1 : 0));
        } 
        else if (e.key === 'ArrowUp') {
            e.preventDefault();
            // Move up, loop to bottom if at top
            setSelectedIndex(prev => (prev > 0 ? prev - 1 : navigationItems.length - 1));
        } 
        else if (e.key === 'Enter') {
            e.preventDefault();
            if (selectedIndex >= 0 && selectedIndex < navigationItems.length) {
                const item = navigationItems[selectedIndex];
                handleSelection();
                router.push(item.href);
            }
        }
        else if (e.key === 'Escape') {
            setHasSearched(false);
            setResults([]);
            setSelectedIndex(-1);
            (document.activeElement as HTMLElement)?.blur();
        }
    };

    const handleSelection = () => {
        setQuery('');
        setResults([]);
        setHasSearched(false);
        setSelectedIndex(-1);
    };

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
                    onKeyDown={handleKeyDown} 
                    className={styles.searchInput}
                    autoComplete="off" 
                />
                {isLoading && <Loader2 size={18} className="animate-spin text-[var(--text-muted)]" />}
            </div>

            {/* Dropdown Results */}
            {(hasSearched && query.length >= 2) && (
                <div className={styles.resultsDropdown}>
                    
                    {/* A. Existing Channels */}
                    {results.length > 0 && (
                        <div className={styles.group}>
                            <h4 className={styles.groupTitle}>Channels Found</h4>
                            {results.map((channel, index) => {
                                // Calculate global index for this item
                                const isSelected = index === selectedIndex;
                                
                                return (
                                    <Link 
                                        key={channel.id} 
                                        href={`/channels/${channel.slug}`}
                                        onClick={handleSelection}
                                        className={clsx(styles.resultItem, {
                                            [styles.active]: isSelected 
                                        })}
                                    >
                                        <div className="flex flex-col text-left">
                                            <span className={styles.channelName}>{channel.name}</span>
                                            <span className={styles.channelSlug}>#{channel.slug}</span>
                                        </div>
                                        <ChevronRight size={16} className="text-[var(--text-muted)]" />
                                    </Link>
                                );
                            })}
                        </div>
                    )}

                    {/* B. Create New Option */}
                    {showCreateOption && (
                        <div className={styles.createOption}>
                             <Link 
                                href={`/channels/create?name=${encodeURIComponent(query)}`}
                                onClick={handleSelection}
                                // The index of this item is always after the last result
                                className={clsx(styles.createLink, {
                                    [styles.active]: selectedIndex === results.length
                                })}
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
                    )}

                </div>
            )}
        </div>
    );
}
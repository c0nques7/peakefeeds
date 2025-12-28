'use client'

import { useState, useEffect, useRef, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Search, ChevronRight, PlusCircle, Loader2, User as UserIcon } from 'lucide-react';
import { searchChannels, searchUsers } from '@/actions/search'; 
import clsx from 'clsx'; 
import styles from './SearchBar.module.css'; 

interface SearchResult {
    id: string;
    name?: string;
    slug?: string;
    username?: string;
    image?: string | null;
    type: 'channel' | 'user';
}

export function SearchBar() {
    const router = useRouter();
    const [query, setQuery] = useState('');
    const [debouncedQuery, setDebouncedQuery] = useState('');
    const [channelResults, setChannelResults] = useState<any[]>([]);
    const [userResults, setUserResults] = useState<any[]>([]);
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
                setChannelResults([]);
                setUserResults([]);
                setIsLoading(false);
                setHasSearched(false);
                setSelectedIndex(-1);
                return;
            }

            setIsLoading(true);
            setHasSearched(true);
            
            try {
                const [channels, users] = await Promise.all([
                    searchChannels(debouncedQuery),
                    searchUsers(debouncedQuery)
                ]);
                setChannelResults(channels);
                setUserResults(users);
                setSelectedIndex(-1); // Reset selection when new results arrive
            } catch (error) {
                console.error("Search failed", error);
                setChannelResults([]);
                setUserResults([]);
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
                setChannelResults([]); 
                setUserResults([]);
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
        const channelMatch = channelResults.some(r => r.name?.toLowerCase() === lowerQ || r.slug?.toLowerCase() === lowerQ);
        const userMatch = userResults.some(r => r.username?.toLowerCase() === lowerQ);
        return channelMatch || userMatch;
    }, [channelResults, userResults, query]);

    // Only show "Create" if we have searched, typed enough, AND no exact match exists
    const showCreateOption = hasSearched && query.length >= 2 && !exactMatchExists;

    // Create a single "Virtual List" for the keyboard to traverse
    // This combines [All Results] + [Create Option (if visible)]
    const navigationItems = useMemo(() => {
        const items: any[] = [];
        
        channelResults.forEach(r => {
            items.push({ 
                type: 'CHANNEL', 
                data: r, 
                href: `/channels/${r.slug}` 
            });
        });

        userResults.forEach(r => {
            items.push({
                type: 'USER',
                data: r,
                href: `/profile/${r.username}`
            });
        });
        
        if (showCreateOption) {
            items.push({ 
                type: 'CREATE', 
                data: { id: 'create', name: query, slug: 'new' }, 
                href: `/channels/create?name=${encodeURIComponent(query)}` 
            });
        }
        return items;
    }, [channelResults, userResults, showCreateOption, query]);

    // --- 5. Keyboard Handler ---
    const handleKeyDown = (e: React.KeyboardEvent) => {
        // If dropdown isn't visible, ignore
        if (!hasSearched || (channelResults.length === 0 && userResults.length === 0 && !showCreateOption)) return;

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
            setChannelResults([]);
            setUserResults([]);
            setSelectedIndex(-1);
            (document.activeElement as HTMLElement)?.blur();
        }
    };

    const handleSelection = () => {
        setQuery('');
        setChannelResults([]);
        setUserResults([]);
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
                    placeholder="Search people, channels, topics..."
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
                    
                    {/* A. User Results */}
                    {userResults.length > 0 && (
                        <div className={styles.group}>
                            <h4 className={styles.groupTitle}>People</h4>
                            {userResults.map((user, index) => {
                                // Global index for this user is just their position in userResults
                                const isSelected = index === selectedIndex;
                                
                                return (
                                    <Link 
                                        key={user.id} 
                                        href={`/profile/${user.username}`}
                                        onClick={handleSelection}
                                        className={clsx(styles.resultItem, {
                                            [styles.active]: isSelected 
                                        })}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-[var(--glass-border)] overflow-hidden flex items-center justify-center">
                                                {user.image ? <img src={user.image} className="w-full h-full object-cover" alt="" /> : <UserIcon size={14} className="text-[var(--text-muted)]" />}
                                            </div>
                                            <div className="flex flex-col text-left">
                                                <span className={styles.channelName}>@{user.username}</span>
                                                {user.name && <span className={styles.channelSlug}>{user.name}</span>}
                                            </div>
                                        </div>
                                        <ChevronRight size={16} className="text-[var(--text-muted)]" />
                                    </Link>
                                );
                            })}
                        </div>
                    )}

                    {/* B. Existing Channels */}
                    {channelResults.length > 0 && (
                        <div className={styles.group}>
                            <h4 className={styles.groupTitle}>Channels</h4>
                            {channelResults.map((channel, index) => {
                                // Global index: previous groups count (users) + current index
                                const globalIndex = userResults.length + index;
                                const isSelected = globalIndex === selectedIndex;
                                
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
                                            <span className={styles.channelSlug}>/c/{channel.slug}</span>
                                        </div>
                                        <ChevronRight size={16} className="text-[var(--text-muted)]" />
                                    </Link>
                                );
                            })}
                        </div>
                    )}

                    {/* C. Create New Option */}
                    {showCreateOption && (
                        <div className={styles.createOption}>
                             <Link 
                                href={`/channels/create?name=${encodeURIComponent(query)}`}
                                onClick={handleSelection}
                                // The index of this item is after users and channels
                                className={clsx(styles.createLink, {
                                    [styles.active]: selectedIndex === (userResults.length + channelResults.length)
                                })}
                             >
                                <div className="flex items-center gap-3">
                                    <PlusCircle size={20} className="text-[var(--accent-primary)]" />
                                    <div className="flex flex-col text-left">
                                        <span className="font-semibold text-[var(--text-primary)]">
                                            Create channel "{query}"
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
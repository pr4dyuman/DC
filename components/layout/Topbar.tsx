"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Search, Settings, LogOut, User as UserIcon, Building2 } from "lucide-react";
import { MobileSidebar } from "./MobileSidebar";
import { Notification } from "@/lib/types";
import type { CurrentUserResult } from "@/lib/actions";
import { getNotifications, getUnreadNotificationCount, globalSearch, markNotificationAsRead, SearchResult } from "@/lib/actions";
import { logout } from "@/lib/auth";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";
import { TopbarDesktopSearch } from "./TopbarDesktopSearch";
import { TopbarMobileSearch } from "./TopbarMobileSearch";
import { TopbarNotificationsMenu } from "./TopbarNotificationsMenu";

interface TopbarProps {
    currentUser?: CurrentUserResult;
    agencyName?: string;
    agencyLogo?: string;
    agencyPlan?: string;
    agencyStatus?: string;
    agencyHasAIBlogger?: boolean;
}

export function Topbar({
    currentUser: propUser,
    agencyName,
    agencyLogo,
    agencyPlan,
    agencyStatus,
    agencyHasAIBlogger,
}: TopbarProps) {
    const router = useRouter();

    const [user, setUser] = useState<CurrentUserResult | undefined>(propUser);

    // Search State
    const [query, setQuery] = useState("");
    const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [showResults, setShowResults] = useState(false);
    const [showMobileSearch, setShowMobileSearch] = useState(false);
    const searchRef = useRef<HTMLDivElement>(null);
    const mobileSearchRef = useRef<HTMLDivElement>(null);

    // Notification State
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);

    // Sync user from props
    // Note: Removed unsafe fallback that picked first user from DB on auth failure

    // Update User from Props
    useEffect(() => {
        if (propUser) setUser(propUser);
    }, [propUser]);

    // Fetch Notifications
    useEffect(() => {
        if (user) {
            Promise.all([
                getNotifications(user.id),
                getUnreadNotificationCount(user.id)
            ]).then(([notes, unread]) => {
                setNotifications(notes.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()));
                setUnreadCount(unread);
            });
        }
    }, [user]);

    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    // ... other code

    // Handle Search Debounce
    useEffect(() => {
        const timer = setTimeout(async () => {
            if (query.length >= 2) {
                setIsSearching(true);
                try {
                    const results = await globalSearch(query);
                    setSearchResults(results);
                    setShowResults(true);
                } catch (error) {
                    console.error("Search failed", error);
                    setSearchResults([]);
                    setShowResults(false);
                    toast.error("Search failed. Please try again.");
                } finally {
                    setIsSearching(false);
                }
            } else {
                setSearchResults([]);
                setShowResults(false);
            }
        }, 300);

        return () => clearTimeout(timer);
    }, [query]);

    // Click Outside to Close Search
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
                setShowResults(false);
            }
            if (mobileSearchRef.current && !mobileSearchRef.current.contains(event.target as Node)) {
                setShowMobileSearch(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleNotificationRead = async (id: string) => {
        // Optimistically update
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
        setUnreadCount(prev => Math.max(0, prev - 1));

        await markNotificationAsRead(id);
    };

    if (!user) return null;

    return (
        <>
            <div className="h-16 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-6 flex items-center justify-between z-10">
                <div className="flex items-center gap-4">
                    <div className="md:hidden mr-2">
                        {mounted && (
                            <MobileSidebar
                                currentUserId={user.id}
                                currentUserUsername={user.username}
                                currentUserRole={user.role}
                                agencyName={agencyName}
                                agencyLogo={agencyLogo}
                                agencyPlan={agencyPlan}
                                agencyStatus={agencyStatus}
                                agencyHasAIBlogger={agencyHasAIBlogger}
                            />
                        )}
                    </div>
                    <h2 className="text-lg font-semibold">Dashboard</h2>
                </div>

                <div className="flex items-center gap-4">
                    {/* Mobile Search Toggle */}
                    <button
                        className="sm:hidden p-2 rounded-full hover:bg-accent transition-colors"
                        onClick={() => setShowMobileSearch(prev => !prev)}
                        aria-label="Search"
                    >
                        <Search className="h-5 w-5 text-muted-foreground" />
                    </button>
                    <TopbarDesktopSearch
                        query={query}
                        searchResults={searchResults}
                        isSearching={isSearching}
                        showResults={showResults}
                        searchRef={searchRef}
                        onQueryChange={setQuery}
                        onShowResultsChange={setShowResults}
                        onSelectResult={() => {
                            setShowResults(false);
                            setQuery("");
                        }}
                    />

                    <TopbarNotificationsMenu
                        mounted={mounted}
                        notifications={notifications}
                        unreadCount={unreadCount}
                        onNotificationRead={handleNotificationRead}
                    />

                    {mounted ? (
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Avatar className="h-9 w-9 cursor-pointer hover:ring-2 hover:ring-offset-1 hover:ring-indigo-600 transition-all" role="button" aria-label="User menu">
                                    <AvatarImage src={user.avatar} alt={user.name || 'User avatar'} className="object-cover" />
                                    <AvatarFallback className="bg-indigo-600 text-white text-sm font-medium">
                                        {user.name?.substring(0, 2).toUpperCase()}
                                    </AvatarFallback>
                                </Avatar>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-56">
                                <DropdownMenuLabel className="font-normal">
                                    <div className="flex flex-col space-y-1">
                                        <p className="text-sm font-medium leading-none">{user.name}</p>
                                        <p className="text-xs leading-none text-muted-foreground">
                                            {user.email}
                                        </p>
                                    </div>
                                </DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem asChild>
                                    <Link href={`/dashboard/team/${user.username}`} className="cursor-pointer">
                                        <UserIcon className="mr-2 h-4 w-4" />
                                        <span>My Profile</span>
                                    </Link>
                                </DropdownMenuItem>
                                {user.role === 'admin' && (
                                    <DropdownMenuItem asChild>
                                        <Link href="/dashboard/settings" className="cursor-pointer">
                                            <Building2 className="mr-2 h-4 w-4" />
                                            <span>Agency Branding</span>
                                        </Link>
                                    </DropdownMenuItem>
                                )}
                                {user.role !== 'client' && (
                                    <DropdownMenuItem asChild>
                                        <Link href="/dashboard/settings" className="cursor-pointer">
                                            <Settings className="mr-2 h-4 w-4" />
                                            <span>Settings</span>
                                        </Link>
                                    </DropdownMenuItem>
                                )}
                                <DropdownMenuSeparator />
                                <DropdownMenuItem className="text-red-600 focus:text-red-600 cursor-pointer" onClick={async () => {
                                    await logout();
                                    router.push('/login');
                                    router.refresh();
                                }}>
                                    <LogOut className="mr-2 h-4 w-4" />
                                    <span>Log out</span>
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    ) : (
                        <Avatar className="h-9 w-9 cursor-pointer hover:ring-2 hover:ring-offset-1 hover:ring-indigo-600 transition-all" role="button" aria-label="User menu">
                            <AvatarImage src={user.avatar} alt={user.name || 'User avatar'} className="object-cover" />
                            <AvatarFallback className="bg-indigo-600 text-white text-sm font-medium">
                                {user.name?.substring(0, 2).toUpperCase()}
                            </AvatarFallback>
                        </Avatar>
                    )}
                </div>
            </div>

            {/* Mobile Search Panel */}
            {showMobileSearch && (
                <TopbarMobileSearch
                    query={query}
                    searchResults={searchResults}
                    isSearching={isSearching}
                    showResults={showResults}
                    mobileSearchRef={mobileSearchRef}
                    onQueryChange={setQuery}
                    onShowResultsChange={setShowResults}
                    onSelectResult={() => {
                        setShowResults(false);
                        setShowMobileSearch(false);
                        setQuery("");
                    }}
                />
            )}

        </>
    );
}

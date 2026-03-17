"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bell, Search, Settings, LogOut, User as UserIcon, Loader2, Check, X, FileText, Briefcase, Users, Building2 } from "lucide-react";
import { MobileSidebar } from "./MobileSidebar";
import { User, Notification } from "@/lib/types";
import { useDateFormat } from "@/context/TimezoneContext";

import { getUsers, getNotifications, getUnreadNotificationCount, globalSearch, markNotificationAsRead, SearchResult } from "@/lib/actions";
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
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface TopbarProps {
    currentUser?: User;
    agencyName?: string;
    agencyLogo?: string;
    agencyPlan?: string;
}

export function Topbar({ currentUser: propUser, agencyName, agencyLogo, agencyPlan }: TopbarProps) {
    const fmt = useDateFormat();
    const router = useRouter();

    const [user, setUser] = useState<User | undefined>(propUser);

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

    const getIconForType = (type: SearchResult['type']) => {
        switch (type) {
            case 'project': return <Briefcase className="h-4 w-4 text-blue-500" />;
            case 'client': return <Users className="h-4 w-4 text-green-500" />;
            case 'task': return <FileText className="h-4 w-4 text-orange-500" />;
            case 'user': return <UserIcon className="h-4 w-4 text-indigo-500" />;
            default: return <Search className="h-4 w-4" />;
        }
    };

    if (!user) return null;

    return (
        <>
            <div className="h-16 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-6 flex items-center justify-between z-10">
                <div className="flex items-center gap-4">
                    <div className="md:hidden mr-2">
                        {mounted && <MobileSidebar currentUserId={user.id} currentUserUsername={user.username} currentUserRole={user.role} agencyName={agencyName} agencyLogo={agencyLogo} agencyPlan={agencyPlan} />}
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
                    {/* Global Search */}
                    <div className="relative w-64 hidden sm:block" ref={searchRef}>
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <input
                            type="text"
                            placeholder="Search projects, tasks..."
                            className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 pl-9 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            onFocus={() => query.length >= 2 && setShowResults(true)}
                        />
                        {isSearching && (
                            <div className="absolute right-2.5 top-2.5">
                                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                            </div>
                        )}

                        {/* Search Results Dropdown */}
                        {showResults && (
                            <div className="absolute top-full mt-2 w-80 md:w-96 max-w-[calc(100vw-2rem)] right-0 bg-background rounded-md border shadow-lg overflow-hidden z-[100]">
                                <div className="p-2">
                                    <h4 className="text-xs font-medium text-muted-foreground mb-2 px-2">
                                        {searchResults.length > 0 ? "Results" : "No results found"}
                                    </h4>
                                    {searchResults.length > 0 && (
                                        <div className="space-y-1">
                                            {searchResults.map((result) => (
                                                <button
                                                    type="button"
                                                    key={result.id}
                                                    className="w-full text-left flex items-start gap-3 p-2 rounded-sm hover:bg-accent transition-colors"
                                                    onClick={() => {
                                                        router.push(result.url);
                                                        setShowResults(false);
                                                        setQuery("");
                                                    }}
                                                >
                                                    <div className="mt-1">
                                                        {getIconForType(result.type)}
                                                    </div>
                                                    <div className="flex-1 overflow-hidden">
                                                        <p className="text-sm font-medium truncate">{result.title}</p>
                                                        {result.subtitle && (
                                                            <p className="text-xs text-muted-foreground truncate">{result.subtitle}</p>
                                                        )}
                                                    </div>
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Notifications */}
                    {mounted ? (
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <button aria-label="Notifications" className="relative p-2 rounded-full hover:bg-accent transition-colors outline-none">
                                    <Bell className="h-5 w-5 text-muted-foreground" />
                                    {unreadCount > 0 && (
                                        <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-red-600 border border-background" />
                                    )}
                                </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-80">
                                <DropdownMenuLabel className="flex items-center justify-between">
                                    <span>Notifications</span>
                                    {unreadCount > 0 && (
                                        <span className="bg-red-100 text-red-600 text-xs px-2 py-0.5 rounded-full">
                                            {unreadCount} New
                                        </span>
                                    )}
                                </DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                <ScrollArea className="h-[300px]">
                                    {notifications.length === 0 ? (
                                        <div className="p-4 text-center text-sm text-muted-foreground">
                                            No notifications yet.
                                        </div>
                                    ) : (
                                        <div className="flex flex-col">
                                            {notifications.map((notification) => (
                                                <button
                                                    type="button"
                                                    key={notification.id}
                                                    className={`w-full text-left p-4 border-b last:border-0 hover:bg-muted/50 transition-colors ${!notification.read ? 'bg-muted/20' : ''}`}
                                                    onClick={() => {
                                                        if (!notification.read) handleNotificationRead(notification.id);
                                                        if (notification.link) {
                                                            router.push(notification.link);
                                                        }
                                                    }}
                                                >
                                                    <div className="flex items-start justify-between gap-2">
                                                        <p className={`text-sm ${!notification.read ? 'font-medium' : 'text-muted-foreground'}`}>
                                                            {notification.message}
                                                        </p>
                                                        {!notification.read && (
                                                            <div className="h-2 w-2 shrink-0 rounded-full bg-blue-500 mt-1.5" />
                                                        )}
                                                    </div>
                                                    <p className="text-xs text-muted-foreground mt-1">
                                                        {fmt.dateTime(notification.timestamp)}
                                                    </p>
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </ScrollArea>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    ) : (
                        <button aria-label="Notifications" className="relative p-2 rounded-full hover:bg-accent transition-colors outline-none">
                            <Bell className="h-5 w-5 text-muted-foreground" />
                        </button>
                    )}

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
                <div className="sm:hidden border-b bg-background px-4 py-2" ref={mobileSearchRef}>
                    <div className="relative">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <input
                            type="text"
                            placeholder="Search projects, tasks..."
                            className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 pl-9 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            onFocus={() => query.length >= 2 && setShowResults(true)}
                            autoFocus
                        />
                        {isSearching && (
                            <div className="absolute right-2.5 top-2.5">
                                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                            </div>
                        )}
                        {showResults && (
                            <div className="absolute top-full mt-2 w-full bg-background rounded-md border shadow-lg overflow-hidden z-[100]">
                                <div className="p-2">
                                    <h4 className="text-xs font-medium text-muted-foreground mb-2 px-2">
                                        {searchResults.length > 0 ? "Results" : "No results found"}
                                    </h4>
                                    {searchResults.length > 0 && (
                                        <div className="space-y-1">
                                            {searchResults.map((result) => (
                                                <button
                                                    type="button"
                                                    key={result.id}
                                                    className="w-full text-left flex items-start gap-3 p-2 rounded-sm hover:bg-accent transition-colors"
                                                    onClick={() => {
                                                        router.push(result.url);
                                                        setShowResults(false);
                                                        setShowMobileSearch(false);
                                                        setQuery("");
                                                    }}
                                                >
                                                    <div className="mt-1">
                                                        {getIconForType(result.type)}
                                                    </div>
                                                    <div className="flex-1 overflow-hidden">
                                                        <p className="text-sm font-medium truncate">{result.title}</p>
                                                        {result.subtitle && (
                                                            <p className="text-xs text-muted-foreground truncate">{result.subtitle}</p>
                                                        )}
                                                    </div>
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

        </>
    );
}

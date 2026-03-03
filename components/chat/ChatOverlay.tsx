"use client";

import { useState, useEffect, useRef } from "react";
import { Message, Contact, getContacts, getMessages, sendMessage, markAsRead, deleteConversation } from "@/lib/chat";
import { MessagesList, ContactItem } from "./ChatComponents";
import { X, Send, Search, Paperclip, MessageCircle, Trash2, ArrowLeft, MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";
import { useActivePolling } from "@/hooks/use-active-polling";
import { toast } from "sonner";
import { format, isToday, isYesterday } from "date-fns";

interface ChatOverlayProps {
    isOpen: boolean;
    onClose: () => void;
    currentUserId?: string;
    initialActiveId?: string | null;
}

export function ChatOverlay({ isOpen, onClose, currentUserId, initialActiveId }: ChatOverlayProps) {
    const [contacts, setContacts] = useState<Contact[]>([]);
    const [activeContactId, setActiveContactId] = useState<string | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [newMessage, setNewMessage] = useState("");
    const [viewMode, setViewMode] = useState<'chats' | 'users'>('chats');
    const [searchQuery, setSearchQuery] = useState("");
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [mobileView, setMobileView] = useState<'sidebar' | 'chat'>('sidebar');
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Initial load and sync with props
    useEffect(() => {
        if (isOpen && currentUserId) {
            loadContacts();
        }
    }, [isOpen, currentUserId]);

    // Handle external trigger to open specific chat
    useEffect(() => {
        if (isOpen && initialActiveId) {
            setActiveContactId(initialActiveId);
            setMobileView('chat');
            setViewMode('chats');
        }
    }, [isOpen, initialActiveId]);

    // Reset delete confirm when switching contacts
    useEffect(() => { setShowDeleteConfirm(false); }, [activeContactId]);

    // Poll for contacts list every 2 minutes
    useActivePolling(() => {
        loadContacts();
    }, 120000, isOpen && !!currentUserId);

    // Load messages when active contact changes
    useEffect(() => {
        if (currentUserId && activeContactId) {
            loadMessages();
            markAsRead(currentUserId, activeContactId);
        }
    }, [currentUserId, activeContactId]);

    // Poll messages every 10s
    useActivePolling(() => {
        loadMessages();
    }, 10000, isOpen && !!currentUserId && !!activeContactId);

    // Scroll to bottom
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    async function loadContacts() {
        if (!currentUserId) return;
        try {
            setContacts(await getContacts(currentUserId));
        } catch (error) {
            console.error("Failed to load contacts", error);
        }
    }

    async function loadMessages() {
        if (!currentUserId || !activeContactId) return;
        try {
            setMessages(await getMessages(currentUserId, activeContactId));
        } catch (error) {
            console.error("Failed to load messages", error);
        }
    }

    async function handleSend() {
        if (!currentUserId || !activeContactId || !newMessage.trim()) return;

        const optimisticMessage: Message = {
            id: "temp-" + Date.now(),
            senderId: currentUserId,
            receiverId: activeContactId,
            content: newMessage,
            timestamp: new Date().toISOString(),
            read: false,
            type: 'text',
            agencyId: 'optimistic'
        };

        setMessages(prev => [...prev, optimisticMessage]);
        setNewMessage("");

        try {
            await sendMessage(currentUserId, activeContactId, optimisticMessage.content);
            await loadMessages();
            await loadContacts();
        } catch (error) {
            console.error("Failed to send", error);
            toast.error("Failed to send message");
        }
    }

    async function handleDeleteConversation(contactId?: string) {
        const targetId = contactId || activeContactId;
        if (!currentUserId || !targetId) return;
        try {
            await deleteConversation(currentUserId, targetId);
            setMessages([]);
            if (targetId === activeContactId) {
                setActiveContactId(null);
                setMobileView('sidebar');
            }
            await loadContacts();
            toast.success("Conversation deleted");
        } catch (error) {
            console.error("Failed to delete conversation", error);
            toast.error("Failed to delete conversation");
        }
    }

    function selectContact(id: string) {
        setActiveContactId(id);
        setMobileView('chat');
    }

    const filteredContacts = searchQuery.trim()
        ? contacts.filter(c => c.name.toLowerCase().includes(searchQuery.toLowerCase()) || c.role?.toLowerCase().includes(searchQuery.toLowerCase()))
        : contacts;
    const activeContact = contacts.find(c => c.id === activeContactId);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 md:p-8 animate-in fade-in duration-200">
            <div
                className="w-full max-w-6xl h-[85vh] bg-card border border-border rounded-3xl overflow-hidden shadow-2xl flex flex-col md:flex-row ring-1 ring-border"
                style={{ backdropFilter: 'blur(20px)' }}
            >
                {/* Sidebar / Contact List */}
                <div className={`w-full md:w-80 border-r border-border flex flex-col bg-secondary ${mobileView === 'chat' ? 'hidden md:flex' : 'flex'}`}>
                    <div className="p-4 border-b border-border flex justify-between items-center">
                        <h2 className="text-lg font-bold text-foreground">Messages</h2>
                        <button onClick={onClose} className="md:hidden p-2 hover:bg-muted rounded-full text-muted-foreground">
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    <div className="p-4 pt-2 space-y-3">
                        <div className="relative">
                            <Search className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
                            <input
                                type="text"
                                placeholder="Search..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full bg-secondary border border-border rounded-xl py-2 pl-9 pr-4 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 placeholder:text-muted-foreground"
                            />
                        </div>
                        <button
                            onClick={() => setViewMode(viewMode === 'chats' ? 'users' : 'chats')}
                            className="w-full py-2 bg-muted hover:bg-accent text-foreground rounded-xl text-sm font-medium transition flex items-center justify-center border border-border"
                        >
                            {viewMode === 'chats' ? (
                                <><MessageCircle className="w-4 h-4 mr-2" />New Message</>
                            ) : (
                                <><X className="w-4 h-4 mr-2" />Cancel Selection</>
                            )}
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto px-2 space-y-1 custom-scrollbar">
                        {viewMode === 'chats' ? (
                            filteredContacts.filter(c => c.lastMessage).length > 0 ? (
                                filteredContacts
                                    .filter(c => c.lastMessage)
                                    .map(contact => (
                                        <ContactItem
                                            key={contact.id}
                                            contact={contact}
                                            isActive={contact.id === activeContactId}
                                            onClick={() => selectContact(contact.id)}
                                            onDelete={async (contactId) => {
                                                await handleDeleteConversation(contactId);
                                            }}
                                        />
                                    ))
                            ) : (
                                <div className="text-center py-8 text-muted-foreground text-sm">
                                    <p>No active chats.</p>
                                    <p className="mt-1">Click &quot;New Message&quot; to start.</p>
                                </div>
                            )
                        ) : (
                            filteredContacts.map(contact => (
                                <ContactItem
                                    key={contact.id}
                                    contact={contact}
                                    isActive={contact.id === activeContactId}
                                    onClick={() => {
                                        selectContact(contact.id);
                                        setViewMode('chats');
                                    }}
                                />
                            ))
                        )}
                    </div>
                </div>

                {/* Main Chat Area */}
                <div className={`flex-1 flex flex-col bg-background ${mobileView === 'sidebar' ? 'hidden md:flex' : 'flex'}`}>
                    {activeContact ? (
                        <>
                            {/* Chat Header */}
                            <div className="p-4 border-b border-border flex justify-between items-center bg-card/50 backdrop-blur-md">
                                <div className="flex items-center">
                                    {/* Mobile back button */}
                                    <button
                                        onClick={() => setMobileView('sidebar')}
                                        className="md:hidden p-1.5 rounded-lg hover:bg-muted transition text-muted-foreground hover:text-foreground mr-2"
                                    >
                                        <ArrowLeft className="w-4 h-4" />
                                    </button>
                                    <div className="relative">
                                        <img
                                            src={activeContact.avatar || "/placeholder-avatar.jpg"}
                                            alt={activeContact.name}
                                            className="w-10 h-10 rounded-full border border-border"
                                        />
                                        {activeContact.isOnline && (
                                            <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-card shadow-[0_0_8px_rgba(34,197,94,0.6)]" />
                                        )}
                                    </div>
                                    <div className="ml-3">
                                        <h3 className="font-semibold text-foreground leading-tight">{activeContact.name}</h3>
                                        <div className="text-xs text-muted-foreground flex items-center">
                                            {activeContact.isOnline ? (
                                                <span className="text-green-500 font-medium">Online</span>
                                            ) : (
                                                <span>
                                                    {activeContact.lastActiveAt
                                                        ? (isToday(new Date(activeContact.lastActiveAt))
                                                            ? `Last seen ${format(new Date(activeContact.lastActiveAt), "HH:mm")}`
                                                            : isYesterday(new Date(activeContact.lastActiveAt))
                                                                ? `Last seen Yesterday ${format(new Date(activeContact.lastActiveAt), "HH:mm")}`
                                                                : `Last seen ${format(new Date(activeContact.lastActiveAt), "d MMM HH:mm")}`)
                                                        : (activeContact.jobTitle || activeContact.role)}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 text-muted-foreground">
                                    {showDeleteConfirm ? (
                                        <div className="flex items-center gap-1.5 bg-card border border-border shadow-lg rounded-xl px-3 py-1.5 text-xs">
                                            <span className="text-muted-foreground whitespace-nowrap">Delete chat?</span>
                                            <button
                                                onClick={() => { handleDeleteConversation(); setShowDeleteConfirm(false); }}
                                                className="flex items-center gap-1 px-2 py-1 bg-red-500 hover:bg-red-600 text-white rounded-lg transition text-xs font-medium"
                                            >
                                                Delete
                                            </button>
                                            <button
                                                onClick={() => setShowDeleteConfirm(false)}
                                                className="flex items-center gap-1 px-2 py-1 bg-muted hover:bg-muted/80 text-foreground rounded-lg transition text-xs font-medium"
                                            >
                                                Cancel
                                            </button>
                                        </div>
                                    ) : (
                                        <button
                                            onClick={() => setShowDeleteConfirm(true)}
                                            title="Delete conversation"
                                            className="p-2 hover:bg-red-500/10 hover:text-red-500 rounded-full transition"
                                        >
                                            <Trash2 className="w-5 h-5" />
                                        </button>
                                    )}
                                    <button onClick={onClose} className="p-2 hover:bg-muted rounded-full transition">
                                        <X className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>

                            {/* Messages */}
                            <div className="flex-1 overflow-y-auto p-4 space-y-1 custom-scrollbar">
                                {messages.length === 0 ? (
                                    <div className="h-full flex flex-col items-center justify-center text-muted-foreground opacity-50">
                                        <div className="w-16 h-16 bg-secondary rounded-full flex items-center justify-center mb-4 border border-border">
                                            <Send className="w-8 h-8 text-muted-foreground" />
                                        </div>
                                        <p className="font-medium">Start messaging with {activeContact.name}</p>
                                        <p className="text-xs mt-1">Send the first message to begin the conversation.</p>
                                    </div>
                                ) : (
                                    <MessagesList messages={messages} currentUserId={currentUserId || ''} />
                                )}
                                <div ref={messagesEndRef} />
                            </div>

                            {/* Input Area */}
                            <div className="p-4 bg-card border-t border-border">
                                <div className="bg-secondary border border-border rounded-2xl p-2 flex items-center shadow-lg">
                                    <button className="p-2 text-muted-foreground cursor-not-allowed" title="Attachments coming soon" disabled>
                                        <Paperclip className="w-5 h-5" />
                                    </button>
                                    <input
                                        type="text"
                                        value={newMessage}
                                        onChange={(e) => setNewMessage(e.target.value)}
                                        onKeyDown={(e) => e.key === "Enter" && handleSend()}
                                        placeholder="Type a message..."
                                        className="flex-1 bg-transparent border-none focus:outline-none text-foreground placeholder:text-muted-foreground px-2 py-1"
                                    />
                                    <button
                                        onClick={handleSend}
                                        disabled={!newMessage.trim()}
                                        className="ml-2 bg-primary hover:bg-primary/90 text-primary-foreground p-2 rounded-xl transition disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        <Send className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="h-full flex flex-col items-center justify-center text-muted-foreground relative">
                            <div className="absolute top-4 right-4">
                                <button
                                    onClick={onClose}
                                    className="p-2 hover:bg-muted rounded-full text-muted-foreground hover:text-foreground transition"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                            <div className="w-20 h-20 bg-primary/10 rounded-3xl flex items-center justify-center mb-6 shadow-2xl border border-primary/20">
                                <MessageSquare className="w-10 h-10 text-primary" />
                            </div>
                            <h2 className="text-2xl font-bold text-foreground mb-2">Agency Messenger</h2>
                            <p className="max-w-md text-center text-muted-foreground">Select a contact from the list to start a conversation.</p>
                            <p className="text-xs text-muted-foreground/60 mt-4">Secure &bull; Private &bull; Real-time</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

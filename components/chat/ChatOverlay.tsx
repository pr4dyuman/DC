"use client";

import { MessagesList, ContactItem, ContactSkeleton, MessagesSkeleton, EmojiPicker } from "./ChatComponents";
import { X, Send, Search, Smile, MessageCircle, Trash2, ArrowLeft, MessageSquare, Loader2 } from "lucide-react";
import { useDateFormat } from "@/context/TimezoneContext";
import { useChatPanelState } from "./useChatPanelState";

interface ChatOverlayProps {
    isOpen: boolean;
    onClose: () => void;
    currentUserId?: string;
    initialActiveId?: string | null;
}

export function ChatOverlay({ isOpen, onClose, currentUserId, initialActiveId }: ChatOverlayProps) {
    const fmt = useDateFormat();
    const {
        contacts,
        activeContactId,
        messages,
        newMessage,
        viewMode,
        searchQuery,
        showDeleteConfirm,
        mobileView,
        isLoadingContacts,
        isLoadingMessages,
        isSending,
        showEmoji,
        messagesEndRef,
        textareaRef,
        filteredContacts,
        activeContact,
        setNewMessage,
        setViewMode,
        setSearchQuery,
        setShowDeleteConfirm,
        setMobileView,
        setShowEmoji,
        handleSend,
        handleDeleteConversation,
        selectContact,
        handleEmojiSelect,
        handleKeyDown,
    } = useChatPanelState({
        currentUserId,
        enabled: isOpen,
        initialActiveId,
    });

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
                        {isLoadingContacts && contacts.length === 0 ? (
                            <>
                                <ContactSkeleton />
                                <ContactSkeleton />
                                <ContactSkeleton />
                                <ContactSkeleton />
                            </>
                        ) : viewMode === 'chats' ? (
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
                                    <button
                                        onClick={() => setMobileView('sidebar')}
                                        className="md:hidden p-1.5 rounded-lg hover:bg-muted transition text-muted-foreground hover:text-foreground mr-2"
                                    >
                                        <ArrowLeft className="w-4 h-4" />
                                    </button>
                                    <div className="relative">
                                        {/* eslint-disable-next-line @next/next/no-img-element -- dynamic remote avatars are kept raw to avoid tenant image-loader/domain regressions */}
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
                                                        ? fmt.presence(activeContact.lastActiveAt)
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
                                {isLoadingMessages && messages.length === 0 ? (
                                    <MessagesSkeleton />
                                ) : messages.length === 0 ? (
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
                                <div className="relative bg-secondary border border-border rounded-2xl p-2 flex items-end gap-1 shadow-lg">
                                    {showEmoji && (
                                        <EmojiPicker
                                            onSelect={handleEmojiSelect}
                                            onClose={() => setShowEmoji(false)}
                                        />
                                    )}
                                    <button
                                        onClick={() => setShowEmoji(!showEmoji)}
                                        className={`p-2 rounded-lg transition ${showEmoji ? 'text-primary bg-primary/10' : 'text-muted-foreground hover:text-foreground hover:bg-muted'}`}
                                        title="Emoji"
                                    >
                                        <Smile className="w-5 h-5" />
                                    </button>
                                    <textarea
                                        ref={textareaRef}
                                        value={newMessage}
                                        onChange={(e) => setNewMessage(e.target.value)}
                                        onKeyDown={handleKeyDown}
                                        placeholder="Type a message..."
                                        rows={1}
                                        className="flex-1 bg-transparent border-none focus:outline-none text-foreground placeholder:text-muted-foreground px-2 py-1.5 resize-none max-h-[120px] text-sm"
                                    />
                                    <button
                                        onClick={handleSend}
                                        disabled={!newMessage.trim() || isSending}
                                        className="bg-primary hover:bg-primary/90 text-primary-foreground p-2 rounded-xl transition disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
                                    >
                                        {isSending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                                    </button>
                                </div>
                                <p className="text-center text-[10px] text-muted-foreground/50 mt-1.5">Press Enter to send, Shift + Enter for new line</p>
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

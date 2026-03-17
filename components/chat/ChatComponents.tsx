import { Message, Contact } from "@/lib/chat";
import { cn } from "@/lib/utils";
import { useDateFormat } from "@/context/TimezoneContext";
import { Check, CheckCheck, User, Image as ImageIcon, Trash2, Smile, X, Loader2 } from "lucide-react";
import NextImage from 'next/image';
import { useState, useRef, useEffect } from "react";

// ── Message Bubble ──────────────────────────────────────────
interface MessageBubbleProps {
    message: Message;
    isOwn: boolean;
}

export function MessageBubble({ message, isOwn }: MessageBubbleProps) {
    const fmt = useDateFormat();
    return (
        <div className={cn("flex w-full mb-4", isOwn ? "justify-end" : "justify-start")}>
            <div className={cn(
                "max-w-[70%] rounded-2xl px-4 py-3 shadow-sm transition-all",
                isOwn
                    ? "bg-primary text-primary-foreground rounded-br-none"
                    : "bg-muted text-foreground rounded-bl-none border border-border"
            )}>
                {message.type === 'image' ? (
                    <div className="relative rounded-lg overflow-hidden mb-1">
                        <div className="flex items-center justify-center bg-black/20 h-32 w-48 text-xs">
                            <ImageIcon className="w-4 h-4 mr-1" /> Image
                        </div>
                    </div>
                ) : (
                    <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">{message.content}</p>
                )}

                <div className="flex items-center justify-end mt-1 space-x-1 opacity-70">
                    <span className="text-[10px] font-medium">
                        {fmt.time(message.timestamp)}
                    </span>
                    {isOwn && (
                        <span>
                            {message.read ? <CheckCheck className="w-3.5 h-3.5 text-blue-400" /> : <Check className="w-3.5 h-3.5" />}
                        </span>
                    )}
                </div>
            </div>
        </div>
    );
}

// ── Date Separator ──────────────────────────────────────────
interface DateSeparatorProps {
    date: Date;
}

export function DateSeparator({ date }: DateSeparatorProps) {
    const fmt = useDateFormat();
    let label: string;
    if (fmt.isToday(date)) {
        label = "Today";
    } else if (fmt.isYesterday(date)) {
        label = "Yesterday";
    } else {
        label = fmt.dateLong(date);
    }

    return (
        <div className="flex items-center gap-3 my-4">
            <div className="flex-1 h-px bg-border" />
            <span className="text-[11px] font-medium text-muted-foreground bg-background px-3 py-1 rounded-full border border-border shadow-sm">
                {label}
            </span>
            <div className="flex-1 h-px bg-border" />
        </div>
    );
}

// ── Messages List with Date Grouping ────────────────────────
interface MessagesListProps {
    messages: Message[];
    currentUserId: string;
}

export function MessagesList({ messages, currentUserId }: MessagesListProps) {
    const fmt = useDateFormat();
    let lastDate: string | null = null;

    return (
        <>
            {messages.map((msg, idx) => {
                const msgDate = new Date(msg.timestamp);
                const dateKey = fmt.dateKey(msgDate);
                let showSeparator = false;

                if (dateKey !== lastDate) {
                    showSeparator = true;
                    lastDate = dateKey;
                }

                return (
                    <div key={msg.id || idx}>
                        {showSeparator && <DateSeparator date={msgDate} />}
                        <MessageBubble
                            message={msg}
                            isOwn={msg.senderId === currentUserId}
                        />
                    </div>
                );
            })}
        </>
    );
}

// ── Loading States ──────────────────────────────────────────
export function ContactSkeleton() {
    return (
        <div className="flex items-center p-3 rounded-xl mb-1 animate-pulse">
            <div className="w-10 h-10 rounded-full bg-muted shrink-0" />
            <div className="ml-3 flex-1 space-y-2">
                <div className="h-3.5 bg-muted rounded-md w-3/4" />
                <div className="h-2.5 bg-muted/60 rounded-md w-1/2" />
            </div>
        </div>
    );
}

export function MessagesSkeleton() {
    return (
        <div className="flex flex-col items-center justify-center h-full opacity-60">
            <Loader2 className="w-8 h-8 text-primary animate-spin mb-3" />
            <p className="text-sm text-muted-foreground">Loading messages...</p>
        </div>
    );
}

// ── Emoji Picker ────────────────────────────────────────────
const EMOJI_CATEGORIES = [
    { label: "Smileys", emojis: ["😀", "😂", "🤣", "😊", "😍", "🥰", "😘", "😎", "🤔", "😏", "😢", "😭", "😤", "🤯", "🥳", "😴"] },
    { label: "Gestures", emojis: ["👍", "👎", "👏", "🙌", "🤝", "✌️", "🤞", "💪", "🙏", "👋", "✋", "🤙", "👀", "🫡", "🫶", "❤️"] },
    { label: "Objects", emojis: ["🔥", "⭐", "💡", "📌", "📎", "✅", "❌", "⚡", "🎯", "🚀", "💯", "🏆", "📈", "💰", "⏰", "🔔"] },
];

interface EmojiPickerProps {
    onSelect: (emoji: string) => void;
    onClose: () => void;
}

export function EmojiPicker({ onSelect, onClose }: EmojiPickerProps) {
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        function handleClickOutside(e: MouseEvent) {
            if (ref.current && !ref.current.contains(e.target as Node)) {
                onClose();
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [onClose]);

    return (
        <div
            ref={ref}
            className="absolute bottom-full left-0 mb-2 bg-card border border-border rounded-2xl shadow-2xl p-3 w-72 animate-in slide-in-from-bottom-2 fade-in duration-200 z-50"
        >
            <div className="flex items-center justify-between mb-2 pb-2 border-b border-border">
                <span className="text-xs font-semibold text-foreground">Emoji</span>
                <button onClick={onClose} className="p-0.5 hover:bg-muted rounded-md transition">
                    <X className="w-3.5 h-3.5 text-muted-foreground" />
                </button>
            </div>
            <div className="max-h-48 overflow-y-auto space-y-2 custom-scrollbar">
                {EMOJI_CATEGORIES.map(cat => (
                    <div key={cat.label}>
                        <p className="text-[10px] font-medium text-muted-foreground mb-1 uppercase tracking-wider">{cat.label}</p>
                        <div className="grid grid-cols-8 gap-0.5">
                            {cat.emojis.map(emoji => (
                                <button
                                    key={emoji}
                                    onClick={() => onSelect(emoji)}
                                    className="w-8 h-8 flex items-center justify-center text-lg hover:bg-muted rounded-lg transition-colors"
                                >
                                    {emoji}
                                </button>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}


// ── Contact Item ────────────────────────────────────────────

interface ContactItemProps {
    contact: Contact;
    isActive: boolean;
    onClick: () => void;
    onDelete?: (contactId: string) => void;
}

export function ContactItem({ contact, isActive, onClick, onDelete }: ContactItemProps) {
    const fmt = useDateFormat();
    const isOnline = contact.isOnline;
    const [confirming, setConfirming] = useState(false);

    const presenceText = isOnline
        ? "Online"
        : contact.lastActiveAt
            ? fmt.presence(contact.lastActiveAt)
            : contact.jobTitle || contact.role || "";

    function handleDeleteClick(e: React.MouseEvent) {
        e.stopPropagation();
        setConfirming(true);
    }
    function handleConfirm(e: React.MouseEvent) {
        e.stopPropagation();
        setConfirming(false);
        onDelete?.(contact.id);
    }
    function handleCancel(e: React.MouseEvent) {
        e.stopPropagation();
        setConfirming(false);
    }

    return (
        <div
            onClick={onClick}
            className={cn(
                "flex items-center hover:bg-muted/50 p-3 rounded-xl cursor-pointer transition w-full group mb-1 relative",
                isActive ? "bg-muted" : ""
            )}
        >
            <div className="relative shrink-0">
                {contact.avatar ? (
                    <NextImage src={contact.avatar} alt={contact.name} width={40} height={40} className="w-10 h-10 rounded-full object-cover border border-border" unoptimized />
                ) : (
                    <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center border border-border text-muted-foreground">
                        <User className="w-5 h-5" />
                    </div>
                )}
                {isOnline && (
                    <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-card shadow-[0_0_8px_rgba(34,197,94,0.6)]" />
                )}
            </div>

            <div className="ml-3 flex-1 overflow-hidden min-w-0">
                <div className="flex justify-between items-center">
                    <h4 className={cn("text-sm font-semibold truncate", isActive ? "text-primary" : "text-foreground group-hover:text-primary")}>
                        {contact.name}
                        {contact.username && <span className="ml-1 text-xs text-muted-foreground font-normal">@{contact.username}</span>}
                    </h4>
                    {contact.lastMessage && !confirming && (
                        <span className="text-[10px] text-muted-foreground whitespace-nowrap ml-2 shrink-0">
                            {fmt.isToday(contact.lastMessage.timestamp)
                                ? fmt.time(contact.lastMessage.timestamp)
                                : fmt.isYesterday(contact.lastMessage.timestamp)
                                    ? "Yesterday"
                                    : fmt.dateShort(contact.lastMessage.timestamp)}
                        </span>
                    )}
                </div>

                {/* Last message or presence */}
                <div className="flex justify-between items-center mt-0.5">
                    {contact.lastMessage ? (
                        <p className="text-xs text-muted-foreground truncate max-w-[140px]">
                            {contact.lastMessage.content}
                        </p>
                    ) : (
                        <p className={cn("text-xs truncate max-w-[140px]", isOnline ? "text-green-500 font-medium" : "text-muted-foreground")}>
                            {presenceText}
                        </p>
                    )}
                    {contact.unreadCount > 0 && !confirming && (
                        <div className="bg-primary text-primary-foreground text-[10px] font-bold w-5 h-5 flex items-center justify-center rounded-full shrink-0 ml-1">
                            {contact.unreadCount}
                        </div>
                    )}
                </div>

                {/* Presence line */}
                {contact.lastMessage && (
                    <p className={cn("text-[10px] mt-0.5 truncate", isOnline ? "text-green-500 font-medium" : "text-muted-foreground/70")}>
                        {presenceText}
                    </p>
                )}
            </div>

            {/* Delete controls */}
            {onDelete && contact.lastMessage && (
                confirming ? (
                    <div
                        onClick={e => e.stopPropagation()}
                        className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1 bg-card border border-border shadow-lg rounded-xl px-2 py-1 text-xs"
                    >
                        <span className="text-muted-foreground mr-1 whitespace-nowrap">Delete?</span>
                        <button
                            onClick={handleConfirm}
                            className="w-6 h-6 flex items-center justify-center bg-red-500 hover:bg-red-600 text-white rounded-lg transition"
                            title="Confirm delete"
                        >
                            <Check className="w-3.5 h-3.5" />
                        </button>
                        <button
                            onClick={handleCancel}
                            className="w-6 h-6 flex items-center justify-center bg-muted hover:bg-muted/80 text-foreground rounded-lg transition"
                            title="Cancel"
                        >
                            <span className="text-sm leading-none">&times;</span>
                        </button>
                    </div>
                ) : (
                    <button
                        onClick={handleDeleteClick}
                        title="Delete conversation"
                        className="absolute right-2 top-1/2 -translate-y-1/2 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition p-1.5 rounded-lg hover:bg-red-500/10 hover:text-red-500 text-muted-foreground"
                    >
                        <Trash2 className="w-3.5 h-3.5" />
                    </button>
                )
            )}
        </div>
    );
}

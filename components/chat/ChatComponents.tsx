import type { Contact, Message } from "@/lib/chat-types";
import { cn } from "@/lib/utils";
import { useDateFormat } from "@/context/TimezoneContext";
import { Check, CheckCheck, User, Image as ImageIcon, Trash2, X, Loader2 } from "lucide-react";
import NextImage from "next/image";
import { useEffect, useRef, useState } from "react";

interface MessageBubbleProps {
    message: Message;
    isOwn: boolean;
}

export function MessageBubble({ message, isOwn }: MessageBubbleProps) {
    const fmt = useDateFormat();

    return (
        <div className={cn("flex w-full mb-4", isOwn ? "justify-end" : "justify-start")}>
            <div
                className={cn(
                    "max-w-[85%] min-w-0 rounded-2xl px-4 py-3 shadow-sm transition-all sm:max-w-[70%]",
                    isOwn
                        ? "bg-primary text-primary-foreground rounded-br-none"
                        : "bg-muted text-foreground rounded-bl-none border border-border"
                )}
            >
                {message.type === "image" ? (
                    <div className="relative mb-1 overflow-hidden rounded-lg">
                        <div className="flex h-32 w-48 items-center justify-center bg-black/20 text-xs">
                            <ImageIcon className="mr-1 h-4 w-4" /> Image
                        </div>
                    </div>
                ) : (
                    <p className="break-words text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
                )}

                <div className="mt-1 flex items-center justify-end space-x-1 opacity-70">
                    <span className="text-[10px] font-medium">
                        {fmt.time(message.timestamp)}
                    </span>
                    {isOwn && (
                        <span>
                            {message.read ? (
                                <CheckCheck className="h-3.5 w-3.5 text-blue-400" />
                            ) : (
                                <Check className="h-3.5 w-3.5" />
                            )}
                        </span>
                    )}
                </div>
            </div>
        </div>
    );
}

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
        <div className="my-4 flex items-center gap-3">
            <div className="h-px flex-1 bg-border" />
            <span className="rounded-full border border-border bg-background px-3 py-1 text-[11px] font-medium text-muted-foreground shadow-sm">
                {label}
            </span>
            <div className="h-px flex-1 bg-border" />
        </div>
    );
}

interface MessagesListProps {
    messages: Message[];
    currentUserId: string;
}

export function MessagesList({ messages, currentUserId }: MessagesListProps) {
    const fmt = useDateFormat();
    const groupedMessages = messages.map((msg, idx) => {
        const msgDate = new Date(msg.timestamp);
        const dateKey = fmt.dateKey(msgDate);
        const previousDateKey = idx > 0 ? fmt.dateKey(new Date(messages[idx - 1].timestamp)) : null;

        return {
            msg,
            idx,
            msgDate,
            showSeparator: idx === 0 || dateKey !== previousDateKey,
        };
    });

    return (
        <>
            {groupedMessages.map(({ msg, idx, msgDate, showSeparator }) => (
                <div key={msg.id || idx}>
                    {showSeparator && <DateSeparator date={msgDate} />}
                    <MessageBubble
                        message={msg}
                        isOwn={msg.senderId === currentUserId}
                    />
                </div>
            ))}
        </>
    );
}

export function ContactSkeleton() {
    return (
        <div className="mb-1 flex animate-pulse items-center rounded-xl p-3">
            <div className="h-10 w-10 shrink-0 rounded-full bg-muted" />
            <div className="ml-3 flex-1 space-y-2">
                <div className="h-3.5 w-3/4 rounded-md bg-muted" />
                <div className="h-2.5 w-1/2 rounded-md bg-muted/60" />
            </div>
        </div>
    );
}

export function MessagesSkeleton() {
    return (
        <div className="flex h-full flex-col items-center justify-center opacity-60">
            <Loader2 className="mb-3 h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Loading messages...</p>
        </div>
    );
}

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
        function handleClickOutside(event: MouseEvent) {
            if (ref.current && !ref.current.contains(event.target as Node)) {
                onClose();
            }
        }

        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [onClose]);

    return (
        <div
            ref={ref}
            className="absolute bottom-full left-0 z-50 mb-2 w-72 animate-in rounded-2xl border border-border bg-card p-3 shadow-2xl fade-in slide-in-from-bottom-2 duration-200"
        >
            <div className="mb-2 flex items-center justify-between border-b border-border pb-2">
                <span className="text-xs font-semibold text-foreground">Emoji</span>
                <button
                    type="button"
                    onClick={onClose}
                    className="rounded-md p-0.5 transition hover:bg-muted"
                    aria-label="Close emoji picker"
                >
                    <X className="h-3.5 w-3.5 text-muted-foreground" />
                </button>
            </div>
            <div className="max-h-48 space-y-2 overflow-y-auto custom-scrollbar">
                {EMOJI_CATEGORIES.map((category) => (
                    <div key={category.label}>
                        <p className="mb-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                            {category.label}
                        </p>
                        <div className="grid grid-cols-8 gap-0.5">
                            {category.emojis.map((emoji) => (
                                <button
                                    type="button"
                                    key={emoji}
                                    onClick={() => onSelect(emoji)}
                                    className="flex h-8 w-8 items-center justify-center rounded-lg text-lg transition-colors hover:bg-muted"
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

    function handleDeleteClick(event: React.MouseEvent) {
        event.stopPropagation();
        setConfirming(true);
    }

    function handleConfirm(event: React.MouseEvent) {
        event.stopPropagation();
        setConfirming(false);
        onDelete?.(contact.id);
    }

    function handleCancel(event: React.MouseEvent) {
        event.stopPropagation();
        setConfirming(false);
    }

    return (
        <div
            onClick={onClick}
            className={cn(
                "group relative mb-1 flex w-full cursor-pointer items-center rounded-xl p-3 transition hover:bg-muted/50",
                isActive ? "bg-muted" : "",
                confirming ? "pr-32" : onDelete && contact.lastMessage ? "pr-10" : ""
            )}
        >
            <div className="relative shrink-0">
                {contact.avatar ? (
                    <NextImage
                        src={contact.avatar}
                        alt={contact.name}
                        width={40}
                        height={40}
                        className="h-10 w-10 rounded-full border border-border object-cover"
                        unoptimized
                    />
                ) : (
                    <div className="flex h-10 w-10 items-center justify-center rounded-full border border-border bg-muted text-muted-foreground">
                        <User className="h-5 w-5" />
                    </div>
                )}
                {isOnline && (
                    <div className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-card bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]" />
                )}
            </div>

            <div className="ml-3 min-w-0 flex-1 overflow-hidden">
                <div className="flex items-center justify-between gap-2">
                    <h4 className={cn("flex min-w-0 items-baseline gap-1 text-sm font-semibold", isActive ? "text-primary" : "text-foreground group-hover:text-primary")}>
                        <span className="truncate">{contact.name}</span>
                        {contact.username && (
                            <span className="shrink truncate text-xs font-normal text-muted-foreground">
                                @{contact.username}
                            </span>
                        )}
                    </h4>
                    {contact.lastMessage && !confirming && (
                        <span className="ml-2 shrink-0 text-[10px] text-muted-foreground whitespace-nowrap">
                            {fmt.isToday(contact.lastMessage.timestamp)
                                ? fmt.time(contact.lastMessage.timestamp)
                                : fmt.isYesterday(contact.lastMessage.timestamp)
                                    ? "Yesterday"
                                    : fmt.dateShort(contact.lastMessage.timestamp)}
                        </span>
                    )}
                </div>

                <div className="mt-0.5 flex items-center justify-between gap-2">
                    {contact.lastMessage ? (
                        <p className="min-w-0 flex-1 truncate text-xs text-muted-foreground">
                            {contact.lastMessage.content}
                        </p>
                    ) : (
                        <p className={cn("min-w-0 flex-1 truncate text-xs", isOnline ? "font-medium text-green-500" : "text-muted-foreground")}>
                            {presenceText}
                        </p>
                    )}
                    {(contact.unreadCount ?? 0) > 0 && !confirming && (
                        <div className="ml-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                            {contact.unreadCount}
                        </div>
                    )}
                </div>

                {contact.lastMessage && (
                    <p className={cn("mt-0.5 truncate text-[10px]", isOnline ? "font-medium text-green-500" : "text-muted-foreground/70")}>
                        {presenceText}
                    </p>
                )}
            </div>

            {onDelete && contact.lastMessage && (
                confirming ? (
                    <div
                        onClick={(event) => event.stopPropagation()}
                        className="absolute right-2 top-1/2 flex -translate-y-1/2 items-center gap-1 rounded-xl border border-border bg-card px-2 py-1 text-xs shadow-lg"
                    >
                        <span className="mr-1 text-muted-foreground whitespace-nowrap">Delete?</span>
                        <button
                            type="button"
                            onClick={handleConfirm}
                            className="flex h-6 w-6 items-center justify-center rounded-lg bg-red-500 text-white transition hover:bg-red-600"
                            title="Confirm delete"
                        >
                            <Check className="h-3.5 w-3.5" />
                        </button>
                        <button
                            type="button"
                            onClick={handleCancel}
                            className="flex h-6 w-6 items-center justify-center rounded-lg bg-muted text-foreground transition hover:bg-muted/80"
                            title="Cancel"
                        >
                            <span className="text-sm leading-none">&times;</span>
                        </button>
                    </div>
                ) : (
                    <button
                        type="button"
                        onClick={handleDeleteClick}
                        title="Delete conversation"
                        className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-muted-foreground opacity-100 transition hover:bg-red-500/10 hover:text-red-500 md:opacity-0 md:group-hover:opacity-100"
                    >
                        <Trash2 className="h-3.5 w-3.5" />
                    </button>
                )
            )}
        </div>
    );
}

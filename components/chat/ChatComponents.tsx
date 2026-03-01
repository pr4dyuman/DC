import { Message, Contact } from "@/lib/chat";
import { cn } from "@/lib/utils";
import { format, isToday, isYesterday } from "date-fns";
import { Check, CheckCheck, User, Image as ImageIcon, Trash2 } from "lucide-react";
import { useState } from "react";

interface MessageBubbleProps {
    message: Message;
    isOwn: boolean;
}

export function MessageBubble({ message, isOwn }: MessageBubbleProps) {
    return (
        <div className={cn("flex w-full mb-4", isOwn ? "justify-end" : "justify-start")}>
            <div className={cn(
                "max-w-[70%] rounded-2xl px-4 py-3 shadow-sm",
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
                    <p className="text-sm leading-relaxed">{message.content}</p>
                )}

                <div className="flex items-center justify-end mt-1 space-x-1 opacity-70">
                    <span className="text-[10px] font-medium">
                        {format(new Date(message.timestamp), "HH:mm")}
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

// Format lastActiveAt smartly
function formatPresence(lastActiveAt: string): string {
    const date = new Date(lastActiveAt);
    if (isToday(date)) return `Last seen ${format(date, "HH:mm")}`;
    if (isYesterday(date)) return `Last seen Yesterday ${format(date, "HH:mm")}`;
    return `Last seen ${format(date, "d MMM HH:mm")}`;
}

interface ContactItemProps {
    contact: Contact;
    isActive: boolean;
    onClick: () => void;
    onDelete?: (contactId: string) => void;
}

export function ContactItem({ contact, isActive, onClick, onDelete }: ContactItemProps) {
    const isOnline = contact.isOnline;
    const [confirming, setConfirming] = useState(false);

    const presenceText = isOnline
        ? "Online"
        : contact.lastActiveAt
            ? formatPresence(contact.lastActiveAt)
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
                    <img src={contact.avatar} alt={contact.name} className="w-10 h-10 rounded-full object-cover border border-border" />
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
                            {isToday(new Date(contact.lastMessage.timestamp))
                                ? format(new Date(contact.lastMessage.timestamp), "HH:mm")
                                : isYesterday(new Date(contact.lastMessage.timestamp))
                                    ? "Yesterday"
                                    : format(new Date(contact.lastMessage.timestamp), "d MMM")}
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
                    // Inline confirm pill
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
                            <span className="text-sm leading-none">✕</span>
                        </button>
                    </div>
                ) : (
                    <button
                        onClick={handleDeleteClick}
                        title="Delete conversation"
                        className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition p-1.5 rounded-lg hover:bg-red-500/10 hover:text-red-500 text-muted-foreground"
                    >
                        <Trash2 className="w-3.5 h-3.5" />
                    </button>
                )
            )}
        </div>
    );
}



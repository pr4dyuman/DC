import { Message, Contact } from "@/lib/chat";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { Check, CheckCheck, User, Image as ImageIcon } from "lucide-react";

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
                    : "bg-zinc-800 text-zinc-100 rounded-bl-none border border-zinc-700"
            )}>
                {message.type === 'image' ? (
                    <div className="relative rounded-lg overflow-hidden mb-1">
                        {/* Placeholder for actual image rendering */}
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

interface ContactItemProps {
    contact: Contact;
    isActive: boolean;
    onClick: () => void;
}

export function ContactItem({ contact, isActive, onClick }: ContactItemProps) {
    const isOnline = contact.isOnline;

    return (
        <div
            onClick={onClick}
            className={cn(
                "flex items-center hover:bg-zinc-800/50 p-3 rounded-xl cursor-pointer transition w-full group mb-1",
                isActive ? "bg-zinc-800 border-l-2 border-primary" : "border-l-2 border-transparent"
            )}
        >
            <div className="relative">
                {contact.avatar ? (
                    <img src={contact.avatar} alt={contact.name} className="w-10 h-10 rounded-full object-cover border border-zinc-700" />
                ) : (
                    <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center border border-zinc-700 text-zinc-400">
                        <User className="w-5 h-5" />
                    </div>
                )}
                {/* Status Indicator */}
                {isOnline && (
                    <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-[#050505] shadow-[0_0_8px_rgba(34,197,94,0.6)]"></div>
                )}
            </div>

            <div className="ml-3 flex-1 overflow-hidden">
                <div className="flex justify-between items-center">
                    <div className="flex items-center overflow-hidden">
                        <h4 className={cn("text-sm font-semibold truncate", isActive ? "text-primary" : "text-zinc-200 group-hover:text-white")}>
                            {contact.name}
                        </h4>
                        {contact.jobTitle && (
                            <span className="ml-2 text-[10px] text-zinc-500 truncate hidden sm:inline-block border border-zinc-700 rounded px-1 py-0.5">
                                {contact.jobTitle}
                            </span>
                        )}
                    </div>
                    {contact.lastMessage && (
                        <span className="text-[10px] text-zinc-500 whitespace-nowrap ml-2">
                            {format(new Date(contact.lastMessage.timestamp), "HH:mm")}
                        </span>
                    )}
                </div>

                <div className="flex justify-between items-center mt-0.5">
                    <p className="text-xs text-zinc-500 truncate max-w-[120px]">
                        {contact.lastMessage?.content || <span className="italic opacity-50">Start a conversation</span>}
                    </p>

                    {contact.unreadCount > 0 && (
                        <div className="bg-primary text-primary-foreground text-[10px] font-bold w-5 h-5 flex items-center justify-center rounded-full">
                            {contact.unreadCount}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

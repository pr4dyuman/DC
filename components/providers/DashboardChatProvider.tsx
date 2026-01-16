"use client";

import { ChatProvider, useChat } from "@/context/ChatContext";
import { ChatOverlay } from "@/components/chat/ChatOverlay";

function ChatManager({ currentUserId }: { currentUserId: string }) {
    const { isOpen, closeChat, targetContactId } = useChat();

    return (
        <ChatOverlay 
            isOpen={isOpen} 
            onClose={closeChat} 
            currentUserId={currentUserId}
            initialActiveId={targetContactId} 
        />
    );
}

export function DashboardChatProvider({ children, currentUserId }: { children: React.ReactNode, currentUserId: string }) {
    return (
        <ChatProvider>
            {children}
            <ChatManager currentUserId={currentUserId} />
        </ChatProvider>
    );
}

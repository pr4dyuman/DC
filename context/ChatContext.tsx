"use client";

import React, { createContext, useContext, useState, ReactNode, useCallback } from "react";

interface ChatContextType {
    isOpen: boolean;
    openChat: (contactId?: string) => void;
    closeChat: () => void;
    targetContactId: string | null;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export function ChatProvider({ children }: { children: ReactNode }) {
    const [isOpen, setIsOpen] = useState(false);
    const [targetContactId, setTargetContactId] = useState<string | null>(null);

    const openChat = useCallback((contactId?: string) => {
        setIsOpen(true);
        if (contactId) {
            setTargetContactId(contactId);
        }
    }, []);

    const closeChat = useCallback(() => {
        setIsOpen(false);
        // We don't necessarily clear targetContactId so it remembers last state, 
        // but for "Message" button logic, usually we want to reset if needed. 
        // Let's keep it simple.
    }, []);

    return (
        <ChatContext.Provider value={{ isOpen, openChat, closeChat, targetContactId }}>
            {children}
        </ChatContext.Provider>
    );
}

export function useChat() {
    const context = useContext(ChatContext);
    if (context === undefined) {
        throw new Error("useChat must be used within a ChatProvider");
    }
    return context;
}

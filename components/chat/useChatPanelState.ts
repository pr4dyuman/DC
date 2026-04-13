"use client";

import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import type { Contact, Message } from "@/lib/chat-types";
import { deleteConversation, getContacts, getMessages, markAsRead, sendMessage } from "@/lib/chat";
import { useActivePolling } from "@/hooks/use-active-polling";
import { toast } from "sonner";

type ChatViewMode = 'chats' | 'users';
type ChatMobileView = 'sidebar' | 'chat';

interface UseChatPanelStateOptions {
    currentUserId?: string;
    enabled?: boolean;
    initialActiveId?: string | null;
}

export function useChatPanelState({
    currentUserId,
    enabled = true,
    initialActiveId = null,
}: UseChatPanelStateOptions) {
    const [contacts, setContacts] = useState<Contact[]>([]);
    const [activeContactId, setActiveContactId] = useState<string | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [newMessage, setNewMessage] = useState("");
    const [viewMode, setViewMode] = useState<ChatViewMode>('chats');
    const [searchQuery, setSearchQuery] = useState("");
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [mobileView, setMobileView] = useState<ChatMobileView>('sidebar');
    const [isLoadingContacts, setIsLoadingContacts] = useState(true);
    const [isLoadingMessages, setIsLoadingMessages] = useState(false);
    const [isSending, setIsSending] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [showEmoji, setShowEmoji] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const loadContactsRef = useRef<(silent?: boolean) => Promise<void>>(async () => { });
    const loadMessagesRef = useRef<(silent?: boolean) => Promise<void>>(async () => { });

    useEffect(() => {
        if (enabled && currentUserId) {
            void loadContactsRef.current();
        }
    }, [enabled, currentUserId]);

    useEffect(() => {
        if (enabled && initialActiveId) {
            setActiveContactId(initialActiveId);
            setMobileView('chat');
            setViewMode('chats');
        }
    }, [enabled, initialActiveId]);

    useEffect(() => {
        setShowDeleteConfirm(false);
    }, [activeContactId]);

    useActivePolling(() => {
        void loadContactsRef.current(true);
    }, 120000, enabled && !!currentUserId);

    useEffect(() => {
        if (enabled && currentUserId && activeContactId) {
            void loadMessagesRef.current();
            void markAsRead(currentUserId, activeContactId);
        }
    }, [enabled, currentUserId, activeContactId]);

    useActivePolling(() => {
        void loadMessagesRef.current(true);
    }, 10000, enabled && !!currentUserId && !!activeContactId);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 120) + 'px';
        }
    }, [newMessage]);

    async function loadContacts(silent = false) {
        if (!currentUserId) return;
        if (!silent) setIsLoadingContacts(true);
        try {
            setContacts(await getContacts(currentUserId));
        } catch (error) {
            console.error("Failed to load contacts", error);
            if (!silent) toast.error("Failed to load conversations");
        } finally {
            setIsLoadingContacts(false);
        }
    }

    async function loadMessages(silent = false) {
        if (!currentUserId || !activeContactId) return;
        if (!silent) setIsLoadingMessages(true);
        try {
            setMessages(await getMessages(currentUserId, activeContactId));
        } catch (error) {
            console.error("Failed to load messages", error);
            if (!silent) toast.error("Failed to load messages");
        } finally {
            setIsLoadingMessages(false);
        }
    }

    loadContactsRef.current = loadContacts;
    loadMessagesRef.current = loadMessages;

    async function handleSend() {
        if (!currentUserId || !activeContactId || !newMessage.trim() || isSending) return;
        const content = newMessage.trim();

        const optimisticMessage: Message = {
            id: "temp-" + Date.now(),
            senderId: currentUserId,
            receiverId: activeContactId,
            content,
            timestamp: new Date().toISOString(),
            read: false,
            type: 'text',
            agencyId: 'optimistic',
        };

        setMessages((prev) => [...prev, optimisticMessage]);
        setNewMessage("");
        setIsSending(true);
        setShowEmoji(false);

        try {
            await sendMessage(currentUserId, activeContactId, content);
            await loadMessages(true);
            await loadContacts(true);
        } catch (error) {
            setMessages((prev) => prev.filter((message) => message.id !== optimisticMessage.id));
            setNewMessage(content);
            console.error("Failed to send", error);
            toast.error("Failed to send message");
        } finally {
            setIsSending(false);
            textareaRef.current?.focus();
        }
    }

    async function handleDeleteConversation(contactId?: string) {
        const targetId = contactId || activeContactId;
        if (!currentUserId || !targetId || isDeleting) return;

        setIsDeleting(true);
        try {
            await deleteConversation(currentUserId, targetId);
            setMessages([]);
            if (targetId === activeContactId) {
                setActiveContactId(null);
                setMobileView('sidebar');
            }
            await loadContacts(true);
            setShowDeleteConfirm(false);
            toast.success("Conversation deleted");
        } catch (error) {
            console.error("Failed to delete conversation", error);
            toast.error("Failed to delete conversation");
        } finally {
            setIsDeleting(false);
        }
    }

    function selectContact(id: string) {
        setActiveContactId(id);
        setMobileView('chat');
    }

    function handleEmojiSelect(emoji: string) {
        setNewMessage((prev) => prev + emoji);
        textareaRef.current?.focus();
    }

    function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            void handleSend();
        }
    }

    const filteredContacts = searchQuery.trim()
        ? contacts.filter((contact) =>
            contact.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            contact.role?.toLowerCase().includes(searchQuery.toLowerCase())
        )
        : contacts;
    const activeContact = contacts.find((contact) => contact.id === activeContactId);

    return {
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
    };
}

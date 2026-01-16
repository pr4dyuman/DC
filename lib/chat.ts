"use server";

import { db, Message, User, Client } from "./db";
import { revalidatePath } from "next/cache";
import { withAgencyId } from "./agency-context";
import { generateId } from "./utils-server";

export type { Message };

export type Contact = {
    id: string;
    username?: string;
    name: string;
    email: string;
    avatar?: string;
    role: string;
    jobTitle?: string;
    type: 'user' | 'client';
    lastMessage?: Message;
    unreadCount: number;
    isOnline: boolean;
    lastActiveAt?: string;
};

// Threshold for "Online" status (1 minute)
const ONLINE_THRESHOLD_MS = 60 * 1000;

export async function heartbeat(userId: string) {
    await db.update((data) => {
        const now = new Date();
        const userIndex = data.users.findIndex(u => u.id === userId);

        if (userIndex !== -1) {
            const lastActive = data.users[userIndex].lastActiveAt ? new Date(data.users[userIndex].lastActiveAt).getTime() : 0;
            // Optimize: Only write if more than 30 seconds have passed to save disk IO/DB load
            if (now.getTime() - lastActive > 30000) {
                data.users[userIndex].lastActiveAt = now.toISOString();
            }
        } else {
            const clientIndex = data.clients.findIndex(c => c.id === userId);
            if (clientIndex !== -1) {
                const lastActive = data.clients[clientIndex].lastActiveAt ? new Date(data.clients[clientIndex].lastActiveAt).getTime() : 0;
                if (now.getTime() - lastActive > 30000) {
                    data.clients[clientIndex].lastActiveAt = now.toISOString();
                }
            }
        }
        return data; // If no changes, db adapter might still write, but at least we don't change data needlessly.
    });
}

export async function getTotalUnreadCount(currentUserId: string): Promise<number> {
    const data = await db.get();
    return (data.messages || []).filter(m =>
        m.receiverId === currentUserId && !m.read
    ).length;
}

export async function getContacts(currentUserId: string): Promise<Contact[]> {
    const data = await db.get();
    const users = data.users.filter(u => u.id !== currentUserId);
    const clients = data.clients;

    const contacts: Contact[] = [];
    const now = new Date().getTime();

    // Add Users
    for (const user of users) {
        const lastActive = user.lastActiveAt ? new Date(user.lastActiveAt).getTime() : 0;
        const isOnline = (now - lastActive) < ONLINE_THRESHOLD_MS;

        contacts.push({
            id: user.id,
            username: user.username,
            name: user.name,
            email: user.email,
            avatar: user.avatar,
            role: user.role,
            jobTitle: user.jobTitle,
            type: 'user',
            unreadCount: 0,
            isOnline,
            lastActiveAt: user.lastActiveAt
        });
    }

    // Determine if current user is a client
    const isClient = data.clients.some(c => c.id === currentUserId);

    // Add Clients (Only if current user is NOT a client)
    if (!isClient) {
        for (const client of clients) {
            const lastActive = client.lastActiveAt ? new Date(client.lastActiveAt).getTime() : 0;
            const isOnline = (now - lastActive) < ONLINE_THRESHOLD_MS;

            contacts.push({
                id: client.id,
                username: client.username,
                name: client.name,
                email: client.email,
                companyName: client.companyName,
                avatar: client.logo,
                role: 'Client',
                type: 'client',
                unreadCount: 0,
                isOnline,
                lastActiveAt: client.lastActiveAt
            } as any);
        }
    }

    // Calculate last message and unread count
    const allMessages = data.messages || [];

    contacts.forEach(contact => {
        const discussion = allMessages.filter(m =>
            (m.senderId === currentUserId && m.receiverId === contact.id) ||
            (m.senderId === contact.id && m.receiverId === currentUserId)
        ).sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

        if (discussion.length > 0) {
            contact.lastMessage = discussion[discussion.length - 1];
        }

        contact.unreadCount = allMessages.filter(m =>
            m.senderId === contact.id &&
            m.receiverId === currentUserId &&
            !m.read
        ).length;
    });

    // Sort contacts: recent messages first
    contacts.sort((a, b) => {
        const timeA = a.lastMessage ? new Date(a.lastMessage.timestamp).getTime() : 0;
        const timeB = b.lastMessage ? new Date(b.lastMessage.timestamp).getTime() : 0;
        return timeB - timeA;
    });

    return contacts;
}

export async function getMessages(currentUserId: string, otherUserId: string): Promise<Message[]> {
    const data = await db.get();
    return (data.messages || [])
        .filter(m =>
            (m.senderId === currentUserId && m.receiverId === otherUserId) ||
            (m.senderId === otherUserId && m.receiverId === currentUserId)
        )
        .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
}

export async function sendMessage(senderId: string, receiverId: string, content: string, type: 'text' | 'image' = 'text') {
    // 1. Try to resolve agencyId robustly
    let agencyId = 'default-agency';
    try {
        const agency = await import("./agency-context").then(m => m.getCurrentAgency());
        if (agency) {
            agencyId = agency.id;
        } else {
            // Fallback: look up user
            const userData = await db.get().then(d => d.users.find(u => u.id === senderId));
            if (userData && userData.agencyId) {
                agencyId = userData.agencyId;
            }
        }
    } catch (e) {
        console.warn("Failed to get agency context in sendMessage, using default/fallback", e);
    }

    const newMessage: Message = {
        id: generateId(),
        senderId,
        receiverId,
        content,
        timestamp: new Date().toISOString(),
        read: false,
        type,
        agencyId // Explicitly set
    };

    await db.update(async (data) => {
        if (!data.messages) data.messages = [];
        data.messages.push(newMessage);
        return data;
    });

    // Also update sender's presence
    await heartbeat(senderId);

    return newMessage;
}

export async function markAsRead(currentUserId: string, senderId: string) {
    await db.update((data) => {
        if (!data.messages) return data;
        let hasChanges = false;
        data.messages = data.messages.map(m => {
            if (m.senderId === senderId && m.receiverId === currentUserId && !m.read) {
                hasChanges = true;
                return { ...m, read: true };
            }
            return m;
        });

        // Update presence when reading too
        if (hasChanges) {
            const userIndex = data.users.findIndex(u => u.id === currentUserId);
            if (userIndex !== -1) data.users[userIndex].lastActiveAt = new Date().toISOString();
        }

        return data;
    });
}

export async function deleteConversation(currentUserId: string, otherUserId: string) {
    await db.update((data) => {
        if (!data.messages) return data;
        data.messages = data.messages.filter(m =>
            !((m.senderId === currentUserId && m.receiverId === otherUserId) ||
                (m.senderId === otherUserId && m.receiverId === currentUserId))
        );
        return data;
    });
    revalidatePath('/dashboard');
}

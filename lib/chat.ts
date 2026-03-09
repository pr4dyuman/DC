"use server";

import { Message, User, Client } from "./db";
import { revalidatePath } from "next/cache";
import { withAgencyId, getCurrentAgency } from "./agency-context";
import { generateId } from "./utils-server";
import { UserModel, ClientModel, MessageModel, connectDB } from "./mongodb";
import { sanitizeString } from "./validation";
import { getSessionUser } from "./auth";

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

/** Converts a raw Mongoose lean Message doc into a plain serializable object */
function serializeMessage(m: any): Message {
    return {
        id: m.id ?? String(m._id),
        agencyId: m.agencyId,
        senderId: m.senderId,
        receiverId: m.receiverId,
        content: m.content,
        timestamp: m.timestamp,
        read: !!m.read,
        type: m.type ?? 'text',
    };
}

export async function heartbeat(_userId?: string) {
    const session = await getSessionUser();
    if (!session) return;
    const authedUserId = session.userId;

    await connectDB();
    const now = new Date().toISOString();

    // Direct targeted update — avoids loading all collections just to update one field
    const userResult = await UserModel.updateOne(
        { id: authedUserId },
        { $set: { lastActiveAt: now } }
    );

    // If no user was found, try clients
    if (userResult.matchedCount === 0) {
        await ClientModel.updateOne(
            { id: authedUserId },
            { $set: { lastActiveAt: now } }
        );
    }
}

export async function getTotalUnreadCount(_currentUserId?: string): Promise<number> {
    const session = await getSessionUser();
    if (!session) return 0;
    const authedUserId = session.userId;

    await connectDB();
    const agency = await getCurrentAgency();
    return MessageModel.countDocuments({
        receiverId: authedUserId, read: false,
        ...(agency ? { agencyId: agency.id } : {})
    });
}

export async function getContacts(_currentUserId?: string): Promise<Contact[]> {
    const session = await getSessionUser();
    if (!session) throw new Error('Unauthorized');
    const currentUserId = session.userId;

    await connectDB();
    const agency = await getCurrentAgency();
    const agencyFilter = agency ? { agencyId: agency.id } : {};
    const now = new Date().getTime();

    // Fetch users/clients, and use aggregation for message stats instead of loading ALL messages
    const [users, clients, lastMessages, unreadCounts] = await Promise.all([
        UserModel.find({ id: { $ne: currentUserId }, ...agencyFilter }).select('-password').lean(),
        ClientModel.find({ ...agencyFilter }).select('-password').lean(),
        // Aggregation: get last message per contact (sent or received)
        MessageModel.aggregate([
            { $match: { $or: [{ senderId: currentUserId }, { receiverId: currentUserId }], ...agencyFilter } },
            { $addFields: { contactId: { $cond: [{ $eq: ['$senderId', currentUserId] }, '$receiverId', '$senderId'] } } },
            { $sort: { timestamp: -1 } },
            { $group: { _id: '$contactId', lastMsg: { $first: '$$ROOT' } } },
        ]),
        // Aggregation: count unread messages per sender
        MessageModel.aggregate([
            { $match: { receiverId: currentUserId, read: false, ...agencyFilter } },
            { $group: { _id: '$senderId', count: { $sum: 1 } } },
        ]),
    ]);

    // Build lookup maps
    const lastMsgMap = new Map<string, any>(lastMessages.map((r: any) => [r._id, r.lastMsg]));
    const unreadMap = new Map<string, number>(unreadCounts.map((r: any) => [r._id, r.count]));

    const isClient = clients.some((c: any) => c.id === currentUserId);
    const contacts: Contact[] = [];

    for (const user of users) {
        const u = user as any;
        const lastActive = u.lastActiveAt ? new Date(u.lastActiveAt).getTime() : 0;
        const lastMsg = lastMsgMap.get(u.id);
        contacts.push({
            id: u.id, username: u.username, name: u.name, email: u.email,
            avatar: u.avatar, role: u.role, jobTitle: u.jobTitle, type: 'user',
            unreadCount: unreadMap.get(u.id) || 0,
            isOnline: (now - lastActive) < ONLINE_THRESHOLD_MS,
            lastActiveAt: u.lastActiveAt,
            lastMessage: lastMsg ? serializeMessage(lastMsg) : undefined,
        });
    }

    if (!isClient) {
        for (const client of clients) {
            const c = client as any;
            const lastActive = c.lastActiveAt ? new Date(c.lastActiveAt).getTime() : 0;
            const lastMsg = lastMsgMap.get(c.id);
            contacts.push({
                id: c.id, username: c.username, name: c.name, email: c.email,
                companyName: c.companyName, avatar: c.logo, role: 'Client', type: 'client',
                unreadCount: unreadMap.get(c.id) || 0,
                isOnline: (now - lastActive) < ONLINE_THRESHOLD_MS,
                lastActiveAt: c.lastActiveAt,
                lastMessage: lastMsg ? serializeMessage(lastMsg) : undefined,
            } as any);
        }
    }

    return contacts.sort((a, b) => {
        const timeA = a.lastMessage ? new Date(a.lastMessage.timestamp).getTime() : 0;
        const timeB = b.lastMessage ? new Date(b.lastMessage.timestamp).getTime() : 0;
        return timeB - timeA;
    });
}

export async function getMessages(_currentUserId: string, otherUserId: string): Promise<Message[]> {
    const session = await getSessionUser();
    if (!session) throw new Error('Unauthorized');
    const currentUserId = session.userId;

    await connectDB();
    const agency = await getCurrentAgency();
    const msgs = await MessageModel.find({
        $or: [
            { senderId: currentUserId, receiverId: otherUserId },
            { senderId: otherUserId, receiverId: currentUserId }
        ],
        ...(agency ? { agencyId: agency.id } : {})
    }).lean();
    return msgs
        .map((m: any) => serializeMessage(m))
        .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()) as Message[];
}

export async function sendMessage(_senderId: string, receiverId: string, content: string, type: 'text' | 'image' = 'text') {
    const session = await getSessionUser();
    if (!session) throw new Error('Unauthorized');
    const senderId = session.userId;

    await connectDB();
    // Input sanitization — prevent XSS in chat messages
    content = sanitizeString(content, 10000);
    if (!content) throw new Error('Message content is required');

    // Resolve agencyId
    let agencyId = 'default-agency';
    try {
        const agency = await getCurrentAgency();
        if (agency) {
            agencyId = agency.id;
        } else {
            // Fallback: look up user directly from DB
            const userData = await UserModel.findOne({ id: senderId }).select('-password').lean();
            if (userData && (userData as any).agencyId) {
                agencyId = (userData as any).agencyId;
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
        agencyId
    };

    // Direct MongoDB insert — bypasses the heavy db.update read-modify-write cycle
    // which could lose the message due to React cache() stale reads
    await MessageModel.create(newMessage);

    // Also update sender's presence
    await heartbeat();

    revalidatePath('/dashboard');

    return newMessage;
}

export async function markAsRead(_currentUserId: string, senderId: string) {
    const session = await getSessionUser();
    if (!session) return;
    const currentUserId = session.userId;

    await connectDB();
    const agency = await getCurrentAgency();
    await MessageModel.updateMany(
        { senderId, receiverId: currentUserId, agencyId: agency?.id, read: false },
        { $set: { read: true } }
    );
    await UserModel.updateOne(
        { id: currentUserId, agencyId: agency?.id },
        { $set: { lastActiveAt: new Date().toISOString() } }
    );
}

export async function deleteConversation(_currentUserId: string, otherUserId: string) {
    const session = await getSessionUser();
    if (!session) throw new Error('Unauthorized');
    const currentUserId = session.userId;

    await connectDB();
    const agency = await getCurrentAgency();
    if (!agency) throw new Error('No agency context — cannot delete conversation');
    await MessageModel.deleteMany({
        agencyId: agency.id,
        $or: [
            { senderId: currentUserId, receiverId: otherUserId },
            { senderId: otherUserId, receiverId: currentUserId }
        ]
    });
    revalidatePath('/dashboard');
}

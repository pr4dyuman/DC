"use server";

import type { Message } from "./db";
import { revalidatePath } from "next/cache";
import { getCurrentAgency } from "./agency-context";
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
    companyName?: string;
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

type MessageRecord = Pick<Message, 'agencyId' | 'senderId' | 'receiverId' | 'content' | 'timestamp'> &
    Partial<Pick<Message, 'id' | 'read' | 'type'>> & {
        _id?: string | { toString(): string };
    };

type ContactMessageAggregateRow = {
    _id: string;
    lastMsg: MessageRecord;
};

type UnreadCountAggregateRow = {
    _id: string;
    count: number;
};

type UserContactRecord = {
    id: string;
    username?: string;
    name: string;
    email: string;
    avatar?: string;
    role: string;
    jobTitle?: string;
    lastActiveAt?: string;
};

type ClientContactRecord = {
    id: string;
    username?: string;
    name: string;
    email: string;
    logo?: string;
    companyName?: string;
    lastActiveAt?: string;
};

type AgencyIdRecord = {
    agencyId?: string;
};

/** Converts a raw Mongoose lean Message doc into a plain serializable object */
function serializeMessage(m: MessageRecord): Message {
    return {
        id: m.id ?? String(m._id ?? ''),
        agencyId: m.agencyId,
        senderId: m.senderId,
        receiverId: m.receiverId,
        content: m.content,
        timestamp: m.timestamp,
        read: !!m.read,
        type: m.type ?? 'text',
    };
}

async function touchCurrentUserPresence(userId: string, agencyId?: string) {
    await connectDB();

    const now = new Date().toISOString();
    const scopedFilter = agencyId ? { id: userId, agencyId } : { id: userId };
    const userResult = await UserModel.updateOne(
        scopedFilter,
        { $set: { lastActiveAt: now } }
    );

    if (userResult.matchedCount === 0) {
        await ClientModel.updateOne(
            scopedFilter,
            { $set: { lastActiveAt: now } }
        );
    }
}

export async function heartbeat(_userId?: string) {
    void _userId;
    const session = await getSessionUser();
    if (!session) return;

    await touchCurrentUserPresence(session.userId);
}

export async function getTotalUnreadCount(_currentUserId?: string): Promise<number> {
    void _currentUserId;
    const session = await getSessionUser();
    if (!session) return 0;
    const authedUserId = session.userId;

    await connectDB();
    const agency = await getCurrentAgency();
    if (!agency?.id) return 0;
    return MessageModel.countDocuments({
        receiverId: authedUserId,
        read: false,
        agencyId: agency.id,
    });
}

export async function getContacts(_currentUserId?: string): Promise<Contact[]> {
    void _currentUserId;
    const session = await getSessionUser();
    if (!session) throw new Error('Unauthorized');
    const currentUserId = session.userId;

    await connectDB();
    const agency = await getCurrentAgency();
    if (!agency?.id) throw new Error('Agency context required');
    const agencyFilter = { agencyId: agency.id };
    const now = new Date().getTime();

    // Fetch users/clients, and use aggregation for message stats instead of loading all messages.
    const [users, clients, lastMessages, unreadCounts] = await Promise.all([
        UserModel.find({ id: { $ne: currentUserId }, ...agencyFilter }).select('-password').lean() as Promise<UserContactRecord[]>,
        ClientModel.find({ ...agencyFilter }).select('-password').lean() as Promise<ClientContactRecord[]>,
        MessageModel.aggregate([
            { $match: { $or: [{ senderId: currentUserId }, { receiverId: currentUserId }], ...agencyFilter } },
            { $addFields: { contactId: { $cond: [{ $eq: ['$senderId', currentUserId] }, '$receiverId', '$senderId'] } } },
            { $sort: { timestamp: -1 } },
            { $group: { _id: '$contactId', lastMsg: { $first: '$$ROOT' } } },
        ]) as Promise<ContactMessageAggregateRow[]>,
        MessageModel.aggregate([
            { $match: { receiverId: currentUserId, read: false, ...agencyFilter } },
            { $group: { _id: '$senderId', count: { $sum: 1 } } },
        ]) as Promise<UnreadCountAggregateRow[]>,
    ]);

    const lastMsgMap = new Map(lastMessages.map((row) => [row._id, row.lastMsg] as const));
    const unreadMap = new Map(unreadCounts.map((row) => [row._id, row.count] as const));

    const isClient = clients.some((client) => client.id === currentUserId);
    const contacts: Contact[] = [];

    for (const user of users) {
        const lastActive = user.lastActiveAt ? new Date(user.lastActiveAt).getTime() : 0;
        const lastMsg = lastMsgMap.get(user.id);

        contacts.push({
            id: user.id,
            username: user.username,
            name: user.name,
            email: user.email,
            avatar: user.avatar,
            role: user.role,
            jobTitle: user.jobTitle,
            type: 'user',
            unreadCount: unreadMap.get(user.id) || 0,
            isOnline: (now - lastActive) < ONLINE_THRESHOLD_MS,
            lastActiveAt: user.lastActiveAt,
            lastMessage: lastMsg ? serializeMessage(lastMsg) : undefined,
        });
    }

    if (!isClient) {
        for (const client of clients) {
            const lastActive = client.lastActiveAt ? new Date(client.lastActiveAt).getTime() : 0;
            const lastMsg = lastMsgMap.get(client.id);

            contacts.push({
                id: client.id,
                username: client.username,
                name: client.name,
                email: client.email,
                companyName: client.companyName,
                avatar: client.logo,
                role: 'Client',
                type: 'client',
                unreadCount: unreadMap.get(client.id) || 0,
                isOnline: (now - lastActive) < ONLINE_THRESHOLD_MS,
                lastActiveAt: client.lastActiveAt,
                lastMessage: lastMsg ? serializeMessage(lastMsg) : undefined,
            });
        }
    }

    return contacts.sort((a, b) => {
        const timeA = a.lastMessage ? new Date(a.lastMessage.timestamp).getTime() : 0;
        const timeB = b.lastMessage ? new Date(b.lastMessage.timestamp).getTime() : 0;
        return timeB - timeA;
    });
}

export async function getMessages(_currentUserId: string, otherUserId: string): Promise<Message[]> {
    void _currentUserId;
    const session = await getSessionUser();
    if (!session) throw new Error('Unauthorized');
    const currentUserId = session.userId;

    await connectDB();
    const agency = await getCurrentAgency();
    if (!agency?.id) throw new Error('Agency context required');

    const msgs = await MessageModel.find({
        $or: [
            { senderId: currentUserId, receiverId: otherUserId },
            { senderId: otherUserId, receiverId: currentUserId },
        ],
        agencyId: agency.id,
    }).lean() as unknown as MessageRecord[];

    return msgs
        .map((message) => serializeMessage(message))
        .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()) as Message[];
}

export async function sendMessage(_senderId: string, receiverId: string, content: string, type: 'text' | 'image' = 'text') {
    const session = await getSessionUser();
    if (!session) throw new Error('Unauthorized');
    const senderId = session.userId;

    await connectDB();

    // Input sanitization - prevent XSS in chat messages.
    content = sanitizeString(content, 10000);
    if (!content) throw new Error('Message content is required');

    // Resolve agencyId - require it for data isolation.
    let agencyId: string | undefined;
    const agency = await getCurrentAgency();
    if (agency) {
        agencyId = agency.id;
    } else {
        const userData = await UserModel.findOne({ id: senderId }).select('agencyId').lean() as AgencyIdRecord | null;
        if (userData?.agencyId) {
            agencyId = userData.agencyId;
        }
    }

    if (!agencyId) throw new Error('Agency context required');

    const newMessage: Message = {
        id: generateId(),
        senderId,
        receiverId,
        content,
        timestamp: new Date().toISOString(),
        read: false,
        type,
        agencyId,
    };

    // Direct MongoDB insert - bypasses the heavier read-modify-write helper path.
    await MessageModel.create(newMessage);

    await touchCurrentUserPresence(senderId, agencyId);

    revalidatePath('/dashboard');

    return newMessage;
}

export async function markAsRead(_currentUserId: string, senderId: string) {
    void _currentUserId;
    const session = await getSessionUser();
    if (!session) return;
    const currentUserId = session.userId;

    await connectDB();
    const agency = await getCurrentAgency();
    if (!agency?.id) return;

    await MessageModel.updateMany(
        { senderId, receiverId: currentUserId, agencyId: agency.id, read: false },
        { $set: { read: true } }
    );

    await touchCurrentUserPresence(currentUserId, agency.id);
}

export async function deleteConversation(_currentUserId: string, otherUserId: string) {
    void _currentUserId;
    const session = await getSessionUser();
    if (!session) throw new Error('Unauthorized');
    const currentUserId = session.userId;

    await connectDB();
    const agency = await getCurrentAgency();
    if (!agency) throw new Error('No agency context - cannot delete conversation');

    await MessageModel.deleteMany({
        agencyId: agency.id,
        $or: [
            { senderId: currentUserId, receiverId: otherUserId },
            { senderId: otherUserId, receiverId: currentUserId },
        ],
    });

    revalidatePath('/dashboard');
}

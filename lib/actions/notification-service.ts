import "server-only";

import type { Notification } from "../db";
import { NotificationModel, connectDB } from "../mongodb";
import { stripNotificationMentionMarkup } from "../notification-text";
import { generateId } from "../utils-server";
import { sanitizeString } from "../validation";

type NotificationInput = {
    agencyId?: string | null;
    userId?: string | null;
    message: string;
    read?: boolean;
    timestamp?: string;
    link?: string;
    eventKey?: string;
};

type NotificationOptions = {
    dedupeWindowMs?: number;
};

const DEFAULT_DEDUPE_WINDOW_MS = 0;

function normalizeMessage(message: string) {
    return sanitizeString(stripNotificationMentionMarkup(message), 1000).trim();
}

function buildLinkFilter(link?: string) {
    return link
        ? { link }
        : { $or: [{ link: { $exists: false } }, { link: "" }, { link: null }] };
}

export async function createNotification(
    input: NotificationInput,
    options: NotificationOptions = {}
): Promise<Notification | null> {
    const agencyId = input.agencyId?.trim();
    const userId = input.userId?.trim();
    const message = normalizeMessage(input.message);
    const eventKey = input.eventKey?.trim();
    if (!agencyId || !userId || !message) return null;

    await connectDB();

    const dedupeWindowMs = options.dedupeWindowMs ?? DEFAULT_DEDUPE_WINDOW_MS;
    const notification: Notification = {
        id: generateId(),
        agencyId,
        userId,
        message,
        read: input.read ?? false,
        timestamp: input.timestamp || new Date().toISOString(),
        ...(input.link ? { link: input.link } : {}),
        ...(eventKey ? { eventKey } : {}),
    };

    if (eventKey) {
        const query = { agencyId, userId, eventKey };
        const result = await NotificationModel.updateOne(
            query,
            { $setOnInsert: notification },
            { upsert: true }
        );
        return result.upsertedCount > 0 ? notification : null;
    }

    if (dedupeWindowMs > 0) {
        const query: Record<string, unknown> = {
            agencyId,
            userId,
            message,
            ...buildLinkFilter(input.link),
            timestamp: { $gte: new Date(Date.now() - dedupeWindowMs).toISOString() },
        };
        const existing = await NotificationModel.exists(query);
        if (existing) return null;
    }

    return NotificationModel.create(notification);
}

export async function createNotifications(
    inputs: NotificationInput[],
    options: NotificationOptions = {}
): Promise<Notification[]> {
    const seen = new Set<string>();
    const uniqueInputs = inputs.filter((input) => {
        const agencyId = input.agencyId?.trim() || "";
        const userId = input.userId?.trim() || "";
        const message = normalizeMessage(input.message);
        const eventKey = input.eventKey?.trim() || "";
        const key = eventKey
            ? `${agencyId}\0${userId}\0${eventKey}`
            : `${agencyId}\0${userId}\0${message}\0${input.link || ""}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
    });

    const created = await Promise.all(uniqueInputs.map((input) => createNotification(input, options)));
    return created.filter((notification): notification is Notification => Boolean(notification));
}

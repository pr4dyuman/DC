import "server-only";

import { revalidatePath } from "next/cache";
import { SystemLogModel, SystemSettingsModel, connectDB } from "../mongodb";
import { type SettingsUpdateRecord, verifySuperAdmin } from "./super-admin-shared";

type SystemLogEntry = {
    event: string;
    type: 'agency' | 'user' | 'system' | 'security' | 'error';
    detail: string;
    status: 'success' | 'error' | 'warning' | 'info';
    agencyId?: string;
    userId?: string;
    meta?: Record<string, unknown>;
};

export async function updateSystemSettingsImpl(
    section: 'platform' | 'security' | 'notifications' | 'emailDefaults' | 'notificationDefaults',
    data: SettingsUpdateRecord,
) {
    await verifySuperAdmin();
    await connectDB();

    const dangerousKeys = new Set(['__proto__', 'constructor', 'prototype']);
    const setObj: Record<string, string | boolean> = {};

    for (const [key, value] of Object.entries(data)) {
        if (dangerousKeys.has(key)) continue;
        if (typeof value === 'string') {
            setObj[`${section}.${key}`] = value.slice(0, 500);
        } else if (typeof value === 'boolean') {
            setObj[`${section}.${key}`] = value;
        } else if (typeof value === 'object' && value !== null) {
            for (const [nestedKey, nestedValue] of Object.entries(value as SettingsUpdateRecord)) {
                if (dangerousKeys.has(nestedKey)) continue;
                if (typeof nestedValue === 'boolean') {
                    setObj[`${section}.${key}.${nestedKey}`] = nestedValue;
                } else if (typeof nestedValue === 'object' && nestedValue !== null) {
                    for (const [deepKey, deepValue] of Object.entries(nestedValue as SettingsUpdateRecord)) {
                        if (dangerousKeys.has(deepKey)) continue;
                        if (typeof deepValue === 'boolean') {
                            setObj[`${section}.${key}.${nestedKey}.${deepKey}`] = deepValue;
                        }
                    }
                }
            }
        }
    }

    await SystemSettingsModel.updateOne(
        { key: 'global' },
        { $set: setObj },
        { upsert: true },
    );

    await logSystemEventImpl({
        event: 'Settings Updated',
        type: 'system',
        detail: `${section} settings were updated`,
        status: 'success',
    });

    revalidatePath('/super-admin/settings');
    return true;
}

export async function savePromptConfigImpl(promptConfig: Record<string, { standard?: string; live?: string }>) {
    await verifySuperAdmin();
    await connectDB();

    // Sanitize — ensure values are strings, cap at 100k chars each
    const safe: Record<string, { standard?: string; live?: string }> = {};
    const ALLOWED_KEYS = ['agentMode', 'agentModeLite', 'chatMode', 'taskExplain', 'hourEstimate', 'taskChatbot'];
    for (const key of ALLOWED_KEYS) {
        const val = promptConfig[key];
        if (!val) continue;
        safe[key] = {};
        if (typeof val.standard === 'string') safe[key].standard = val.standard.slice(0, 100_000);
        if (typeof val.live === 'string') safe[key].live = val.live.slice(0, 100_000);
    }

    await SystemSettingsModel.updateOne(
        { key: 'global' },
        { $set: { promptConfig: safe } },
        { upsert: true },
    );

    revalidatePath('/super-admin/settings');
    return true;
}

export async function logSystemEventImpl(entry: SystemLogEntry) {
    try {
        await connectDB();
        await SystemLogModel.create(entry);
    } catch (error) {
        console.error('[SystemLog] Failed to write log:', error);
    }
}

export async function subscribeNewsletterImpl(email: string) {
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return { error: 'Please enter a valid email address.' };
    }

    const apiKey = process.env.BREVO_API_KEY;
    if (!apiKey) {
        return { error: 'Newsletter service is not configured.' };
    }

    try {
        const response = await fetch('https://api.brevo.com/v3/contacts', {
            method: 'POST',
            headers: {
                accept: 'application/json',
                'content-type': 'application/json',
                'api-key': apiKey,
            },
            body: JSON.stringify({
                email,
                updateEnabled: true,
            }),
        });

        if (response.status === 201 || response.status === 204) {
            return { success: true };
        }

        const body = await response.json().catch(() => ({}));
        if (body.code === 'duplicate_parameter') {
            return { success: true };
        }

        return { error: 'Could not subscribe. Please try again later.' };
    } catch {
        return { error: 'Network error. Please try again later.' };
    }
}

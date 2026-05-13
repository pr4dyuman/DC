import "server-only";

import type { Agency } from "./types";
import {
    DEFAULT_EMAIL_CATEGORIES,
    DEFAULT_TASK_EMAIL_EVENTS,
    type EmailCategory,
    type TaskEmailEventConfig,
    type TaskEmailEventKey,
} from "./email-constants";
import { AgencyModel, SystemSettingsModel, connectDB } from "./mongodb";

type EmailEventField = keyof TaskEmailEventConfig;

type StoredEmailCategories = Partial<Record<EmailCategory, boolean>> & {
    taskEmailEvents?: Partial<Record<TaskEmailEventKey, Partial<TaskEmailEventConfig>>>;
};

type StoredEmailDefaults = StoredEmailCategories & {
    globalEnabled?: boolean;
};

type SystemEmailSettingsDoc = {
    emailDefaults?: StoredEmailDefaults;
};

export const EMAIL_CATEGORY_KEYS = Object.keys(DEFAULT_EMAIL_CATEGORIES) as EmailCategory[];
export const TASK_EMAIL_EVENT_KEYS = Object.keys(DEFAULT_TASK_EMAIL_EVENTS) as TaskEmailEventKey[];
const TASK_EMAIL_EVENT_FIELDS: EmailEventField[] = ["enabled", "notifyAssignee", "notifyClient"];

export type EffectiveEmailSettings = {
    platformEnabled: boolean;
    agencyEnabled: boolean;
    enabled: boolean;
    categories: Record<EmailCategory, boolean>;
    taskEmailEvents: Record<TaskEmailEventKey, TaskEmailEventConfig>;
};

async function getSystemEmailDefaults(): Promise<StoredEmailDefaults> {
    try {
        await connectDB();
        const settings = await SystemSettingsModel.findOne(
            { key: "global" },
            { emailDefaults: 1 },
        ).lean() as SystemEmailSettingsDoc | null;
        return settings?.emailDefaults || {};
    } catch (error) {
        console.warn("[EmailPolicy] Failed to load system email defaults. Falling back to code defaults.", error);
        return {};
    }
}

function mergeTaskEmailEvents(
    systemDefaults?: StoredEmailDefaults["taskEmailEvents"],
    agencyDefaults?: StoredEmailCategories["taskEmailEvents"],
): Record<TaskEmailEventKey, TaskEmailEventConfig> {
    const merged = {} as Record<TaskEmailEventKey, TaskEmailEventConfig>;

    for (const eventKey of TASK_EMAIL_EVENT_KEYS) {
        const base = DEFAULT_TASK_EMAIL_EVENTS[eventKey];
        const systemEvent = systemDefaults?.[eventKey] || {};
        const agencyEvent = agencyDefaults?.[eventKey] || {};
        const eventConfig = { ...base };

        for (const field of TASK_EMAIL_EVENT_FIELDS) {
            const value = agencyEvent[field] ?? systemEvent[field];
            if (typeof value === "boolean") {
                eventConfig[field] = value;
            }
        }

        merged[eventKey] = eventConfig;
    }

    return merged;
}

export function mergeEmailCategories(
    systemDefaults: StoredEmailDefaults = {},
    agencyCategories: StoredEmailCategories = {},
): Pick<EffectiveEmailSettings, "categories" | "taskEmailEvents"> {
    const categories = {} as Record<EmailCategory, boolean>;

    for (const category of EMAIL_CATEGORY_KEYS) {
        categories[category] =
            agencyCategories[category] ??
            systemDefaults[category] ??
            DEFAULT_EMAIL_CATEGORIES[category];
    }

    return {
        categories,
        taskEmailEvents: mergeTaskEmailEvents(systemDefaults.taskEmailEvents, agencyCategories.taskEmailEvents),
    };
}

export async function getDefaultAgencyEmailSettings(): Promise<{
    emailNotificationsEnabled: boolean;
    emailCategories: StoredEmailCategories;
}> {
    const systemDefaults = await getSystemEmailDefaults();
    const merged = mergeEmailCategories(systemDefaults);

    return {
        emailNotificationsEnabled: systemDefaults.globalEnabled ?? true,
        emailCategories: {
            ...merged.categories,
            taskEmailEvents: merged.taskEmailEvents,
        },
    };
}

export async function getEffectiveEmailSettings(input?: {
    agency?: Pick<Agency, "id" | "settings"> | null;
    agencyId?: string;
}): Promise<EffectiveEmailSettings> {
    const systemDefaults = await getSystemEmailDefaults();
    let agency = input?.agency || null;

    if (!agency && input?.agencyId) {
        try {
            await connectDB();
            agency = await AgencyModel.findOne({ id: input.agencyId })
                .select("id settings")
                .lean() as Pick<Agency, "id" | "settings"> | null;
        } catch (error) {
            console.warn(`[EmailPolicy] Failed to load agency ${input.agencyId}. Falling back to platform defaults.`, error);
        }
    }

    const platformEnabled = systemDefaults.globalEnabled ?? true;
    const agencyEnabled = agency?.settings?.emailNotificationsEnabled ?? true;
    const merged = mergeEmailCategories(systemDefaults, agency?.settings?.emailCategories || {});

    return {
        platformEnabled,
        agencyEnabled,
        enabled: platformEnabled && agencyEnabled,
        ...merged,
    };
}

export async function isPlatformEmailGloballyEnabled(): Promise<boolean> {
    const systemDefaults = await getSystemEmailDefaults();
    return systemDefaults.globalEnabled ?? true;
}

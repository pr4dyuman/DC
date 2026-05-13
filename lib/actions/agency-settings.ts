import "server-only";

import { revalidatePath } from "next/cache";
import type { Agency } from "../db";
import { comparePassword } from "../auth";
import { sanitizeColor, sanitizeName, sanitizeUrl } from "../validation";
import type { AIConfig, AIPermissions } from "../types";
import { DEFAULT_AI_PERMISSIONS } from "../types";
import { EMAIL_CATEGORY_KEYS, TASK_EMAIL_EVENT_KEYS, getEffectiveEmailSettings } from "../email-policy";
import {
    AgencyModel,
    ClientModel,
    SettingsModel,
    SystemSettingsModel,
    UserModel,
    connectDB,
} from "../mongodb";
import { getAgencyAIConfigServer } from "../utils-server";

type SystemCurrencySettings = {
    platform?: {
        defaultCurrency?: string;
    };
};

export async function getAgencySettingsImpl(agency: Agency | null) {
    if (!agency) return null;
    const effectiveEmailSettings = await getEffectiveEmailSettings({ agency });

    // Agency-specific currency takes priority; fall back to system default, then USD
    let fallbackCurrency = "USD";
    if (!agency.settings?.currency) {
        try {
            const sys = await SystemSettingsModel.findOne(
                { key: "global" },
                { "platform.defaultCurrency": 1 }
            ).lean() as SystemCurrencySettings | null;
            if (sys?.platform?.defaultCurrency) fallbackCurrency = sys.platform.defaultCurrency;
        } catch {
            // Fall back to USD if system settings are unavailable.
        }
    }

    return {
        name: agency.name,
        logo: agency.logo || "",
        primaryColor: agency.primaryColor,
        secondaryColor: agency.secondaryColor,
        currency: agency.settings?.currency || fallbackCurrency,
        emailNotificationsEnabled: agency.settings?.emailNotificationsEnabled ?? true,
        emailCategories: {
            ...effectiveEmailSettings.categories,
            taskEmailEvents: effectiveEmailSettings.taskEmailEvents,
        },
    };
}


export async function getAgencyAIConfigImpl(): Promise<AIConfig | null> {
    const config = await getAgencyAIConfigServer();
    if (!config) return null;
    return {
        ...config,
        apiKey: config.apiKey
            ? (config.apiKey.length >= 4 ? `****${config.apiKey.slice(-4)}` : "****")
            : config.apiKey,
    };
}

export async function getAIPermissionsImpl(agency: Agency | null): Promise<AIPermissions> {
    await connectDB();
    if (!agency) return DEFAULT_AI_PERMISSIONS;
    return { ...DEFAULT_AI_PERMISSIONS, ...agency.aiPermissions };
}

export async function updateAIPermissionsImpl(permissions: AIPermissions, agencyId: string) {
    await AgencyModel.updateOne(
        { id: agencyId },
        { $set: { aiPermissions: permissions } }
    );

    revalidatePath("/dashboard/settings");
    return { success: true };
}

export async function verifyAgentPasswordImpl(password: string, currentUserId: string): Promise<{ success: boolean; error?: string }> {
    if (!password || typeof password !== "string") {
        return { success: false, error: "Password required" };
    }

    await connectDB();

    const user = await UserModel.findOne({ id: currentUserId }).select("password").lean();
    if (!user?.password) {
        const client = await ClientModel.findOne({ id: currentUserId }).select("password").lean();
        if (!client?.password) return { success: false, error: "User not found" };
        const valid = await comparePassword(password, client.password);
        return valid ? { success: true } : { success: false, error: "Incorrect password" };
    }

    const valid = await comparePassword(password, user.password);
    return valid ? { success: true } : { success: false, error: "Incorrect password" };
}

export async function updateEmailSettingsImpl(enabled: boolean, agencyId: string) {
    await AgencyModel.updateOne(
        { id: agencyId },
        {
            $set: {
                "settings.emailNotificationsEnabled": enabled,
            },
        }
    );

    revalidatePath("/dashboard");
    return { success: true };
}

export async function updateEmailCategorySettingsImpl(categories: Record<string, boolean>, agencyId: string) {
    const updates: Record<string, boolean> = {};

    for (const [key, value] of Object.entries(categories)) {
        if ((EMAIL_CATEGORY_KEYS as string[]).includes(key) && typeof value === "boolean") {
            updates[`settings.emailCategories.${key}`] = value;
        }
    }

    if (Object.keys(updates).length === 0) throw new Error("No valid categories provided");

    await AgencyModel.updateOne(
        { id: agencyId },
        { $set: updates }
    );

    revalidatePath("/dashboard/settings");
    return { success: true };
}

export async function updateTaskEmailEventsImpl(events: Record<string, Record<string, boolean>>, agencyId: string) {
    const validFields = ["enabled", "notifyAssignee", "notifyClient"];
    const updates: Record<string, boolean> = {};

    for (const [eventKey, fields] of Object.entries(events)) {
        if (!(TASK_EMAIL_EVENT_KEYS as string[]).includes(eventKey) || typeof fields !== "object") continue;
        for (const [field, value] of Object.entries(fields)) {
            if (validFields.includes(field) && typeof value === "boolean") {
                updates[`settings.emailCategories.taskEmailEvents.${eventKey}.${field}`] = value;
            }
        }
    }

    if (Object.keys(updates).length === 0) throw new Error("No valid event settings provided");

    await AgencyModel.updateOne(
        { id: agencyId },
        { $set: updates }
    );

    revalidatePath("/dashboard/settings");
    return { success: true };
}

export async function updateUserPermissionsImpl(
    agencyId: string,
    targetUserId: string,
    permissions: Record<string, unknown>
) {
    await connectDB();
    const [targetUser, targetClient] = await Promise.all([
        UserModel.findOne({ id: targetUserId, agencyId, archived: { $ne: true } }).select("role").lean(),
        ClientModel.findOne({ id: targetUserId, agencyId, archived: { $ne: true } }).select("id").lean(),
    ]);
    if (!targetUser && !targetClient) {
        throw new Error("Permission subject not found");
    }
    if (targetUser?.role === "admin") {
        throw new Error("Admin permissions cannot be overridden");
    }
    await SettingsModel.updateOne(
        { agencyId },
        { $set: { [`userPermissions.${targetUserId}`]: permissions } },
        { upsert: true }
    );

    revalidatePath("/dashboard/settings");
}

export async function updateAgencyDetailsImpl(
    name: string,
    logo: string,
    agencyId: string,
    primaryColor?: string,
    secondaryColor?: string
) {
    name = sanitizeName(name, 200);
    logo = sanitizeUrl(logo);

    if (primaryColor) primaryColor = sanitizeColor(primaryColor);
    if (secondaryColor) secondaryColor = sanitizeColor(secondaryColor);
    if (!name) throw new Error("Agency name is required");

    await AgencyModel.updateOne(
        { id: agencyId },
        {
            $set: {
                name,
                logo,
                ...(primaryColor && { primaryColor }),
                ...(secondaryColor && { secondaryColor }),
            },
        }
    );

    revalidatePath("/dashboard");
    return { success: true };
}

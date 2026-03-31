import "server-only";

import { SuperAdminModel, SystemSettingsModel, connectDB } from "../mongodb";
import { getSessionUser } from "../auth";
import type { Agency, AIBloggerStageConfig, AIConfig, AIFeatureConfig } from "../types";

type SerializableRecord = Record<string, unknown>;

type StoredAIConfigRecord = {
    provider?: AIConfig["provider"];
    apiKey?: string;
    model?: string;
    customModelId?: string;
    chatConfig?: AIFeatureConfig;
    agentConfig?: AIFeatureConfig;
    taskExplainConfig?: AIFeatureConfig;
    hourEstimateConfig?: AIFeatureConfig;
    taskChatbotConfig?: AIFeatureConfig;
    heavyTasksConfig?: AIFeatureConfig;
};

type StoredAIBloggerStageConfigRecord = {
    provider?: AIBloggerStageConfig["provider"];
    apiKey?: string;
    fallbackApiKey?: string;
    model?: string;
    customModelId?: string;
    systemPrompt?: string;
};

type StoredAIBloggerTrendsConfigRecord = {
    enabled?: boolean;
    provider?: "serpapi";
    apiKey?: string;
    fallbackApiKey?: string;
    fallbackEnabled?: boolean;
    fallbackToAi?: boolean;
    defaultLocation?: string;
};

export type StoredAIBloggerConfigRecord = {
    fallbackEnabled?: boolean;
    trends?: StoredAIBloggerTrendsConfigRecord;
    extractKeywords?: StoredAIBloggerStageConfigRecord;
    research?: StoredAIBloggerStageConfigRecord;
    seoAnalysis?: StoredAIBloggerStageConfigRecord;
    writeBlog?: StoredAIBloggerStageConfigRecord;
    generateImage?: StoredAIBloggerStageConfigRecord;
    updatedAt?: string;
    updatedBy?: string;
};

type EmailEventSettingsRecord = {
    enabled?: boolean;
    notifyAssignee?: boolean;
    notifyClient?: boolean;
};

type EmailDefaultsRecord = {
    globalEnabled?: boolean;
    accountCreation?: boolean;
    invoicePayment?: boolean;
    salaryPayroll?: boolean;
    refund?: boolean;
    projectUpdates?: boolean;
    taskUpdates?: boolean;
    leaveManagement?: boolean;
    documentApproval?: boolean;
    aiBloggerAlerts?: boolean;
    taskEmailEvents?: Partial<Record<'taskCreated' | 'taskInProgress' | 'taskDone', EmailEventSettingsRecord>>;
};

export type SystemSettingsRecord = {
    security?: {
        requireEmailVerification?: boolean;
        enableTwoFactor?: boolean;
        enforceStrongPasswords?: boolean;
        allowSelfRegistration?: boolean;
    };
    platform?: {
        name?: string;
        supportEmail?: string;
        defaultCurrency?: string;
    };
    notifications?: {
        emailOnAgencyCreated?: boolean;
        emailOnAgencySuspended?: boolean;
        weeklySummary?: boolean;
    };
    notificationDefaults?: Partial<Record<'welcome' | 'project' | 'task' | 'invoice' | 'salary' | 'leave' | 'refund' | 'document' | 'security', boolean>>;
    emailDefaults?: EmailDefaultsRecord;
    defaultAiConfig?: StoredAIConfigRecord;
    promptConfig?: PromptConfigRecord;
    aiBloggerSearchConsole?: {
        enabled: boolean;
        propertyUrl?: string;
        credentialsJson?: string;
        syncFrequencyHours: number;
        lookbackDays: number;
        authStatus: "not-connected" | "configured";
    };
};

export type PromptFeatureConfig = {
    /** Full replacement prompt for standard (non-live) model. Empty = use default. */
    standard?: string;
    /** Full replacement prompt for live/streaming model. Empty = use standard override or default. */
    live?: string;
};

export type PromptConfigRecord = Partial<Record<PromptFeatureKey, PromptFeatureConfig>>;

export type PromptFeatureKey =
    | "agentMode"       // Singularity Agent (non-live)
    | "agentModeLite"   // Singularity Agent — lite model guardrails
    | "chatMode"        // Singularity Chat
    | "taskExplain"     // Task Explain/Enhance
    | "hourEstimate"    // Hour Estimation
    | "taskChatbot";    // In-task chatbot

export type SuperAdminPasswordRecord = {
    password?: string;
};

type SuperAdminContactRecord = {
    email?: string;
    name?: string;
};

export type AssetUrlRecord = {
    url?: string;
};

export type AgencyLookupRecord = {
    id: string;
    name?: string;
    slug?: string;
    plan?: Agency["plan"];
    trialEndsAt?: string;
    usage?: {
        storage?: number;
    };
    limits?: {
        maxStorage?: number;
    };
};

export type UserLookupRecord = {
    id: string;
    name?: string;
    email?: string;
};

export type AIUsageByAgencyRow = {
    _id?: string;
    totalRequests: number;
    totalTokens: number;
    inputTokens: number;
    outputTokens: number;
};

export type AIUsageByAgencyUserRow = {
    _id?: string;
    totalRequests: number;
    totalTokens: number;
};

export type AIUsageByUserRow = {
    _id?: string;
    agencyId?: string;
    totalRequests: number;
    totalTokens: number;
    inputTokens: number;
    outputTokens: number;
    lastUsed?: string | Date;
};

export type SettingsUpdateRecord = Record<string, unknown>;

export type AgencyPlanUpdate = Partial<Pick<Agency, "plan" | "limits" | "features" | "planDuration" | "planExpiresAt" | "status" | "updatedAt">>;

export type StoredAIConfig = StoredAIConfigRecord;
export type StoredAIBloggerConfig = StoredAIBloggerConfigRecord;

export async function verifySuperAdmin() {
    const sessionUser = await getSessionUser();
    if (!sessionUser || sessionUser.role !== 'superadmin') {
        throw new Error('Unauthorized: Super admin access required');
    }
    return sessionUser;
}

function stripMongoFields<T>(obj: T): T {
    if (Array.isArray(obj)) return obj.map((item) => stripMongoFields(item)) as T;
    if (obj && typeof obj === 'object') {
        const source = obj as SerializableRecord;
        const clean: SerializableRecord = {};
        for (const key of Object.keys(source)) {
            if (key === '_id' || key === '__v') continue;
            clean[key] = stripMongoFields(source[key]);
        }
        return clean as T;
    }
    return obj;
}

export function toSerializable<T>(obj: T): T {
    const plain = JSON.parse(JSON.stringify(obj)) as T;
    return stripMongoFields(plain);
}

export async function getSuperAdminAlertSettings(): Promise<{
    emailOnAgencyCreated: boolean;
    emailOnAgencySuspended: boolean;
    weeklySummary: boolean;
}> {
    await connectDB();
    const settings = await SystemSettingsModel.findOne(
        { key: 'global' },
        { notifications: 1 }
    ).lean() as SystemSettingsRecord | null;
    return {
        emailOnAgencyCreated: settings?.notifications?.emailOnAgencyCreated ?? true,
        emailOnAgencySuspended: settings?.notifications?.emailOnAgencySuspended ?? true,
        weeklySummary: settings?.notifications?.weeklySummary ?? false,
    };
}

export async function sendSuperAdminAlertEmail(subject: string, body: string) {
    try {
        const sa = await SuperAdminModel.findOne({}).select('email name').lean() as SuperAdminContactRecord | null;
        if (!sa?.email) return;
        const { sendEmail } = await import("../brevo");
        const escSubject = subject.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        await sendEmail({
            to: sa.email,
            toName: sa.name || 'Super Admin',
            subject,
            htmlContent: `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px;background:#f8f9fa;border-radius:8px;">
                <h2 style="margin:0 0 16px;color:#1a1a2e;">${escSubject}</h2>
                <div style="background:#fff;padding:20px;border-radius:6px;border:1px solid #e5e7eb;color:#374151;line-height:1.6;">${body}</div>
                <p style="margin:16px 0 0;font-size:12px;color:#9ca3af;">This is an automated alert from your AgencyOS platform.</p>
            </div>`,
        });
    } catch (error) {
        console.error('Failed to send super-admin alert email:', error);
    }
}

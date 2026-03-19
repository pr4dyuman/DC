import mongoose, { Model, Schema } from "mongoose";

type SystemSettingsDoc = {
    key: string;
} & Record<string, unknown>;

type SystemLogDoc = {
    event: string;
    type: "agency" | "user" | "system" | "security" | "error";
    detail: string;
    status: "success" | "error" | "warning" | "info";
    agencyId?: string;
    userId?: string;
    meta?: unknown;
};

type AIUsageFeature =
    | "singularity-agent"
    | "singularity-chat"
    | "ai-explain"
    | "ai-enhance"
    | "ai-task-chat"
    | "ai-chatbot"
    | "ai-hour-estimate";

type AIUsageLogDoc = {
    agencyId: string;
    userId: string;
    feature: AIUsageFeature;
    model: string;
    provider: string;
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
    durationMs: number;
    success: boolean;
    error?: string;
};

const SystemSettingsSchema = new Schema({
    key: { type: String, default: "global", unique: true },
    platform: {
        name: { type: String, default: "AgencyOS" },
        supportEmail: { type: String, default: "support@agencyos.com" },
        defaultTimezone: { type: String, default: "UTC" },
        defaultCurrency: { type: String, default: "USD" },
    },
    security: {
        requireEmailVerification: { type: Boolean, default: false },
        enableTwoFactor: { type: Boolean, default: false },
        allowSelfRegistration: { type: Boolean, default: false },
        enforceStrongPasswords: { type: Boolean, default: true },
    },
    notifications: {
        emailOnAgencyCreated: { type: Boolean, default: true },
        emailOnAgencySuspended: { type: Boolean, default: true },
        weeklySummary: { type: Boolean, default: false },
    },
    notificationDefaults: {
        welcome: { type: Boolean, default: true },
        project: { type: Boolean, default: true },
        task: { type: Boolean, default: true },
        invoice: { type: Boolean, default: true },
        salary: { type: Boolean, default: true },
        leave: { type: Boolean, default: true },
        refund: { type: Boolean, default: true },
        document: { type: Boolean, default: true },
        security: { type: Boolean, default: true },
    },
    emailDefaults: {
        globalEnabled: { type: Boolean, default: true },
        accountCreation: { type: Boolean, default: true },
        invoicePayment: { type: Boolean, default: true },
        salaryPayroll: { type: Boolean, default: true },
        refund: { type: Boolean, default: true },
        projectUpdates: { type: Boolean, default: false },
        taskUpdates: { type: Boolean, default: false },
        leaveManagement: { type: Boolean, default: false },
        documentApproval: { type: Boolean, default: false },
        taskEmailEvents: {
            taskCreated: {
                enabled: { type: Boolean, default: true },
                notifyAssignee: { type: Boolean, default: true },
                notifyClient: { type: Boolean, default: false },
            },
            taskInProgress: {
                enabled: { type: Boolean, default: false },
                notifyAssignee: { type: Boolean, default: true },
                notifyClient: { type: Boolean, default: false },
            },
            taskDone: {
                enabled: { type: Boolean, default: false },
                notifyAssignee: { type: Boolean, default: true },
                notifyClient: { type: Boolean, default: true },
            },
        },
    },
}, { timestamps: true });

const SystemLogSchema = new Schema({
    event: { type: String, required: true, index: true },
    type: { type: String, required: true, enum: ["agency", "user", "system", "security", "error"] },
    detail: { type: String, required: true },
    status: { type: String, required: true, enum: ["success", "error", "warning", "info"], default: "info" },
    agencyId: { type: String, index: true },
    userId: { type: String },
    meta: { type: Schema.Types.Mixed },
}, { timestamps: true });
SystemLogSchema.index({ createdAt: -1 });

const AIUsageLogSchema = new Schema({
    agencyId: { type: String, required: true, index: true },
    userId: { type: String, required: true, index: true },
    feature: {
        type: String,
        required: true,
        enum: ["singularity-agent", "singularity-chat", "ai-explain", "ai-enhance", "ai-task-chat", "ai-chatbot", "ai-hour-estimate"],
        index: true,
    },
    model: { type: String, required: true },
    provider: { type: String, required: true },
    inputTokens: { type: Number, default: 0 },
    outputTokens: { type: Number, default: 0 },
    totalTokens: { type: Number, default: 0 },
    durationMs: { type: Number, default: 0 },
    success: { type: Boolean, default: true },
    error: { type: String },
}, { timestamps: true });
AIUsageLogSchema.index({ createdAt: -1 });
AIUsageLogSchema.index({ agencyId: 1, createdAt: -1 });
AIUsageLogSchema.index({ agencyId: 1, feature: 1, createdAt: -1 });

export const SystemSettingsModel = (mongoose.models.SystemSettings as Model<SystemSettingsDoc>) || mongoose.model<SystemSettingsDoc>("SystemSettings", SystemSettingsSchema);
export const SystemLogModel = (mongoose.models.SystemLog as Model<SystemLogDoc>) || mongoose.model<SystemLogDoc>("SystemLog", SystemLogSchema);
export const AIUsageLogModel = (mongoose.models.AIUsageLog as Model<AIUsageLogDoc>) || mongoose.model<AIUsageLogDoc>("AIUsageLog", AIUsageLogSchema);

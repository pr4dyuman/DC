import mongoose, { Model, Schema } from "mongoose";
import { Agency, SuperAdmin } from "./types";

const AgencyLimitsSchema = new Schema({
    maxUsers: { type: Number, required: true },
    maxProjects: { type: Number, required: true },
    maxClients: { type: Number, required: true },
    maxStorage: { type: Number, required: true },
    maxMonthlyInvoices: { type: Number, required: true },
    aiEnabled: { type: Boolean, required: true },
    customBranding: { type: Boolean, required: true },
}, { _id: false });

const AgencyUsageSchema = new Schema({
    users: { type: Number, default: 0 },
    projects: { type: Number, default: 0 },
    clients: { type: Number, default: 0 },
    storage: { type: Number, default: 0 },
    monthlyInvoices: { type: Number, default: 0 },
}, { _id: false });

const TaskEmailEventSchema = new Schema({
    enabled: { type: Boolean, default: false },
    notifyAssignee: { type: Boolean, default: true },
    notifyClient: { type: Boolean, default: false },
}, { _id: false });

const TaskEmailEventsSchema = new Schema({
    taskCreated: { type: TaskEmailEventSchema, default: () => ({ enabled: true, notifyAssignee: true, notifyClient: false }) },
    taskInProgress: { type: TaskEmailEventSchema, default: () => ({ enabled: false, notifyAssignee: true, notifyClient: false }) },
    taskDone: { type: TaskEmailEventSchema, default: () => ({ enabled: false, notifyAssignee: true, notifyClient: true }) },
}, { _id: false });

const EmailCategoriesSchema = new Schema({
    accountCreation: { type: Boolean, default: true },
    invoicePayment: { type: Boolean, default: true },
    salaryPayroll: { type: Boolean, default: true },
    refund: { type: Boolean, default: true },
    projectUpdates: { type: Boolean, default: false },
    taskUpdates: { type: Boolean, default: false },
    leaveManagement: { type: Boolean, default: false },
    documentApproval: { type: Boolean, default: false },
    taskEmailPriorities: { type: Schema.Types.Mixed, default: undefined },
    taskEmailEvents: { type: TaskEmailEventsSchema, default: () => ({}) },
}, { _id: false });

const AgencySettingsSchema = new Schema({
    systemName: { type: String, required: true },
    timezone: { type: String, default: "UTC" },
    currency: { type: String, default: "USD" },
    dateFormat: { type: String, default: "MM/DD/YYYY" },
    allowClientRegistration: { type: Boolean, default: false },
    requireEmailVerification: { type: Boolean, default: false },
    enableTwoFactor: { type: Boolean, default: false },
    emailNotificationsEnabled: { type: Boolean, default: true },
    emailCategories: { type: EmailCategoriesSchema, default: () => ({}) },
}, { _id: false });

const AgencyFeaturesSchema = new Schema({
    aiAssistant: { type: Boolean, default: false },
    advancedReporting: { type: Boolean, default: false },
    apiAccess: { type: Boolean, default: false },
    whiteLabel: { type: Boolean, default: false },
    customDomain: { type: Boolean, default: false },
    ssoEnabled: { type: Boolean, default: false },
}, { _id: false });

const AIConfigSchema = new Schema({
    provider: { type: String, enum: ["gemini", "openai", "nvidia", "github"], required: true },
    apiKey: { type: String, required: true },
    model: { type: String, required: true },
    customModelId: { type: String },
}, { _id: false });

const AIPermissionsSchema = new Schema({
    canPayroll: { type: Boolean, default: false },
    canManageInvoices: { type: Boolean, default: false },
    canRefund: { type: Boolean, default: false },
    canCreateEmployee: { type: Boolean, default: false },
    canDelete: { type: Boolean, default: false },
}, { _id: false });

const AgencySchema = new Schema({
    id: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    slug: { type: String, required: true, unique: true },
    domain: { type: String, sparse: true },
    logo: { type: String },
    primaryColor: { type: String },
    secondaryColor: { type: String },
    status: {
        type: String,
        enum: ["active", "suspended", "trial", "cancelled"],
        required: true,
        default: "trial",
    },
    plan: {
        type: String,
        enum: ["free", "starter", "pro", "enterprise"],
        required: true,
        default: "free",
    },
    planDuration: {
        type: String,
        enum: ["monthly", "3months", "6months", "yearly", "lifetime"],
    },
    planExpiresAt: { type: String },
    trialEndsAt: { type: String },
    limits: { type: AgencyLimitsSchema, required: true },
    usage: { type: AgencyUsageSchema, required: true },
    billing: {
        subscriptionId: { type: String },
        stripeCustomerId: { type: String },
        subscriptionStatus: {
            type: String,
            enum: ["active", "past_due", "canceled", "unpaid", "trialing", "incomplete", "incomplete_expired", "paused"],
        },
        currentPeriodEnd: { type: String },
        cancelAtPeriodEnd: { type: Boolean },
        billingEmail: { type: String, required: true },
        billingAddress: { type: String },
        taxId: { type: String },
    },
    settings: { type: AgencySettingsSchema, required: true },
    createdAt: { type: String, required: true },
    createdBy: { type: String, required: true },
    updatedAt: { type: String },
    lastActivityAt: { type: String },
    features: { type: AgencyFeaturesSchema, required: true },
    aiConfig: { type: AIConfigSchema },
    aiPermissions: { type: AIPermissionsSchema },
}, { timestamps: true });

AgencySchema.index({ status: 1 });
AgencySchema.index({ plan: 1 });
AgencySchema.index({ createdBy: 1 });

const SuperAdminPermissionsSchema = new Schema({
    canCreateAgency: { type: Boolean, default: true },
    canDeleteAgency: { type: Boolean, default: true },
    canSuspendAgency: { type: Boolean, default: true },
    canViewBilling: { type: Boolean, default: true },
    canManagePlans: { type: Boolean, default: true },
}, { _id: false });

const SuperAdminSchema = new Schema({
    id: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, default: "superadmin" },
    avatar: { type: String },
    phone: { type: String },
    timezone: { type: String },
    twoFactorEnabled: { type: Boolean, default: false },
    twoFactorSecret: { type: String },
    createdAt: { type: String, required: true },
    lastLoginAt: { type: String },
    permissions: { type: SuperAdminPermissionsSchema, required: true },
}, { timestamps: true });

export const AgencyModel = (mongoose.models.Agency as Model<Agency>) || mongoose.model<Agency>("Agency", AgencySchema);
export const SuperAdminModel = (mongoose.models.SuperAdmin as Model<SuperAdmin>) || mongoose.model<SuperAdmin>("SuperAdmin", SuperAdminSchema);

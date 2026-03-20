import mongoose, { Schema, Model } from 'mongoose';
import { decryptApiKey as decryptApiKeyImpl, encryptApiKey as encryptApiKeyImpl } from "./ai-key-crypto";
export { OtpModel, RateLimitModel } from "./mongodb-auth-models";
export { AIUsageLogModel, SystemLogModel, SystemSettingsModel } from "./mongodb-platform-models";
export { AgencyModel, SuperAdminModel } from "./mongodb-tenant-models";
export { SingularityChatSessionModel, SingularityCheckpointModel } from "./mongodb-singularity-models";
import { connectMongo } from "./mongodb-connection";
import {
    User, Client, Project, Task, Invoice, Transaction, Service,
    Notification, Activity, Asset, Message, LeaveRequest, Settings,
    PaymentConfig, ProjectServiceConfig, Comment, Job
} from './types';

// ============================================================================
// API KEY ENCRYPTION HELPERS (AES-256-GCM)
// Kept as thin wrappers so existing imports keep working.
// ============================================================================
export function encryptApiKey(plaintext: string): string {
    return encryptApiKeyImpl(plaintext);
}

export function decryptApiKey(value: string): string {
    return decryptApiKeyImpl(value);
}

export async function connectDB() {
    return connectMongo();
}

// ============================================================================
// SCHEMAS
// ============================================================================

// Comment Schema (Embedded)
const CommentSchema = new Schema<Comment>({
    id: { type: String, required: true },
    userId: { type: String, required: true },
    text: { type: String, required: true },
    timestamp: { type: String, required: true }
}, { _id: false });

// Job Schema (Embedded)
const JobSchema = new Schema<Job>({
    title: { type: String, required: true },
    count: { type: Number, required: true }
}, { _id: false });

// Payment Config Schema (Embedded)
const PaymentConfigSchema = new Schema<PaymentConfig>({
    type: { type: String, enum: ['installment', 'monthly'], required: true },
    installments: { type: Number },
    installmentAmount: { type: Number },
    firstPaymentDate: { type: String },
    installmentDates: [{ type: String }],
    monthlyAmount: { type: Number },
    billingStartDate: { type: String },
    paymentDetailsLater: { type: Boolean, required: true }
}, { _id: false });

// Project Service Config Schema (Embedded)
const ProjectServiceConfigSchema = new Schema<ProjectServiceConfig>({
    serviceId: { type: String, required: true },
    name: { type: String, required: true },
    paymentConfig: { type: PaymentConfigSchema }
}, { _id: false });

// ============================================================================
// TENANT & ADMIN MODELS
// Extracted to mongodb-tenant-models.ts and re-exported above.
// ============================================================================

// ============================================================================
// EXISTING SCHEMAS (Updated with agencyId)
// ============================================================================

// User Schema
const UserSchema = new Schema<User>({
    id: { type: String, required: true, unique: true },
    agencyId: { type: String, required: true, index: true }, // Multi-tenancy
    username: { type: String, sparse: true },
    name: { type: String, required: true },
    email: { type: String, required: true },
    role: { type: String, enum: ['admin', 'manager', 'employee', 'client'], required: true },
    jobTitle: { type: String },
    salary: { type: Number },
    avatar: { type: String },
    password: { type: String },
    timezone: { type: String },
    lastActiveAt: { type: String },
    employmentType: { type: String, enum: ['Salary', 'Project Based', 'Freelancer'] },
    gender: { type: String, enum: ['Male', 'Female', 'Other'] },
    contactNumber: { type: String },
    adharCardImage: { type: String },
    panCardImage: { type: String },
    pendingAdharCardImage: { type: String },
    pendingPanCardImage: { type: String },
    contracts: [{ type: String }],
    pendingContracts: [{ type: String }],
    otherDocuments: [{ type: String }],
    pendingOtherDocuments: [{ type: String }],
    archived: { type: Boolean, default: false },
    archivedAt: { type: String },
}, { timestamps: true });

// Compound unique index: each email is unique within an agency
UserSchema.index({ email: 1, agencyId: 1 }, { unique: true });
// Compound unique index: each username is unique within an agency
UserSchema.index({ username: 1, agencyId: 1 }, { unique: true, sparse: true });
UserSchema.index({ archived: 1 });

// Client Schema
const ClientSchema = new Schema<Client>({
    id: { type: String, required: true, unique: true },
    agencyId: { type: String, required: true, index: true },
    username: { type: String, sparse: true },
    name: { type: String, required: true },
    email: { type: String, required: true },
    role: { type: String, default: 'client' },
    companyName: { type: String, required: true },
    logo: { type: String },
    phone: { type: String },
    address: { type: String },
    password: { type: String },
    timezone: { type: String },
    lastActiveAt: { type: String },
    archived: { type: Boolean, default: false },
    archivedAt: { type: String },
    adharCardImage: { type: String },
    panCardImage: { type: String },
    pendingAdharCardImage: { type: String },
    pendingPanCardImage: { type: String },
    contracts: [{ type: String }],
    pendingContracts: [{ type: String }],
    otherDocuments: [{ type: String }],
    pendingOtherDocuments: [{ type: String }]
}, { timestamps: true });

// Note: id and username already have indexes from unique constraint
ClientSchema.index({ email: 1, agencyId: 1 }, { unique: true });
ClientSchema.index({ username: 1, agencyId: 1 }, { unique: true, sparse: true });
ClientSchema.index({ archived: 1 });

// Project Schema
const ProjectSchema = new Schema<Project>({
    id: { type: String, required: true, unique: true },
    agencyId: { type: String, required: true, index: true },
    slug: { type: String },
    name: { type: String, required: true },
    client: { type: String },
    clientId: { type: String },
    services: [{ type: String }],
    serviceConfigs: [ProjectServiceConfigSchema],
    status: { type: String, enum: ['Active', 'Completed', 'On Hold', 'Cancelled'], required: true },
    clientArchiveHold: { type: Boolean, default: false },
    clientArchiveHoldAt: { type: String },
    budget: { type: Number, required: true },
    dueDate: { type: String, required: true },
    aiEnabled: { type: Boolean, default: false }
}, { timestamps: true });

// Note: id already has index from unique constraint
ProjectSchema.index({ clientId: 1 });
ProjectSchema.index({ status: 1 });
ProjectSchema.index({ agencyId: 1, status: 1 });                          // Compound: agency+status
ProjectSchema.index({ agencyId: 1, slug: 1 }, { unique: true, sparse: true }); // Slug unique per agency

// Task Schema
const TaskSchema = new Schema<Task>({
    id: { type: String, required: true, unique: true },
    agencyId: { type: String, required: true, index: true },
    projectId: { type: String, required: true },
    title: { type: String, required: true },
    description: { type: String },
    status: { type: String, enum: ['Todo', 'In Progress', 'Review', 'Done'], required: true },
    priority: { type: String, enum: ['Low', 'Medium', 'High'] },
    assigneeId: { type: String, default: "" },
    dueDate: { type: String },
    startDate: { type: String },
    category: { type: String },
    createdBy: { type: String },
    estimatedHours: { type: Number },
    comments: [CommentSchema]
}, { timestamps: true });

// Note: id already has index from unique constraint
TaskSchema.index({ projectId: 1 });
TaskSchema.index({ agencyId: 1, status: 1 });           // Compound: agency + status
TaskSchema.index({ agencyId: 1, assigneeId: 1 });       // Compound: agency + assignee
TaskSchema.index({ createdBy: 1 });

// Invoice Schema
const InvoiceSchema = new Schema<Invoice>({
    id: { type: String, required: true, unique: true },
    agencyId: { type: String, required: true, index: true },
    projectId: { type: String, required: true },
    serviceId: { type: String },
    amount: { type: Number, required: true },
    status: { type: String, enum: ['Paid', 'Pending', 'Overdue', 'Processing'], required: true },
    date: { type: String, required: true },
    performedBy: { type: String },
    paymentDate: { type: String },
    paymentNote: { type: String },
}, { timestamps: true });

// Note: id already has index from unique constraint
InvoiceSchema.index({ projectId: 1 });
InvoiceSchema.index({ agencyId: 1, status: 1 }); // Compound: agency + status

// Transaction Schema
const TransactionSchema = new Schema<Transaction>({
    id: { type: String, required: true, unique: true },
    agencyId: { type: String, required: true, index: true },
    date: { type: String, required: true },
    amount: { type: Number, required: true },
    type: { type: String, enum: ['income', 'expense'], required: true },
    category: { type: String, enum: ['Project', 'Salary', 'Freelancer', 'Tax', 'Reimbursement', 'Retainer', 'Internal Transfer', 'Investor', 'Refund', 'Other'], required: true },
    description: { type: String, required: true },
    status: { type: String, enum: ['completed', 'pending'], required: true },
    projectId: { type: String },
    userId: { type: String },
    taxType: { type: String, enum: ['GST', 'TDS', 'Income Tax', 'Professional Tax', 'Other'] },
    expenseType: { type: String, enum: ['Travel', 'Meals', 'Client Meeting', 'Equipment', 'Other'] },
    invoiceId: { type: String },
    performedBy: { type: String }
}, { timestamps: true });

// Note: id already has index from unique constraint
TransactionSchema.index({ projectId: 1 });
TransactionSchema.index({ agencyId: 1, type: 1 });     // Compound: agency + type
TransactionSchema.index({ agencyId: 1, date: 1 });     // Compound: agency + date (range queries)
TransactionSchema.index({ agencyId: 1, category: 1 }); // Compound: agency + category
TransactionSchema.index({ userId: 1 });

// Service Schema
const ServiceSchema = new Schema<Service>({
    id: { type: String, required: true, unique: true },
    agencyId: { type: String, required: true, index: true },
    name: { type: String, required: true },
    projectId: { type: String, index: true },
    employees: [{ type: String }],
    jobs: [JobSchema]
}, { timestamps: true });

// Note: id already has index from unique constraint
ServiceSchema.index({ agencyId: 1, projectId: 1, name: 1 }, { unique: true });

// Notification Schema
const NotificationSchema = new Schema<Notification>({
    id: { type: String, required: true, unique: true },
    agencyId: { type: String, required: true, index: true },
    userId: { type: String, required: true },
    message: { type: String, required: true },
    read: { type: Boolean, required: true, default: false },
    timestamp: { type: String, required: true },
    link: { type: String }
}, { timestamps: true });

// Note: id already has index from unique constraint
NotificationSchema.index({ agencyId: 1, userId: 1, read: 1 }); // Compound: agency + user + read status

// Activity Schema
const ActivitySchema = new Schema<Activity>({
    id: { type: String, required: true, unique: true },
    agencyId: { type: String, required: true, index: true },
    user: { type: String, required: true },
    userId: { type: String },
    action: { type: String, required: true },
    target: { type: String, required: true },
    timestamp: { type: String, required: true },
    entityId: { type: String },
    entityType: { type: String, enum: ['task', 'project', 'invoice', 'client', 'user'] }
}, { timestamps: true });

// Note: id already has index from unique constraint
ActivitySchema.index({ agencyId: 1, timestamp: -1 }); // Compound for agency-scoped activity feed
ActivitySchema.index({ userId: 1, agencyId: 1, timestamp: -1 }); // For user-specific activity lookups (BUG-021)

// Asset Schema
const AssetSchema = new Schema<Asset>({
    id: { type: String, required: true, unique: true },
    agencyId: { type: String, required: true, index: true },
    projectId: { type: String, required: true },
    name: { type: String, required: true },
    type: { type: String, enum: ['image', 'file', 'code', 'zip', 'folder', 'link'], required: true },
    url: { type: String, required: true },
    description: { type: String },
    size: { type: String },
    uploadedAt: { type: String, required: true },
    uploadedBy: { type: String, required: true },
    content: { type: String },
    aiEnabled: { type: Boolean, default: false }
}, { timestamps: true });

// Note: id already has index from unique constraint
AssetSchema.index({ projectId: 1 });

// Message Schema
const MessageSchema = new Schema<Message>({
    id: { type: String, required: true, unique: true },
    agencyId: { type: String, required: true, index: true },
    senderId: { type: String, required: true },
    receiverId: { type: String, required: true },
    content: { type: String, required: true },
    timestamp: { type: String, required: true },
    read: { type: Boolean, required: true, default: false },
    type: { type: String, enum: ['text', 'image'], required: true }
}, { timestamps: true });

// Note: id already has index from unique constraint
MessageSchema.index({ senderId: 1, receiverId: 1 }); // Compound for conversation queries
MessageSchema.index({ agencyId: 1, receiverId: 1 }); // For unread count queries

// Leave Request Schema
const LeaveRequestSchema = new Schema<LeaveRequest>({
    id: { type: String, required: true, unique: true },
    agencyId: { type: String, required: true, index: true },
    userId: { type: String, required: true },
    startDate: { type: String, required: true },
    endDate: { type: String, required: true },
    type: { type: String, enum: ['Casual', 'Emergency'], required: true },
    reason: { type: String, required: true },
    status: { type: String, enum: ['Pending', 'Approved', 'Rejected'], required: true },
    reviewedBy: { type: String },
    reviewedAt: { type: String }
}, { timestamps: true });

// Note: id already has index from unique constraint
LeaveRequestSchema.index({ agencyId: 1, userId: 1 });   // Compound: agency + user
LeaveRequestSchema.index({ agencyId: 1, status: 1 });   // Compound: agency + status

// Settings Schema
const SettingsSchema = new Schema<Settings>({
    agencyId: { type: String, required: true },
    systemName: { type: String, required: true, default: 'AgencyOS' },
    logo: { type: String, required: false, default: '' },
    userPermissions: { type: Schema.Types.Mixed, required: false }
}, { timestamps: true });

// One settings document per agency
SettingsSchema.index({ agencyId: 1 }, { unique: true });

// ============================================================================
// SINGULARITY CHAT & CHECKPOINT MODELS
// Extracted to mongodb-singularity-models.ts and re-exported above.
// ============================================================================

// ============================================================================
// MODEL EXPORTS
// ============================================================================

// Existing business models
export const UserModel = (mongoose.models.User as Model<User>) || mongoose.model<User>('User', UserSchema);
export const ClientModel = (mongoose.models.Client as Model<Client>) || mongoose.model<Client>('Client', ClientSchema);
export const ProjectModel = (mongoose.models.Project as Model<Project>) || mongoose.model<Project>('Project', ProjectSchema);
export const TaskModel = (mongoose.models.Task as Model<Task>) || mongoose.model<Task>('Task', TaskSchema);
export const InvoiceModel = (mongoose.models.Invoice as Model<Invoice>) || mongoose.model<Invoice>('Invoice', InvoiceSchema);
export const TransactionModel = (mongoose.models.Transaction as Model<Transaction>) || mongoose.model<Transaction>('Transaction', TransactionSchema);
export const ServiceModel = (mongoose.models.Service as Model<Service>) || mongoose.model<Service>('Service', ServiceSchema);
export const NotificationModel = (mongoose.models.Notification as Model<Notification>) || mongoose.model<Notification>('Notification', NotificationSchema);
export const ActivityModel = (mongoose.models.Activity as Model<Activity>) || mongoose.model<Activity>('Activity', ActivitySchema);
export const AssetModel = (mongoose.models.Asset as Model<Asset>) || mongoose.model<Asset>('Asset', AssetSchema);
export const MessageModel = (mongoose.models.Message as Model<Message>) || mongoose.model<Message>('Message', MessageSchema);

export const LeaveRequestModel = (mongoose.models.LeaveRequest as Model<LeaveRequest>) || mongoose.model<LeaveRequest>('LeaveRequest', LeaveRequestSchema);

export const SettingsModel = (mongoose.models.Settings as Model<Settings>) || mongoose.model<Settings>('Settings', SettingsSchema);

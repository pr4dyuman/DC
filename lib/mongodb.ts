import mongoose, { Schema, Model } from 'mongoose';
import crypto from 'crypto';
import {
    Agency, SuperAdmin,
    User, Client, Project, Task, Invoice, Transaction, Service,
    Notification, Activity, Asset, Message, LeaveRequest, Settings,
    PaymentConfig, ProjectServiceConfig, Comment, Job
} from './types';

// ============================================================================
// API KEY ENCRYPTION HELPERS (AES-256-GCM)
// Set AI_ENCRYPT_KEY=<32-byte hex> in your environment variables
// ============================================================================
const AI_ENCRYPT_KEY = process.env.AI_ENCRYPT_KEY;

export function encryptApiKey(plaintext: string): string {
    if (!AI_ENCRYPT_KEY) {
        console.warn('AI_ENCRYPT_KEY not set — API key stored unencrypted');
        return plaintext;
    }
    const key = Buffer.from(AI_ENCRYPT_KEY, 'hex');
    if (key.length !== 32) throw new Error('AI_ENCRYPT_KEY must be exactly 32 bytes (64 hex characters)');
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
    const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();
    return `enc:${iv.toString('hex')}:${tag.toString('hex')}:${encrypted.toString('hex')}`;
}

export function decryptApiKey(value: string): string {
    if (!value.startsWith('enc:')) return value; // Not encrypted — return as-is
    if (!AI_ENCRYPT_KEY) throw new Error('AI_ENCRYPT_KEY is required to decrypt API keys. Set it in your environment variables.');
    const key = Buffer.from(AI_ENCRYPT_KEY, 'hex');
    const [, ivHex, tagHex, encHex] = value.split(':');
    const iv = Buffer.from(ivHex, 'hex');
    const tag = Buffer.from(tagHex, 'hex');
    const encrypted = Buffer.from(encHex, 'hex');
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(tag);
    return decipher.update(encrypted).toString('utf8') + decipher.final('utf8');
}

// MongoDB Connection
const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
    throw new Error('Please define the MONGODB_URI environment variable in .env.local');
}

interface MongooseConnection {
    conn: typeof mongoose | null;
    promise: Promise<typeof mongoose> | null;
}

declare global {
    var mongoose: MongooseConnection | undefined;
}

const cached: MongooseConnection = global.mongoose || { conn: null, promise: null };

if (!global.mongoose) {
    global.mongoose = cached;
}

export async function connectDB() {
    if (cached.conn) {
        return cached.conn;
    }

    if (!cached.promise) {
        const opts = {
            bufferCommands: false,
            serverSelectionTimeoutMS: 10000,
            socketTimeoutMS: 45000,
        };

        console.log('🔌 Attempting to connect to MongoDB...');

        cached.promise = mongoose.connect(MONGODB_URI!, opts)
            .then((mongoose) => {
                console.log('✅ MongoDB Connected Successfully');
                return mongoose;
            })
            .catch((error) => {
                console.error('❌ MongoDB Connection Error:', error.message);
                throw error;
            });
    }

    try {
        cached.conn = await cached.promise;
    } catch (e: any) {
        cached.promise = null;
        console.error('❌ Failed to establish MongoDB connection:', e.message);
        throw e;
    }

    return cached.conn;
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
// MULTI-TENANCY SCHEMAS
// ============================================================================

// Agency Limits Schema (Embedded)
const AgencyLimitsSchema = new Schema({
    maxUsers: { type: Number, required: true },
    maxProjects: { type: Number, required: true },
    maxClients: { type: Number, required: true },
    maxStorage: { type: Number, required: true },
    maxMonthlyInvoices: { type: Number, required: true },
    aiEnabled: { type: Boolean, required: true },
    customBranding: { type: Boolean, required: true }
}, { _id: false });

// Agency Usage Schema (Embedded)
const AgencyUsageSchema = new Schema({
    users: { type: Number, default: 0 },
    projects: { type: Number, default: 0 },
    clients: { type: Number, default: 0 },
    storage: { type: Number, default: 0 },
    monthlyInvoices: { type: Number, default: 0 }
}, { _id: false });

// Agency Settings Schema (Embedded)
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
    timezone: { type: String, default: 'UTC' },
    currency: { type: String, default: 'USD' },
    dateFormat: { type: String, default: 'MM/DD/YYYY' },
    allowClientRegistration: { type: Boolean, default: false },
    requireEmailVerification: { type: Boolean, default: false },
    enableTwoFactor: { type: Boolean, default: false },
    emailNotificationsEnabled: { type: Boolean, default: true },
    emailCategories: { type: EmailCategoriesSchema, default: () => ({}) }
}, { _id: false });

// Agency Features Schema (Embedded)
const AgencyFeaturesSchema = new Schema({
    aiAssistant: { type: Boolean, default: false },
    advancedReporting: { type: Boolean, default: false },
    apiAccess: { type: Boolean, default: false },
    whiteLabel: { type: Boolean, default: false },
    customDomain: { type: Boolean, default: false },
    ssoEnabled: { type: Boolean, default: false }
}, { _id: false });

// AI Config Schema (Embedded in Agency)
const AIConfigSchema = new Schema({
    provider: { type: String, enum: ['gemini', 'openai', 'nvidia', 'github'], required: true },
    apiKey: { type: String, required: true },
    model: { type: String, required: true },
    customModelId: { type: String }
}, { _id: false });

// AI Permissions Schema (Embedded in Agency)
const AIPermissionsSchema = new Schema({
    canPayroll: { type: Boolean, default: false },
    canManageInvoices: { type: Boolean, default: false },
    canRefund: { type: Boolean, default: false },
    canCreateEmployee: { type: Boolean, default: false },
    canDelete: { type: Boolean, default: false },
}, { _id: false });

// Agency Schema
const AgencySchema = new Schema({
    id: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    slug: { type: String, required: true, unique: true },
    domain: { type: String, sparse: true },

    // Branding
    logo: { type: String },
    primaryColor: { type: String },
    secondaryColor: { type: String },

    // Status & Plan
    status: {
        type: String,
        enum: ['active', 'suspended', 'trial', 'cancelled'],
        required: true,
        default: 'trial'
    },
    plan: {
        type: String,
        enum: ['free', 'starter', 'pro', 'enterprise'],
        required: true,
        default: 'free'
    },
    planDuration: {
        type: String,
        enum: ['monthly', '3months', '6months', 'yearly', 'lifetime']
    },
    planExpiresAt: { type: String },
    trialEndsAt: { type: String },

    // Limits & Usage
    limits: { type: AgencyLimitsSchema, required: true },
    usage: { type: AgencyUsageSchema, required: true },

    // Billing
    billing: {
        subscriptionId: { type: String },
        stripeCustomerId: { type: String },
        subscriptionStatus: {
            type: String,
            enum: ['active', 'past_due', 'canceled', 'unpaid', 'trialing', 'incomplete', 'incomplete_expired', 'paused']
        },
        currentPeriodEnd: { type: String },
        cancelAtPeriodEnd: { type: Boolean },
        billingEmail: { type: String, required: true },
        billingAddress: { type: String },
        taxId: { type: String }
    },

    // Settings
    settings: { type: AgencySettingsSchema, required: true },

    // Metadata
    createdAt: { type: String, required: true },
    createdBy: { type: String, required: true },
    updatedAt: { type: String },
    lastActivityAt: { type: String },

    // Features
    features: { type: AgencyFeaturesSchema, required: true },

    // AI Configuration (Singularity)
    aiConfig: { type: AIConfigSchema },
    aiPermissions: { type: AIPermissionsSchema },
}, { timestamps: true });

// Indexes for Agency
// AgencySchema.index({ slug: 1 }); // Already unique
AgencySchema.index({ status: 1 });
AgencySchema.index({ plan: 1 });
AgencySchema.index({ createdBy: 1 });

// SuperAdmin Permissions Schema (Embedded)
const SuperAdminPermissionsSchema = new Schema({
    canCreateAgency: { type: Boolean, default: true },
    canDeleteAgency: { type: Boolean, default: true },
    canSuspendAgency: { type: Boolean, default: true },
    canViewBilling: { type: Boolean, default: true },
    canManagePlans: { type: Boolean, default: true }
}, { _id: false });

// SuperAdmin Schema
const SuperAdminSchema = new Schema({
    id: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, default: 'superadmin' },
    avatar: { type: String },
    phone: { type: String },
    timezone: { type: String },
    twoFactorEnabled: { type: Boolean, default: false },
    twoFactorSecret: { type: String },
    createdAt: { type: String, required: true },
    lastLoginAt: { type: String },
    permissions: { type: SuperAdminPermissionsSchema, required: true }
}, { timestamps: true });

// Indexes for SuperAdmin
// SuperAdminSchema.index({ email: 1 }); // Already unique

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
    assigneeId: { type: String, required: true },
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
    amount: { type: Number, required: true },
    status: { type: String, enum: ['Paid', 'Pending', 'Overdue', 'Processing'], required: true },
    date: { type: String, required: true },
    performedBy: { type: String }
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
// SINGULARITY CHAT & CHECKPOINT SCHEMAS
// ============================================================================

// Chat Message Schema (Embedded in SingularityChatSession)
const SingularityChatMessageSchema = new Schema({
    role: { type: String, enum: ['user', 'model'], required: true },
    content: { type: String, default: '' },
    thinking: { type: String },
    images: [{ type: String }],
    toolActions: [{
        name: { type: String },
        displayName: { type: String },
        status: { type: String, enum: ['calling', 'done', 'error'] },
        summary: { type: String },
        success: { type: Boolean },
        _id: false,
    }],
    timestamp: { type: String, required: true },
}, { _id: false });

// Chat Session Schema — stores entire conversation
const SingularityChatSessionSchema = new Schema({
    id: { type: String, required: true, unique: true },
    agencyId: { type: String, required: true, index: true },
    userId: { type: String, required: true, index: true },
    title: { type: String, default: 'New Chat' },
    mode: { type: String, enum: ['chat', 'agent'], required: true, default: 'chat' },
    messages: [SingularityChatMessageSchema],
    createdAt: { type: String, required: true },
    updatedAt: { type: String, required: true },
}, { timestamps: false }); // We manage our own timestamps

SingularityChatSessionSchema.index({ userId: 1, updatedAt: -1 });

// Checkpoint Action Schema (Embedded in SingularityCheckpoint)
const CheckpointActionSchema = new Schema({
    toolName: { type: String, required: true },
    actionType: { type: String, enum: ['create', 'update', 'delete'], required: true },
    entityType: { type: String, enum: ['task', 'project', 'client', 'invoice', 'transaction', 'service', 'leaveRequest', 'comment'], required: true },
    entityId: { type: String, required: true },
    beforeSnapshot: { type: Schema.Types.Mixed }, // Full entity state before change (for update/delete rollback)
    createdEntityIds: [{ type: String }], // For bulk operations — all created IDs
    executedAt: { type: String, required: true },
}, { _id: false });

// Checkpoint Schema — stores rollback data for agent actions
const SingularityCheckpointSchema = new Schema({
    id: { type: String, required: true, unique: true },
    sessionId: { type: String, required: true, index: true },
    agencyId: { type: String, required: true, index: true },
    messageIndex: { type: Number, required: true }, // Position in messages array when checkpoint was created
    actions: [CheckpointActionSchema],
    label: { type: String, default: 'Checkpoint' },
    status: { type: String, enum: ['active', 'rolled_back'], default: 'active' },
    createdAt: { type: String, required: true },
}, { timestamps: false });

SingularityCheckpointSchema.index({ sessionId: 1, createdAt: -1 });

// ============================================================================
// MODEL EXPORTS
// ============================================================================

// Multi-tenancy models
export const AgencyModel = (mongoose.models.Agency as Model<Agency>) || mongoose.model<Agency>('Agency', AgencySchema);
export const SuperAdminModel = (mongoose.models.SuperAdmin as Model<SuperAdmin>) || mongoose.model<SuperAdmin>('SuperAdmin', SuperAdminSchema);

// Existing models
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

// Singularity AI Chat models
export const SingularityChatSessionModel = (mongoose.models.SingularityChatSession as Model<any>) || mongoose.model('SingularityChatSession', SingularityChatSessionSchema);
export const SingularityCheckpointModel = (mongoose.models.SingularityCheckpoint as Model<any>) || mongoose.model('SingularityCheckpoint', SingularityCheckpointSchema);

// OTP Schema with TTL auto-expiry
const OtpSchema = new Schema({
    email: { type: String, required: true },
    otp: { type: String, required: true },
    attempts: { type: Number, default: 0 },
    purpose: { type: String, enum: ['signup', 'password-reset'], default: 'signup' },
    expiresAt: { type: Date, required: true, index: { expireAfterSeconds: 0 } },
});
OtpSchema.index({ email: 1, purpose: 1 });
export const OtpModel = (mongoose.models.Otp as Model<any>) || mongoose.model('Otp', OtpSchema);

// Rate Limit Schema with TTL auto-expiry
const RateLimitSchema = new Schema({
    key: { type: String, required: true, unique: true },
    count: { type: Number, default: 1 },
    expiresAt: { type: Date, required: true, index: { expireAfterSeconds: 0 } },
});
export const RateLimitModel = (mongoose.models.RateLimit as Model<any>) || mongoose.model('RateLimit', RateLimitSchema);

// ============================================================================
// SYSTEM SETTINGS (Global platform-wide settings for super-admin)
// ============================================================================
const SystemSettingsSchema = new Schema({
    key: { type: String, default: 'global', unique: true },
    platform: {
        name: { type: String, default: 'AgencyOS' },
        supportEmail: { type: String, default: 'support@agencyos.com' },
        defaultTimezone: { type: String, default: 'UTC' },
        defaultCurrency: { type: String, default: 'USD' },
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
export const SystemSettingsModel = (mongoose.models.SystemSettings as Model<any>) || mongoose.model('SystemSettings', SystemSettingsSchema);

// ============================================================================
// SYSTEM LOG (Real event log for super-admin — replaces fabricated logs)
// ============================================================================
const SystemLogSchema = new Schema({
    event: { type: String, required: true, index: true },
    type: { type: String, required: true, enum: ['agency', 'user', 'system', 'security', 'error'] },
    detail: { type: String, required: true },
    status: { type: String, required: true, enum: ['success', 'error', 'warning', 'info'], default: 'info' },
    agencyId: { type: String, index: true },
    userId: { type: String },
    meta: { type: Schema.Types.Mixed },
}, { timestamps: true });
SystemLogSchema.index({ createdAt: -1 });
export const SystemLogModel = (mongoose.models.SystemLog as Model<any>) || mongoose.model('SystemLog', SystemLogSchema);

// ============================================================================
// AI USAGE LOG — Tracks every AI API call for monitoring and billing
// ============================================================================
const AIUsageLogSchema = new Schema({
    agencyId: { type: String, required: true, index: true },
    userId: { type: String, required: true, index: true },
    feature: {
        type: String,
        required: true,
        enum: ['singularity-agent', 'singularity-chat', 'ai-explain', 'ai-enhance', 'ai-task-chat', 'ai-chatbot', 'ai-hour-estimate'],
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
export const AIUsageLogModel = (mongoose.models.AIUsageLog as Model<any>) || mongoose.model('AIUsageLog', AIUsageLogSchema);

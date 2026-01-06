import mongoose, { Schema, Model, Document } from 'mongoose';
import {
    User, Client, Project, Task, Invoice, Transaction, Service,
    Notification, Activity, Asset, Message, LeaveRequest, Settings,
    PaymentConfig, ProjectServiceConfig, Comment, Job
} from './types';

// MongoDB Connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://maharshiankit05_db_user:pVqBK5hxBhNylA6P@cluster0.7i5lvqh.mongodb.net/AgencyOS?retryWrites=true&w=majority';

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

let cached: MongooseConnection = global.mongoose || { conn: null, promise: null };

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
        console.log('📍 URI:', MONGODB_URI.replace(/\/\/([^:]+):([^@]+)@/, '//$1:****@')); // Hide password in logs

        cached.promise = mongoose.connect(MONGODB_URI, opts)
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

// User Schema
const UserSchema = new Schema<User>({
    id: { type: String, required: true, unique: true },
    username: { type: String, sparse: true },
    name: { type: String, required: true },
    email: { type: String, required: true },
    role: { type: String, enum: ['admin', 'specialist', 'manager', 'employee', 'client'], required: true },
    jobTitle: { type: String },
    salary: { type: Number },
    avatar: { type: String },
    password: { type: String },
    geminiApiKey: { type: String },
    lastActiveAt: { type: String },
    employmentType: { type: String, enum: ['Salary', 'Project Based'] },
    contactNumber: { type: String },
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
UserSchema.index({ email: 1 });

// Client Schema
const ClientSchema = new Schema<Client>({
    id: { type: String, required: true, unique: true },
    username: { type: String, sparse: true },
    name: { type: String, required: true },
    email: { type: String, required: true },
    role: { type: String, default: 'client' },
    companyName: { type: String, required: true },
    logo: { type: String },
    phone: { type: String },
    address: { type: String },
    password: { type: String },
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
ClientSchema.index({ email: 1 });
ClientSchema.index({ archived: 1 });

// Project Schema
const ProjectSchema = new Schema<Project>({
    id: { type: String, required: true, unique: true },
    slug: { type: String },
    name: { type: String, required: true },
    client: { type: String },
    clientId: { type: String },
    services: [{ type: String }],
    serviceConfigs: [ProjectServiceConfigSchema],
    status: { type: String, enum: ['Active', 'Completed', 'On Hold'], required: true },
    budget: { type: Number, required: true },
    dueDate: { type: String, required: true },
    createdAt: { type: String },
    aiEnabled: { type: Boolean, default: false }
}, { timestamps: true });

// Note: id already has index from unique constraint
ProjectSchema.index({ clientId: 1 });
ProjectSchema.index({ status: 1 });
ProjectSchema.index({ slug: 1 });

// Task Schema
const TaskSchema = new Schema<Task>({
    id: { type: String, required: true, unique: true },
    projectId: { type: String, required: true },
    title: { type: String, required: true },
    description: { type: String },
    status: { type: String, enum: ['Todo', 'In Progress', 'Review', 'Done'], required: true },
    priority: { type: String, enum: ['Low', 'Medium', 'High'] },
    assigneeId: { type: String, required: true },
    dueDate: { type: String, required: true },
    startDate: { type: String },
    category: { type: String },
    createdAt: { type: String },
    createdBy: { type: String },
    comments: [CommentSchema]
}, { timestamps: true });

// Note: id already has index from unique constraint
TaskSchema.index({ projectId: 1 });
TaskSchema.index({ assigneeId: 1 });
TaskSchema.index({ status: 1 });
TaskSchema.index({ createdBy: 1 });

// Invoice Schema
const InvoiceSchema = new Schema<Invoice>({
    id: { type: String, required: true, unique: true },
    projectId: { type: String, required: true },
    amount: { type: Number, required: true },
    status: { type: String, enum: ['Paid', 'Pending', 'Overdue', 'Processing'], required: true },
    date: { type: String, required: true }
}, { timestamps: true });

// Note: id already has index from unique constraint
InvoiceSchema.index({ projectId: 1 });
InvoiceSchema.index({ status: 1 });

// Transaction Schema
const TransactionSchema = new Schema<Transaction>({
    id: { type: String, required: true, unique: true },
    date: { type: String, required: true },
    amount: { type: Number, required: true },
    type: { type: String, enum: ['income', 'expense'], required: true },
    category: { type: String, enum: ['Project', 'Salary', 'Software', 'Marketing', 'Office', 'Hosting', 'Domain', 'Equipment', 'Internal Transfer', 'Investor', 'Refund', 'Other'], required: true },
    description: { type: String, required: true },
    status: { type: String, enum: ['completed', 'pending'], required: true },
    projectId: { type: String },
    userId: { type: String }
}, { timestamps: true });

// Note: id already has index from unique constraint
TransactionSchema.index({ projectId: 1 });
TransactionSchema.index({ userId: 1 });
TransactionSchema.index({ type: 1 });
TransactionSchema.index({ category: 1 });
TransactionSchema.index({ date: 1 });

// Service Schema
const ServiceSchema = new Schema<Service>({
    id: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    jobs: [JobSchema]
}, { timestamps: true });

// Note: id already has index from unique constraint

// Notification Schema
const NotificationSchema = new Schema<Notification>({
    id: { type: String, required: true, unique: true },
    userId: { type: String, required: true },
    message: { type: String, required: true },
    read: { type: Boolean, required: true, default: false },
    timestamp: { type: String, required: true },
    link: { type: String }
}, { timestamps: true });

// Note: id already has index from unique constraint
NotificationSchema.index({ userId: 1 });
NotificationSchema.index({ read: 1 });

// Activity Schema
const ActivitySchema = new Schema<Activity>({
    id: { type: String, required: true, unique: true },
    user: { type: String, required: true },
    action: { type: String, required: true },
    target: { type: String, required: true },
    timestamp: { type: String, required: true }
}, { timestamps: true });

// Note: id already has index from unique constraint
ActivitySchema.index({ timestamp: -1 });

// Asset Schema
const AssetSchema = new Schema<Asset>({
    id: { type: String, required: true, unique: true },
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
    senderId: { type: String, required: true },
    receiverId: { type: String, required: true },
    content: { type: String, required: true },
    timestamp: { type: String, required: true },
    read: { type: Boolean, required: true, default: false },
    type: { type: String, enum: ['text', 'image'], required: true }
}, { timestamps: true });

// Note: id already has index from unique constraint
MessageSchema.index({ senderId: 1 });
MessageSchema.index({ receiverId: 1 });

// Leave Request Schema
const LeaveRequestSchema = new Schema<LeaveRequest>({
    id: { type: String, required: true, unique: true },
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
LeaveRequestSchema.index({ userId: 1 });
LeaveRequestSchema.index({ status: 1 });

// Settings Schema
const SettingsSchema = new Schema<Settings>({
    systemName: { type: String, required: true, default: 'AgencyOS' },
    logo: { type: String, required: false, default: '' },
    userPermissions: { type: Schema.Types.Mixed, required: false }
}, { timestamps: true });

// ============================================================================
// MODELS
// ============================================================================

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

// Force recreate LeaveRequest model to pick up schema changes
if (mongoose.models.LeaveRequest) {
    delete mongoose.models.LeaveRequest;
}
export const LeaveRequestModel = mongoose.model<LeaveRequest>('LeaveRequest', LeaveRequestSchema);

// Force recreate Settings model to pick up schema changes
if (mongoose.models.Settings) {
    delete mongoose.models.Settings;
}
export const SettingsModel = mongoose.model<Settings>('Settings', SettingsSchema);

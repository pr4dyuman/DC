// ============================================================================
// MULTI-TENANCY TYPES
// ============================================================================

export type AgencyPlan = 'free' | 'starter' | 'pro' | 'enterprise';
export type AgencyStatus = 'active' | 'suspended' | 'trial' | 'cancelled';

export type AgencyLimits = {
    maxUsers: number;
    maxProjects: number;
    maxClients: number;
    maxStorage: number;        // in MB
    maxMonthlyInvoices: number;
    aiEnabled: boolean;        // Synced with Schema
    customBranding: boolean;   // Synced with Schema
};

export type AgencyFeatures = {
    aiAssistant: boolean;
    advancedReporting: boolean;
    apiAccess: boolean;
    whiteLabel: boolean;
    customDomain: boolean;
    ssoEnabled: boolean;
};

// AI Configuration Types
export type AIProvider = 'gemini' | 'openai' | 'nvidia' | 'github';

export type AIConfig = {
    provider: AIProvider;
    apiKey: string;
    model: string;
    customModelId?: string;
};

// AI Permission Flags — controls what Singularity is allowed to do
export type AIPermissions = {
    canPayroll: boolean;          // pay_employee, bulk_pay_employees
    canManageInvoices: boolean;   // approve/reject invoice payments, update status, bulk create
    canRefund: boolean;           // create_refund
    canCreateEmployee: boolean;   // create_employee (onboarding)
    canDelete: boolean;           // delete_project, delete_client, delete_transaction, delete_service
};

export const DEFAULT_AI_PERMISSIONS: AIPermissions = {
    canPayroll: false,
    canManageInvoices: false,
    canRefund: false,
    canCreateEmployee: false,
    canDelete: false,
};

export type AgencyUsage = {
    users: number;
    projects: number;
    clients: number;
    storage: number;           // in MB
    monthlyInvoices: number;
};

export type Agency = {
    id: string;
    name: string;              // "Digital Corvids", "Marketing Pro"
    slug: string;              // "digital-corvids", "marketing-pro"
    domain?: string;           // Optional custom domain

    // Branding
    logo?: string;
    primaryColor?: string;
    secondaryColor?: string;

    // Status & Plan
    status: AgencyStatus;
    plan: AgencyPlan;
    trialEndsAt?: string;      // ISO date
    planExpiresAt?: string;    // ISO date — when paid plan expires (null = lifetime)
    planDuration?: 'monthly' | '3months' | '6months' | 'yearly' | 'lifetime';

    // Limits & Usage
    limits: AgencyLimits;
    usage: AgencyUsage;

    // Billing
    billing: {
        subscriptionId?: string;
        stripeCustomerId?: string;
        subscriptionStatus?: 'active' | 'past_due' | 'canceled' | 'unpaid' | 'trialing' | 'incomplete' | 'incomplete_expired' | 'paused';
        currentPeriodEnd?: string;
        cancelAtPeriodEnd?: boolean;
        billingEmail: string;
        billingAddress?: string;
        taxId?: string;
    };

    // Settings
    settings: {
        systemName: string;
        timezone: string;
        currency: string;
        dateFormat: string;
        allowClientRegistration: boolean;
        requireEmailVerification: boolean;
        enableTwoFactor: boolean;
        emailNotificationsEnabled: boolean;
        emailCategories?: {
            accountCreation?: boolean;
            invoicePayment?: boolean;
            salaryPayroll?: boolean;
            refund?: boolean;
            projectUpdates?: boolean;
            taskUpdates?: boolean;
            leaveManagement?: boolean;
            documentApproval?: boolean;
            taskEmailPriorities?: {
                high?: boolean;
                medium?: boolean;
                low?: boolean;
            };
            taskEmailEvents?: {
                taskCreated?: { enabled?: boolean; notifyAssignee?: boolean; notifyClient?: boolean };
                taskInProgress?: { enabled?: boolean; notifyAssignee?: boolean; notifyClient?: boolean };
                taskDone?: { enabled?: boolean; notifyAssignee?: boolean; notifyClient?: boolean };
            };
        };
    };

    // Metadata
    createdAt: string;
    createdBy: string;         // Super admin ID
    updatedAt?: string;
    lastActivityAt?: string;

    // AI Configuration (Singularity)
    aiConfig?: AIConfig;
    aiPermissions?: AIPermissions;

    // Features
    features: AgencyFeatures;
};

export type SuperAdmin = {
    id: string;
    name: string;
    email: string;
    password: string;
    role: 'superadmin';
    avatar?: string;
    phone?: string;
    timezone?: string;
    twoFactorEnabled?: boolean;
    twoFactorSecret?: string;
    createdAt: string;
    lastLoginAt?: string;
    permissions: {
        canCreateAgency: boolean;
        canDeleteAgency: boolean;
        canSuspendAgency: boolean;
        canViewBilling: boolean;
        canManagePlans: boolean;
    };
};

// Plan configurations
export const AGENCY_PLANS: Record<AgencyPlan, { limits: AgencyLimits; features: AgencyFeatures }> = {
    free: {
        limits: {
            maxUsers: 3,
            maxProjects: 5,
            maxClients: 10,
            maxStorage: 100,           // 100 MB
            maxMonthlyInvoices: 20,
            aiEnabled: false,
            customBranding: false,
        },
        features: {
            aiAssistant: false,
            advancedReporting: false,
            apiAccess: false,
            whiteLabel: false,
            customDomain: false,
            ssoEnabled: false,
        }
    },
    starter: {
        limits: {
            maxUsers: 10,
            maxProjects: 50,
            maxClients: 100,
            maxStorage: 1024,          // 1 GB
            maxMonthlyInvoices: 100,
            aiEnabled: true,
            customBranding: false,
        },
        features: {
            aiAssistant: true,
            advancedReporting: true,
            apiAccess: false,
            whiteLabel: false,
            customDomain: false,
            ssoEnabled: false,
        }
    },
    pro: {
        limits: {
            maxUsers: 50,
            maxProjects: 500,
            maxClients: 1000,
            maxStorage: 10240,         // 10 GB
            maxMonthlyInvoices: 1000,
            aiEnabled: true,
            customBranding: true,
        },
        features: {
            aiAssistant: true,
            advancedReporting: true,
            apiAccess: true,
            whiteLabel: true,
            customDomain: false,
            ssoEnabled: false,
        }
    },
    enterprise: {
        limits: {
            maxUsers: -1,              // Unlimited
            maxProjects: -1,
            maxClients: -1,
            maxStorage: -1,
            maxMonthlyInvoices: -1,
            aiEnabled: true,
            customBranding: true,
        },
        features: {
            aiAssistant: true,
            advancedReporting: true,
            apiAccess: true,
            whiteLabel: true,
            customDomain: true,
            ssoEnabled: true,
        }
    },
};

// ============================================================================
// EXISTING TYPES (Updated with agencyId)
// ============================================================================

export type User = {
    id: string;
    agencyId: string;          // NEW: Links to agency
    username?: string; // New: Unique handle for URLs
    name: string;
    email: string;
    role: 'admin' | 'manager' | 'employee' | 'client';
    jobTitle?: string;
    salary?: number;
    avatar?: string;
    password?: string;
    timezone?: string; // IANA timezone (e.g. 'Asia/Kolkata')
    lastActiveAt?: string; // ISO Date string for presence
    employmentType?: 'Salary' | 'Project Based' | 'Freelancer';
    gender?: 'Male' | 'Female' | 'Other';
    contactNumber?: string;
    adharCardImage?: string;
    panCardImage?: string;
    pendingAdharCardImage?: string;
    pendingPanCardImage?: string;
    contracts?: string[];
    pendingContracts?: string[];
    otherDocuments?: string[];
    pendingOtherDocuments?: string[];
    // Archive fields - preserve financial/task data when employee leaves
    archived?: boolean;
    archivedAt?: string;
    createdAt?: string;
    updatedAt?: string;
};
export type Client = {
    id: string;
    agencyId: string;          // NEW: Links to agency
    username?: string;
    name: string;
    email: string;
    role?: 'client';
    companyName: string;
    logo?: string;
    phone?: string;
    address?: string;
    password?: string;
    timezone?: string; // IANA timezone (e.g. 'Asia/Kolkata')
    lastActiveAt?: string;
    // Archive fields - preserve financial data when client is "deleted"
    archived?: boolean;
    archivedAt?: string;
    adharCardImage?: string;
    panCardImage?: string;
    pendingAdharCardImage?: string;
    pendingPanCardImage?: string;
    contracts?: string[];
    pendingContracts?: string[];
    otherDocuments?: string[];
    pendingOtherDocuments?: string[];
};
export type PaymentType = 'installment' | 'monthly';

export type PaymentConfig = {
    type: PaymentType;
    // For Installment
    installments?: number;
    installmentAmount?: number; // total / installments
    firstPaymentDate?: string;
    installmentDates?: string[]; // New: Specific dates for each installment

    // For Monthly
    monthlyAmount?: number;
    billingStartDate?: string;

    // Common
    paymentDetailsLater: boolean;
};

export type ProjectServiceConfig = {
    serviceId: string; // matches Category.name or Category.id
    name: string;
    paymentConfig?: PaymentConfig;
};

export type Project = { id: string; agencyId: string; slug?: string; name: string; client?: string; clientId?: string; services: string[]; serviceConfigs?: ProjectServiceConfig[]; status: 'Active' | 'Completed' | 'On Hold' | 'Cancelled'; budget: number; dueDate: string; createdAt?: string; aiEnabled?: boolean };
export type Invoice = { id: string; agencyId: string; projectId: string; amount: number; status: 'Paid' | 'Pending' | 'Overdue' | 'Processing'; date: string };
export type Comment = { id: string; userId: string; text: string; timestamp: string };
export type Task = { id: string; agencyId: string; projectId: string; title: string; description?: string; status: 'Todo' | 'In Progress' | 'Review' | 'Done'; priority?: 'Low' | 'Medium' | 'High'; assigneeId: string; dueDate?: string; startDate?: string; category?: string; createdAt?: string; createdBy?: string; comments?: Comment[]; estimatedHours?: number };
export type Notification = { id: string; agencyId: string; userId: string; message: string; read: boolean; timestamp: string; link?: string };
export type Activity = { id: string; agencyId: string; user: string; userId?: string; action: string; target: string; timestamp: string; entityId?: string; entityType?: 'task' | 'project' | 'invoice' | 'client' | 'user' };

export type AssetType = 'image' | 'file' | 'code' | 'zip' | 'folder' | 'link';
export type Asset = {
    id: string;
    agencyId: string;          // NEW: Links to agency
    projectId: string;
    name: string;
    type: AssetType;
    url: string;
    description?: string;
    size?: string; // e.g. "2MB", "4KB"
    uploadedAt: string;
    uploadedBy: string;
    content?: string; // For text/code files
    aiEnabled?: boolean;
};

export type LeaveType = 'Casual' | 'Emergency';
export type LeaveStatus = 'Pending' | 'Approved' | 'Rejected';

export type LeaveRequest = {
    id: string;
    agencyId: string;          // NEW: Links to agency
    userId: string;
    startDate: string; // ISO Date
    endDate: string;   // ISO Date
    type: LeaveType;
    reason: string;
    status: LeaveStatus;
    createdAt: string;
    reviewedBy?: string; // Admin ID
    reviewedAt?: string;
};

export type Job = { title: string; count: number; employees?: string[] };

export type Message = {
    id: string;
    agencyId: string;          // NEW: Links to agency
    senderId: string;
    receiverId: string; // Can be user ID, but for now assuming direct messages. Group chat would need 'groupId'
    content: string;
    timestamp: string;
    read: boolean;
    type: 'text' | 'image';
};

export type Service = { id: string; agencyId: string; name: string; projectId?: string; employees?: string[]; jobs?: Job[] };

export type TransactionType = 'income' | 'expense';
export type TransactionCategory = 'Project' | 'Salary' | 'Freelancer' | 'Tax' | 'Reimbursement' | 'Retainer' | 'Internal Transfer' | 'Investor' | 'Refund' | 'Other';
export const TRANSACTION_CATEGORIES: TransactionCategory[] = ['Project', 'Salary', 'Freelancer', 'Tax', 'Reimbursement', 'Retainer', 'Internal Transfer', 'Investor', 'Refund', 'Other'];

export type Transaction = {
    id: string;
    agencyId: string;          // NEW: Links to agency
    date: string;
    amount: number;
    type: TransactionType;
    category: TransactionCategory;
    description: string;
    status: 'completed' | 'pending';
    projectId?: string;
    userId?: string; // Optional: For salary or reimbursements
    taxType?: 'GST' | 'TDS' | 'Income Tax' | 'Professional Tax' | 'Other';
    expenseType?: 'Travel' | 'Meals' | 'Client Meeting' | 'Equipment' | 'Other';
    invoiceId?: string; // Links back to the invoice that generated this transaction
    performedBy?: string; // User ID of who performed the transaction (audit trail)
};

export type UserPermissions = {
    canCreateProject: boolean;
    canManageTasks: boolean;
    canUseAI: boolean;
    // Compatibility with old definition if needed, or strictly use new one
    canMarkDone?: boolean;
    deleteAccess?: 'none' | 'own' | 'any';
};

export const DEFAULT_USER_PERMISSIONS: UserPermissions = {
    canCreateProject: false,
    canManageTasks: true,
    canUseAI: false,
    canMarkDone: true,
    deleteAccess: 'own'
};

export type Settings = {
    agencyId?: string;
    systemName: string;
    logo: string;
    userPermissions?: Record<string, UserPermissions>;
};

export type DB = {
    agencies: Agency[];
    superAdmins: SuperAdmin[];
    users: User[];
    clients: Client[];
    projects: Project[];
    invoices: Invoice[];
    tasks: Task[];
    notifications: Notification[];
    activities: Activity[];
    services: Service[];
    transactions: Transaction[];
    assets: Asset[];
    messages: Message[];
    leaveRequests: LeaveRequest[];
    settings: Settings;
};

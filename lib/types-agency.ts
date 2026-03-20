export type AgencyPlan = "free" | "starter" | "pro" | "enterprise";
export type AgencyStatus = "active" | "suspended" | "trial" | "cancelled";

export type AgencyLimits = {
    maxUsers: number;
    maxProjects: number;
    maxClients: number;
    maxStorage: number;
    maxMonthlyInvoices: number;
    aiEnabled: boolean;
    customBranding: boolean;
};

export type AgencyFeatures = {
    aiAssistant: boolean;
    advancedReporting: boolean;
    apiAccess: boolean;
    whiteLabel: boolean;
    customDomain: boolean;
    ssoEnabled: boolean;
};

export type AIProvider = "gemini" | "openai" | "nvidia" | "github" | "groq";

export type AIFeatureConfig = {
    provider: AIProvider;
    apiKey: string;
    model: string;
    customModelId?: string;
};

export type AIConfig = {
    provider: AIProvider;
    apiKey: string;
    model: string;          // default / fallback model
    customModelId?: string; // used when model === "custom"
    // Per-feature full configuration overrides
    chatConfig?: AIFeatureConfig;
    agentConfig?: AIFeatureConfig;
    taskExplainConfig?: AIFeatureConfig;
    hourEstimateConfig?: AIFeatureConfig;
    taskChatbotConfig?: AIFeatureConfig;
};

export type AIPermissions = {
    canPayroll: boolean;
    canManageInvoices: boolean;
    canRefund: boolean;
    canCreateEmployee: boolean;
    canDelete: boolean;
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
    storage: number;
    monthlyInvoices: number;
};

export type Agency = {
    id: string;
    name: string;
    slug: string;
    domain?: string;
    logo?: string;
    primaryColor?: string;
    secondaryColor?: string;
    status: AgencyStatus;
    plan: AgencyPlan;
    trialEndsAt?: string;
    planExpiresAt?: string;
    planDuration?: "monthly" | "3months" | "6months" | "yearly" | "lifetime";
    limits: AgencyLimits;
    usage: AgencyUsage;
    billing: {
        subscriptionId?: string;
        stripeCustomerId?: string;
        subscriptionStatus?: "active" | "past_due" | "canceled" | "unpaid" | "trialing" | "incomplete" | "incomplete_expired" | "paused";
        currentPeriodEnd?: string;
        cancelAtPeriodEnd?: boolean;
        billingEmail: string;
        billingAddress?: string;
        taxId?: string;
    };
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
    createdAt: string;
    createdBy: string;
    updatedAt?: string;
    lastActivityAt?: string;
    aiConfig?: AIConfig;
    aiPermissions?: AIPermissions;
    features: AgencyFeatures;
};

export type SuperAdmin = {
    id: string;
    name: string;
    email: string;
    password: string;
    role: "superadmin";
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

export const AGENCY_PLANS: Record<AgencyPlan, { limits: AgencyLimits; features: AgencyFeatures }> = {
    free: {
        limits: {
            maxUsers: 3,
            maxProjects: 5,
            maxClients: 10,
            maxStorage: 100,
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
        },
    },
    starter: {
        limits: {
            maxUsers: 10,
            maxProjects: 50,
            maxClients: 100,
            maxStorage: 1024,
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
        },
    },
    pro: {
        limits: {
            maxUsers: 50,
            maxProjects: 500,
            maxClients: 1000,
            maxStorage: 10240,
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
        },
    },
    enterprise: {
        limits: {
            maxUsers: -1,
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
        },
    },
};

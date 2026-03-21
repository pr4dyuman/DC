import type { Agency, SuperAdmin } from "@/lib/types-agency";

export type User = {
    id: string;
    agencyId: string;
    username?: string;
    name: string;
    email: string;
    role: "admin" | "manager" | "employee" | "client";
    jobTitle?: string;
    salary?: number;
    avatar?: string;
    password?: string;
    timezone?: string;
    lastActiveAt?: string;
    employmentType?: "Salary" | "Project Based" | "Freelancer";
    gender?: "Male" | "Female" | "Other";
    contactNumber?: string;
    adharCardImage?: string;
    panCardImage?: string;
    pendingAdharCardImage?: string;
    pendingPanCardImage?: string;
    contracts?: string[];
    pendingContracts?: string[];
    otherDocuments?: string[];
    pendingOtherDocuments?: string[];
    archived?: boolean;
    archivedAt?: string;
    createdAt?: string;
    updatedAt?: string;
};

export type Client = {
    id: string;
    agencyId: string;
    username?: string;
    name: string;
    email: string;
    role?: "client";
    companyName: string;
    logo?: string;
    phone?: string;
    address?: string;
    password?: string;
    timezone?: string;
    lastActiveAt?: string;
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

export type PaymentType = "installment" | "monthly";

export type PaymentConfig = {
    type: PaymentType;
    installments?: number;
    installmentAmount?: number;
    firstPaymentDate?: string;
    installmentDates?: string[];
    monthlyAmount?: number;
    billingStartDate?: string;
    paymentDetailsLater: boolean;
};

export type ProjectServiceConfig = {
    serviceId: string;
    name: string;
    paymentConfig?: PaymentConfig;
};

export type Project = {
    id: string;
    agencyId: string;
    slug?: string;
    name: string;
    client?: string;
    clientId?: string;
    clientIds?: string[];
    services: string[];
    serviceConfigs?: ProjectServiceConfig[];
    status: "Active" | "Completed" | "On Hold" | "Cancelled";
    clientArchiveHold?: boolean;
    clientArchiveHoldAt?: string;
    budget: number;
    dueDate: string;
    createdAt?: string;
    aiEnabled?: boolean;
};

export type Invoice = {
    id: string;
    agencyId: string;
    projectId: string;
    serviceId?: string;
    amount: number;
    status: "Paid" | "Pending" | "Overdue" | "Processing";
    date: string;
    performedBy?: string;
    paymentNote?: string;
    paymentDate?: string;
};

export type Comment = { id: string; userId: string; text: string; timestamp: string };

export type Task = {
    id: string;
    agencyId: string;
    projectId: string;
    title: string;
    description?: string;
    status: "Todo" | "In Progress" | "Review" | "Done";
    priority?: "Low" | "Medium" | "High";
    assigneeId: string;
    dueDate?: string;
    startDate?: string;
    category?: string;
    createdAt?: string;
    updatedAt?: string;
    createdBy?: string;
    comments?: Comment[];
    estimatedHours?: number;
};

export type Notification = {
    id: string;
    agencyId: string;
    userId: string;
    message: string;
    read: boolean;
    timestamp: string;
    link?: string;
};

export type Activity = {
    id: string;
    agencyId: string;
    user: string;
    userId?: string;
    action: string;
    target: string;
    timestamp: string;
    entityId?: string;
    entityType?: "task" | "project" | "invoice" | "client" | "user";
};

export type AssetType = "image" | "file" | "code" | "zip" | "folder" | "link";

export type Asset = {
    id: string;
    agencyId: string;
    projectId: string;
    name: string;
    type: AssetType;
    url: string;
    description?: string;
    size?: string;
    uploadedAt: string;
    uploadedBy: string;
    content?: string;
    aiEnabled?: boolean;
};

export type LeaveType = "Casual" | "Emergency";
export type LeaveStatus = "Pending" | "Approved" | "Rejected";

export type LeaveRequest = {
    id: string;
    agencyId: string;
    userId: string;
    startDate: string;
    endDate: string;
    type: LeaveType;
    reason: string;
    status: LeaveStatus;
    createdAt: string;
    reviewedBy?: string;
    reviewedAt?: string;
};

export type Job = { title: string; count: number; employees?: string[] };

export type Message = {
    id: string;
    agencyId: string;
    senderId: string;
    receiverId: string;
    content: string;
    timestamp: string;
    read: boolean;
    type: "text" | "image";
};

export type Service = {
    id: string;
    agencyId: string;
    name: string;
    projectId?: string;
    employees?: string[];
    jobs?: Job[];
};

export type TransactionType = "income" | "expense";
export type TransactionCategory = "Project" | "Salary" | "Freelancer" | "Tax" | "Reimbursement" | "Retainer" | "Internal Transfer" | "Investor" | "Refund" | "Other";

export const TRANSACTION_CATEGORIES: TransactionCategory[] = [
    "Project",
    "Salary",
    "Freelancer",
    "Tax",
    "Reimbursement",
    "Retainer",
    "Internal Transfer",
    "Investor",
    "Refund",
    "Other",
];

export type Transaction = {
    id: string;
    agencyId: string;
    date: string;
    amount: number;
    type: TransactionType;
    category: TransactionCategory;
    description: string;
    status: "completed" | "pending";
    projectId?: string;
    userId?: string;
    taxType?: "GST" | "TDS" | "Income Tax" | "Professional Tax" | "Other";
    expenseType?: "Travel" | "Meals" | "Client Meeting" | "Equipment" | "Other";
    invoiceId?: string;
    performedBy?: string;
};

export type UserPermissions = {
    canCreateProject: boolean;
    canManageTasks: boolean;
    canUseAI: boolean;
    canMarkDone?: boolean;
    deleteAccess?: "none" | "own" | "any";
};

export const DEFAULT_USER_PERMISSIONS: UserPermissions = {
    canCreateProject: false,
    canManageTasks: false,
    canUseAI: false,
    canMarkDone: false,
    deleteAccess: "none",
};

export function getDefaultUserPermissionsForRole(role?: string): UserPermissions {
    const normalizedRole = role?.toLowerCase();

    if (normalizedRole === "admin" || normalizedRole === "manager" || normalizedRole === "superadmin") {
        return {
            canCreateProject: true,
            canManageTasks: true,
            canUseAI: true,
            canMarkDone: true,
            deleteAccess: "any",
        };
    }

    if (normalizedRole === "employee") {
        return {
            ...DEFAULT_USER_PERMISSIONS,
            canMarkDone: true,
        };
    }

    return { ...DEFAULT_USER_PERMISSIONS };
}

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

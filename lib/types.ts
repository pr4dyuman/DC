export type User = {
    id: string;
    username?: string; // New: Unique handle for URLs
    name: string;
    email: string;
    role: 'admin' | 'specialist' | 'manager' | 'employee' | 'client';
    jobTitle?: string;
    salary?: number;
    avatar?: string;
    password?: string;
    geminiApiKey?: string;
    lastActiveAt?: string; // ISO Date string for presence
    employmentType?: 'Salary' | 'Project Based';
    contactNumber?: string;
    adharCardImage?: string;
    panCardImage?: string;
    pendingAdharCardImage?: string;
    pendingPanCardImage?: string;
    contracts?: string[];
    pendingContracts?: string[];
    otherDocuments?: string[];
    pendingOtherDocuments?: string[];
};
export type Client = {
    id: string;
    username?: string; // New: Unique handle for URLs
    name: string;
    email: string;
    role?: 'client';
    companyName: string;
    logo?: string;
    phone?: string;
    address?: string;
    password?: string;
    lastActiveAt?: string;
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

export type Project = { id: string; slug?: string; name: string; client?: string; clientId?: string; services: string[]; serviceConfigs?: ProjectServiceConfig[]; status: 'Active' | 'Completed' | 'On Hold'; budget: number; dueDate: string; createdAt?: string; aiEnabled?: boolean };
export type Invoice = { id: string; projectId: string; amount: number; status: 'Paid' | 'Pending' | 'Overdue' | 'Processing'; date: string };
export type Comment = { id: string; userId: string; text: string; timestamp: string };
export type Task = { id: string; projectId: string; title: string; description?: string; status: 'Todo' | 'In Progress' | 'Review' | 'Done'; priority?: 'Low' | 'Medium' | 'High'; assigneeId: string; dueDate: string; startDate?: string; category?: string; createdAt?: string; createdBy?: string; comments?: Comment[] };
export type Notification = { id: string; userId: string; message: string; read: boolean; timestamp: string; link?: string };
export type Activity = { id: string; user: string; action: string; target: string; timestamp: string };

export type AssetType = 'image' | 'file' | 'code' | 'zip' | 'folder' | 'link';
export type Asset = {
    id: string;
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

export type Job = { title: string; count: number };

export type Message = {
    id: string;
    senderId: string;
    receiverId: string; // Can be user ID, but for now assuming direct messages. Group chat would need 'groupId'
    content: string;
    timestamp: string;
    read: boolean;
    type: 'text' | 'image';
};

export type Service = { id: string; name: string; jobs: Job[] };

export type TransactionType = 'income' | 'expense';
export type TransactionCategory = 'Project' | 'Salary' | 'Software' | 'Marketing' | 'Office' | 'Hosting' | 'Domain' | 'Equipment' | 'Internal Transfer' | 'Investor' | 'Other';
export const TRANSACTION_CATEGORIES: TransactionCategory[] = ['Project', 'Salary', 'Software', 'Marketing', 'Office', 'Hosting', 'Domain', 'Equipment', 'Internal Transfer', 'Investor', 'Other'];

export type Transaction = {
    id: string;
    date: string;
    amount: number;
    type: TransactionType;
    category: TransactionCategory;
    description: string;
    status: 'completed' | 'pending';
    projectId?: string;
    userId?: string; // Optional: For salary or reimbursements
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
    systemName: string;
    logo: string;
    userPermissions?: Record<string, UserPermissions>;
};

export type DB = {
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

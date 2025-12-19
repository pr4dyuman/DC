import fs from 'fs/promises';
import path from 'path';

const DB_PATH = path.join(process.cwd(), 'data', 'db.json');

export type User = {
    id: string;
    name: string;
    email: string;
    role: 'admin' | 'specialist' | 'manager' | 'employee';
    jobTitle?: string;
    salary?: number;
    avatar?: string;
    password?: string;
    geminiApiKey?: string;
    lastActiveAt?: string; // ISO Date string for presence
};
export type Client = {
    id: string;
    name: string;
    email: string;
    companyName: string;
    logo?: string;
    phone?: string;
    address?: string;
    password?: string;
    lastActiveAt?: string;
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

export type Project = { id: string; name: string; client?: string; clientId?: string; services: string[]; serviceConfigs?: ProjectServiceConfig[]; status: 'Active' | 'Completed' | 'On Hold'; budget: number; dueDate: string; createdAt?: string; aiEnabled?: boolean };
export type Invoice = { id: string; projectId: string; amount: number; status: 'Paid' | 'Pending' | 'Overdue'; date: string };
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

export type Message = {
    id: string;
    senderId: string;
    receiverId: string; // Can be user ID, but for now assuming direct messages. Group chat would need 'groupId'
    content: string;
    timestamp: string;
    read: boolean;
    type: 'text' | 'image';
};

export type TransactionType = 'income' | 'expense';
export type TransactionCategory = 'Project' | 'Salary' | 'Software' | 'Marketing' | 'Office' | 'Hosting' | 'Domain' | 'Equipment' | 'Internal Transfer' | 'Investor' | 'Other';


export type Transaction = {
    id: string;
    date: string;
    amount: number;
    type: TransactionType;
    category: TransactionCategory;
    description: string;
    status: 'completed' | 'pending';
    projectId?: string;
    relatedInvoiceId?: string;
    userId?: string; // Linked user (e.g. for Salary)
};

export type Job = { title: string; count: number };
export type Service = { id: string; name: string; jobs: Job[] };
export type Settings = { systemName: string; logo: string };
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
    settings: Settings;
};

// Simulate network delay for "Realism"
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function readDb(): Promise<DB> {
    // Ensure data dir exists
    try {
        const data = await fs.readFile(DB_PATH, 'utf-8');
        return JSON.parse(data);
    } catch (error) {
        // If file doesn't exist, return empty structure or throw
        console.error("DB Read Error", error);
        throw new Error("Database not found");
    }
}

async function writeDb(data: DB): Promise<void> {
    await fs.writeFile(DB_PATH, JSON.stringify(data, null, 2));
}

export const db = {
    get: async () => {
        // await delay(300); // Delay removed for performance
        const data = await readDb();

        // Data Migration Helpers
        if (!data.services) {
            // Migration check: if categories exist, migrate them to services
            if ((data as any).categories) {
                data.services = (data as any).categories.map((c: any) => ({
                    id: c.id,
                    name: c.name,
                    jobs: []
                }));
                delete (data as any).categories; // Cleanup old key
            } else {
                data.services = [
                    { id: "c1", name: "Web Dev", jobs: [] },
                    { id: "c2", name: "SEO", jobs: [] },
                    { id: "c3", name: "Video Production", jobs: [] },
                    { id: "c4", name: "Amazon E-com", jobs: [] },
                    { id: "c5", name: "Design", jobs: [] }
                ];
            }

        }

        if (data.projects) {
            data.projects = data.projects.map((p: any) => {
                // Migration: Ensure 'name' exists (fallback to client)
                if (!p.name) p.name = p.client || "Untitled Project";

                // Migrate 'department' or 'departments' to 'services'
                if (p.departments && !p.services) {
                    return { ...p, services: p.departments, departments: undefined };
                }
                if (p.department && !p.services) {
                    return { ...p, services: [p.department], department: undefined };
                }
                return p;
            });
        }

        if (!data.clients) {
            data.clients = [
                { id: "cl1", name: "John Doe", email: "john@techstart.com", companyName: "TechStart", phone: "+1 555 0101" },
                { id: "cl2", name: "Jane Smith", email: "jane@growth.io", companyName: "Growth.io" }
            ];
        }

        if (!data.transactions) {
            data.transactions = [
                { id: "t1", date: "2024-05-01", amount: 5000, type: "income", category: "Project", description: "Website Down Payment", status: "completed", projectId: "p1" },
                { id: "t2", date: "2024-05-05", amount: 150, type: "expense", category: "Software", description: "Figma Subscription", status: "completed" },
                { id: "t3", date: "2024-05-10", amount: 2000, type: "expense", category: "Salary", description: "Freelancer Payment", status: "completed" },
                { id: "t4", date: "2024-05-15", amount: 12000, type: "income", category: "Project", description: "SEO Campaign Q2", status: "completed", projectId: "p2" },
                { id: "t5", date: "2024-05-20", amount: 20, type: "expense", category: "Hosting", description: "Vercel Pro", status: "completed", projectId: "p1" }
            ];
        }

        if (!data.invoices) data.invoices = [];
        if (!data.tasks) data.tasks = [];
        if (!data.users) data.users = [];
        if (!data.notifications) data.notifications = [];
        if (!data.activities) data.activities = [];
        if (!data.assets) data.assets = [];
        if (!data.messages) data.messages = [];
        if (!data.settings) {
            data.settings = { systemName: 'AgencyOS', logo: '' };
        }

        return data;
    },
    update: async (callback: (data: DB) => DB) => {
        // await delay(300);
        const data = await readDb();

        // Ensure properties exist before update
        if (!data.services) data.services = [];
        if (!data.clients) data.clients = [];
        if (!data.transactions) data.transactions = [];
        if (!data.invoices) data.invoices = [];
        if (!data.tasks) data.tasks = [];
        if (!data.users) data.users = [];
        if (!data.notifications) data.notifications = [];
        if (!data.activities) data.activities = [];
        if (!data.activities) data.activities = [];
        if (!data.assets) data.assets = [];
        if (!data.messages) data.messages = [];
        if (!data.settings) data.settings = { systemName: 'AgencyOS', logo: '' };

        const newData = callback(data);
        await writeDb(newData);
        return newData;
    }
};

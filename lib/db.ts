import fs from 'fs/promises';
import path from 'path';

const DB_PATH = path.join(process.cwd(), 'data', 'db.json');

export type User = { id: string; name: string; email: string; role: 'admin' | 'specialist' | 'manager' | 'employee'; jobTitle?: string; salary?: number; avatar?: string; password?: string; geminiApiKey?: string };
export type Client = { id: string; name: string; email: string; companyName: string; logo?: string; phone?: string; address?: string; password?: string };
export type Project = { id: string; client: string; clientId?: string; services: string[]; status: 'Active' | 'Completed' | 'On Hold'; budget: number; dueDate: string; aiEnabled?: boolean };
export type Invoice = { id: string; projectId: string; amount: number; status: 'Paid' | 'Pending' | 'Overdue'; date: string };
export type Comment = { id: string; userId: string; text: string; timestamp: string };
export type Task = { id: string; projectId: string; title: string; description?: string; status: 'Todo' | 'In Progress' | 'Review' | 'Done'; priority?: 'Low' | 'Medium' | 'High'; assigneeId: string; dueDate: string; startDate?: string; category?: string; createdAt?: string; comments?: Comment[] };
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
};

export type Category = { id: string; name: string };
export type Settings = { systemName: string; logo: string };
export type DB = {
    users: User[];
    clients: Client[];
    projects: Project[];
    invoices: Invoice[];
    tasks: Task[];
    notifications: Notification[];
    activities: Activity[];
    categories: Category[];
    transactions: Transaction[];
    assets: Asset[];
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
        await delay(300); // Small 300ms latency
        const data = await readDb();

        // Data Migration Helpers
        if (!data.categories) {
            data.categories = [
                { id: "c1", name: "Web Dev" },
                { id: "c2", name: "SEO" },
                { id: "c3", name: "Video Production" },
                { id: "c4", name: "Amazon E-com" },
                { id: "c5", name: "Design" }
            ];
        }

        if (data.projects) {
            data.projects = data.projects.map((p: any) => {
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
        if (!data.settings) {
            data.settings = { systemName: 'AgencyOS', logo: '' };
        }

        return data;
    },
    update: async (callback: (data: DB) => DB) => {
        await delay(300);
        const data = await readDb();

        // Ensure properties exist before update
        if (!data.categories) data.categories = [];
        if (!data.clients) data.clients = [];
        if (!data.transactions) data.transactions = [];
        if (!data.invoices) data.invoices = [];
        if (!data.tasks) data.tasks = [];
        if (!data.users) data.users = [];
        if (!data.notifications) data.notifications = [];
        if (!data.activities) data.activities = [];
        if (!data.assets) data.assets = [];
        if (!data.settings) data.settings = { systemName: 'AgencyOS', logo: '' };

        const newData = callback(data);
        await writeDb(newData);
        return newData;
    }
};

import fs from 'fs/promises';
import path from 'path';
import {
    User, Client, PaymentType, PaymentConfig, ProjectServiceConfig, Project,
    Invoice, Comment, Task, Notification, Activity, AssetType, Asset, Message,
    TransactionType, TransactionCategory, Transaction, Service,
    TRANSACTION_CATEGORIES, UserPermissions, DEFAULT_USER_PERMISSIONS,
    LeaveType, LeaveStatus, LeaveRequest, Job, Settings, DB
} from './types';

export * from './types';

const DB_PATH = path.join(process.cwd(), 'data', 'db.json');
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
                    p.services = p.departments;
                    delete p.departments;
                }
                if (p.department && !p.services) {
                    p.services = [p.department];
                    delete p.department;
                }

                // DATA INTEGRITY MIGRATION: Service Names -> Service IDs
                if (p.services && data.services) {
                    p.services = p.services.map((svc: string) => {
                        // Check if it's already an ID
                        if (data.services.some((s: Service) => s.id === svc)) return svc;

                        // If not, find by Name
                        const match = data.services.find((s: Service) => s.name === svc);
                        return match ? match.id : svc; // Return ID if found, else keep original (legacy/unknown)
                    });
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
        if (!data.leaveRequests) data.leaveRequests = [];
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
        if (!data.leaveRequests) data.leaveRequests = [];
        if (!data.settings) data.settings = { systemName: 'AgencyOS', logo: '' };

        const newData = callback(data);
        await writeDb(newData);
        return newData;
    }
};

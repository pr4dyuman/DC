import { cache } from 'react';
import {
    User, Client, PaymentType, PaymentConfig, ProjectServiceConfig, Project,
    Invoice, Comment, Task, Notification, Activity, AssetType, Asset, Message,
    TransactionType, TransactionCategory, Transaction, Service,
    TRANSACTION_CATEGORIES, UserPermissions, DEFAULT_USER_PERMISSIONS,
    LeaveType, LeaveStatus, LeaveRequest, Job, Settings, DB
} from './types';

import {
    connectDB,
    AgencyModel,
    SuperAdminModel,
    UserModel,
    ClientModel,
    ProjectModel,
    TaskModel,
    InvoiceModel,
    TransactionModel,
    ServiceModel,
    NotificationModel,
    ActivityModel,
    AssetModel,
    MessageModel,
    LeaveRequestModel,
    SettingsModel
} from './mongodb';

export * from './types';

// Helper to convert MongoDB documents to plain objects and remove MongoDB-specific fields
function toPlainObject<T>(doc: any): T {
    if (!doc) return doc;
    if (Array.isArray(doc)) {
        return doc.map(d => toPlainObject(d)) as any;
    }
    
    // Convert to plain object if it's a Mongoose document
    const plain = doc.toObject ? doc.toObject() : doc;
    
    // Remove MongoDB-specific fields
    // KEEP createdAt and updatedAt as they are required by schema
    const { _id, __v, ...rest } = plain;
    
    return rest as T;
}

export const db = {
    get: cache(async (): Promise<DB> => {
        await connectDB();

        const [agencies, superAdmins, users, clients, projects, tasks, invoices, transactions, services, notifications, activities, assets, messages, leaveRequests, settingsDoc] = await Promise.all([
            AgencyModel.find({}).lean(),
            SuperAdminModel.find({}).lean(),
            UserModel.find({}).lean(),
            ClientModel.find({}).lean(),
            ProjectModel.find({}).lean(),
            TaskModel.find({}).lean(),
            InvoiceModel.find({}).lean(),
            TransactionModel.find({}).lean(),
            ServiceModel.find({}).lean(),
            NotificationModel.find({}).lean(),
            ActivityModel.find({}).lean(),
            AssetModel.find({}).lean(),
            MessageModel.find({}).lean(),
            LeaveRequestModel.find({}).lean(),
            SettingsModel.findOne({}).lean()
        ]);

        // Default settings if none exist, with all required fields
        const settings: Settings = settingsDoc 
            ? toPlainObject(settingsDoc) 
            : { systemName: 'AgencyOS', logo: '', userPermissions: {} };

        // Ensure settings always have required fields
        if (!settings.systemName) settings.systemName = 'AgencyOS';
        if (settings.logo === undefined || settings.logo === null) settings.logo = '';
        if (!settings.userPermissions) settings.userPermissions = {};

        // Helper to ensure Agency validity (Backfilling legacy data)
        const validAgencies = toPlainObject<any[]>(agencies).map(agency => ({
            ...agency,
            createdAt: agency.createdAt || new Date().toISOString(),
            billing: {
                ...agency.billing,
                billingEmail: agency.billing?.billingEmail || 'legacy-agency@example.com' // Fallback for legacy data
            }
        }));

        // Backfill agencyId for all other collections to prevent validation errors
        const fallbackAgencyId = 'default-agency';

        const validClients = toPlainObject<any[]>(clients).map(c => ({
            ...c,
            agencyId: c.agencyId || fallbackAgencyId
        }));

        const validProjects = toPlainObject<any[]>(projects).map(p => ({
            ...p,
            agencyId: p.agencyId || fallbackAgencyId
        }));

        const validTasks = toPlainObject<any[]>(tasks).map(t => ({
            ...t,
            agencyId: t.agencyId || fallbackAgencyId
        }));

        const validInvoices = toPlainObject<any[]>(invoices).map(i => ({
            ...i,
            agencyId: i.agencyId || fallbackAgencyId
        }));

        const validTransactions = toPlainObject<any[]>(transactions).map(t => ({
            ...t,
            agencyId: t.agencyId || fallbackAgencyId
        }));

        const validServices = toPlainObject<any[]>(services).map(s => ({
            ...s,
            agencyId: s.agencyId || fallbackAgencyId
        }));

        const validNotifications = toPlainObject<any[]>(notifications).map(n => ({
            ...n,
            agencyId: n.agencyId || fallbackAgencyId
        }));

        const validActivities = toPlainObject<any[]>(activities).map(a => ({
            ...a,
            agencyId: a.agencyId || fallbackAgencyId
        }));

         const validAssets = toPlainObject<any[]>(assets).map(a => ({
            ...a,
            agencyId: a.agencyId || fallbackAgencyId
        }));
        
        const validMessages = toPlainObject<any[]>(messages).map(m => ({
            ...m,
            agencyId: m.agencyId || fallbackAgencyId
        }));
        
        const validLeaveRequests = toPlainObject<any[]>(leaveRequests).map(l => ({
            ...l,
            agencyId: l.agencyId || fallbackAgencyId
        }));

        // Convert all documents to plain objects without MongoDB fields
        return {
            agencies: validAgencies,
            superAdmins: toPlainObject(superAdmins), // SuperAdmins don't belong to an agency
            users: toPlainObject<any[]>(users).map(u => ({
                ...u,
                agencyId: u.agencyId || fallbackAgencyId
            })),
            clients: validClients,
            projects: validProjects,
            tasks: validTasks,
            invoices: validInvoices,
            transactions: validTransactions,
            services: validServices,
            notifications: validNotifications,
            activities: validActivities,
            assets: validAssets,
            messages: validMessages,
            leaveRequests: validLeaveRequests,
            settings
        };
    }),

    update: async (callback: (data: DB) => DB | Promise<DB>): Promise<DB> => {
        await connectDB();

        // Get current data
        const currentData = await db.get();

        // Apply the callback transformation (support both sync and async)
        const newData = await callback(currentData);

        // Update all collections in parallel
        await Promise.all([
            // Clear and insert agencies
            AgencyModel.deleteMany({}).then(async () => {
                if (newData.agencies.length > 0) await AgencyModel.insertMany(newData.agencies);
            }),
            // Clear and insert superAdmins
            SuperAdminModel.deleteMany({}).then(async () => {
                if (newData.superAdmins.length > 0) await SuperAdminModel.insertMany(newData.superAdmins);
            }),
            // Clear and insert users
            UserModel.deleteMany({}).then(async () => {
                if (newData.users.length > 0) await UserModel.insertMany(newData.users);
            }),
            // Clear and insert clients
            ClientModel.deleteMany({}).then(async () => {
                if (newData.clients.length > 0) await ClientModel.insertMany(newData.clients);
            }),
            // Clear and insert projects
            ProjectModel.deleteMany({}).then(async () => {
                if (newData.projects.length > 0) await ProjectModel.insertMany(newData.projects);
            }),
            // Clear and insert tasks
            TaskModel.deleteMany({}).then(async () => {
                if (newData.tasks.length > 0) await TaskModel.insertMany(newData.tasks);
            }),
            // Clear and insert invoices
            InvoiceModel.deleteMany({}).then(async () => {
                if (newData.invoices.length > 0) await InvoiceModel.insertMany(newData.invoices);
            }),
            // Clear and insert transactions
            TransactionModel.deleteMany({}).then(async () => {
                if (newData.transactions.length > 0) await TransactionModel.insertMany(newData.transactions);
            }),
            // Clear and insert services
            ServiceModel.deleteMany({}).then(async () => {
                if (newData.services.length > 0) await ServiceModel.insertMany(newData.services);
            }),
            // Clear and insert notifications
            NotificationModel.deleteMany({}).then(async () => {
                if (newData.notifications.length > 0) await NotificationModel.insertMany(newData.notifications);
            }),
            // Clear and insert activities
            ActivityModel.deleteMany({}).then(async () => {
                if (newData.activities.length > 0) await ActivityModel.insertMany(newData.activities);
            }),
            // Clear and insert assets
            AssetModel.deleteMany({}).then(async () => {
                if (newData.assets.length > 0) await AssetModel.insertMany(newData.assets);
            }),
            // Clear and insert messages
            MessageModel.deleteMany({}).then(async () => {
                if (newData.messages.length > 0) await MessageModel.insertMany(newData.messages);
            }),
            // Clear and insert leave requests
            LeaveRequestModel.deleteMany({}).then(async () => {
                if (newData.leaveRequests.length > 0) await LeaveRequestModel.insertMany(newData.leaveRequests);
            }),
            // Update settings
            SettingsModel.deleteMany({}).then(async () => {
                // Ensure settings have required fields
                const settingsToSave = {
                    systemName: newData.settings.systemName || 'AgencyOS',
                    logo: newData.settings.logo || '',
                    userPermissions: newData.settings.userPermissions || {}
                };
                await SettingsModel.create(settingsToSave);
            })
        ]);

        return newData;
    }
};

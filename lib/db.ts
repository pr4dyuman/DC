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

        // Diff-based update: only touch documents that actually changed.
        // This avoids deleting ALL data and re-inserting, which risks data loss.
        const collectionMap: { model: any; key: keyof DB }[] = [
            { model: AgencyModel, key: 'agencies' },
            { model: SuperAdminModel, key: 'superAdmins' },
            { model: UserModel, key: 'users' },
            { model: ClientModel, key: 'clients' },
            { model: ProjectModel, key: 'projects' },
            { model: TaskModel, key: 'tasks' },
            { model: InvoiceModel, key: 'invoices' },
            { model: TransactionModel, key: 'transactions' },
            { model: ServiceModel, key: 'services' },
            { model: NotificationModel, key: 'notifications' },
            { model: ActivityModel, key: 'activities' },
            { model: AssetModel, key: 'assets' },
            { model: MessageModel, key: 'messages' },
            { model: LeaveRequestModel, key: 'leaveRequests' },
        ];

        await Promise.all(
            collectionMap.map(async ({ model, key }) => {
                const oldItems = (currentData[key] as any[]) || [];
                const newItems = (newData[key] as any[]) || [];

                const oldMap = new Map(oldItems.map(item => [item.id, item]));
                const newMap = new Map(newItems.map(item => [item.id, item]));

                // Find items to insert (in new but not in old)
                const toInsert = newItems.filter(item => !oldMap.has(item.id));

                // Find items to delete (in old but not in new)
                const toDeleteIds = oldItems.filter(item => !newMap.has(item.id)).map(item => item.id);

                // Find items to update (in both, but content changed)
                const toUpdate = newItems.filter(item => {
                    const oldItem = oldMap.get(item.id);
                    if (!oldItem) return false;
                    return JSON.stringify(oldItem) !== JSON.stringify(item);
                });

                const ops: Promise<any>[] = [];

                if (toInsert.length > 0) {
                    ops.push(model.insertMany(toInsert));
                }

                if (toDeleteIds.length > 0) {
                    ops.push(model.deleteMany({ id: { $in: toDeleteIds } }));
                }

                for (const item of toUpdate) {
                    ops.push(model.replaceOne({ id: item.id }, item, { upsert: true }));
                }

                await Promise.all(ops);
            })
        );

        // Update settings separately (singleton document, no id field)
        const settingsToSave = {
            systemName: newData.settings.systemName || 'AgencyOS',
            logo: newData.settings.logo || '',
            userPermissions: newData.settings.userPermissions || {}
        };
        await SettingsModel.updateOne({}, { $set: settingsToSave }, { upsert: true });

        return newData;
    }
};

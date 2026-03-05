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
import { getCurrentAgency } from './agency-context';

export * from './types';

// Helper to convert MongoDB documents to plain objects and remove MongoDB-specific fields
function toPlainObject<T>(doc: any): T {
    if (!doc) return doc;
    if (Array.isArray(doc)) {
        return doc.map(d => toPlainObject(d)) as any;
    }

    // .lean() already returns plain objects, but handle Mongoose docs too
    const plain = doc.toObject ? doc.toObject() : doc;

    // Remove MongoDB-specific fields
    const { _id, __v, ...rest } = plain;

    return rest as T;
}

// Simple async mutex to serialize db.update() calls and prevent race conditions
let updateLock: Promise<any> = Promise.resolve();

function withLock<T>(fn: () => Promise<T>): Promise<T> {
    const prev = updateLock;
    let resolve: () => void;
    updateLock = new Promise<void>(r => { resolve = r; });
    return prev
        .then(() => fn())
        .finally(() => resolve!());
}

// Deep equality check that is key-order-independent (avoids JSON.stringify false positives)
function deepEqual(a: any, b: any): boolean {
    if (a === b) return true;
    if (a == null || b == null) return a === b;
    if (typeof a !== typeof b) return false;
    if (typeof a !== 'object') return false;
    if (Array.isArray(a) !== Array.isArray(b)) return false;
    if (Array.isArray(a)) {
        if (a.length !== b.length) return false;
        return a.every((item: any, i: number) => deepEqual(item, b[i]));
    }
    const keysA = Object.keys(a);
    const keysB = Object.keys(b);
    if (keysA.length !== keysB.length) return false;
    return keysA.every(key => key in b && deepEqual(a[key], b[key]));
}

// Fallback agencyId for legacy data that predates multi-tenancy
const FALLBACK_AGENCY_ID = 'default-agency';

// Helper: backfill agencyId for legacy documents
function backfillAgencyId<T extends Record<string, any>>(docs: any[]): T[] {
    return toPlainObject<any[]>(docs).map(d => ({
        ...d,
        agencyId: d.agencyId || FALLBACK_AGENCY_ID
    }));
}

export const db = {
    get: cache(async (): Promise<DB> => {
        await connectDB();

        // Scope all queries to the current agency (multi-tenancy)
        const agency = await getCurrentAgency();
        const agencyFilter = agency ? { agencyId: agency.id } : {};

        const [agencies, superAdmins, users, clients, projects, tasks, invoices, transactions, services, notifications, activities, assets, messages, leaveRequests, settingsDoc] = await Promise.all([
            AgencyModel.find({}).lean(),
            SuperAdminModel.find({}).lean(),
            UserModel.find(agencyFilter).lean(),
            ClientModel.find(agencyFilter).lean(),
            ProjectModel.find(agencyFilter).lean(),
            TaskModel.find(agencyFilter).lean(),
            InvoiceModel.find(agencyFilter).lean(),
            TransactionModel.find(agencyFilter).lean(),
            ServiceModel.find(agencyFilter).lean(),
            NotificationModel.find(agencyFilter).lean(),
            ActivityModel.find(agencyFilter).lean(),
            AssetModel.find(agencyFilter).lean(),
            MessageModel.find(agencyFilter).lean(),
            LeaveRequestModel.find(agencyFilter).lean(),
            SettingsModel.findOne(agencyFilter).lean()
        ]);

        // Default settings if none exist
        const settings: Settings = settingsDoc
            ? toPlainObject(settingsDoc)
            : { systemName: 'AgencyOS', logo: '', userPermissions: {} };

        // Ensure settings always have required fields
        if (!settings.systemName) settings.systemName = 'AgencyOS';
        if (settings.logo === undefined || settings.logo === null) settings.logo = '';
        if (!settings.userPermissions) settings.userPermissions = {};

        // Backfill legacy data
        const validAgencies = toPlainObject<any[]>(agencies).map(agency => ({
            ...agency,
            createdAt: agency.createdAt || new Date().toISOString(),
            billing: {
                ...agency.billing,
                billingEmail: agency.billing?.billingEmail || 'legacy-agency@example.com'
            }
        }));

        return {
            agencies: validAgencies,
            superAdmins: toPlainObject(superAdmins),
            users: backfillAgencyId(users),
            clients: backfillAgencyId(clients),
            projects: backfillAgencyId(projects),
            tasks: backfillAgencyId(tasks),
            invoices: backfillAgencyId(invoices),
            transactions: backfillAgencyId(transactions),
            services: backfillAgencyId(services),
            notifications: backfillAgencyId(notifications),
            activities: backfillAgencyId(activities),
            assets: backfillAgencyId(assets),
            messages: backfillAgencyId(messages),
            leaveRequests: backfillAgencyId(leaveRequests),
            settings
        };
    }),

    update: async (callback: (data: DB) => DB | Promise<DB>): Promise<DB> => {
        // Serialize concurrent updates via mutex lock to prevent race conditions
        return withLock(async () => {
            await connectDB();

            // Get current data
            const currentData = await db.get();

            // Apply the callback transformation
            const newData = await callback(currentData);

            // Diff-based update: only touch documents that actually changed
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
                        return !deepEqual(oldItem, item);
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
            const settingsToSave: Record<string, any> = {
                systemName: newData.settings.systemName || 'AgencyOS',
                logo: newData.settings.logo || '',
                userPermissions: newData.settings.userPermissions || {}
            };
            // Include agencyId in settings for multi-tenancy scoping
            const settingsAgencyId = newData.settings.agencyId || 'default-agency';
            settingsToSave.agencyId = settingsAgencyId;
            await SettingsModel.updateOne({ agencyId: settingsAgencyId }, { $set: settingsToSave }, { upsert: true });

            return newData;
        });
    }
};

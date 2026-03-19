/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * Seed script to create all account types for Agency OS
 * 
 * Account Types:
 *   1. SuperAdmin  - Platform-level administrator
 *   2. Admin       - Agency-level admin
 *   3. Manager     - Agency manager
 *   4. Specialist  - Agency specialist
 *   5. Employee    - Agency employee
 *   6. Client      - External client
 * 
 * Usage: node scripts/seed-accounts.js
 */

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
    console.error('❌ MONGODB_URI not found in .env');
    process.exit(1);
}

// ──────────────────────────────────────────────────────────────
// Schemas (mirrors lib/mongodb.ts)
// ──────────────────────────────────────────────────────────────

const SuperAdminPermissionsSchema = new mongoose.Schema({
    canCreateAgency: { type: Boolean, default: true },
    canDeleteAgency: { type: Boolean, default: true },
    canSuspendAgency: { type: Boolean, default: true },
    canViewBilling: { type: Boolean, default: true },
    canManagePlans: { type: Boolean, default: true }
}, { _id: false });

const SuperAdminSchema = new mongoose.Schema({
    id: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, default: 'superadmin' },
    avatar: { type: String },
    phone: { type: String },
    createdAt: { type: String, required: true },
    lastLoginAt: { type: String },
    permissions: { type: SuperAdminPermissionsSchema, required: true }
}, { timestamps: true });

const UserSchema = new mongoose.Schema({
    id: { type: String, required: true, unique: true },
    agencyId: { type: String, required: true, index: true },
    username: { type: String, sparse: true },
    name: { type: String, required: true },
    email: { type: String, required: true },
    role: { type: String, enum: ['admin', 'specialist', 'manager', 'employee', 'client'], required: true },
    jobTitle: { type: String },
    salary: { type: Number },
    avatar: { type: String },
    password: { type: String },
    lastActiveAt: { type: String },
    employmentType: { type: String, enum: ['Salary', 'Project Based', 'Freelancer'] },
    contactNumber: { type: String },
}, { timestamps: true });

const ClientSchema = new mongoose.Schema({
    id: { type: String, required: true, unique: true },
    agencyId: { type: String, required: true, index: true },
    username: { type: String, sparse: true },
    name: { type: String, required: true },
    email: { type: String, required: true },
    role: { type: String, default: 'client' },
    companyName: { type: String, required: true },
    logo: { type: String },
    phone: { type: String },
    address: { type: String },
    password: { type: String },
    lastActiveAt: { type: String },
    archived: { type: Boolean, default: false },
}, { timestamps: true });

// Agency schemas for finding existing agency
const AgencyLimitsSchema = new mongoose.Schema({
    maxUsers: { type: Number, required: true },
    maxProjects: { type: Number, required: true },
    maxClients: { type: Number, required: true },
    maxStorage: { type: Number, required: true },
    maxMonthlyInvoices: { type: Number, required: true },
    aiEnabled: { type: Boolean, required: true },
    customBranding: { type: Boolean, required: true }
}, { _id: false });

const AgencyUsageSchema = new mongoose.Schema({
    users: { type: Number, default: 0 },
    projects: { type: Number, default: 0 },
    clients: { type: Number, default: 0 },
    storage: { type: Number, default: 0 },
    monthlyInvoices: { type: Number, default: 0 }
}, { _id: false });

const AgencySettingsSchema = new mongoose.Schema({
    systemName: { type: String, required: true },
    timezone: { type: String, default: 'UTC' },
    currency: { type: String, default: 'INR' },
    dateFormat: { type: String, default: 'DD/MM/YYYY' },
    allowClientRegistration: { type: Boolean, default: false },
    requireEmailVerification: { type: Boolean, default: false },
    enableTwoFactor: { type: Boolean, default: false },
    emailNotificationsEnabled: { type: Boolean, default: true }
}, { _id: false });

const AgencyFeaturesSchema = new mongoose.Schema({
    aiAssistant: { type: Boolean, default: true },
    advancedReporting: { type: Boolean, default: true },
    apiAccess: { type: Boolean, default: true },
    whiteLabel: { type: Boolean, default: true },
    customDomain: { type: Boolean, default: false },
    ssoEnabled: { type: Boolean, default: false }
}, { _id: false });

const AgencySchema = new mongoose.Schema({
    id: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    slug: { type: String, required: true, unique: true },
    status: { type: String, required: true, default: 'active' },
    plan: { type: String, required: true, default: 'enterprise' },
    limits: { type: AgencyLimitsSchema, required: true },
    usage: { type: AgencyUsageSchema, required: true },
    billing: {
        billingEmail: { type: String, required: true },
    },
    settings: { type: AgencySettingsSchema, required: true },
    createdAt: { type: String, required: true },
    createdBy: { type: String, required: true },
    features: { type: AgencyFeaturesSchema, required: true }
}, { timestamps: true });

// ──────────────────────────────────────────────────────────────
// Models
// ──────────────────────────────────────────────────────────────

const SuperAdminModel = mongoose.models.SuperAdmin || mongoose.model('SuperAdmin', SuperAdminSchema);
const UserModel = mongoose.models.User || mongoose.model('User', UserSchema);
const ClientModel = mongoose.models.Client || mongoose.model('Client', ClientSchema);
const AgencyModel = mongoose.models.Agency || mongoose.model('Agency', AgencySchema);

// ──────────────────────────────────────────────────────────────
// Seed Data
// ──────────────────────────────────────────────────────────────

const COMMON_PASSWORD = process.env.SEED_PASSWORD || 'Test@1234';

const now = new Date().toISOString();

async function seed() {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected!\n');

    const hashedPassword = await bcrypt.hash(COMMON_PASSWORD, 12);

    // ── 1. Find or create Agency ──
    let agency = await AgencyModel.findOne({}).lean();
    let agencyId;

    if (agency) {
        agencyId = agency.id;
        console.log(`📦 Using existing agency: "${agency.name}" (${agencyId})`);
    } else {
        agencyId = 'agency-' + crypto.randomUUID().slice(0, 8);
        const superAdminId = 'sa-' + crypto.randomUUID().slice(0, 8);

        agency = await AgencyModel.create({
            id: agencyId,
            name: 'Demo Agency',
            slug: 'demo-agency',
            status: 'active',
            plan: 'enterprise',
            limits: {
                maxUsers: -1,
                maxProjects: -1,
                maxClients: -1,
                maxStorage: -1,
                maxMonthlyInvoices: -1,
                aiEnabled: true,
                customBranding: true,
            },
            usage: { users: 0, projects: 0, clients: 0, storage: 0, monthlyInvoices: 0 },
            billing: { billingEmail: 'billing@demo-agency.com' },
            settings: { systemName: 'AgencyOS' },
            createdAt: now,
            createdBy: superAdminId,
            features: {
                aiAssistant: true,
                advancedReporting: true,
                apiAccess: true,
                whiteLabel: true,
                customDomain: false,
                ssoEnabled: false,
            }
        });
        console.log(`📦 Created new agency: "Demo Agency" (${agencyId})`);
    }

    // ── 2. SuperAdmin ──
    const existingSA = await SuperAdminModel.findOne({ email: 'superadmin@agencyos.com' }).lean();
    if (!existingSA) {
        await SuperAdminModel.create({
            id: 'sa-' + crypto.randomUUID().slice(0, 8),
            name: 'Super Admin',
            email: 'superadmin@agencyos.com',
            password: hashedPassword,
            role: 'superadmin',
            createdAt: now,
            permissions: {
                canCreateAgency: true,
                canDeleteAgency: true,
                canSuspendAgency: true,
                canViewBilling: true,
                canManagePlans: true,
            }
        });
        console.log('✅ Created SuperAdmin');
    } else {
        console.log('⏭️  SuperAdmin already exists, skipping');
    }

    // ── 3. Admin ──
    const existingAdmin = await UserModel.findOne({ email: 'admin@agencyos.com', agencyId }).lean();
    if (!existingAdmin) {
        await UserModel.create({
            id: 'admin-' + crypto.randomUUID().slice(0, 8),
            agencyId,
            name: 'Agency Admin',
            email: 'admin@agencyos.com',
            role: 'admin',
            password: hashedPassword,
            jobTitle: 'Administrator',
            employmentType: 'Salary',
        });
        console.log('✅ Created Admin');
    } else {
        console.log('⏭️  Admin already exists, skipping');
    }

    // ── 4. Manager ──
    const existingManager = await UserModel.findOne({ email: 'manager@agencyos.com', agencyId }).lean();
    if (!existingManager) {
        await UserModel.create({
            id: 'mgr-' + crypto.randomUUID().slice(0, 8),
            agencyId,
            name: 'Project Manager',
            email: 'manager@agencyos.com',
            role: 'manager',
            password: hashedPassword,
            jobTitle: 'Project Manager',
            employmentType: 'Salary',
        });
        console.log('✅ Created Manager');
    } else {
        console.log('⏭️  Manager already exists, skipping');
    }

    // ── 5. Specialist ──
    const existingSpecialist = await UserModel.findOne({ email: 'specialist@agencyos.com', agencyId }).lean();
    if (!existingSpecialist) {
        await UserModel.create({
            id: 'spec-' + crypto.randomUUID().slice(0, 8),
            agencyId,
            name: 'Creative Specialist',
            email: 'specialist@agencyos.com',
            role: 'specialist',
            password: hashedPassword,
            jobTitle: 'UI/UX Designer',
            employmentType: 'Salary',
        });
        console.log('✅ Created Specialist');
    } else {
        console.log('⏭️  Specialist already exists, skipping');
    }

    // ── 6. Employee ──
    const existingEmployee = await UserModel.findOne({ email: 'employee@agencyos.com', agencyId }).lean();
    if (!existingEmployee) {
        await UserModel.create({
            id: 'emp-' + crypto.randomUUID().slice(0, 8),
            agencyId,
            name: 'Team Employee',
            email: 'employee@agencyos.com',
            role: 'employee',
            password: hashedPassword,
            jobTitle: 'Developer',
            employmentType: 'Salary',
        });
        console.log('✅ Created Employee');
    } else {
        console.log('⏭️  Employee already exists, skipping');
    }

    // ── 7. Client ──
    const existingClient = await ClientModel.findOne({ email: 'client@agencyos.com' }).lean();
    if (!existingClient) {
        await ClientModel.create({
            id: 'client-' + crypto.randomUUID().slice(0, 8),
            agencyId,
            name: 'Demo Client',
            email: 'client@agencyos.com',
            role: 'client',
            companyName: 'Client Corp',
            password: hashedPassword,
            phone: '+91 9876543210',
        });
        console.log('✅ Created Client');
    } else {
        console.log('⏭️  Client already exists, skipping');
    }

    console.log('\n' + '═'.repeat(60));
    console.log('  ALL ACCOUNT CREDENTIALS');
    console.log('═'.repeat(60));
    console.log('  Password for ALL accounts: (set via SEED_PASSWORD env var)');
    console.log('─'.repeat(60));
    console.log('  #  | Role        | Email                      | Redirects To');
    console.log('─'.repeat(60));
    console.log('  1  | SuperAdmin  | superadmin@agencyos.com    | /super-admin');
    console.log('  2  | Admin       | admin@agencyos.com         | /dashboard');
    console.log('  3  | Manager     | manager@agencyos.com       | /dashboard');
    console.log('  4  | Specialist  | specialist@agencyos.com    | /dashboard');
    console.log('  5  | Employee    | employee@agencyos.com      | /dashboard');
    console.log('  6  | Client      | client@agencyos.com        | /dashboard');
    console.log('═'.repeat(60));

    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
}

seed().catch(err => {
    console.error('❌ Seed failed:', err);
    process.exit(1);
});

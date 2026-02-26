// Fix database: normalize agencyId + create new admin account
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI;

async function fixDatabase() {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    const db = mongoose.connection.db;
    console.log(`✅ Connected to database: ${db.databaseName}\n`);

    // If data is in 'test' database, move it to proper DB
    if (db.databaseName === 'test') {
        console.log('⚠️  WARNING: Data is in "test" database.');
        console.log('   Please add /agency-os to your MONGODB_URI before the ?');
        console.log('   Example: mongodb+srv://user:pass@cluster.net/agency-os?retryWrites=true');
        console.log('   Then re-run this script.\n');
    }

    const AGENCY_ID = 'agency-1';

    // Collections that need agencyId normalization
    const collectionsToFix = [
        'users', 'clients', 'projects', 'tasks', 'invoices',
        'transactions', 'services', 'notifications', 'activities',
        'assets', 'messages', 'leaverequests'
    ];

    console.log('=== FIXING agencyId ===\n');
    for (const colName of collectionsToFix) {
        try {
            const col = db.collection(colName);
            const count = await col.countDocuments();
            if (count === 0) {
                console.log(`⏭️  ${colName}: empty, skipped`);
                continue;
            }

            // Update all docs to use consistent agencyId
            const result = await col.updateMany(
                { $or: [{ agencyId: { $ne: AGENCY_ID } }, { agencyId: { $exists: false } }] },
                { $set: { agencyId: AGENCY_ID } }
            );
            console.log(`✅ ${colName}: ${result.modifiedCount}/${count} docs fixed`);
        } catch (e) {
            console.log(`⚠️  ${colName}: ${e.message}`);
        }
    }

    // Fix agency record
    const agencyCol = db.collection('agencies');
    const agency = await agencyCol.findOne();
    if (agency) {
        await agencyCol.updateOne({ _id: agency._id }, {
            $set: { id: AGENCY_ID, name: 'AgencyOS', slug: 'agencyos' }
        });
        console.log(`\n✅ Agency updated: id=${AGENCY_ID}, name=AgencyOS`);
    }

    // Create new admin account
    console.log('\n=== CREATING NEW ADMIN ===\n');
    const hashedPassword = await bcrypt.hash('Admin@123', 10);

    const newAdmin = {
        id: 'admin-' + Math.random().toString(36).substr(2, 9),
        agencyId: AGENCY_ID,
        username: 'pradyuman',
        name: 'Pradyuman Sharma',
        email: 'pradyuman@agencyos.com',
        role: 'admin',
        jobTitle: 'Agency Owner',
        password: hashedPassword,
        lastActiveAt: new Date().toISOString(),
        contracts: [],
        pendingContracts: [],
        otherDocuments: [],
        pendingOtherDocuments: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };

    // Remove old admin if exists, then insert new
    await db.collection('users').deleteOne({ username: 'pradyuman' });
    await db.collection('users').insertOne(newAdmin);

    console.log('✅ New admin account created:');
    console.log(`   Username: pradyuman`);
    console.log(`   Password: Admin@123`);
    console.log(`   Email:    pradyuman@agencyos.com`);
    console.log(`   Role:     admin`);

    // Also reset superadmin password
    const superAdmin = await db.collection('superadmins').findOne();
    if (superAdmin) {
        const superHash = await bcrypt.hash('Super@123', 10);
        await db.collection('superadmins').updateOne(
            { _id: superAdmin._id },
            { $set: { password: superHash } }
        );
        console.log(`\n✅ Super Admin password reset:`);
        console.log(`   Email:    ${superAdmin.email}`);
        console.log(`   Password: Super@123`);
    }

    // Summary
    console.log('\n=== FINAL STATUS ===\n');
    const cols = await db.listCollections().toArray();
    for (const col of cols.sort((a, b) => a.name.localeCompare(b.name))) {
        const count = await db.collection(col.name).countDocuments();
        console.log(`  ${col.name}: ${count} docs`);
    }

    await mongoose.disconnect();
    console.log('\n🎉 Done! Restart the server to apply changes.');
}

fixDatabase().catch(err => {
    console.error('❌ Error:', err.message);
    process.exit(1);
});

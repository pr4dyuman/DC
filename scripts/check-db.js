// Check MongoDB database structure and data integrity
const mongoose = require('mongoose');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI;

async function checkDB() {
    await mongoose.connect(MONGODB_URI);
    const db = mongoose.connection.db;
    const collections = await db.listCollections().toArray();

    console.log('=== DATABASE STRUCTURE CHECK ===\n');
    console.log(`Database: ${db.databaseName}`);
    console.log(`Collections: ${collections.length}\n`);

    for (const col of collections.sort((a, b) => a.name.localeCompare(b.name))) {
        const count = await db.collection(col.name).countDocuments();
        const sample = await db.collection(col.name).findOne();
        const fields = sample ? Object.keys(sample).filter(k => k !== '__v').join(', ') : '(empty)';

        console.log(`📦 ${col.name} (${count} docs)`);
        console.log(`   Fields: ${fields}`);

        // Check for required fields
        if (col.name === 'users' && sample) {
            console.log(`   Sample: ${sample.name} (${sample.role}) - id: ${sample.id}, agencyId: ${sample.agencyId || '⚠️ MISSING'}`);
        }
        if (col.name === 'projects' && sample) {
            console.log(`   Sample: ${sample.name} - id: ${sample.id}, agencyId: ${sample.agencyId || '⚠️ MISSING'}`);
        }
        if (col.name === 'clients' && sample) {
            console.log(`   Sample: ${sample.name} (${sample.companyName}) - id: ${sample.id}, agencyId: ${sample.agencyId || '⚠️ MISSING'}`);
        }
        if (col.name === 'tasks' && sample) {
            console.log(`   Sample: ${sample.title} - status: ${sample.status}, agencyId: ${sample.agencyId || '⚠️ MISSING'}`);
        }
        if (col.name === 'agencies' && sample) {
            console.log(`   Sample: ${sample.name} - plan: ${sample.plan}, status: ${sample.status}`);
        }
        if (col.name === 'superadmins' && sample) {
            console.log(`   Sample: ${sample.name} - email: ${sample.email}, hasPassword: ${!!sample.password}`);
        }
        if (col.name === 'transactions' && sample) {
            console.log(`   Sample: ${sample.description} - type: ${sample.type}, amount: ${sample.amount}`);
        }
        if (col.name === 'invoices' && sample) {
            console.log(`   Sample: id:${sample.id} - status: ${sample.status}, amount: ${sample.amount}`);
        }
        console.log('');
    }

    // Check indexes
    console.log('=== INDEX CHECK ===\n');
    for (const col of ['users', 'projects', 'tasks', 'clients']) {
        try {
            const indexes = await db.collection(col).indexes();
            console.log(`${col}: ${indexes.map(i => Object.keys(i.key).join('+')).join(', ')}`);
        } catch {
            console.log(`${col}: ⚠️ collection not found`);
        }
    }

    await mongoose.disconnect();
}

checkDB().catch(err => {
    console.error('❌ Error:', err.message);
    process.exit(1);
});

/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * One-time migration: hash all plain text passwords in the database.
 * 
 * Run once after deploying the hashed password requirement:
 *   node scripts/migrate-passwords.js
 * 
 * Safe to run multiple times — skips already-hashed passwords.
 */

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
    console.error('MONGODB_URI not found in .env');
    process.exit(1);
}

function isBcryptHash(value) {
    return typeof value === 'string' &&
        (value.startsWith('$2a$') || value.startsWith('$2b$') || value.startsWith('$2y$'));
}

async function migrateCollection(db, collectionName) {
    const col = db.collection(collectionName);
    const docs = await col.find({ password: { $exists: true, $ne: null } }).toArray();

    let hashed = 0;
    let skipped = 0;

    for (const doc of docs) {
        if (isBcryptHash(doc.password)) {
            skipped++;
            continue;
        }

        const hash = await bcrypt.hash(doc.password, 12);
        await col.updateOne({ _id: doc._id }, { $set: { password: hash } });
        hashed++;
        console.log(`  ${collectionName}: hashed password for ${doc.email || doc.id}`);
    }

    console.log(`  ${collectionName}: ${hashed} hashed, ${skipped} already hashed, ${docs.length} total`);
    return hashed;
}

async function main() {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    const db = mongoose.connection.db;
    console.log(`Connected to: ${db.databaseName}\n`);

    const collections = ['superadmins', 'users', 'clients'];
    let totalHashed = 0;

    for (const name of collections) {
        totalHashed += await migrateCollection(db, name);
    }

    console.log(`\nDone. ${totalHashed} passwords were hashed.`);
    if (totalHashed === 0) {
        console.log('All passwords were already hashed — no changes made.');
    }

    await mongoose.disconnect();
}

main().catch(err => {
    console.error('Migration failed:', err);
    process.exit(1);
});

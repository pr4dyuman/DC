// Import backed-up JSON files into MongoDB
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const readline = require('readline');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
    console.error('❌ MONGODB_URI not found in .env');
    process.exit(1);
}

function askConfirmation(question) {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    return new Promise(resolve => {
        rl.question(question, answer => {
            rl.close();
            resolve(answer.toLowerCase().trim());
        });
    });
}

async function importAll() {
    console.log('🔌 Connecting to NEW MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected!\n');

    const db = mongoose.connection.db;
    const backupDir = path.join(__dirname, '..', 'data', 'backup');

    const files = fs.readdirSync(backupDir).filter(f => f.endsWith('.json'));

    console.log(`⚠️  WARNING: This will DROP and re-import ${files.length} collections.`);
    console.log(`   Database: ${MONGODB_URI.replace(/\/\/[^:]+:[^@]+@/, '//***:***@')}\n`);

    const answer = await askConfirmation('Are you sure you want to continue? (yes/no): ');
    if (answer !== 'yes' && answer !== 'y') {
        console.log('❌ Aborted.');
        await mongoose.disconnect();
        process.exit(0);
    }

    let totalDocs = 0;
    for (const file of files) {
        const collectionName = file.replace('.json', '');
        const data = JSON.parse(fs.readFileSync(path.join(backupDir, file), 'utf8'));

        if (data.length === 0) {
            console.log(`⏭️  ${collectionName}: 0 documents (skipped)`);
            continue;
        }

        // Drop existing collection if any, then insert
        try { await db.collection(collectionName).drop(); } catch { /* doesn't exist yet */ }
        await db.collection(collectionName).insertMany(data);
        console.log(`✅ ${collectionName}: ${data.length} documents imported`);
        totalDocs += data.length;
    }

    console.log(`\n🎉 Imported ${totalDocs} total documents into new database`);
    await mongoose.disconnect();
}

importAll().catch(err => {
    console.error('❌ Error:', err.message);
    process.exit(1);
});

// Export all MongoDB collections to JSON files
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
    console.error('❌ MONGODB_URI not found in .env');
    process.exit(1);
}

async function exportAll() {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected!\n');

    const db = mongoose.connection.db;
    const collections = await db.listCollections().toArray();

    const outputDir = path.join(__dirname, '..', 'data', 'backup');
    if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

    const SENSITIVE_FIELDS = ['password', 'otp', 'otpExpiry', 'resetToken', 'resetTokenExpiry'];

    let totalDocs = 0;
    for (const col of collections) {
        const docs = await db.collection(col.name).find({}).toArray();
        const sanitized = docs.map(doc => {
            const clean = { ...doc };
            for (const field of SENSITIVE_FIELDS) {
                if (field in clean) clean[field] = '[REDACTED]';
            }
            return clean;
        });
        const filePath = path.join(outputDir, `${col.name}.json`);
        fs.writeFileSync(filePath, JSON.stringify(sanitized, null, 2));
        console.log(`📦 ${col.name}: ${docs.length} documents → ${col.name}.json`);
        totalDocs += docs.length;
    }

    console.log(`\n✅ Exported ${totalDocs} total documents from ${collections.length} collections`);
    console.log(`📁 Saved to: ${outputDir}`);

    await mongoose.disconnect();
}

exportAll().catch(err => {
    console.error('❌ Error:', err.message);
    process.exit(1);
});

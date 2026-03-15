/**
 * Post-Cleanup Verification — Confirms everything is clean
 */
import { MongoClient } from 'mongodb';

const MONGODB_URI = 'mongodb+srv://chandanvsharma00_agencyos:tUhRWo1W1PdzfsJI@cluster0.o2mv8lz.mongodb.net/?appName=Cluster0';

async function verify() {
    const client = new MongoClient(MONGODB_URI);
    const issues = [];

    try {
        await client.connect();
        console.log('✅ Connected\n');

        // 1. Only expected databases should exist
        const adminDb = client.db().admin();
        const dbList = await adminDb.listDatabases();
        console.log('═══ DATABASES IN CLUSTER ═══');
        for (const db of dbList.databases) {
            const unexpected = !['agency-os', 'admin', 'local'].includes(db.name);
            const icon = unexpected ? '❌' : '✅';
            console.log(`  ${icon} ${db.name} — ${(db.sizeOnDisk / 1024 / 1024).toFixed(2)} MB`);
            if (unexpected) issues.push(`Unexpected database: ${db.name}`);
        }

        const prodDb = client.db('agency-os');

        // 2. Collection document counts
        console.log('\n═══ AGENCY-OS COLLECTIONS ═══');
        const cols = await prodDb.listCollections().toArray();
        for (const col of cols.sort((a, b) => a.name.localeCompare(b.name))) {
            const count = await prodDb.collection(col.name).countDocuments();
            console.log(`  ${count > 0 ? '📋' : '📭'} ${col.name}: ${count}`);
        }

        // 3. No orphaned settings
        console.log('\n═══ INTEGRITY CHECKS ═══');
        const orphanedSettings = await prodDb.collection('settings').countDocuments({
            $or: [{ agencyId: null }, { agencyId: { $exists: false } }, { agencyId: '' }]
        });
        if (orphanedSettings > 0) {
            console.log(`  ❌ ${orphanedSettings} orphaned settings docs`);
            issues.push('Orphaned settings still exist');
        } else {
            console.log('  ✅ No orphaned settings');
        }

        // 4. AI usage logs have correct agencyId
        const wrongAiLogs = await prodDb.collection('aiusagelogs').countDocuments({ agencyId: 'agency-1' });
        if (wrongAiLogs > 0) {
            console.log(`  ❌ ${wrongAiLogs} AI logs still have agencyId "agency-1"`);
            issues.push('AI logs still have wrong agencyId');
        } else {
            console.log('  ✅ All AI logs have correct agencyId');
        }

        // 5. No empty passwords
        const emptyPwd = await prodDb.collection('users').countDocuments({
            $or: [{ password: '' }, { password: null }, { password: { $exists: false } }]
        });
        if (emptyPwd > 0) {
            console.log(`  ❌ ${emptyPwd} users with empty passwords`);
            issues.push('Users with empty passwords');
        } else {
            console.log('  ✅ All users have passwords');
        }

        // 6. All data belongs to correct agency
        const agency = await prodDb.collection('agencies').findOne({});
        if (agency) {
            const agencyId = agency.id;
            console.log(`\n  Agency: "${agency.name}" (${agencyId})`);
            
            const multiTenantCols = ['users', 'notifications', 'settings', 'aiusagelogs'];
            for (const colName of multiTenantCols) {
                const total = await prodDb.collection(colName).countDocuments({});
                const withCorrectAgency = await prodDb.collection(colName).countDocuments({ agencyId });
                const agencyless = await prodDb.collection(colName).countDocuments({
                    $or: [{ agencyId: null }, { agencyId: { $exists: false } }, { agencyId: '' }]
                });
                const wrong = total - withCorrectAgency - agencyless;
                if (wrong > 0 || agencyless > 0) {
                    console.log(`  ❌ ${colName}: ${total} total, ${withCorrectAgency} correct, ${wrong} wrong, ${agencyless} missing`);
                    issues.push(`${colName} has mismatched agencyIds`);
                } else {
                    console.log(`  ✅ ${colName}: all ${total} docs belong to "${agency.name}"`);
                }
            }

            // Usage counters
            const actualUsers = await prodDb.collection('users').countDocuments({ agencyId, archived: { $ne: true } });
            const actualProjects = await prodDb.collection('projects').countDocuments({ agencyId });
            const actualClients = await prodDb.collection('clients').countDocuments({ agencyId, archived: { $ne: true } });
            const usage = agency.usage || {};
            const countersOk = usage.users === actualUsers && usage.projects === actualProjects && usage.clients === actualClients;
            if (countersOk) {
                console.log(`  ✅ Usage counters correct: users=${actualUsers}, projects=${actualProjects}, clients=${actualClients}`);
            } else {
                console.log(`  ❌ Usage counters mismatch!`);
                issues.push('Usage counters still wrong');
            }
        }

        // 7. SuperAdmin data is separate
        console.log('\n═══ SUPERADMIN DATA (Separate) ═══');
        const superAdmin = await prodDb.collection('superadmins').findOne({});
        if (superAdmin) {
            console.log(`  ✅ SuperAdmin: "${superAdmin.name}" (${superAdmin.email})`);
            console.log(`     ID: ${superAdmin.id}, Role: ${superAdmin.role}`);
            console.log(`     Has password: ${superAdmin.password ? 'Yes' : 'NO!'}`);
        }
        const systemSettings = await prodDb.collection('systemsettings').findOne({});
        if (systemSettings) {
            console.log(`  ✅ SystemSettings: key="${systemSettings.key}"`);
        }
        const systemLogs = await prodDb.collection('systemlogs').countDocuments({});
        console.log(`  ✅ SystemLogs: ${systemLogs} entries`);

        // FINAL VERDICT
        console.log('\n' + '═'.repeat(50));
        if (issues.length === 0) {
            console.log('🎉 ALL CHECKS PASSED — Database is clean!');
        } else {
            console.log(`⚠️  ${issues.length} ISSUE(S) REMAIN:`);
            issues.forEach(i => console.log(`  • ${i}`));
        }
        console.log('═'.repeat(50));

    } catch (err) {
        console.error('Error:', err);
    } finally {
        await client.close();
    }
}

verify();

/**
 * Full Cluster Inspector — Inspects ALL databases in the MongoDB cluster
 * Especially the "test" database which has duplicate collections with data
 */
import { MongoClient } from 'mongodb';
import fs from 'fs';
import path from 'path';
import 'dotenv/config';

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
    throw new Error('MONGODB_URI is required. Set it in .env.local or the shell environment before running this script.');
}

async function inspect() {
    const client = new MongoClient(MONGODB_URI);
    const output = [];

    function log(msg) {
        console.log(msg);
        output.push(msg);
    }

    try {
        await client.connect();
        log('✅ Connected to MongoDB Cluster\n');

        // List all databases
        const adminDb = client.db().admin();
        const dbList = await adminDb.listDatabases();
        
        log('═'.repeat(70));
        log('ALL DATABASES IN CLUSTER');
        log('═'.repeat(70));
        for (const dbInfo of dbList.databases) {
            log(`  📦 ${dbInfo.name} — ${(dbInfo.sizeOnDisk / 1024 / 1024).toFixed(2)} MB`);
        }
        log('');

        // ============================================================
        // Inspect each database
        // ============================================================
        const databasesToInspect = ['agency-os', 'test', 'sample_mflix'];
        
        for (const dbName of databasesToInspect) {
            const db = client.db(dbName);
            const collections = await db.listCollections().toArray();
            
            log('\n' + '═'.repeat(70));
            log(`DATABASE: ${dbName} — ${collections.length} collections`);
            log('═'.repeat(70));
            
            for (const col of collections.sort((a, b) => a.name.localeCompare(b.name))) {
                const collection = db.collection(col.name);
                const count = await collection.countDocuments();
                
                log(`\n┌─ 📋 ${col.name} — ${count} documents`);
                
                if (count > 0) {
                    // Get all unique field names from sample
                    const sample = await collection.find().limit(3).toArray();
                    const allFields = new Set();
                    sample.forEach(doc => Object.keys(doc).forEach(k => allFields.add(k)));
                    log(`│  Fields: ${[...allFields].join(', ')}`);
                    
                    // Print condensed sample
                    for (let i = 0; i < sample.length; i++) {
                        const doc = sample[i];
                        const condensed = {};
                        for (const [key, val] of Object.entries(doc)) {
                            if (key === '_id') {
                                condensed._id = String(val);
                            } else if (key === 'password') {
                                condensed[key] = val ? '[HASHED]' : '[EMPTY]';
                            } else if (key === 'logo' || key === 'favicon' || key === 'avatar' || key === 'adharCardImage' || key === 'panCardImage' || key === 'image') {
                                condensed[key] = val ? `[${typeof val === 'string' && val.startsWith('data:') ? 'BASE64' : 'URL'}:${String(val).substring(0, 40)}...]` : null;
                            } else if (Array.isArray(val)) {
                                condensed[key] = `[Array(${val.length})]`;
                            } else if (val && typeof val === 'object' && !(val instanceof Date)) {
                                const keys = Object.keys(val);
                                condensed[key] = `{${keys.length} keys: ${keys.join(', ')}}`;
                            } else if (typeof val === 'string' && val.length > 100) {
                                condensed[key] = val.substring(0, 97) + '...';
                            } else {
                                condensed[key] = val;
                            }
                        }
                        log(`│  Doc[${i}]: ${JSON.stringify(condensed, null, 2).split('\n').join('\n│    ')}`);
                    }
                }
                log(`└─`);
            }
        }

        // ============================================================
        // CROSS-DATABASE COMPARISON: agency-os vs test
        // ============================================================
        log('\n\n' + '═'.repeat(70));
        log('CROSS-DATABASE ANALYSIS: agency-os vs test');
        log('═'.repeat(70));
        
        const agencyDb = client.db('agency-os');
        const testDb = client.db('test');
        
        const agencyCollections = (await agencyDb.listCollections().toArray()).map(c => c.name).sort();
        const testCollections = (await testDb.listCollections().toArray()).map(c => c.name).sort();
        
        // Collections in test but not in agency-os
        const onlyInTest = testCollections.filter(c => !agencyCollections.includes(c));
        const onlyInAgency = agencyCollections.filter(c => !testCollections.includes(c));
        const inBoth = testCollections.filter(c => agencyCollections.includes(c));
        
        if (onlyInTest.length > 0) {
            log(`\n⚠️  Collections ONLY in "test" (not in agency-os): ${onlyInTest.join(', ')}`);
        }
        if (onlyInAgency.length > 0) {
            log(`\n⚠️  Collections ONLY in "agency-os" (not in test): ${onlyInAgency.join(', ')}`);
        }
        
        log(`\n📊 Document count comparison (collections in both databases):`);
        log(`${'Collection'.padEnd(30)} | ${'agency-os'.padEnd(12)} | ${'test'.padEnd(12)} | Status`);
        log(`${'-'.repeat(30)}-+-${'-'.repeat(12)}-+-${'-'.repeat(12)}-+-----------`);
        
        for (const colName of inBoth) {
            const agencyCount = await agencyDb.collection(colName).countDocuments();
            const testCount = await testDb.collection(colName).countDocuments();
            
            let status = '';
            if (agencyCount === 0 && testCount > 0) status = '❌ DATA ONLY IN TEST!';
            else if (agencyCount > 0 && testCount === 0) status = '✅ Only in agency-os';
            else if (agencyCount > 0 && testCount > 0) status = '⚠️ DATA IN BOTH!';
            else status = '🔵 Both empty';
            
            log(`${colName.padEnd(30)} | ${String(agencyCount).padEnd(12)} | ${String(testCount).padEnd(12)} | ${status}`);
        }

        // ============================================================
        // DATA INTEGRITY IN TEST DATABASE
        // ============================================================
        log('\n\n' + '═'.repeat(70));
        log('DATA INTEGRITY CHECKS ON "test" DATABASE');
        log('═'.repeat(70));
        
        // Check 1: Orphaned tasks
        log('\n🔍 CHECK 1: Orphaned Tasks in test DB');
        const testProjectIds = await testDb.collection('projects').distinct('id');
        const testTaskProjectIds = await testDb.collection('tasks').distinct('projectId');
        const orphanedTaskProjects = testTaskProjectIds.filter(pid => !testProjectIds.includes(pid));
        if (orphanedTaskProjects.length > 0) {
            log(`  ❌ BUG: ${orphanedTaskProjects.length} tasks reference non-existent projects`);
            const orphanedTasks = await testDb.collection('tasks').find({ projectId: { $in: orphanedTaskProjects } }).project({ id: 1, title: 1, projectId: 1 }).toArray();
            orphanedTasks.forEach(t => log(`     - Task "${t.title}" (${t.id}) → projectId: ${t.projectId}`));
        } else {
            log('  ✅ All tasks reference valid projects');
        }

        // Check 2: Orphaned invoices
        log('\n🔍 CHECK 2: Orphaned Invoices in test DB');
        const testInvoiceProjectIds = await testDb.collection('invoices').distinct('projectId');
        const orphanedInvProjects = testInvoiceProjectIds.filter(pid => !testProjectIds.includes(pid));
        if (orphanedInvProjects.length > 0) {
            log(`  ❌ BUG: ${orphanedInvProjects.length} invoices reference non-existent projects`);
            const count = await testDb.collection('invoices').countDocuments({ projectId: { $in: orphanedInvProjects } });
            log(`     → ${count} invoice documents affected`);
        } else {
            log('  ✅ All invoices reference valid projects');
        }

        // Check 3: Orphaned assets
        log('\n🔍 CHECK 3: Orphaned Assets in test DB');
        const testAssetProjectIds = await testDb.collection('assets').distinct('projectId');
        const orphanedAssetProjects = testAssetProjectIds.filter(pid => !testProjectIds.includes(pid));
        if (orphanedAssetProjects.length > 0) {
            log(`  ❌ BUG: ${orphanedAssetProjects.length} assets reference non-existent projects`);
            const orphanedAssets = await testDb.collection('assets').find({ projectId: { $in: orphanedAssetProjects } }).project({ id: 1, name: 1, projectId: 1 }).toArray();
            orphanedAssets.forEach(a => log(`     - Asset "${a.name}" (${a.id}) → projectId: ${a.projectId}`));
        } else {
            log('  ✅ All assets reference valid projects');
        }

        // Check 4: Tasks with invalid assignee
        log('\n🔍 CHECK 4: Tasks with invalid assigneeId in test DB');
        const testUserIds = await testDb.collection('users').distinct('id');
        const testAssigneeIds = await testDb.collection('tasks').distinct('assigneeId');
        const invalidAssignees = testAssigneeIds.filter(aid => !testUserIds.includes(aid));
        if (invalidAssignees.length > 0) {
            log(`  ❌ BUG: ${invalidAssignees.length} tasks reference non-existent assignees: ${invalidAssignees.join(', ')}`);
            const count = await testDb.collection('tasks').countDocuments({ assigneeId: { $in: invalidAssignees } });
            log(`     → ${count} task documents affected`);
        } else {
            log('  ✅ All task assignees are valid');
        }

        // Check 5: Projects with invalid clientId
        log('\n🔍 CHECK 5: Projects with invalid clientId in test DB');
        const testClientIds = await testDb.collection('clients').distinct('id');
        const projectClientIds = (await testDb.collection('projects').distinct('clientId')).filter(Boolean);
        const invalidClients = projectClientIds.filter(cid => !testClientIds.includes(cid));
        if (invalidClients.length > 0) {
            log(`  ❌ BUG: ${invalidClients.length} projects reference non-existent clients`);
            const affectedProjects = await testDb.collection('projects').find({ clientId: { $in: invalidClients } }).project({ id: 1, name: 1, clientId: 1, client: 1 }).toArray();
            affectedProjects.forEach(p => log(`     - Project "${p.name}" (${p.id}) → clientId: ${p.clientId}, client name: "${p.client}"`));
        } else {
            log('  ✅ All projects reference valid clients');
        }

        // Check 6: Transactions with invalid references
        log('\n🔍 CHECK 6: Transactions with invalid projectId in test DB');
        const txProjectIds = (await testDb.collection('transactions').distinct('projectId')).filter(Boolean);
        const invalidTxProjects = txProjectIds.filter(pid => !testProjectIds.includes(pid));
        if (invalidTxProjects.length > 0) {
            log(`  ❌ BUG: ${invalidTxProjects.length} transactions reference non-existent projects`);
            const count = await testDb.collection('transactions').countDocuments({ projectId: { $in: invalidTxProjects } });
            log(`     → ${count} transaction documents affected`);
            const affectedTx = await testDb.collection('transactions').find({ projectId: { $in: invalidTxProjects } }).project({ id: 1, description: 1, projectId: 1, amount: 1 }).limit(10).toArray();
            affectedTx.forEach(t => log(`     - Tx "${t.description}" ($${t.amount}) → projectId: ${t.projectId}`));
        } else {
            log('  ✅ All transactions reference valid projects');
        }

        // Check 7: Transactions with invalid userId
        log('\n🔍 CHECK 7: Transactions with invalid userId in test DB');
        const txUserIds = (await testDb.collection('transactions').distinct('userId')).filter(Boolean);
        const invalidTxUsers = txUserIds.filter(uid => !testUserIds.includes(uid));
        if (invalidTxUsers.length > 0) {
            log(`  ❌ BUG: ${invalidTxUsers.length} transactions reference non-existent users`);
            const count = await testDb.collection('transactions').countDocuments({ userId: { $in: invalidTxUsers } });
            log(`     → ${count} transaction documents affected`);
        } else {
            log('  ✅ All transactions reference valid users');
        }

        // Check 8: Missing agencyId
        log('\n🔍 CHECK 8: Documents missing agencyId in test DB');
        const agencyColNames = ['users', 'clients', 'projects', 'tasks', 'invoices', 'transactions', 'services', 'notifications', 'activities', 'assets', 'messages', 'leaverequests'];
        for (const colName of agencyColNames) {
            try {
                const missingCount = await testDb.collection(colName).countDocuments({
                    $or: [{ agencyId: null }, { agencyId: { $exists: false } }, { agencyId: '' }]
                });
                if (missingCount > 0) {
                    log(`  ❌ ${colName}: ${missingCount} documents missing agencyId`);
                }
            } catch { }
        }
        log('  ✅ agencyId check complete');

        // Check 9: Duplicate IDs
        log('\n🔍 CHECK 9: Duplicate IDs in test DB');
        for (const colName of agencyColNames) {
            try {
                const dupes = await testDb.collection(colName).aggregate([
                    { $group: { _id: '$id', count: { $sum: 1 } } },
                    { $match: { count: { $gt: 1 } } }
                ]).toArray();
                if (dupes.length > 0) {
                    log(`  ❌ ${colName}: ${dupes.length} duplicate IDs: ${dupes.map(d => `"${d._id}" (${d.count}x)`).join(', ')}`);
                }
            } catch { }
        }
        log('  ✅ Duplicate ID check complete');

        // Check 10: Stale user names in activities
        log('\n🔍 CHECK 10: Stale user names in test.activities');
        const testUsers = await testDb.collection('users').find().project({ id: 1, name: 1 }).toArray();
        const userNameMap = {};
        testUsers.forEach(u => { userNameMap[u.id] = u.name; });
        const testActivities = await testDb.collection('activities').find({ userId: { $exists: true, $ne: null } }).project({ userId: 1, user: 1 }).toArray();
        let staleCount = 0;
        for (const act of testActivities) {
            if (act.userId && userNameMap[act.userId] && userNameMap[act.userId] !== act.user) {
                if (staleCount < 5) log(`  ⚠️ Activity user="${act.user}" but current name="${userNameMap[act.userId]}" (${act.userId})`);
                staleCount++;
            }
        }
        if (staleCount > 0) log(`  ❌ Total: ${staleCount} activities with stale names`);
        else log('  ✅ Activity user names are consistent');

        // Check 11: Stale client names in projects
        log('\n🔍 CHECK 11: Stale client names in test.projects');
        const testClients = await testDb.collection('clients').find().project({ id: 1, name: 1 }).toArray();
        const clientNameMap = {};
        testClients.forEach(c => { clientNameMap[c.id] = c.name; });
        const projs = await testDb.collection('projects').find({ clientId: { $exists: true, $ne: null } }).project({ clientId: 1, client: 1, name: 1 }).toArray();
        let staleClientCount = 0;
        for (const p of projs) {
            if (p.clientId && clientNameMap[p.clientId] && clientNameMap[p.clientId] !== p.client) {
                log(`  ⚠️ Project "${p.name}" has client="${p.client}" but current name="${clientNameMap[p.clientId]}"`);
                staleClientCount++;
            }
        }
        if (staleClientCount > 0) log(`  ❌ Total: ${staleClientCount} projects with stale client names`);
        else log('  ✅ Project client names are consistent');

        // Check 12: Agency usage counters
        log('\n🔍 CHECK 12: Agency usage counters vs actual in test DB');
        const testAgencies = await testDb.collection('agencies').find().toArray();
        for (const agency of testAgencies) {
            const actualUsers = await testDb.collection('users').countDocuments({ agencyId: agency.id, archived: { $ne: true } });
            const actualProjects = await testDb.collection('projects').countDocuments({ agencyId: agency.id });
            const actualClients = await testDb.collection('clients').countDocuments({ agencyId: agency.id, archived: { $ne: true } });
            const usage = agency.usage || {};
            const issues = [];
            if (usage.users !== undefined && usage.users !== actualUsers) issues.push(`users: tracked=${usage.users}, actual=${actualUsers}`);
            if (usage.projects !== undefined && usage.projects !== actualProjects) issues.push(`projects: tracked=${usage.projects}, actual=${actualProjects}`);
            if (usage.clients !== undefined && usage.clients !== actualClients) issues.push(`clients: tracked=${usage.clients}, actual=${actualClients}`);
            if (issues.length > 0) {
                log(`  ❌ Agency "${agency.name}" (${agency.id}): ${issues.join('; ')}`);
            } else {
                log(`  ✅ Agency "${agency.name}" counters match`);
            }
        }

        // Check 13: Settings for non-existent agencies
        log('\n🔍 CHECK 13: Orphaned settings in test DB');
        const testAgencyIds = await testDb.collection('agencies').distinct('id');
        const testSettingsAgencyIds = await testDb.collection('settings').distinct('agencyId');
        const orphanedSettingsIds = testSettingsAgencyIds.filter(aid => aid && !testAgencyIds.includes(aid));
        const noAgencySettings = await testDb.collection('settings').countDocuments({
            $or: [{ agencyId: null }, { agencyId: { $exists: false } }, { agencyId: '' }]
        });
        if (orphanedSettingsIds.length > 0) log(`  ❌ Settings for non-existent agencies: ${orphanedSettingsIds.join(', ')}`);
        if (noAgencySettings > 0) log(`  ❌ ${noAgencySettings} settings docs with no agencyId`);
        if (orphanedSettingsIds.length === 0 && noAgencySettings === 0) log('  ✅ All settings reference valid agencies');

        // Check 14: Notifications for non-existent users
        log('\n🔍 CHECK 14: Notifications for non-existent users in test DB');
        const notifUserIds = await testDb.collection('notifications').distinct('userId');
        const invalidNotifUsers = notifUserIds.filter(uid => !testUserIds.includes(uid));
        if (invalidNotifUsers.length > 0) {
            const count = await testDb.collection('notifications').countDocuments({ userId: { $in: invalidNotifUsers } });
            log(`  ❌ ${count} notifications for non-existent users`);
            invalidNotifUsers.forEach(uid => log(`     - userId: ${uid}`));
        } else {
            log('  ✅ All notifications reference valid users');
        }

        // Check 15: Leave requests for non-existent users
        log('\n🔍 CHECK 15: Leave requests for non-existent users in test DB');
        const leaveUserIds = await testDb.collection('leaverequests').distinct('userId');
        const invalidLeaveUsers = leaveUserIds.filter(uid => !testUserIds.includes(uid));
        if (invalidLeaveUsers.length > 0) {
            const count = await testDb.collection('leaverequests').countDocuments({ userId: { $in: invalidLeaveUsers } });
            log(`  ❌ ${count} leave requests for non-existent users`);
        } else {
            log('  ✅ All leave requests reference valid users');
        }

        // ============================================================
        // SAMPLE_MFLIX CHECK
        // ============================================================
        log('\n\n' + '═'.repeat(70));
        log('⚠️  SAMPLE_MFLIX DATABASE — UNNECESSARY SAMPLE DATA');
        log('═'.repeat(70));
        const mflixDb = client.db('sample_mflix');
        const mflixCollections = await mflixDb.listCollections().toArray();
        let totalMflixDocs = 0;
        for (const col of mflixCollections) {
            const count = await mflixDb.collection(col.name).countDocuments();
            totalMflixDocs += count;
            log(`  ${col.name}: ${count} documents`);
        }
        log(`  TOTAL: ${totalMflixDocs} documents of unnecessary sample data`);
        log(`  ⚠️  This database should be DELETED — it's MongoDB sample data, not part of your app.`);

        // Write output
        const outPath = path.join(process.cwd(), 'full-cluster-report.txt');
        fs.writeFileSync(outPath, output.join('\n'), 'utf8');
        log(`\n📄 Full report saved to: ${outPath}`);

    } catch (err) {
        console.error('❌ Error:', err);
    } finally {
        await client.close();
        log('\n🔌 Disconnected');
    }
}

inspect();

/**
 * Database Cleanup Script — One-time cleanup of the entire MongoDB cluster
 * 
 * Operations:
 * 1. Delete `sample_mflix` database (123MB junk)
 * 2. Drop `test` database (old pre-migration data with agencyId: "agency-1")
 * 3. Delete orphaned settings doc in `agency-os` (no agencyId)
 * 4. Fix AI usage logs (wrong agencyId "agency-1" → correct UUID)
 * 5. Fix admin user password (empty → hashed temp password)
 * 6. Verify final state
 */
import { MongoClient } from 'mongodb';
import bcrypt from 'bcryptjs';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://chandanvsharma00_agencyos:tUhRWo1W1PdzfsJI@cluster0.o2mv8lz.mongodb.net/?appName=Cluster0';
const PRODUCTION_DB = 'agency-os';

async function cleanup() {
    const client = new MongoClient(MONGODB_URI);
    const results = { success: [], failed: [], skipped: [] };

    function ok(msg) { console.log(`  ✅ ${msg}`); results.success.push(msg); }
    function fail(msg) { console.error(`  ❌ ${msg}`); results.failed.push(msg); }
    function skip(msg) { console.log(`  ⏭️  ${msg}`); results.skipped.push(msg); }

    try {
        await client.connect();
        console.log('✅ Connected to MongoDB Cluster\n');

        // =====================================================================
        // STEP 0: BEFORE STATE — snapshot
        // =====================================================================
        console.log('═'.repeat(60));
        console.log('BEFORE CLEANUP — Database Snapshot');
        console.log('═'.repeat(60));
        const adminDb = client.db().admin();
        const dbListBefore = await adminDb.listDatabases();
        for (const db of dbListBefore.databases) {
            const cols = await client.db(db.name).listCollections().toArray();
            let totalDocs = 0;
            for (const col of cols) {
                totalDocs += await client.db(db.name).collection(col.name).countDocuments();
            }
            console.log(`  📦 ${db.name} — ${(db.sizeOnDisk / 1024 / 1024).toFixed(2)} MB, ${cols.length} collections, ${totalDocs} docs`);
        }

        const prodDb = client.db(PRODUCTION_DB);

        // =====================================================================
        // STEP 1: Get the correct production agency ID
        // =====================================================================
        console.log('\n' + '═'.repeat(60));
        console.log('STEP 1: Identify production agency');
        console.log('═'.repeat(60));
        
        const prodAgency = await prodDb.collection('agencies').findOne({});
        if (!prodAgency) {
            fail('No agency found in production database! Aborting.');
            return;
        }
        const CORRECT_AGENCY_ID = prodAgency.id;
        console.log(`  Production agency: "${prodAgency.name}" (${CORRECT_AGENCY_ID})`);
        ok(`Agency identified: ${prodAgency.name}`);

        // =====================================================================
        // STEP 2: Delete sample_mflix database
        // =====================================================================
        console.log('\n' + '═'.repeat(60));
        console.log('STEP 2: Delete sample_mflix database');
        console.log('═'.repeat(60));

        try {
            const mflixDb = client.db('sample_mflix');
            const mflixCols = await mflixDb.listCollections().toArray();
            if (mflixCols.length > 0) {
                let totalMflixDocs = 0;
                for (const col of mflixCols) {
                    totalMflixDocs += await mflixDb.collection(col.name).countDocuments();
                }
                console.log(`  Found ${mflixCols.length} collections, ${totalMflixDocs} documents`);
                await mflixDb.dropDatabase();
                ok(`Dropped sample_mflix (${totalMflixDocs} docs deleted)`);
            } else {
                skip('sample_mflix already empty/gone');
            }
        } catch (e) {
            fail(`Failed to drop sample_mflix: ${e.message}`);
        }

        // =====================================================================
        // STEP 3: Drop test database
        // =====================================================================
        console.log('\n' + '═'.repeat(60));
        console.log('STEP 3: Drop test database');
        console.log('═'.repeat(60));

        try {
            const testDb = client.db('test');
            const testCols = await testDb.listCollections().toArray();
            if (testCols.length > 0) {
                let totalTestDocs = 0;
                for (const col of testCols) {
                    const count = await testDb.collection(col.name).countDocuments();
                    console.log(`  📋 ${col.name}: ${count} docs`);
                    totalTestDocs += count;
                }
                console.log(`  Total: ${totalTestDocs} documents in ${testCols.length} collections`);
                await testDb.dropDatabase();
                ok(`Dropped test database (${totalTestDocs} docs deleted)`);
            } else {
                skip('test database already empty/gone');
            }
        } catch (e) {
            fail(`Failed to drop test database: ${e.message}`);
        }

        // =====================================================================
        // STEP 4: Delete orphaned settings doc (no agencyId)
        // =====================================================================
        console.log('\n' + '═'.repeat(60));
        console.log('STEP 4: Delete orphaned settings doc in agency-os');
        console.log('═'.repeat(60));

        try {
            const orphanedSettings = await prodDb.collection('settings').find({
                $or: [
                    { agencyId: null },
                    { agencyId: { $exists: false } },
                    { agencyId: '' }
                ]
            }).toArray();

            if (orphanedSettings.length > 0) {
                for (const doc of orphanedSettings) {
                    console.log(`  Orphaned: _id=${doc._id}, systemName="${doc.systemName}", created=${doc.createdAt}`);
                }
                const delResult = await prodDb.collection('settings').deleteMany({
                    $or: [
                        { agencyId: null },
                        { agencyId: { $exists: false } },
                        { agencyId: '' }
                    ]
                });
                ok(`Deleted ${delResult.deletedCount} orphaned settings doc(s)`);
            } else {
                skip('No orphaned settings docs found');
            }
        } catch (e) {
            fail(`Failed to delete orphaned settings: ${e.message}`);
        }

        // =====================================================================
        // STEP 5: Fix AI usage logs — wrong agencyId
        // =====================================================================
        console.log('\n' + '═'.repeat(60));
        console.log('STEP 5: Fix AI usage logs (agencyId "agency-1" → correct UUID)');
        console.log('═'.repeat(60));

        try {
            const wrongLogs = await prodDb.collection('aiusagelogs').countDocuments({
                agencyId: 'agency-1'
            });

            if (wrongLogs > 0) {
                console.log(`  Found ${wrongLogs} logs with wrong agencyId "agency-1"`);
                const updateResult = await prodDb.collection('aiusagelogs').updateMany(
                    { agencyId: 'agency-1' },
                    { $set: { agencyId: CORRECT_AGENCY_ID } }
                );
                ok(`Updated ${updateResult.modifiedCount} AI usage logs to agencyId: ${CORRECT_AGENCY_ID}`);
            } else {
                skip('No AI usage logs with wrong agencyId');
            }
        } catch (e) {
            fail(`Failed to fix AI usage logs: ${e.message}`);
        }

        // =====================================================================
        // STEP 6: Fix admin user password
        // =====================================================================
        console.log('\n' + '═'.repeat(60));
        console.log('STEP 6: Fix admin user with empty password');
        console.log('═'.repeat(60));

        try {
            const emptyPwdUsers = await prodDb.collection('users').find({
                $or: [
                    { password: '' },
                    { password: null },
                    { password: { $exists: false } }
                ]
            }).project({ id: 1, name: 1, email: 1, role: 1 }).toArray();

            if (emptyPwdUsers.length > 0) {
                for (const user of emptyPwdUsers) {
                    console.log(`  Empty password: "${user.name}" (${user.email}, role: ${user.role})`);
                    
                    // Set a temp password — user MUST change it on next login
                    const tempPassword = 'Agency@123';
                    const hashedPassword = await bcrypt.hash(tempPassword, 12);
                    
                    await prodDb.collection('users').updateOne(
                        { _id: user._id },
                        { $set: { password: hashedPassword } }
                    );
                    ok(`Set temp password for "${user.name}" (${user.email}) — temp pwd: Agency@123`);
                }
            } else {
                skip('No users with empty passwords');
            }
        } catch (e) {
            fail(`Failed to fix user passwords: ${e.message}`);
        }

        // =====================================================================
        // STEP 7: Fix userId in AI usage logs (old format → find closest match)
        // =====================================================================
        console.log('\n' + '═'.repeat(60));
        console.log('STEP 7: Check and fix AI usage log userIds');
        console.log('═'.repeat(60));

        try {
            const aiLogs = await prodDb.collection('aiusagelogs').find({}).toArray();
            const validUserIds = await prodDb.collection('users').distinct('id');
            const superAdminId = (await prodDb.collection('superadmins').findOne({}))?.id;
            
            let fixed = 0;
            for (const log of aiLogs) {
                if (log.userId && !validUserIds.includes(log.userId) && log.userId !== superAdminId) {
                    // This userId doesn't exist — it's from old system
                    // Map it to the admin user (since they were the one using Singularity)
                    const adminUser = await prodDb.collection('users').findOne({ 
                        agencyId: CORRECT_AGENCY_ID, role: 'admin' 
                    });
                    if (adminUser) {
                        await prodDb.collection('aiusagelogs').updateOne(
                            { _id: log._id },
                            { $set: { userId: adminUser.id } }
                        );
                        console.log(`  Fixed: log ${log._id} userId "${log.userId}" → "${adminUser.id}"`);
                        fixed++;
                    }
                }
            }
            if (fixed > 0) ok(`Fixed ${fixed} AI usage log userIds`);
            else skip('All AI usage log userIds are valid or already correct');
        } catch (e) {
            fail(`Failed to fix AI usage log userIds: ${e.message}`);
        }

        // =====================================================================
        // STEP 8: Verify all notifications reference valid users
        // =====================================================================
        console.log('\n' + '═'.repeat(60));
        console.log('STEP 8: Clean orphaned notifications');
        console.log('═'.repeat(60));

        try {
            const allUserIds = await prodDb.collection('users').distinct('id');
            const allClientIds = await prodDb.collection('clients').distinct('id');
            const allValidIds = [...allUserIds, ...allClientIds];
            
            const orphanedNotifs = await prodDb.collection('notifications').find({
                userId: { $nin: allValidIds }
            }).toArray();

            if (orphanedNotifs.length > 0) {
                for (const n of orphanedNotifs) {
                    console.log(`  Orphaned notification: "${n.message?.substring(0, 50)}..." → userId: ${n.userId}`);
                }
                const delResult = await prodDb.collection('notifications').deleteMany({
                    userId: { $nin: allValidIds }
                });
                ok(`Deleted ${delResult.deletedCount} orphaned notification(s)`);
            } else {
                skip('All notifications reference valid users');
            }
        } catch (e) {
            fail(`Failed to clean orphaned notifications: ${e.message}`);
        }

        // =====================================================================
        // STEP 9: Verify agency usage counters
        // =====================================================================
        console.log('\n' + '═'.repeat(60));
        console.log('STEP 9: Sync agency usage counters');
        console.log('═'.repeat(60));

        try {
            const agencies = await prodDb.collection('agencies').find({}).toArray();
            for (const agency of agencies) {
                const actualUsers = await prodDb.collection('users').countDocuments({ 
                    agencyId: agency.id, archived: { $ne: true } 
                });
                const actualProjects = await prodDb.collection('projects').countDocuments({ agencyId: agency.id });
                const actualClients = await prodDb.collection('clients').countDocuments({ 
                    agencyId: agency.id, archived: { $ne: true } 
                });

                const usage = agency.usage || {};
                const updates = {};
                if (usage.users !== actualUsers) updates['usage.users'] = actualUsers;
                if (usage.projects !== actualProjects) updates['usage.projects'] = actualProjects;
                if (usage.clients !== actualClients) updates['usage.clients'] = actualClients;

                if (Object.keys(updates).length > 0) {
                    await prodDb.collection('agencies').updateOne(
                        { _id: agency._id },
                        { $set: updates }
                    );
                    ok(`Synced counters for "${agency.name}": users=${actualUsers}, projects=${actualProjects}, clients=${actualClients}`);
                } else {
                    skip(`Counters already correct for "${agency.name}"`);
                }
            }
        } catch (e) {
            fail(`Failed to sync usage counters: ${e.message}`);
        }

        // =====================================================================
        // STEP 10: AFTER STATE — final snapshot
        // =====================================================================
        console.log('\n' + '═'.repeat(60));
        console.log('AFTER CLEANUP — Database Snapshot');
        console.log('═'.repeat(60));

        const dbListAfter = await adminDb.listDatabases();
        for (const db of dbListAfter.databases) {
            const cols = await client.db(db.name).listCollections().toArray();
            let totalDocs = 0;
            for (const col of cols) {
                totalDocs += await client.db(db.name).collection(col.name).countDocuments();
            }
            console.log(`  📦 ${db.name} — ${(db.sizeOnDisk / 1024 / 1024).toFixed(2)} MB, ${cols.length} collections, ${totalDocs} docs`);
        }

        // =====================================================================
        // Final production DB detail
        // =====================================================================
        console.log('\n' + '═'.repeat(60));
        console.log(`FINAL STATE — ${PRODUCTION_DB} Database Detail`);
        console.log('═'.repeat(60));

        const finalCols = await prodDb.listCollections().toArray();
        for (const col of finalCols.sort((a, b) => a.name.localeCompare(b.name))) {
            const count = await prodDb.collection(col.name).countDocuments();
            const icon = count > 0 ? '📋' : '📭';
            console.log(`  ${icon} ${col.name}: ${count} documents`);
        }

        // =====================================================================
        // SUMMARY
        // =====================================================================
        console.log('\n' + '═'.repeat(60));
        console.log('CLEANUP SUMMARY');
        console.log('═'.repeat(60));
        console.log(`  ✅ Successful: ${results.success.length}`);
        results.success.forEach(s => console.log(`     • ${s}`));
        if (results.failed.length > 0) {
            console.log(`  ❌ Failed: ${results.failed.length}`);
            results.failed.forEach(f => console.log(`     • ${f}`));
        }
        if (results.skipped.length > 0) {
            console.log(`  ⏭️  Skipped: ${results.skipped.length}`);
            results.skipped.forEach(s => console.log(`     • ${s}`));
        }

        console.log('\n⚠️  IMPORTANT: Temp password for admin user chandan sharma is: Agency@123');
        console.log('   Please change it immediately after logging in!\n');

    } catch (err) {
        console.error('💥 Fatal error:', err);
    } finally {
        await client.close();
        console.log('🔌 Disconnected');
    }
}

cleanup();

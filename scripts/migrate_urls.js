const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, '..', 'data', 'db.json');

function generateSlug(name) {
    return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

function generateUsername(name) {
    return name.toLowerCase().replace(/[^a-z0-9]+/g, '');
}

async function migrate() {
    try {
        console.log(`Reading DB from ${DB_PATH}...`);
        const data = JSON.parse(fs.readFileSync(DB_PATH, 'utf-8'));
        let changes = 0;

        // Migrate Users
        if (data.users) {
            const usernames = new Set();
            // First pass: collect existing usernames if any
            data.users.forEach(u => {
                if (u.username) usernames.add(u.username);
            });

            data.users = data.users.map(u => {
                if (!u.username) {
                    let base = generateUsername(u.name);
                    let unique = base;
                    let counter = 1;
                    while (usernames.has(unique)) {
                        unique = `${base}${counter}`;
                        counter++;
                    }
                    u.username = unique;
                    usernames.add(unique);
                    changes++;
                    console.log(`Updated User: ${u.name} -> ${u.username}`);
                }
                return u;
            });
        }

        // Migrate Projects
        if (data.projects) {
            const slugs = new Set();
            data.projects.forEach(p => {
                if (p.slug) slugs.add(p.slug);
            });

            data.projects = data.projects.map(p => {
                if (!p.slug) {
                    let base = generateSlug(p.name);
                    let unique = base;
                    let counter = 1;
                    while (slugs.has(unique)) {
                        unique = `${base}-${counter}`;
                        counter++;
                    }
                    p.slug = unique;
                    slugs.add(unique);
                    changes++;
                    console.log(`Updated Project: ${p.name} -> ${p.slug}`);
                }
                return p;
            });
        }

        if (changes > 0) {
            fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
            console.log(`Migration complete. ${changes} records updated.`);
        } else {
            console.log("No changes needed.");
        }

    } catch (error) {
        console.error("Migration failed:", error);
    }
}

migrate();

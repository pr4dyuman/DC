
const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(process.cwd(), 'data', 'db.json');

try {
    const raw = fs.readFileSync(DB_PATH, 'utf-8');
    const data = JSON.parse(raw);

    let fixedCount = 0;
    if (data.projects) {
        data.projects = data.projects.map(p => {
            if (p.slug && p.slug.includes(' ')) {
                const newSlug = p.slug.replace(/\s+/g, '-').toLowerCase();
                console.log(`Fixing project "${p.name}": "${p.slug}" -> "${newSlug}"`);
                fixedCount++;
                return { ...p, slug: newSlug };
            }
            return p;
        });
    }

    if (fixedCount > 0) {
        fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
        console.log(`Successfully fixed ${fixedCount} broken slugs.`);
    } else {
        console.log("No broken slugs found.");
    }

} catch (e) {
    console.error("Error running repair:", e);
}

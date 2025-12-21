
const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, 'data', 'db.json');
const data = JSON.parse(fs.readFileSync(dbPath, 'utf8'));

console.log('Total Projects:', data.projects.length);
data.projects.forEach(p => {
    console.log(`- ${p.name} (Client: ${p.client}, ID: ${p.clientId})`);
});

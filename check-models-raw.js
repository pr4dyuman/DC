
const https = require('https');
require('dotenv').config({ path: '.env.local' });

const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
    console.error("No API Key found");
    process.exit(1);
}

const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;

https.get(url, (res) => {
    let data = '';

    res.on('data', (chunk) => {
        data += chunk;
    });

    res.on('end', () => {
        try {
            const json = JSON.parse(data);
            if (json.error) {
                console.error("API Error:", json.error.message);
            } else if (json.models) {
                console.log("Available Models:");
                json.models.forEach(m => console.log(`- ${m.name.replace('models/', '')}`));
            } else {
                console.log("No models found or unexpected format:", data.substring(0, 200));
            }
        } catch (e) {
            console.error("Parse Error:", e.message, data.substring(0, 200));
        }
    });

}).on("error", (err) => {
    console.error("Network Error:", err.message);
});

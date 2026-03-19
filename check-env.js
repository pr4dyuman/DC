/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '.env.local');

console.log('--- ENV CHECK SCRIPT ---');
console.log('Checking path:', envPath);

if (fs.existsSync(envPath)) {
    console.log('File exists.');
    const content = fs.readFileSync(envPath);
    console.log('Raw buffer length:', content.length);
    console.log('First 20 bytes:', content.subarray(0, 20));
    
    // Try UTF-8
    const textUtf8 = content.toString('utf8');
    if (textUtf8.includes('BREVO_API_KEY')) {
        console.log('UTF-8 Decode Successful. Key found.');
    } else {
        console.log('UTF-8 Decode Failed to find key.');
    }

    // Check lines
    const lines = textUtf8.split('\n');
    lines.forEach((line, i) => {
        if (line.includes('BREVO')) {
            console.log(`Line ${i}: ${line.trim().substring(0, 20)}...`);
        }
    });

} else {
    console.log('File does NOT exist.');
}
console.log('--- END CHECK ---');

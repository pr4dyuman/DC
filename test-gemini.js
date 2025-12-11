const { GoogleGenerativeAI } = require("@google/generative-ai");
require('dotenv').config({ path: '.env.local' });

async function testGemini() {
    const apiKey = process.env.GEMINI_API_KEY;
    console.log("Testing Gemini API...");
    console.log("API Key Present:", !!apiKey);
    console.log("API Key Length:", apiKey ? apiKey.length : 0);

    if (!apiKey) {
        console.error("ERROR: No API Key found in .env.local");
        return;
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-pro" });

    try {
        console.log("Sending request to gemini-pro...");
        const result = await model.generateContent("Say hello!");
        const response = await result.response;
        console.log("SUCCESS! Response:", response.text());
    } catch (error) {
        console.error("FAILURE:");
        console.error(error);
        if (error.response) {
            console.error("Response Details:", JSON.stringify(error.response, null, 2));
        }
    }
}

testGemini();

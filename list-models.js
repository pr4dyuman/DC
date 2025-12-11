
const { GoogleGenerativeAI } = require("@google/generative-ai");
require('dotenv').config({ path: '.env.local' });

async function listModels() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        console.error("No GEMINI_API_KEY found.");
        return;
    }

    const genAI = new GoogleGenerativeAI(apiKey);

    try {
        // There isn't a direct "listModels" on the client instance in some versions, 
        // but we can try to use the model not found error usage or just try a known one to verify.
        // actually, the error message said "Call ListModels". 
        // In the Node SDK, it's usually accessible via the API or we can just try to run a simple generate on a few candidates.

        // Let's try to infer from the error we got.
        // But better yet, let's just try to hit the API endpoint directly if the SDK doesn't expose it easily in this version.
        // Or we can try the `getGenerativeModel` with standard ones.

        // Using the SDK:
        // Some versions expose it on the GoogleGenerativeAI instance or via a helper.
        // For now, I'll essentially try to 'guess' by trying checking standard ones.

        const candidateModels = [
            "gemini-2.0-flash-exp",
            "gemini-1.5-pro",
            "gemini-1.5-pro-latest",
            "gemini-1.5-flash",
            "gemini-1.5-flash-latest",
            "gemini-1.0-pro",
            "gemini-pro"
        ];

        console.log("Testing Model Availability...");

        for (const modelName of candidateModels) {
            try {
                const model = genAI.getGenerativeModel({ model: modelName });
                const result = await model.generateContent("Hello");
                console.log(`✅ ${modelName} is AVAILABLE`);
            } catch (error) {
                console.log(`❌ ${modelName} failed: ${error.message.split('\n')[0]}`);
            }
        }

    } catch (error) {
        console.error("Error:", error);
    }
}

listModels();

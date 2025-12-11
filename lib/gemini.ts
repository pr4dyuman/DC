import { GoogleGenerativeAI } from "@google/generative-ai";

const apiKey = process.env.GEMINI_API_KEY;

// Debug log to check if key is loaded (safe, doesn't print key)
console.log("Gemini Config - API Key Present:", !!apiKey);
if (apiKey) console.log("Gemini Config - Key Length:", apiKey.length);

if (!apiKey) {
    console.warn("GEMINI_API_KEY is not set in environment variables (or .env.local isn't loaded yet).");
}

const genAI = new GoogleGenerativeAI(apiKey || "");

// Switching to 'gemini-1.5-flash' which is the best model for the Free Tier (higher rate limits, reliable).
// 'gemini-1.5-pro' often hits quotas on free accounts.
export const genAIInstance = genAI;
export const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

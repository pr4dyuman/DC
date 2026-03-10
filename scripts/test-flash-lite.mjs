/**
 * Test script for gemini-3.1-flash-lite-preview via standard text API.
 * Tests basic generation, tool-use prompts, and short-prompt handling.
 */
import { GoogleGenerativeAI } from "@google/generative-ai";

const API_KEY = process.env.GEMINI_API_KEY;
if (!API_KEY) { console.error("Set GEMINI_API_KEY"); process.exit(1); }

const MODEL = "gemini-3.1-flash-lite-preview";
const genAI = new GoogleGenerativeAI(API_KEY);
const model = genAI.getGenerativeModel({ model: MODEL });

const tests = [
  { name: "Simple greeting", prompt: "Hello, how are you?" },
  { name: "Finance summary", prompt: "Give me a finance summary for my agency." },
  { name: "Short prompt", prompt: "List projects" },
  { name: "Team workload", prompt: "Show team workload overview" },
  { name: "Tool-aware question", prompt: "What tools do you have access to?" },
  {
    name: "Continuation check", 
    prompt: "User asked: Finance summary\n\nSingularity: Here\n\nUser: Was your previous answer fully complete, or did it get cut off? If it was complete (even if short), reply with exactly the word COMPLETE and nothing else. If it was cut off or incomplete, continue your answer from exactly where you left off — do NOT repeat what you already said."
  },
  {
    name: "Continuation check (complete answer)",
    prompt: "User asked: What is 2+2?\n\nSingularity: 4.\n\nUser: Was your previous answer fully complete, or did it get cut off? If it was complete (even if short), reply with exactly the word COMPLETE and nothing else. If it was cut off or incomplete, continue your answer from exactly where you left off — do NOT repeat what you already said."
  },
];

console.log(`Testing model: ${MODEL}\n${"=".repeat(60)}`);

let passed = 0;
for (const t of tests) {
  const start = Date.now();
  try {
    const result = await model.generateContent(t.prompt);
    const text = result.response.text();
    const ms = Date.now() - start;
    const preview = text.length > 200 ? text.slice(0, 200) + "..." : text;
    console.log(`\n✅ ${t.name} (${ms}ms, ${text.length} chars)`);
    console.log(`   ${preview.replace(/\n/g, "\n   ")}`);
    passed++;
  } catch (err) {
    const ms = Date.now() - start;
    console.log(`\n❌ ${t.name} (${ms}ms)`);
    console.log(`   Error: ${err.message}`);
  }
}

console.log(`\n${"=".repeat(60)}`);
console.log(`Results: ${passed}/${tests.length} passed`);

/**
 * Test: Live model transcript endings WITH and WITHOUT punctuation instruction.
 * Compares default vs instructed behavior.
 */
import { GoogleGenAI, Modality } from "@google/genai";

const API_KEY = process.env.GEMINI_API_KEY;
if (!API_KEY) { console.error("Set GEMINI_API_KEY"); process.exit(1); }

const ai = new GoogleGenAI({ apiKey: API_KEY });
const MODEL = "gemini-2.5-flash-native-audio-preview-12-2025";

const prompts = [
    "Finance summary",
    "List projects",
    "Create a project",
    "Hello",
    "What's my team's workload?",
    "Add a client named John",
];

async function testPrompt(prompt, systemInstruction) {
    return new Promise(async (resolve) => {
        const messageQueue = [];
        let transcript = '';

        const config = {
            responseModalities: [Modality.AUDIO],
            speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } } },
            outputAudioTranscription: {},
            ...(systemInstruction && { systemInstruction: { parts: [{ text: systemInstruction }] } }),
        };

        const session = await ai.live.connect({
            model: `models/${MODEL}`,
            config,
            callbacks: {
                onopen: () => {},
                onmessage: (msg) => messageQueue.push(msg),
                onerror: (e) => console.error('Error:', e?.message),
                onclose: () => {},
            },
        });

        session.sendClientContent({
            turns: [
                { role: 'user', parts: [{ text: 'hi' }] },
                { role: 'model', parts: [{ text: 'Hello! How can I help you today?' }] },
                { role: 'user', parts: [{ text: prompt }] },
            ]
        });

        let turnComplete = false;
        const startTime = Date.now();

        const poll = setInterval(() => {
            while (messageQueue.length > 0) {
                const msg = messageQueue.shift();
                const sc = msg.serverContent;
                if (sc?.outputTranscription?.text) {
                    transcript += sc.outputTranscription.text;
                }
                if (sc?.modelTurn?.parts) {
                    for (const p of sc.modelTurn.parts) {
                        if (p.text) transcript += p.text;
                    }
                }
                if (sc?.turnComplete) turnComplete = true;
            }
            if (turnComplete || Date.now() - startTime > 30000) {
                clearInterval(poll);
                session.close();
                resolve(transcript);
            }
        }, 100);
    });
}

// ---- Run tests ----

console.log("=".repeat(70));
console.log("TEST 1: WITHOUT any system instruction (default behavior)");
console.log("=".repeat(70));

let withoutPunct = 0;
let totalWithout = 0;
for (const prompt of prompts) {
    const transcript = await testPrompt(prompt, null);
    const trimmed = transcript.trim();
    const lastChar = trimmed.slice(-1);
    const endsWithPunct = /[.!?]$/.test(trimmed);
    const mark = endsWithPunct ? '✅' : '❌';
    if (endsWithPunct) withoutPunct++;
    totalWithout++;
    console.log(`${mark} "${prompt}" → last: "${lastChar}" | len: ${trimmed.length}`);
}
console.log(`\nScore: ${withoutPunct}/${totalWithout} end with .!?\n`);

console.log("=".repeat(70));
console.log("TEST 2: WITH punctuation instruction in system prompt");
console.log("=".repeat(70));

const PUNCT_INSTRUCTION = `You are Singularity Agent — an AI-powered agency management assistant.
Always end every response with proper sentence-ending punctuation (. ! or ?).`;

let withPunct = 0;
let totalWith = 0;
for (const prompt of prompts) {
    const transcript = await testPrompt(prompt, PUNCT_INSTRUCTION);
    const trimmed = transcript.trim();
    const lastChar = trimmed.slice(-1);
    const endsWithPunct = /[.!?]$/.test(trimmed);
    const mark = endsWithPunct ? '✅' : '❌';
    if (endsWithPunct) withPunct++;
    totalWith++;
    console.log(`${mark} "${prompt}" → last: "${lastChar}" | len: ${trimmed.length}`);
}
console.log(`\nScore: ${withPunct}/${totalWith} end with .!?\n`);

console.log("=".repeat(70));
console.log(`SUMMARY: Without instruction ${withoutPunct}/${totalWithout} | With instruction ${withPunct}/${totalWith}`);
console.log("=".repeat(70));

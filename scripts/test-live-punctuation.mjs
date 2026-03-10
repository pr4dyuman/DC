/**
 * Test: Does the live native-audio model end transcripts with . ! ?
 * Tests multiple prompts and logs the LAST characters of each transcript.
 */
import { GoogleGenAI, Modality } from "@google/genai";

const API_KEY = process.env.GEMINI_API_KEY;
if (!API_KEY) { console.error("Set GEMINI_API_KEY"); process.exit(1); }

const ai = new GoogleGenAI({ apiKey: API_KEY });
const MODEL = "gemini-2.5-flash-native-audio-preview-12-2025";

const prompts = [
    "Hello",
    "Finance summary",
    "List projects",
    "What is 2 plus 2?",
    "Team workload",
    "Create a project",
    "Add a client",
    "How are you today?",
];

async function testPrompt(prompt) {
    return new Promise(async (resolve) => {
        const messageQueue = [];
        let transcript = '';

        const session = await ai.live.connect({
            model: `models/${MODEL}`,
            config: {
                responseModalities: [Modality.AUDIO],
                speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } } },
                outputAudioTranscription: {},
            },
            callbacks: {
                onopen: () => {},
                onmessage: (msg) => messageQueue.push(msg),
                onerror: (e) => console.error('Error:', e?.message),
                onclose: () => {},
            },
        });

        // Send with a greeting history to avoid empty turns
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
                // Extract transcript
                const sc = msg.serverContent;
                if (sc?.outputTranscription?.text) {
                    transcript += sc.outputTranscription.text;
                }
                if (sc?.modelTurn?.parts) {
                    for (const p of sc.modelTurn.parts) {
                        if (p.text) transcript += p.text;
                    }
                }
                if (sc?.turnComplete) {
                    turnComplete = true;
                }
            }

            if (turnComplete || Date.now() - startTime > 30000) {
                clearInterval(poll);
                session.close();
                resolve(transcript);
            }
        }, 100);
    });
}

console.log(`Testing punctuation endings with: ${MODEL}`);
console.log("=".repeat(70));

for (const prompt of prompts) {
    try {
        const transcript = await testPrompt(prompt);
        const trimmed = transcript.trim();
        const lastChar = trimmed.slice(-1);
        const last10 = trimmed.slice(-30);
        const endsWithPunct = /[.!?]$/.test(trimmed);
        const mark = endsWithPunct ? '✅' : '❌';
        
        console.log(`\n${mark} "${prompt}"`);
        console.log(`   Last char: "${lastChar}" | Ends with .!?: ${endsWithPunct}`);
        console.log(`   Last 30 chars: "...${last10}"`);
        console.log(`   Full length: ${trimmed.length} chars`);
    } catch (err) {
        console.log(`\n❌ "${prompt}" — Error: ${err.message}`);
    }
}

console.log("\n" + "=".repeat(70));
console.log("Done");

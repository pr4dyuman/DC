/**
 * Debug test: Log the EXACT raw message structure from the Live API
 * when tools are provided, to see how tool calls arrive.
 * 
 * Usage: node scripts/test-live-debug.mjs
 */

import { GoogleGenAI, Modality } from "@google/genai";

const API_KEY = process.argv[2] || process.env.GEMINI_API_KEY;
if (!API_KEY) { console.error("Set GEMINI_API_KEY"); process.exit(1); }

const MODEL = "gemini-2.5-flash-native-audio-preview-12-2025";

// Same tools as production
const TOOLS = [
    { name: "get_finance_summary", description: "Get financial summary — revenue, expenses, profit, invoices", parameters: { type: "OBJECT", properties: {} } },
    { name: "get_team_workload", description: "Get workload per team member", parameters: { type: "OBJECT", properties: {} } },
    { name: "search_agency", description: "Search across agency data", parameters: { type: "OBJECT", properties: { query: { type: "STRING" } }, required: ["query"] } },
];

// Short context so we focus on the message structure
const SYSTEM = "You are Singularity Agent. When asked about finances, use the get_finance_summary tool.";

async function main() {
    console.log("Deep-logging Live API messages with tools...\n");

    const ai = new GoogleGenAI({ apiKey: API_KEY });
    const messageQueue = [];

    const session = await ai.live.connect({
        model: `models/${MODEL}`,
        config: {
            responseModalities: [Modality.AUDIO],
            speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: "Zephyr" } } },
            outputAudioTranscription: {},
            tools: [{ functionDeclarations: TOOLS }],
        },
        callbacks: {
            onopen: () => console.log("Connected"),
            onmessage: (msg) => messageQueue.push(msg),
            onerror: (e) => console.error("WS Error:", e?.message || e),
            onclose: () => console.log("Disconnected"),
        },
    });

    session.sendClientContent({
        turns: [{ role: "user", parts: [{ text: SYSTEM + "\n\n---\n\nUser: Finance summary" }] }],
    });

    let done = false;
    let msgCount = 0;
    const timeout = setTimeout(() => { done = true; }, 30000);

    const waitMsg = () => new Promise(resolve => {
        const check = () => {
            if (done) { resolve(null); return; }
            const msg = messageQueue.shift();
            if (msg) resolve(msg);
            else setTimeout(check, 50);
        };
        check();
    });

    while (!done) {
        const msg = await waitMsg();
        if (!msg) break;
        msgCount++;

        // Log the RAW top-level keys of each message
        const keys = Object.keys(msg);
        console.log(`\n═══ MSG #${msgCount} ═══  keys: [${keys.join(", ")}]`);

        // Deep-print each key (skip inlineData binary)
        for (const key of keys) {
            const val = msg[key];
            if (val === undefined || val === null) continue;
            
            const cleaned = JSON.parse(JSON.stringify(val, (k, v) => {
                // Truncate binary audio data
                if (k === 'data' && typeof v === 'string' && v.length > 100) return `[BASE64 ${v.length} chars]`;
                return v;
            }));
            console.log(`  ${key}:`, JSON.stringify(cleaned, null, 4).split('\n').map((l, i) => i === 0 ? l : '    ' + l).join('\n'));
        }

        // Check for toolCall specifically
        if (msg.toolCall) {
            console.log("  >>> TOOL CALL DETECTED via msg.toolCall <<<");
            // Send fake response
            const frs = msg.toolCall.functionCalls.map(fc => ({
                id: fc.id, name: fc.name,
                response: { success: true, data: { revenue: 425000, expenses: 280000 } },
            }));
            session.sendToolResponse({ functionResponses: frs });
        }

        // Also check alternative locations where tool calls might hide
        if (msg.serverContent?.modelTurn?.parts) {
            for (const part of msg.serverContent.modelTurn.parts) {
                if (part.functionCall) {
                    console.log("  >>> TOOL CALL FOUND IN serverContent.modelTurn.parts.functionCall <<<");
                    console.log("     ", JSON.stringify(part.functionCall));
                }
            }
        }

        if (msg.serverContent?.turnComplete) {
            console.log("  >>> TURN COMPLETE <<<");
            done = true;
        }
    }

    // Brief drain
    await new Promise(r => setTimeout(r, 2000));
    while (messageQueue.length > 0) {
        const r = messageQueue.shift();
        const keys = Object.keys(r);
        console.log(`\n═══ DRAIN MSG ═══  keys: [${keys.join(", ")}]`);
        if (r.toolCall) console.log("  >>> LATE TOOL CALL <<<");
        if (r.serverContent?.outputTranscription?.text) {
            console.log(`  transcript: "${r.serverContent.outputTranscription.text.slice(0, 100)}"`);
        }
    }

    clearTimeout(timeout);
    session.close();

    console.log(`\n\nTotal messages: ${msgCount}`);
}

main().catch(e => { console.error("Fatal:", e); process.exit(1); });

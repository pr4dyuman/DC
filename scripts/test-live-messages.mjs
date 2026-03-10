/**
 * Test: Does the Gemini Live API fail more with certain messages or rapid sends?
 * 
 * Sends multiple prompts (including the exact hardcoded suggestion labels)
 * and reports success/failure for each.
 * 
 * Usage: node scripts/test-live-messages.mjs
 *        (requires GEMINI_API_KEY env var)
 */

import { GoogleGenAI, Modality } from "@google/genai";

const API_KEY = process.argv[2] || process.env.GEMINI_API_KEY;
if (!API_KEY) {
    console.error("Set GEMINI_API_KEY env var or pass as argument");
    process.exit(1);
}

const MODEL = "gemini-2.5-flash-native-audio-preview-12-2025";

// The exact hardcoded suggestion labels from the UI
const MESSAGES = [
    "Finance summary",          // ← the one that often fails
    "Create a project",         // hardcoded
    "Team workload",            // hardcoded
    "List projects",            // hardcoded
    "Add a client",             // hardcoded
    "Give me a detailed breakdown of our agency finances including revenue, expenses, and profit margins for all projects",  // longer typed message
];

const SYSTEM_INSTRUCTION = `You are Singularity Agent — an AI assistant for agency management. 
You help with projects, finance, team, and client management.
Provide clear, concise responses.`;

async function testMessage(label, message, attempt = 1) {
    const ai = new GoogleGenAI({ apiKey: API_KEY });
    const messageQueue = [];
    const startTime = Date.now();

    const fullPrompt = SYSTEM_INSTRUCTION + "\n\n---\n\nUser: " + message;

    try {
        const session = await ai.live.connect({
            model: `models/${MODEL}`,
            config: {
                responseModalities: [Modality.AUDIO],
                speechConfig: {
                    voiceConfig: {
                        prebuiltVoiceConfig: { voiceName: "Zephyr" },
                    },
                },
                outputAudioTranscription: {},
            },
            callbacks: {
                onopen: () => {},
                onmessage: (msg) => messageQueue.push(msg),
                onerror: (e) => console.error(`    WS Error: ${e?.message || e}`),
                onclose: () => {},
            },
        });

        const connectTime = Date.now() - startTime;

        // Send prompt immediately (mimicking button click — no delay)
        session.sendClientContent({
            turns: [{ role: "user", parts: [{ text: fullPrompt }] }],
        });

        let transcriptText = "";
        let modelText = "";
        let audioChunks = 0;
        let msgCount = 0;
        let done = false;

        const timeout = setTimeout(() => { done = true; }, 30000);

        const waitMsg = () => new Promise((resolve) => {
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

            if (msg.serverContent?.modelTurn?.parts) {
                for (const part of msg.serverContent.modelTurn.parts) {
                    if (part.text) modelText += part.text;
                    if (part.inlineData) audioChunks++;
                }
            }
            if (msg.serverContent?.outputTranscription?.text) {
                transcriptText += msg.serverContent.outputTranscription.text;
            }
            if (msg.serverContent?.turnComplete) {
                done = true;
            }
        }

        // Drain remaining
        let drainDeadline = Date.now() + 3000;
        while (Date.now() < drainDeadline) {
            const remaining = messageQueue.shift();
            if (!remaining) { await new Promise(r => setTimeout(r, 100)); continue; }
            if (remaining.serverContent?.outputTranscription?.text) {
                transcriptText += remaining.serverContent.outputTranscription.text;
                drainDeadline = Math.max(drainDeadline, Date.now() + 1000);
            }
            if (remaining.serverContent?.modelTurn?.parts) {
                for (const part of remaining.serverContent.modelTurn.parts) {
                    if (part.text) modelText += part.text;
                    if (part.inlineData) audioChunks++;
                }
            }
        }

        clearTimeout(timeout);
        session.close();

        const elapsed = Date.now() - startTime;
        const totalChars = modelText.length + transcriptText.length;
        const preview = (transcriptText || modelText).slice(0, 80).replace(/\n/g, " ");

        return {
            label,
            message,
            attempt,
            success: totalChars > 0,
            connectTime,
            elapsed,
            modelTextChars: modelText.length,
            transcriptChars: transcriptText.length,
            totalChars,
            audioChunks,
            msgCount,
            preview,
        };
    } catch (error) {
        return {
            label,
            message,
            attempt,
            success: false,
            elapsed: Date.now() - startTime,
            error: error.message,
        };
    }
}

async function main() {
    console.log("╔══════════════════════════════════════════════════════════════╗");
    console.log("║  Gemini Live API — Message Reliability Test                 ║");
    console.log("║  Sending hardcoded suggestions + typed message              ║");
    console.log("╚══════════════════════════════════════════════════════════════╝\n");

    const results = [];

    // Round 1: Send all messages rapidly (simulating quick suggestion clicks)
    console.log("── ROUND 1: Rapid-fire (no delay between messages) ──\n");
    for (let i = 0; i < MESSAGES.length; i++) {
        const msg = MESSAGES[i];
        const label = `R1-${i + 1}`;
        process.stdout.write(`  [${label}] "${msg.slice(0, 40)}..." → `);
        const result = await testMessage(label, msg, 1);
        results.push(result);
        if (result.success) {
            console.log(`✅ ${result.totalChars} chars in ${result.elapsed}ms — "${result.preview}..."`);
        } else {
            console.log(`❌ NO TEXT (${result.msgCount} msgs, ${result.audioChunks} audio) in ${result.elapsed}ms${result.error ? " Error: " + result.error : ""}`);
        }
        // No delay — rapid fire
    }

    // Round 2: Re-test the ones that failed with a 3s delay (simulating user typing)
    const failed = results.filter(r => !r.success);
    if (failed.length > 0) {
        console.log(`\n── ROUND 2: Retry failed messages with 3s delay ──\n`);
        for (const f of failed) {
            await new Promise(r => setTimeout(r, 3000));
            const label = `R2-retry`;
            process.stdout.write(`  [${label}] "${f.message.slice(0, 40)}..." → `);
            const result = await testMessage(label, f.message, 2);
            results.push(result);
            if (result.success) {
                console.log(`✅ ${result.totalChars} chars in ${result.elapsed}ms — "${result.preview}..."`);
            } else {
                console.log(`❌ STILL NO TEXT (${result.msgCount} msgs, ${result.audioChunks} audio) in ${result.elapsed}ms`);
            }
        }
    }

    // Summary
    const successes = results.filter(r => r.success);
    const failures = results.filter(r => !r.success);

    console.log(`\n${"═".repeat(62)}`);
    console.log("  SUMMARY");
    console.log("═".repeat(62));
    console.log(`  Total tests: ${results.length}`);
    console.log(`  ✅ Success:  ${successes.length}`);
    console.log(`  ❌ Failed:   ${failures.length}`);
    console.log(`  Success rate: ${((successes.length / results.length) * 100).toFixed(0)}%`);

    if (failures.length > 0) {
        console.log(`\n  Failed messages:`);
        for (const f of failures) {
            console.log(`    - "${f.message}" (attempt ${f.attempt}, ${f.msgCount || 0} msgs received, ${f.audioChunks || 0} audio chunks)`);
        }
    }

    if (successes.length > 0) {
        console.log(`\n  Average response time: ${Math.round(successes.reduce((a, r) => a + r.elapsed, 0) / successes.length)}ms`);
    }

    console.log("═".repeat(62));

    if (failures.length > 0) {
        console.log("\n  ⚠ The Live API is unreliable for text-only agent queries.");
        console.log("  ➤ Recommendation: Use non-live text API (GoogleGenerativeAI)");
        console.log("    for agent mode, keep Live API only for voice/audio features.");
    } else {
        console.log("\n  ✓ All messages got responses — Live API is working reliably.");
    }
}

main().catch(e => { console.error("Fatal:", e); process.exit(1); });

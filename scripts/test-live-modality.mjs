/**
 * Test script to compare Gemini Live API behavior with different responseModalities:
 * 
 *   Test A: [AUDIO] only           ← current behavior (often returns 0 text chars)
 *   Test B: [TEXT]  only           ← text-only modality
 *   Test C: [TEXT, AUDIO]          ← Option B fix — both modalities
 *
 * Usage:
 *   node scripts/test-live-modality.mjs <GEMINI_API_KEY>
 * 
 * Or set the env var:
 *   set GEMINI_API_KEY=your-key-here
 *   node scripts/test-live-modality.mjs
 */

import { GoogleGenAI, Modality } from "@google/genai";

const API_KEY = process.argv[2] || process.env.GEMINI_API_KEY;
if (!API_KEY) {
    console.error("Usage: node scripts/test-live-modality.mjs <GEMINI_API_KEY>");
    console.error("  Or set GEMINI_API_KEY environment variable");
    process.exit(1);
}

const MODEL = "gemini-2.5-flash-native-audio-preview-12-2025";
const PROMPT = "Give me a brief finance summary for a digital agency with 5 employees.";
const TIMEOUT_MS = 30000;

// ─────────────────────────────────────────────────────────────
// Run a single Live API test with the given modalities
// ─────────────────────────────────────────────────────────────
async function runTest(testName, modalities) {
    console.log(`\n${"═".repeat(60)}`);
    console.log(`  ${testName}`);
    console.log(`  Modalities: [${modalities.map(m => m).join(", ")}]`);
    console.log(`${"═".repeat(60)}`);

    const ai = new GoogleGenAI({ apiKey: API_KEY });
    const messageQueue = [];

    const waitMsg = (done) => new Promise((resolve) => {
        const check = () => {
            if (done.value) { resolve(null); return; }
            const msg = messageQueue.shift();
            if (msg) resolve(msg);
            else setTimeout(check, 50);
        };
        check();
    });

    const startTime = Date.now();

    try {
        const config = {
            responseModalities: modalities,
            outputAudioTranscription: {},
        };

        // Only add speechConfig if AUDIO is included
        if (modalities.includes(Modality.AUDIO)) {
            config.speechConfig = {
                voiceConfig: {
                    prebuiltVoiceConfig: { voiceName: "Zephyr" },
                },
            };
        }

        console.log("  Connecting...");
        const session = await ai.live.connect({
            model: `models/${MODEL}`,
            config,
            callbacks: {
                onopen: () => console.log("  ✓ Connected"),
                onmessage: (msg) => messageQueue.push(msg),
                onerror: (e) => console.error("  ✗ WS Error:", e?.message || e),
                onclose: () => console.log("  ✓ Disconnected"),
            },
        });

        const connectTime = Date.now() - startTime;
        console.log(`  Connected in ${connectTime}ms`);

        // Send prompt
        console.log(`  Sending prompt: "${PROMPT.slice(0, 50)}..."`);
        session.sendClientContent({
            turns: [{ role: "user", parts: [{ text: PROMPT }] }],
        });

        // Collect responses
        let transcriptText = "";
        let modelText = "";
        let audioChunks = 0;
        let msgCount = 0;
        const done = { value: false };

        const timeout = setTimeout(() => {
            console.log("  ⚠ Timeout reached");
            done.value = true;
        }, TIMEOUT_MS);

        while (!done.value) {
            const msg = await waitMsg(done);
            if (!msg) break;
            msgCount++;

            // Model turn text parts
            if (msg.serverContent?.modelTurn?.parts) {
                for (const part of msg.serverContent.modelTurn.parts) {
                    if (part.text) {
                        modelText += part.text;
                    }
                    if (part.inlineData) {
                        audioChunks++;
                    }
                }
            }

            // Output transcription
            if (msg.serverContent?.outputTranscription?.text) {
                transcriptText += msg.serverContent.outputTranscription.text;
            }

            // Turn complete
            if (msg.serverContent?.turnComplete) {
                console.log(`  ✓ Turn complete after ${msgCount} messages`);
                done.value = true;
            }
        }

        // Drain remaining (transcription chunks can arrive after turnComplete)
        let drainDeadline = Date.now() + 3000;
        while (Date.now() < drainDeadline) {
            const remaining = messageQueue.shift();
            if (!remaining) {
                await new Promise((r) => setTimeout(r, 100));
                continue;
            }
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

        // Results
        console.log(`\n  ── Results ──`);
        console.log(`  Total time:        ${elapsed}ms`);
        console.log(`  Messages received: ${msgCount}`);
        console.log(`  Audio chunks:      ${audioChunks}`);
        console.log(`  Model text chars:  ${modelText.length}`);
        console.log(`  Transcript chars:  ${transcriptText.length}`);
        console.log(`  Total text chars:  ${modelText.length + transcriptText.length}`);

        if (modelText.length > 0) {
            console.log(`\n  ── Model Text (first 300 chars) ──`);
            console.log(`  ${modelText.slice(0, 300).replace(/\n/g, "\n  ")}`);
        }
        if (transcriptText.length > 0) {
            console.log(`\n  ── Transcript (first 300 chars) ──`);
            console.log(`  ${transcriptText.slice(0, 300).replace(/\n/g, "\n  ")}`);
        }
        if (modelText.length === 0 && transcriptText.length === 0) {
            console.log(`\n  ⚠ NO TEXT RECEIVED AT ALL — this is the bug!`);
        }

        return {
            testName,
            success: modelText.length + transcriptText.length > 0,
            modelTextChars: modelText.length,
            transcriptChars: transcriptText.length,
            audioChunks,
            elapsed,
        };
    } catch (error) {
        console.error(`  ✗ Error: ${error.message}`);
        return { testName, success: false, error: error.message };
    }
}

// ─────────────────────────────────────────────────────────────
// Main — run all three tests sequentially
// ─────────────────────────────────────────────────────────────
async function main() {
    console.log("╔══════════════════════════════════════════════════════════╗");
    console.log("║  Gemini Live API — Response Modality Comparison Test    ║");
    console.log("║  Model: " + MODEL.padEnd(48) + "║");
    console.log("╚══════════════════════════════════════════════════════════╝");

    const results = [];

    // Test A: Current behavior — AUDIO only
    results.push(await runTest("Test A: AUDIO only (current)", [Modality.AUDIO]));

    // Small pause between tests
    await new Promise((r) => setTimeout(r, 2000));

    // Test B: TEXT only
    results.push(await runTest("Test B: TEXT only", [Modality.TEXT]));

    await new Promise((r) => setTimeout(r, 2000));

    // Test C: Option B fix — TEXT + AUDIO
    results.push(await runTest("Test C: TEXT + AUDIO (Option B)", [Modality.TEXT, Modality.AUDIO]));

    // Summary
    console.log(`\n\n${"═".repeat(60)}`);
    console.log("  SUMMARY");
    console.log("═".repeat(60));
    for (const r of results) {
        const status = r.success ? "✅ GOT TEXT" : "❌ NO TEXT";
        const detail = r.error
            ? `Error: ${r.error}`
            : `modelText=${r.modelTextChars}, transcript=${r.transcriptChars}, audio=${r.audioChunks}, ${r.elapsed}ms`;
        console.log(`  ${status}  ${r.testName}`);
        console.log(`           ${detail}`);
    }
    console.log("═".repeat(60));
    console.log("\nIf Test B or C shows ✅, we can apply that fix to the codebase.");
}

main().catch((e) => {
    console.error("Fatal:", e);
    process.exit(1);
});

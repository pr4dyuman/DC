import { NextRequest, NextResponse } from "next/server";
import { getAgencyAIConfig } from "@/lib/actions";
import { buildSingularityContext } from "@/lib/singularity-context";
import { SINGULARITY_TOOL_DECLARATIONS, getToolDisplayName } from "@/lib/singularity-tool-defs";
import { executeTool } from "@/lib/singularity-tools";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// ---------------------------------------------------------------------------
// Short-response fallback helper
// If the AI's reply has fewer than 2 non-empty lines, we ask it whether the
// answer was complete or got cut off. The AI responds with either:
//   "COMPLETE" → original answer was fine, return nothing extra
//   anything else → that text is the continuation, append it
// ---------------------------------------------------------------------------
function isTooShort(text: string): boolean {
    const nonEmpty = text.split('\n').filter(l => l.trim().length > 0);
    return nonEmpty.length < 2;
}

async function checkAndContinue(
    generateContent: (cfg: any, prompt: string, sys?: string) => Promise<string>,
    aiConfig: any,
    systemInstruction: string,
    originalPrompt: string,
    originalReply: string
): Promise<string | null> {
    const followUpPrompt =
        originalPrompt +
        `\n\nSingularity: ${originalReply}\n\n` +
        `User: Was your previous answer fully complete, or did it get cut off? ` +
        `If it was complete (even if short), reply with exactly the word COMPLETE and nothing else. ` +
        `If it was cut off or incomplete, continue your answer from exactly where you left off — do NOT repeat what you already said.`;

    const continuation = await generateContent(aiConfig, followUpPrompt, systemInstruction);
    const trimmed = continuation.trim();

    // AI signals it was done → nothing to add
    if (!trimmed || trimmed.toUpperCase() === 'COMPLETE') return null;

    return trimmed;
}

export async function POST(req: NextRequest) {
    try {
        const { history, message, images, documents, mode, userId } = await req.json();

        const aiConfig = await getAgencyAIConfig();
        if (!aiConfig) {
            return NextResponse.json({ error: "AI not configured" }, { status: 500 });
        }

        // Build prompt with history
        let fullPrompt = '';
        if (history && history.length > 0) {
            fullPrompt += history
                .map((m: any) => `${m.role === 'user' ? 'User' : 'Singularity'}: ${m.content}`)
                .join('\n\n');
            fullPrompt += '\n\n';
        }
        fullPrompt += `User: ${message}`;

        // Append document text content to prompt
        if (documents && documents.length > 0) {
            fullPrompt += '\n\n--- UPLOADED DOCUMENTS ---\n';
            for (const doc of documents) {
                fullPrompt += `\n📄 FILE: ${doc.fileName} (${doc.mimeType})\n`;
                if (doc.textContent && !doc.textContent.startsWith('[PDF Document:')) {
                    fullPrompt += `CONTENT:\n${doc.textContent}\n`;
                }
                fullPrompt += '---\n';
            }
        }

        const modelId = aiConfig.model || 'gemini-2.5-flash-lite';
        const isLive = modelId.includes('native-audio');

        // =====================================================================
        // AGENT MODE — TEXT modality + agency context + tool calling
        // =====================================================================
        if (mode === 'agent') {
            console.log('[Singularity Agent] Starting agent mode for userId:', userId);

            // Build agency context
            let systemInstruction = '';
            try {
                systemInstruction = await buildSingularityContext(userId || '');
                console.log('[Singularity Agent] Context built, length:', systemInstruction.length);
            } catch (ctxErr: any) {
                console.error('[Singularity Agent] Context build failed:', ctxErr?.message || ctxErr);
                systemInstruction = 'You are Singularity Agent — an AI assistant for agency management. Agency data could not be loaded.';
            }
            const agentPrompt = systemInstruction + '\n\n---\n\n' + fullPrompt;

            if (!isLive) {
                // Non-live model: single response with context (no tool calling)
                const { generateContent } = await import("@/lib/ai-provider");
                const result = await generateContent(aiConfig, fullPrompt, systemInstruction);
                const encoder = new TextEncoder();

                // Stream initial response immediately so user sees it right away.
                // Fallback check (if needed) runs AFTER that — done is sent only when fully complete.
                const stream = new ReadableStream({
                    async start(controller) {
                        // 1. Send initial response immediately — user sees it now
                        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'response', text: result })}\n\n`));

                        // 2. Short-response fallback — runs after initial text is visible
                        if (isTooShort(result)) {
                            console.log('[Singularity Agent] Response too short, checking if complete...');
                            try {
                                const continuation = await checkAndContinue(generateContent, aiConfig, systemInstruction, fullPrompt, result);
                                if (continuation) {
                                    console.log('[Singularity Agent] Appending continuation.');
                                    controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'response', text: '\n\n' + continuation })}\n\n`));
                                } else {
                                    console.log('[Singularity Agent] AI confirmed answer was complete.');
                                }
                            } catch (err) {
                                console.error('[Singularity Agent] Fallback check failed:', err);
                            }
                        }

                        // 3. Signal completion — unlocks the input box
                        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'done' })}\n\n`));
                        controller.close();
                    }
                });
                return new Response(stream, {
                    headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', 'Connection': 'keep-alive' },
                });
            }

            // Live API — Agent mode with tools (AUDIO modality + transcription)
            const { GoogleGenAI, Modality } = await import("@google/genai");
            const ai = new GoogleGenAI({ apiKey: aiConfig.apiKey });
            const messageQueue: any[] = [];
            const encoder = new TextEncoder();

            const stream = new ReadableStream({
                async start(controller) {
                    try {
                        console.log('[Singularity Agent] Connecting with model:', modelId);

                        const session = await ai.live.connect({
                            model: `models/${modelId}`,
                            config: {
                                responseModalities: [Modality.AUDIO],
                                speechConfig: {
                                    voiceConfig: {
                                        prebuiltVoiceConfig: { voiceName: 'Zephyr' }
                                    }
                                },
                                outputAudioTranscription: {},
                                tools: [{ functionDeclarations: SINGULARITY_TOOL_DECLARATIONS }],
                            } as any,
                            callbacks: {
                                onopen: () => {
                                    console.log('[Singularity Agent] Connected');
                                },
                                onmessage: (msg: any) => messageQueue.push(msg),
                                onerror: (e: any) => {
                                    console.error('[Singularity Agent] WS Error:', e?.message || e);
                                    try {
                                        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'error', text: 'Connection error' })}\n\n`));
                                    } catch { }
                                },
                                onclose: () => {
                                    console.log('[Singularity Agent] Disconnected');
                                },
                            },
                        });

                        // Build parts: text + optional PDF inline data
                        const parts: any[] = [];

                        // Add PDF documents as inline data for native extraction
                        if (documents && documents.length > 0) {
                            for (const doc of documents) {
                                if (doc.mimeType === 'application/pdf' && doc.base64) {
                                    parts.push({
                                        inlineData: {
                                            mimeType: 'application/pdf',
                                            data: doc.base64,
                                        }
                                    });
                                }
                            }
                        }

                        // Add images as inline data
                        if (images && images.length > 0) {
                            for (const img of images) {
                                parts.push({
                                    inlineData: {
                                        mimeType: img.mimeType,
                                        data: img.base64,
                                    }
                                });
                            }
                        }

                        parts.push({ text: agentPrompt });

                        // Send system instruction + user prompt + attachments
                        session.sendClientContent({
                            turns: [{ role: 'user', parts }]
                        });

                        // Poll and stream messages
                        let done = false;
                        let totalResponseChars = 0;
                        let totalThinkingChars = 0;
                        let msgCount = 0;
                        const timeout = setTimeout(() => {
                            console.log('[Singularity Agent] Timeout reached');
                            done = true;
                        }, 300000); // 5 min — needed for heavy operations (100+ tasks, bulk imports)

                        const waitMsg = (): Promise<any> => new Promise((resolve) => {
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

                            // Log every message type for debugging
                            const msgKeys = Object.keys(msg);
                            console.log(`[Agent] Msg #${msgCount} keys:`, msgKeys);

                            // Handle tool calls from the model
                            if (msg.toolCall && msg.toolCall.functionCalls) {
                                console.log('[Singularity Agent] Tool calls:', msg.toolCall.functionCalls.map((fc: any) => fc.name));
                                const functionResponses: any[] = [];

                                for (const fc of msg.toolCall.functionCalls) {
                                    const displayName = getToolDisplayName(fc.name);

                                    // Stream tool_call event to UI
                                    controller.enqueue(encoder.encode(
                                        `data: ${JSON.stringify({ type: 'tool_call', name: fc.name, displayName, args: fc.args })}\n\n`
                                    ));

                                    // Execute the tool
                                    const result = await executeTool(fc.name, fc.args || {}, userId || '');
                                    console.log('[Singularity Agent] Tool result:', fc.name, result.success, result.summary);

                                    // Stream tool_result event to UI (include rollback data for checkpoint system)
                                    controller.enqueue(encoder.encode(
                                        `data: ${JSON.stringify({ type: 'tool_result', name: fc.name, displayName, success: result.success, summary: result.summary, rollbackData: result.rollbackData })}\n\n`
                                    ));

                                    // Collect function response for the model
                                    functionResponses.push({
                                        id: fc.id,
                                        name: fc.name,
                                        response: result,
                                    });
                                }

                                // Send all tool results back to model
                                session.sendToolResponse({ functionResponses });
                                continue;
                            }

                            // Handle thinking text (modelTurn parts)
                            if (msg.serverContent?.modelTurn?.parts) {
                                for (const part of msg.serverContent.modelTurn.parts) {
                                    if (part.text) {
                                        totalThinkingChars += part.text.length;
                                        console.log(`[Agent] Thinking chunk: ${part.text.length} chars, total: ${totalThinkingChars}`);
                                        controller.enqueue(encoder.encode(
                                            `data: ${JSON.stringify({ type: 'thinking', text: part.text })}\n\n`
                                        ));
                                    }
                                }
                            }

                            // Handle audio transcript (the actual response text)
                            if ((msg.serverContent as any)?.outputTranscription?.text) {
                                const chunk = (msg.serverContent as any).outputTranscription.text;
                                totalResponseChars += chunk.length;
                                console.log(`[Agent] Response chunk: "${chunk.slice(0, 80)}${chunk.length > 80 ? '...' : ''}" (${chunk.length} chars, total: ${totalResponseChars})`);
                                controller.enqueue(encoder.encode(
                                    `data: ${JSON.stringify({ type: 'response', text: chunk })}\n\n`
                                ));
                            }

                            // Check for turn completion
                            if (msg.serverContent?.turnComplete) {
                                console.log(`[Agent] turnComplete after ${msgCount} messages. Response: ${totalResponseChars} chars, Thinking: ${totalThinkingChars} chars`);
                                done = true;
                            }
                        }

                        // Drain remaining transcript chunks (can arrive after turnComplete)
                        // Use a rolling window: extend drain whenever new data arrives
                        let drainDeadline = Date.now() + 5000;
                        let drainCount = 0;
                        console.log(`[Agent] Starting drain loop...`);
                        while (Date.now() < drainDeadline) {
                            const remaining = messageQueue.shift();
                            if (!remaining) {
                                await new Promise(r => setTimeout(r, 100));
                                continue;
                            }
                            drainCount++;
                            if ((remaining.serverContent as any)?.outputTranscription?.text) {
                                const chunk = (remaining.serverContent as any).outputTranscription.text;
                                totalResponseChars += chunk.length;
                                console.log(`[Agent] Drain chunk #${drainCount}: "${chunk.slice(0, 80)}${chunk.length > 80 ? '...' : ''}" (${chunk.length} chars, total: ${totalResponseChars})`);
                                controller.enqueue(encoder.encode(
                                    `data: ${JSON.stringify({ type: 'response', text: chunk })}\n\n`
                                ));
                                // Extend drain window — more transcription may follow
                                drainDeadline = Math.max(drainDeadline, Date.now() + 2000);
                            } else {
                                console.log(`[Agent] Drain non-transcript msg #${drainCount}:`, Object.keys(remaining));
                            }
                        }
                        console.log(`[Agent] Drain complete. ${drainCount} msgs drained. Final response: ${totalResponseChars} chars`);

                        clearTimeout(timeout);
                        session.close();

                        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'done' })}\n\n`));
                        controller.close();
                    } catch (error: any) {
                        console.error('[Singularity Agent] Error:', error?.message || error);
                        try {
                            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'error', text: error?.message || 'Agent error' })}\n\n`));
                            controller.close();
                        } catch { }
                    }
                }
            });

            return new Response(stream, {
                headers: {
                    'Content-Type': 'text/event-stream',
                    'Cache-Control': 'no-cache',
                    'Connection': 'keep-alive',
                },
            });
        }

        // =====================================================================
        // CHAT MODE — Existing code, completely untouched
        // =====================================================================

        if (!isLive) {
            // Non-live model: single response, no streaming
            const { generateContent } = await import("@/lib/ai-provider");
            const result = await generateContent(aiConfig, fullPrompt);
            const encoder = new TextEncoder();

            // Stream initial response immediately, fallback check runs inside stream before done
            const stream = new ReadableStream({
                async start(controller) {
                    // 1. Send initial response right away
                    controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'response', text: result })}\n\n`));

                    // 2. Short-response fallback check
                    if (isTooShort(result)) {
                        console.log('[Singularity Chat] Response too short, checking if complete...');
                        try {
                            const continuation = await checkAndContinue(generateContent, aiConfig, '', fullPrompt, result);
                            if (continuation) {
                                console.log('[Singularity Chat] Appending continuation.');
                                controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'response', text: '\n\n' + continuation })}\n\n`));
                            } else {
                                console.log('[Singularity Chat] AI confirmed answer was complete.');
                            }
                        } catch (err) {
                            console.error('[Singularity Chat] Fallback check failed:', err);
                        }
                    }

                    // 3. Done
                    controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'done' })}\n\n`));
                    controller.close();
                }
            });
            return new Response(stream, {
                headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', 'Connection': 'keep-alive' },
            });
        }

        // Live API — stream thinking + transcript in real-time
        const { GoogleGenAI, Modality } = await import("@google/genai");
        const ai = new GoogleGenAI({ apiKey: aiConfig.apiKey });
        const messageQueue: any[] = [];

        const encoder = new TextEncoder();

        const stream = new ReadableStream({
            async start(controller) {
                try {
                    const session = await ai.live.connect({
                        model: `models/${modelId}`,
                        config: {
                            responseModalities: [Modality.AUDIO],
                            speechConfig: {
                                voiceConfig: {
                                    prebuiltVoiceConfig: { voiceName: 'Zephyr' }
                                }
                            },
                            outputAudioTranscription: {},
                        } as any,
                        callbacks: {
                            onopen: () => { },
                            onmessage: (msg: any) => messageQueue.push(msg),
                            onerror: (e: any) => {
                                console.error('[Singularity Stream] Error:', e?.message || e);
                                controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'error', text: 'Connection error' })}\n\n`));
                            },
                            onclose: () => { },
                        },
                    });

                    // Build turn with text + optional images
                    const parts: any[] = [];

                    // Add images as inline data
                    if (images && images.length > 0) {
                        for (const img of images) {
                            parts.push({
                                inlineData: {
                                    mimeType: img.mimeType,
                                    data: img.base64,
                                }
                            });
                        }
                    }

                    // Add text prompt
                    parts.push({ text: fullPrompt });

                    session.sendClientContent({
                        turns: [{ role: 'user', parts }]
                    });

                    // Poll and stream messages
                    let done = false;
                    const timeout = setTimeout(() => { done = true; }, 60000);

                    const waitMsg = (): Promise<any> => new Promise((resolve) => {
                        const check = () => {
                            const msg = messageQueue.shift();
                            if (msg) resolve(msg);
                            else setTimeout(check, 50);
                        };
                        check();
                    });

                    while (!done) {
                        const msg = await waitMsg();

                        // Stream thinking text as it arrives
                        if (msg.serverContent?.modelTurn?.parts) {
                            for (const part of msg.serverContent.modelTurn.parts) {
                                if (part.text) {
                                    controller.enqueue(encoder.encode(
                                        `data: ${JSON.stringify({ type: 'thinking', text: part.text })}\n\n`
                                    ));
                                }
                            }
                        }

                        // Stream transcript text as it arrives
                        if ((msg.serverContent as any)?.outputTranscription?.text) {
                            controller.enqueue(encoder.encode(
                                `data: ${JSON.stringify({ type: 'response', text: (msg.serverContent as any).outputTranscription.text })}\n\n`
                            ));
                        }

                        if (msg.serverContent?.turnComplete) {
                            done = true;
                        }
                    }

                    // IMPORTANT: Transcript chunks can arrive AFTER turnComplete.
                    // Use a rolling window: extend drain whenever new data arrives.
                    let drainDeadline = Date.now() + 5000;
                    while (Date.now() < drainDeadline) {
                        const remaining = messageQueue.shift();
                        if (!remaining) {
                            await new Promise(r => setTimeout(r, 100));
                            continue;
                        }
                        if ((remaining.serverContent as any)?.outputTranscription?.text) {
                            controller.enqueue(encoder.encode(
                                `data: ${JSON.stringify({ type: 'response', text: (remaining.serverContent as any).outputTranscription.text })}\n\n`
                            ));
                            // Extend drain window — more transcription may follow
                            drainDeadline = Math.max(drainDeadline, Date.now() + 2000);
                        }
                    }

                    clearTimeout(timeout);
                    session.close();

                    controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'done' })}\n\n`));
                    controller.close();
                } catch (error: any) {
                    console.error('[Singularity Stream] Error:', error);
                    controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'error', text: error.message })}\n\n`));
                    controller.close();
                }
            }
        });

        return new Response(stream, {
            headers: {
                'Content-Type': 'text/event-stream',
                'Cache-Control': 'no-cache',
                'Connection': 'keep-alive',
            },
        });
    } catch (error: any) {
        console.error('[Singularity API] Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

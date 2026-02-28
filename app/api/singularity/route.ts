import { NextRequest, NextResponse } from "next/server";
import { getAgencyAIConfig } from "@/lib/actions";
import { buildSingularityContext } from "@/lib/singularity-context";
import { SINGULARITY_TOOL_DECLARATIONS, getToolDisplayName } from "@/lib/singularity-tool-defs";
import { executeTool } from "@/lib/singularity-tools";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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
                const stream = new ReadableStream({
                    start(controller) {
                        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'response', text: result })}\n\n`));
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
                                        controller.enqueue(encoder.encode(
                                            `data: ${JSON.stringify({ type: 'thinking', text: part.text })}\n\n`
                                        ));
                                    }
                                }
                            }

                            // Handle audio transcript (the actual response text)
                            if ((msg.serverContent as any)?.outputTranscription?.text) {
                                controller.enqueue(encoder.encode(
                                    `data: ${JSON.stringify({ type: 'response', text: (msg.serverContent as any).outputTranscription.text })}\n\n`
                                ));
                            }

                            // Check for turn completion
                            if (msg.serverContent?.turnComplete) {
                                done = true;
                            }
                        }

                        // Drain remaining transcript chunks (can arrive after turnComplete)
                        const drainEnd = Date.now() + 2000;
                        while (Date.now() < drainEnd) {
                            const remaining = messageQueue.shift();
                            if (!remaining) {
                                await new Promise(r => setTimeout(r, 100));
                                continue;
                            }
                            if ((remaining.serverContent as any)?.outputTranscription?.text) {
                                controller.enqueue(encoder.encode(
                                    `data: ${JSON.stringify({ type: 'response', text: (remaining.serverContent as any).outputTranscription.text })}\n\n`
                                ));
                            }
                        }

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
            const stream = new ReadableStream({
                start(controller) {
                    controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'response', text: result })}\n\n`));
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
                    // Drain any remaining messages for up to 2 seconds.
                    const drainEnd = Date.now() + 2000;
                    while (Date.now() < drainEnd) {
                        const remaining = messageQueue.shift();
                        if (!remaining) {
                            await new Promise(r => setTimeout(r, 100));
                            continue;
                        }
                        if ((remaining.serverContent as any)?.outputTranscription?.text) {
                            controller.enqueue(encoder.encode(
                                `data: ${JSON.stringify({ type: 'response', text: (remaining.serverContent as any).outputTranscription.text })}\n\n`
                            ));
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

import { NextRequest, NextResponse } from "next/server";
import { getAgencyAIConfigServer } from "@/lib/utils-server";
import { buildSingularityContext } from "@/lib/singularity-context";
import { SINGULARITY_TOOL_DECLARATIONS, getToolDisplayName } from "@/lib/singularity-tool-defs";
import { executeTool } from "@/lib/singularity-tools";
import { getSessionUser } from "@/lib/auth";
import { getAIPermissions } from "@/lib/actions";
import { validateCsrfOrigin } from "@/lib/validation";
import type { AIPermissions } from "@/lib/types";

// Tool name → AI permission flag mapping (must stay in sync with singularity-tools.ts)
const TOOL_PERMISSION_FLAGS: Record<string, keyof AIPermissions> = {
    pay_employee: 'canPayroll',
    bulk_pay_employees: 'canPayroll',
    approve_invoice_payment: 'canManageInvoices',
    reject_invoice_payment: 'canManageInvoices',
    update_invoice_status: 'canManageInvoices',
    bulk_create_invoices: 'canManageInvoices',
    create_refund: 'canRefund',
    create_employee: 'canCreateEmployee',
    bulk_create_clients: 'canManageInvoices',
    delete_project: 'canDelete',
    delete_client: 'canDelete',
    delete_transaction: 'canDelete',
    delete_service: 'canDelete',
};

/** Filter tool declarations, removing tools whose AI permissions are disabled */
function filterToolsByPermissions(tools: typeof SINGULARITY_TOOL_DECLARATIONS, aiPerms: AIPermissions) {
    return tools.filter(tool => {
        const requiredFlag = TOOL_PERMISSION_FLAGS[tool.name];
        if (!requiredFlag) return true; // Not permission-gated → always include
        return aiPerms[requiredFlag]; // Only include if the flag is enabled
    });
}

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
        const csrf = validateCsrfOrigin(req);
        if (!csrf.valid) return csrf.response;

        // Authentication check
        const session = await getSessionUser();
        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { history, message, images, documents, mode } = await req.json();
        const authenticatedUserId = session.userId;

        const aiConfig = await getAgencyAIConfigServer();
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
            console.log('[Singularity Agent] Starting agent mode for userId:', authenticatedUserId);

            // Build agency context
            let systemInstruction = '';
            try {
                systemInstruction = await buildSingularityContext(authenticatedUserId);
                console.log('[Singularity Agent] Context built, length:', systemInstruction.length);
            } catch (ctxErr: any) {
                console.error('[Singularity Agent] Context build failed:', ctxErr?.message || ctxErr);
                systemInstruction = 'You are Singularity Agent — an AI assistant for agency management. Agency data could not be loaded.';
            }
            const agentPrompt = systemInstruction + '\n\n---\n\n' + fullPrompt;

            // Fetch AI permissions and filter tool declarations
            let filteredTools = SINGULARITY_TOOL_DECLARATIONS;
            try {
                const aiPerms = await getAIPermissions();
                filteredTools = filterToolsByPermissions(SINGULARITY_TOOL_DECLARATIONS, aiPerms);
                console.log(`[Singularity Agent] Tools: ${SINGULARITY_TOOL_DECLARATIONS.length} total, ${filteredTools.length} after permission filter`);
            } catch (err) {
                console.error('[Singularity Agent] Failed to filter tools by permissions:', err);
            }

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
                            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'rechecking' })}\n\n`));
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
            const encoder = new TextEncoder();

            // Build parts once (reused across retries): text + optional PDF/image inline data
            const parts: any[] = [];
            if (documents && documents.length > 0) {
                for (const doc of documents) {
                    if (doc.mimeType === 'application/pdf' && doc.base64) {
                        parts.push({ inlineData: { mimeType: 'application/pdf', data: doc.base64 } });
                    }
                }
            }
            if (images && images.length > 0) {
                for (const img of images) {
                    parts.push({ inlineData: { mimeType: img.mimeType, data: img.base64 } });
                }
            }
            parts.push({ text: agentPrompt });

            const MAX_ATTEMPTS = 2;

            const stream = new ReadableStream({
                async start(controller) {
                    try {
                        let totalResponseChars = 0;

                        for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
                            if (attempt > 1) {
                                console.log(`[Singularity Agent] Retry attempt ${attempt} (previous returned 0 chars)`);
                                controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'rechecking' })}\n\n`));
                                await new Promise(r => setTimeout(r, 500)); // Brief pause before retry
                            }

                            const messageQueue: any[] = [];
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
                                    tools: [{ functionDeclarations: filteredTools }],
                                } as any,
                                callbacks: {
                                    onopen: () => { console.log('[Singularity Agent] Connected'); },
                                    onmessage: (msg: any) => messageQueue.push(msg),
                                    onerror: (e: any) => {
                                        console.error('[Singularity Agent] WS Error:', e?.message || e);
                                        try {
                                            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'error', text: 'Connection error' })}\n\n`));
                                        } catch { }
                                    },
                                    onclose: () => { console.log('[Singularity Agent] Disconnected'); },
                                },
                            });

                            // Send prompt
                            session.sendClientContent({
                                turns: [{ role: 'user', parts }]
                            });

                            // Poll and stream messages
                            let done = false;
                            totalResponseChars = 0;
                            let msgCount = 0;
                            const timeout = setTimeout(() => {
                                console.log('[Singularity Agent] Timeout reached');
                                done = true;
                            }, 300000);

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

                                // Process text/transcript from every message
                                if (msg.serverContent?.modelTurn?.parts) {
                                    for (const part of msg.serverContent.modelTurn.parts) {
                                        if (part.text) {
                                            totalResponseChars += part.text.length;
                                            controller.enqueue(encoder.encode(
                                                `data: ${JSON.stringify({ type: 'response', text: part.text })}\n\n`
                                            ));
                                        }
                                    }
                                }

                                if ((msg.serverContent as any)?.outputTranscription?.text) {
                                    const chunk = (msg.serverContent as any).outputTranscription.text;
                                    totalResponseChars += chunk.length;
                                    controller.enqueue(encoder.encode(
                                        `data: ${JSON.stringify({ type: 'response', text: chunk })}\n\n`
                                    ));
                                }

                                // Handle tool calls
                                if (msg.toolCall && msg.toolCall.functionCalls) {
                                    console.log('[Singularity Agent] Tool calls:', msg.toolCall.functionCalls.map((fc: any) => fc.name));
                                    const functionResponses: any[] = [];

                                    const flushTranscripts = () => {
                                        while (messageQueue.length > 0) {
                                            const queued = messageQueue[0];
                                            if (queued.toolCall || queued.serverContent?.turnComplete) break;
                                            messageQueue.shift();
                                            if (queued.serverContent?.modelTurn?.parts) {
                                                for (const part of queued.serverContent.modelTurn.parts) {
                                                    if (part.text) {
                                                        totalResponseChars += part.text.length;
                                                        controller.enqueue(encoder.encode(
                                                            `data: ${JSON.stringify({ type: 'response', text: part.text })}\n\n`
                                                        ));
                                                    }
                                                }
                                            }
                                            if ((queued.serverContent as any)?.outputTranscription?.text) {
                                                const chunk = (queued.serverContent as any).outputTranscription.text;
                                                totalResponseChars += chunk.length;
                                                controller.enqueue(encoder.encode(
                                                    `data: ${JSON.stringify({ type: 'response', text: chunk })}\n\n`
                                                ));
                                            }
                                        }
                                    };

                                    for (const fc of msg.toolCall.functionCalls) {
                                        const displayName = getToolDisplayName(fc.name);
                                        controller.enqueue(encoder.encode(
                                            `data: ${JSON.stringify({ type: 'tool_call', name: fc.name, displayName, args: fc.args })}\n\n`
                                        ));
                                        const result = await executeTool(fc.name, fc.args || {}, authenticatedUserId);
                                        console.log('[Singularity Agent] Tool result:', fc.name, result.success, result.summary);
                                        controller.enqueue(encoder.encode(
                                            `data: ${JSON.stringify({ type: 'tool_result', name: fc.name, displayName, success: result.success, summary: result.summary, rollbackData: result.rollbackData })}\n\n`
                                        ));
                                        functionResponses.push({ id: fc.id, name: fc.name, response: result });
                                        flushTranscripts();
                                    }

                                    session.sendToolResponse({ functionResponses });
                                    continue;
                                }

                                // Check for turn completion
                                if (msg.serverContent?.turnComplete) {
                                    console.log(`[Agent] turnComplete after ${msgCount} messages. Response: ${totalResponseChars} chars`);
                                    done = true;
                                }
                            }

                            // Drain remaining chunks
                            let drainDeadline = Date.now() + 5000;
                            while (Date.now() < drainDeadline) {
                                const remaining = messageQueue.shift();
                                if (!remaining) { await new Promise(r => setTimeout(r, 100)); continue; }
                                let hadContent = false;
                                if (remaining.serverContent?.modelTurn?.parts) {
                                    for (const part of remaining.serverContent.modelTurn.parts) {
                                        if (part.text) {
                                            totalResponseChars += part.text.length;
                                            controller.enqueue(encoder.encode(
                                                `data: ${JSON.stringify({ type: 'response', text: part.text })}\n\n`
                                            ));
                                            hadContent = true;
                                        }
                                    }
                                }
                                if ((remaining.serverContent as any)?.outputTranscription?.text) {
                                    const chunk = (remaining.serverContent as any).outputTranscription.text;
                                    totalResponseChars += chunk.length;
                                    controller.enqueue(encoder.encode(
                                        `data: ${JSON.stringify({ type: 'response', text: chunk })}\n\n`
                                    ));
                                    hadContent = true;
                                }
                                if (hadContent) drainDeadline = Math.max(drainDeadline, Date.now() + 2000);
                            }

                            clearTimeout(timeout);
                            session.close();

                            // If we got content, stop retrying
                            if (totalResponseChars > 0) {
                                console.log(`[Agent] Attempt ${attempt} success: ${totalResponseChars} chars`);
                                break;
                            }
                            console.log(`[Agent] Attempt ${attempt} returned 0 chars`);
                        }

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
                        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'rechecking' })}\n\n`));
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
        return NextResponse.json({ error: "An internal error occurred" }, { status: 500 });
    }
}

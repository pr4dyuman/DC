import { NextRequest, NextResponse } from "next/server";
import { getAgencyAIConfigServer } from "@/lib/utils-server";
import { buildSingularityContext } from "@/lib/singularity-context";
import { SINGULARITY_TOOL_DECLARATIONS, getToolDisplayName } from "@/lib/singularity-tool-defs";
import { executeTool } from "@/lib/singularity-tools";
import { getSessionUser } from "@/lib/auth";
import { getAIPermissions } from "@/lib/actions";
import { getCurrentAgency, checkTrialExpired } from "@/lib/agency-context";
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
    const trimmed = text.trim();
    if (!trimmed) return true;
    // Ends with sentence-ending punctuation → complete
    if (/[.!?]$/.test(trimmed)) return false;
    return true;
}

async function checkAndContinue(
    generateContent: (cfg: any, prompt: string, sys?: string) => Promise<{ text: string; tokens?: any }>,
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

    const { text: continuation } = await generateContent(aiConfig, followUpPrompt, systemInstruction);
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

        // Trial expiration check
        const agency = await getCurrentAgency();
        if (await checkTrialExpired(agency)) {
            return NextResponse.json({ error: "Trial expired. Please upgrade your plan." }, { status: 403 });
        }

        const { history, message, images, documents, mode } = await req.json();
        const authenticatedUserId = session.userId;

        // Limit message size to prevent abuse
        if (typeof message === 'string' && message.length > 50000) {
            return NextResponse.json({ error: 'Message too long (max 50,000 characters)' }, { status: 400 });
        }

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
            // Model-aware prompt: add extra guardrails for weaker/lite models
            const isLiteModel = modelId.includes('lite') || modelId.includes('flash-lite');
            if (isLiteModel) {
                systemInstruction += `\n\n⚠️ MODEL-SPECIFIC RULES (you are a lightweight model):
- ALWAYS use bulk tools (bulk_create_tasks, bulk_update_task_status) instead of individual calls for batch operations.
- When moving tasks to Done with realistic dates, use bulk_update_task_status with autoBackdate=true.
- You MUST call a tool to perform an action. Reading data (get_project_tasks) does NOT modify anything.
- If you only see "Fetching tasks" in the Actions, you have NOT updated any tasks.
- Keep responses concise. Do not over-explain or repeat yourself.`;
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
                // Non-live model: text API with tool calling support (BUG-031)
                const { GoogleGenerativeAI } = await import("@google/generative-ai");
                const genAI = new GoogleGenerativeAI(aiConfig.apiKey);
                const model = genAI.getGenerativeModel({
                    model: modelId,
                    systemInstruction,
                    tools: [{ functionDeclarations: filteredTools as any }],
                });
                const chat = model.startChat();
                const encoder = new TextEncoder();

                const stream = new ReadableStream({
                    async start(controller) {
                        try {
                            let currentPrompt = fullPrompt;
                            const MAX_TOOL_ROUNDS = 25;

                            for (let round = 0; round <= MAX_TOOL_ROUNDS; round++) {
                                const result = await chat.sendMessage(currentPrompt);
                                const response = result.response;
                                const parts = response.candidates?.[0]?.content?.parts || [];

                                // Collect text parts
                                const textParts = parts.filter((p: any) => p.text).map((p: any) => p.text);
                                if (textParts.length > 0) {
                                    controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'response', text: textParts.join('') })}\n\n`));
                                }

                                // Check for function calls
                                const functionCalls = parts.filter((p: any) => p.functionCall);
                                if (functionCalls.length === 0) break; // No more tool calls — done

                                // Execute each tool call
                                const functionResponses: any[] = [];
                                for (const part of functionCalls) {
                                    const fc = part.functionCall!;
                                    const displayName = getToolDisplayName(fc.name);
                                    controller.enqueue(encoder.encode(
                                        `data: ${JSON.stringify({ type: 'tool_call', name: fc.name, displayName, args: fc.args })}\n\n`
                                    ));
                                    const toolResult = await executeTool(fc.name, fc.args || {}, authenticatedUserId);
                                    console.log('[Singularity Agent] Tool result:', fc.name, toolResult.success, toolResult.summary);
                                    controller.enqueue(encoder.encode(
                                        `data: ${JSON.stringify({ type: 'tool_result', name: fc.name, displayName, success: toolResult.success, summary: toolResult.summary, rollbackData: toolResult.rollbackData })}\n\n`
                                    ));
                                    functionResponses.push({
                                        functionResponse: {
                                            name: fc.name,
                                            response: toolResult,
                                        }
                                    });
                                }

                                // Send tool results back to the model
                                const toolResultMsg = await chat.sendMessage(functionResponses);
                                const toolResponseParts = toolResultMsg.response.candidates?.[0]?.content?.parts || [];

                                // Collect any text from the tool response
                                const toolTextParts = toolResponseParts.filter((p: any) => p.text).map((p: any) => p.text);
                                if (toolTextParts.length > 0) {
                                    controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'response', text: toolTextParts.join('') })}\n\n`));
                                }

                                // Check if model wants more tool calls
                                const moreCalls = toolResponseParts.filter((p: any) => p.functionCall);
                                if (moreCalls.length === 0) break;

                                // Continue loop with the new function calls as the next prompt
                                // Re-enter the loop — the chat history is maintained by the SDK
                                currentPrompt = moreCalls.map((p: any) => JSON.stringify(p.functionCall)).join('\n');
                            }
                        } catch (err: any) {
                            console.error('[Singularity Agent] Non-live error:', err?.message || err);
                            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'error', text: err?.message || 'Agent error' })}\n\n`));
                        }

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

            const stream = new ReadableStream({
                async start(controller) {
                    try {
                        let totalResponseChars = 0;
                        let accumulatedText = '';

                        // Helper: poll messages from a Live session, stream to client, handle tools
                        const pollSession = async (liveSession: any, messageQueue: any[], label: string) => {
                            let done = false;
                            totalResponseChars = 0;
                            accumulatedText = '';
                            let msgCount = 0;
                            const timeout = setTimeout(() => {
                                console.log(`[Agent ${label}] Timeout reached`);
                                done = true;
                            }, 120000);

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

                                if (msg.serverContent?.modelTurn?.parts) {
                                    for (const part of msg.serverContent.modelTurn.parts) {
                                        if (part.text) {
                                            totalResponseChars += part.text.length;
                                            accumulatedText += part.text;
                                            controller.enqueue(encoder.encode(
                                                `data: ${JSON.stringify({ type: 'response', text: part.text })}\n\n`
                                            ));
                                        }
                                    }
                                }

                                if ((msg.serverContent as any)?.outputTranscription?.text) {
                                    const chunk = (msg.serverContent as any).outputTranscription.text;
                                    totalResponseChars += chunk.length;
                                    accumulatedText += chunk;
                                    controller.enqueue(encoder.encode(
                                        `data: ${JSON.stringify({ type: 'response', text: chunk })}\n\n`
                                    ));
                                }

                                // Handle tool calls
                                if (msg.toolCall && msg.toolCall.functionCalls) {
                                    console.log(`[Agent ${label}] Tool calls:`, msg.toolCall.functionCalls.map((fc: any) => fc.name));
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
                                                        accumulatedText += part.text;
                                                        controller.enqueue(encoder.encode(
                                                            `data: ${JSON.stringify({ type: 'response', text: part.text })}\n\n`
                                                        ));
                                                    }
                                                }
                                            }
                                            if ((queued.serverContent as any)?.outputTranscription?.text) {
                                                const chunk = (queued.serverContent as any).outputTranscription.text;
                                                totalResponseChars += chunk.length;
                                                accumulatedText += chunk;
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
                                        console.log(`[Agent ${label}] Tool result:`, fc.name, result.success, result.summary);
                                        controller.enqueue(encoder.encode(
                                            `data: ${JSON.stringify({ type: 'tool_result', name: fc.name, displayName, success: result.success, summary: result.summary, rollbackData: result.rollbackData })}\n\n`
                                        ));
                                        functionResponses.push({ id: fc.id, name: fc.name, response: result });
                                        flushTranscripts();
                                    }

                                    liveSession.sendToolResponse({ functionResponses });
                                    continue;
                                }

                                if (msg.serverContent?.turnComplete) {
                                    console.log(`[Agent ${label}] turnComplete after ${msgCount} msgs. Response: ${totalResponseChars} chars`);
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
                                            accumulatedText += part.text;
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
                                    accumulatedText += chunk;
                                    controller.enqueue(encoder.encode(
                                        `data: ${JSON.stringify({ type: 'response', text: chunk })}\n\n`
                                    ));
                                    hadContent = true;
                                }
                                if (hadContent) drainDeadline = Math.max(drainDeadline, Date.now() + 2000);
                            }
                            clearTimeout(timeout);
                        };

                        const isResponseBad = () => totalResponseChars === 0 || isTooShort(accumulatedText);

                        // --- Phase 1: Initial attempt on fresh connection ---
                        const messageQueue: any[] = [];
                        console.log('[Singularity Agent] Connecting with model:', modelId);

                        let session = await ai.live.connect({
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

                        session.sendClientContent({ turns: [{ role: 'user', parts }] });
                        await pollSession(session, messageQueue, 'attempt-1');

                        // --- Phase 2: Same-connection retry if response was bad ---
                        if (isResponseBad()) {
                            console.log(`[Agent] Same-connection retry (was ${totalResponseChars} chars)`);
                            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'clear' })}\n\n`));
                            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'rechecking' })}\n\n`));
                            totalResponseChars = 0;
                            accumulatedText = '';
                            messageQueue.length = 0; // Clear stale messages
                            session.sendClientContent({ turns: [{ role: 'user', parts }] });
                            await pollSession(session, messageQueue, 'same-conn-retry');
                        }

                        session.close();

                        // --- Phase 3: Reconnect if still bad ---
                        if (isResponseBad()) {
                            console.log(`[Agent] Reconnecting (was ${totalResponseChars} chars)`);
                            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'clear' })}\n\n`));
                            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'rechecking' })}\n\n`));
                            totalResponseChars = 0;
                            accumulatedText = '';
                            await new Promise(r => setTimeout(r, 500));

                            const mq2: any[] = [];
                            session = await ai.live.connect({
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
                                    onopen: () => { console.log('[Singularity Agent] Reconnected'); },
                                    onmessage: (msg: any) => mq2.push(msg),
                                    onerror: (e: any) => {
                                        console.error('[Singularity Agent] WS Error:', e?.message || e);
                                        try {
                                            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'error', text: 'Connection error' })}\n\n`));
                                        } catch { }
                                    },
                                    onclose: () => { console.log('[Singularity Agent] Disconnected'); },
                                },
                            });

                            session.sendClientContent({ turns: [{ role: 'user', parts }] });
                            await pollSession(session, mq2, 'reconnect');
                            session.close();
                        }

                        // --- Phase 4: Short-response fallback via text API (non-live model) ---
                        if (totalResponseChars > 0 && isTooShort(accumulatedText)) {
                            console.log('[Agent] Response too short, falling back to gemini-3.1-flash-lite-preview...');
                            const previousAnswer = accumulatedText;
                            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'clear' })}\n\n`));
                            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'rechecking' })}\n\n`));
                            totalResponseChars = 0;
                            accumulatedText = '';
                            try {
                                const { generateContent } = await import("@/lib/ai-provider");
                                const fallbackConfig = { ...aiConfig, model: 'gemini-3.1-flash-lite-preview' };
                                const continuation = await checkAndContinue(generateContent, fallbackConfig, systemInstruction, fullPrompt, previousAnswer);
                                if (continuation) {
                                    console.log('[Agent] Text API continuation appended.');
                                    controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'response', text: continuation })}\n\n`));
                                } else {
                                    console.log('[Agent] Text API confirmed answer was complete.');
                                }
                            } catch (err) {
                                console.error('[Agent] Text API fallback failed:', err);
                            }
                        }

                        if (totalResponseChars === 0) {
                            console.log('[Agent] All attempts returned 0 chars');
                        }

                        // Log AI usage for agent mode (Live API — estimate tokens from text)
                        const { logAIUsage: logAgentUsage } = await import("@/lib/ai-usage");
                        const agentInputTokens = Math.ceil((agentPrompt || '').length / 4);
                        const agentOutputTokens = Math.ceil((accumulatedText || '').length / 4);
                        logAgentUsage({ agencyId: agency!.id, userId: authenticatedUserId, feature: 'singularity-agent', model: modelId, provider: aiConfig.provider, inputTokens: agentInputTokens, outputTokens: agentOutputTokens, totalTokens: agentInputTokens + agentOutputTokens });

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
            const { logAIUsage } = await import("@/lib/ai-usage");
            const { text: result, tokens } = await generateContent(aiConfig, fullPrompt);
            logAIUsage({ agencyId: agency!.id, userId: authenticatedUserId, feature: 'singularity-chat', model: modelId, provider: aiConfig.provider, ...tokens });
            const encoder = new TextEncoder();

            // Stream initial response immediately, fallback check runs inside stream before done
            const stream = new ReadableStream({
                async start(controller) {
                    // 1. Send initial response right away
                    controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'response', text: result })}\n\n`));

                    // 2. Short-response fallback check (non-live model)
                    if (isTooShort(result)) {
                        console.log('[Singularity Chat] Response too short, falling back to gemini-3.1-flash-lite-preview...');
                        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'clear' })}\n\n`));
                        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'rechecking' })}\n\n`));
                        try {
                            const fallbackConfig = { ...aiConfig, model: 'gemini-3.1-flash-lite-preview' };
                            const continuation = await checkAndContinue(generateContent, fallbackConfig, '', fullPrompt, result);
                            if (continuation) {
                                console.log('[Singularity Chat] Appending continuation.');
                                controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'response', text: continuation })}\n\n`));
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
                    let liveChatAccumulatedText = '';
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
                                    liveChatAccumulatedText += part.text;
                                    controller.enqueue(encoder.encode(
                                        `data: ${JSON.stringify({ type: 'thinking', text: part.text })}\n\n`
                                    ));
                                }
                            }
                        }

                        // Stream transcript text as it arrives
                        if ((msg.serverContent as any)?.outputTranscription?.text) {
                            liveChatAccumulatedText += (msg.serverContent as any).outputTranscription.text;
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
                            liveChatAccumulatedText += (remaining.serverContent as any).outputTranscription.text;
                            controller.enqueue(encoder.encode(
                                `data: ${JSON.stringify({ type: 'response', text: (remaining.serverContent as any).outputTranscription.text })}\n\n`
                            ));
                            // Extend drain window — more transcription may follow
                            drainDeadline = Math.max(drainDeadline, Date.now() + 2000);
                        }
                    }

                    clearTimeout(timeout);
                    session.close();

                    // Log AI usage for live chat mode (estimate tokens from text)
                    const { logAIUsage: logLiveChatUsage } = await import("@/lib/ai-usage");
                    const chatInputTokens = Math.ceil((fullPrompt || '').length / 4);
                    const chatOutputTokens = Math.ceil((liveChatAccumulatedText || '').length / 4);
                    logLiveChatUsage({ agencyId: agency!.id, userId: authenticatedUserId, feature: 'singularity-chat', model: modelId, provider: aiConfig.provider, inputTokens: chatInputTokens, outputTokens: chatOutputTokens, totalTokens: chatInputTokens + chatOutputTokens });

                    controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'done' })}\n\n`));
                    controller.close();
                } catch (error: any) {
                    console.error('[Singularity Stream] Error:', error);
                    // Sanitize error: only show safe user-facing messages, not internal details
                    const msg = error?.message || '';
                    const isSafe = msg.startsWith('Unauthorized') || msg.startsWith('AI permissions')
                        || msg.startsWith('Plan limit') || msg.includes('quota') || msg.includes('rate limit');
                    const safeMsg = isSafe ? msg : 'Something went wrong. Please try again.';
                    controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'error', text: safeMsg })}\n\n`));
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

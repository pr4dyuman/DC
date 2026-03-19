import { getToolDisplayName, SINGULARITY_TOOL_DECLARATIONS } from "@/lib/singularity-tool-defs";
import {
    checkAndContinue,
    createEventStreamResponse,
    getErrorMessage,
    getLiveEventMessage,
    getOutputTranscriptionText,
    isTooShort,
    toToolArgs,
} from "@/lib/singularity-route-helpers";
import { executeTool } from "@/lib/singularity-tools";
import type { AIConfig } from "@/lib/types";
import type { FunctionDeclaration as GenerativeFunctionDeclaration, Part as GenerativePart } from "@google/generative-ai";
import type {
    FunctionDeclaration as LiveFunctionDeclaration,
    FunctionResponse as LiveFunctionResponse,
    LiveConnectParameters,
    LiveServerMessage,
    Part as LivePart,
    Session as LiveSession,
} from "@google/genai";

type NonLiveAgentOptions = {
    aiConfig: AIConfig;
    modelId: string;
    systemInstruction: string;
    fullPrompt: string;
    filteredTools: typeof SINGULARITY_TOOL_DECLARATIONS;
    authenticatedUserId: string;
};

type AgentImageInput = {
    mimeType?: string;
    base64?: string;
};

type AgentDocumentInput = {
    mimeType?: string;
    base64?: string;
};

type LiveAgentOptions = {
    aiConfig: AIConfig;
    agencyId: string;
    authenticatedUserId: string;
    modelId: string;
    systemInstruction: string;
    fullPrompt: string;
    agentPrompt: string;
    filteredTools: typeof SINGULARITY_TOOL_DECLARATIONS;
    images?: AgentImageInput[];
    documents?: AgentDocumentInput[];
};

export async function handleNonLiveAgentMode({
    aiConfig,
    modelId,
    systemInstruction,
    fullPrompt,
    filteredTools,
    authenticatedUserId,
}: NonLiveAgentOptions): Promise<Response> {
    const { GoogleGenerativeAI } = await import("@google/generative-ai");
    const genAI = new GoogleGenerativeAI(aiConfig.apiKey);
    const model = genAI.getGenerativeModel({
        model: modelId,
        systemInstruction,
        tools: [{ functionDeclarations: filteredTools as unknown as GenerativeFunctionDeclaration[] }],
    });
    const chat = model.startChat();
    const encoder = new TextEncoder();

    const stream = new ReadableStream({
        async start(controller) {
            try {
                const MAX_TOOL_ROUNDS = 25;

                const initialResult = await chat.sendMessage(fullPrompt);
                let responseParts = (initialResult.response.candidates?.[0]?.content?.parts ?? []) as GenerativePart[];

                for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
                    const textParts = responseParts.flatMap((part) => (
                        typeof part.text === "string" ? [part.text] : []
                    ));
                    if (textParts.length > 0) {
                        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "response", text: textParts.join("") })}\n\n`));
                    }

                    const functionCalls = responseParts.flatMap((part) => (
                        part.functionCall ? [part.functionCall] : []
                    ));
                    if (functionCalls.length === 0) break;

                    const functionResponses: GenerativePart[] = [];
                    for (const functionCall of functionCalls) {
                        const displayName = getToolDisplayName(functionCall.name);
                        controller.enqueue(encoder.encode(
                            `data: ${JSON.stringify({ type: "tool_call", name: functionCall.name, displayName, args: functionCall.args })}\n\n`
                        ));
                        const toolResult = await executeTool(functionCall.name, toToolArgs(functionCall.args), authenticatedUserId);
                        console.log("[Singularity Agent] Tool result:", functionCall.name, toolResult.success, toolResult.summary);
                        controller.enqueue(encoder.encode(
                            `data: ${JSON.stringify({ type: "tool_result", name: functionCall.name, displayName, success: toolResult.success, summary: toolResult.summary, rollbackData: toolResult.rollbackData })}\n\n`
                        ));
                        functionResponses.push({
                            functionResponse: {
                                name: functionCall.name,
                                response: toolResult,
                            },
                        });
                    }

                    const toolResultMessage = await chat.sendMessage(functionResponses);
                    responseParts = (toolResultMessage.response.candidates?.[0]?.content?.parts ?? []) as GenerativePart[];
                }
            } catch (error: unknown) {
                const errorMessage = getErrorMessage(error, "Agent error");
                console.error("[Singularity Agent] Non-live error:", errorMessage);
                controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "error", text: errorMessage })}\n\n`));
            }

            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "done" })}\n\n`));
            controller.close();
        },
    });

    return createEventStreamResponse(stream);
}

export async function handleLiveAgentMode({
    aiConfig,
    agencyId,
    authenticatedUserId,
    modelId,
    systemInstruction,
    fullPrompt,
    agentPrompt,
    filteredTools,
    images,
    documents,
}: LiveAgentOptions): Promise<Response> {
    const { GoogleGenAI, Modality } = await import("@google/genai");
    const ai = new GoogleGenAI({ apiKey: aiConfig.apiKey });
    const encoder = new TextEncoder();

    const parts: LivePart[] = [];
    if (documents && documents.length > 0) {
        for (const doc of documents) {
            if (doc.mimeType === "application/pdf" && doc.base64) {
                parts.push({ inlineData: { mimeType: "application/pdf", data: doc.base64 } });
            }
        }
    }
    if (images && images.length > 0) {
        for (const image of images) {
            if (!image.mimeType || !image.base64) continue;
            parts.push({ inlineData: { mimeType: image.mimeType, data: image.base64 } });
        }
    }
    parts.push({ text: agentPrompt });

    const stream = new ReadableStream({
        async start(controller) {
            try {
                let totalResponseChars = 0;
                let accumulatedText = "";

                const pollSession = async (liveSession: LiveSession, messageQueue: LiveServerMessage[], label: string) => {
                    let done = false;
                    totalResponseChars = 0;
                    accumulatedText = "";
                    let msgCount = 0;
                    const timeout = setTimeout(() => {
                        console.log(`[Agent ${label}] Timeout reached`);
                        done = true;
                    }, 120000);

                    const waitMsg = (): Promise<LiveServerMessage | null> => new Promise((resolve) => {
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
                                        `data: ${JSON.stringify({ type: "response", text: part.text })}\n\n`
                                    ));
                                }
                            }
                        }

                        const transcriptChunk = getOutputTranscriptionText(msg);
                        if (transcriptChunk) {
                            const chunk = transcriptChunk;
                            totalResponseChars += chunk.length;
                            accumulatedText += chunk;
                            controller.enqueue(encoder.encode(
                                `data: ${JSON.stringify({ type: "response", text: chunk })}\n\n`
                            ));
                        }

                        if (msg.toolCall && msg.toolCall.functionCalls) {
                            console.log(`[Agent ${label}] Tool calls:`, msg.toolCall.functionCalls.flatMap((functionCall) => (
                                functionCall.name ? [functionCall.name] : []
                            )));
                            const functionResponses: LiveFunctionResponse[] = [];

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
                                                    `data: ${JSON.stringify({ type: "response", text: part.text })}\n\n`
                                                ));
                                            }
                                        }
                                    }
                                    const queuedTranscript = getOutputTranscriptionText(queued);
                                    if (queuedTranscript) {
                                        const chunk = queuedTranscript;
                                        totalResponseChars += chunk.length;
                                        accumulatedText += chunk;
                                        controller.enqueue(encoder.encode(
                                            `data: ${JSON.stringify({ type: "response", text: chunk })}\n\n`
                                        ));
                                    }
                                }
                            };

                            for (const functionCall of msg.toolCall.functionCalls) {
                                if (!functionCall.name) {
                                    console.warn(`[Agent ${label}] Skipping tool call with no name`);
                                    continue;
                                }
                                const displayName = getToolDisplayName(functionCall.name);
                                controller.enqueue(encoder.encode(
                                    `data: ${JSON.stringify({ type: "tool_call", name: functionCall.name, displayName, args: functionCall.args })}\n\n`
                                ));
                                const result = await executeTool(functionCall.name, toToolArgs(functionCall.args), authenticatedUserId);
                                console.log(`[Agent ${label}] Tool result:`, functionCall.name, result.success, result.summary);
                                controller.enqueue(encoder.encode(
                                    `data: ${JSON.stringify({ type: "tool_result", name: functionCall.name, displayName, success: result.success, summary: result.summary, rollbackData: result.rollbackData })}\n\n`
                                ));
                                functionResponses.push({ id: functionCall.id, name: functionCall.name, response: result });
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

                    let drainDeadline = Date.now() + 5000;
                    while (Date.now() < drainDeadline) {
                        const remaining = messageQueue.shift();
                        if (!remaining) {
                            await new Promise((resolve) => setTimeout(resolve, 100));
                            continue;
                        }
                        let hadContent = false;
                        if (remaining.serverContent?.modelTurn?.parts) {
                            for (const part of remaining.serverContent.modelTurn.parts) {
                                if (part.text) {
                                    totalResponseChars += part.text.length;
                                    accumulatedText += part.text;
                                    controller.enqueue(encoder.encode(
                                        `data: ${JSON.stringify({ type: "response", text: part.text })}\n\n`
                                    ));
                                    hadContent = true;
                                }
                            }
                        }
                        const remainingTranscript = getOutputTranscriptionText(remaining);
                        if (remainingTranscript) {
                            const chunk = remainingTranscript;
                            totalResponseChars += chunk.length;
                            accumulatedText += chunk;
                            controller.enqueue(encoder.encode(
                                `data: ${JSON.stringify({ type: "response", text: chunk })}\n\n`
                            ));
                            hadContent = true;
                        }
                        if (hadContent) drainDeadline = Math.max(drainDeadline, Date.now() + 2000);
                    }
                    clearTimeout(timeout);
                };

                const isResponseBad = () => totalResponseChars === 0 || isTooShort(accumulatedText);

                const messageQueue: LiveServerMessage[] = [];
                console.log("[Singularity Agent] Connecting with model:", modelId);

                const initialAgentConnectConfig: LiveConnectParameters = {
                    model: `models/${modelId}`,
                    config: {
                        responseModalities: [Modality.AUDIO],
                        speechConfig: {
                            voiceConfig: {
                                prebuiltVoiceConfig: { voiceName: "Zephyr" },
                            },
                        },
                        outputAudioTranscription: {},
                        tools: [{ functionDeclarations: filteredTools as unknown as LiveFunctionDeclaration[] }],
                    },
                    callbacks: {
                        onopen: () => { console.log("[Singularity Agent] Connected"); },
                        onmessage: (msg) => messageQueue.push(msg),
                        onerror: (event) => {
                            console.error("[Singularity Agent] WS Error:", getLiveEventMessage(event));
                            try {
                                controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "error", text: "Connection error" })}\n\n`));
                            } catch { }
                        },
                        onclose: () => { console.log("[Singularity Agent] Disconnected"); },
                    },
                };

                let session = await ai.live.connect(initialAgentConnectConfig);

                session.sendClientContent({ turns: [{ role: "user", parts }] });
                await pollSession(session, messageQueue, "attempt-1");

                if (isResponseBad()) {
                    console.log(`[Agent] Same-connection retry (was ${totalResponseChars} chars)`);
                    controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "clear" })}\n\n`));
                    controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "rechecking" })}\n\n`));
                    totalResponseChars = 0;
                    accumulatedText = "";
                    messageQueue.length = 0;
                    session.sendClientContent({ turns: [{ role: "user", parts }] });
                    await pollSession(session, messageQueue, "same-conn-retry");
                }

                session.close();

                if (isResponseBad()) {
                    console.log(`[Agent] Reconnecting (was ${totalResponseChars} chars)`);
                    controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "clear" })}\n\n`));
                    controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "rechecking" })}\n\n`));
                    totalResponseChars = 0;
                    accumulatedText = "";
                    await new Promise((resolve) => setTimeout(resolve, 500));

                    const retryQueue: LiveServerMessage[] = [];
                    const retryAgentConnectConfig: LiveConnectParameters = {
                        model: `models/${modelId}`,
                        config: {
                            responseModalities: [Modality.AUDIO],
                            speechConfig: {
                                voiceConfig: {
                                    prebuiltVoiceConfig: { voiceName: "Zephyr" },
                                },
                            },
                            outputAudioTranscription: {},
                            tools: [{ functionDeclarations: filteredTools as unknown as LiveFunctionDeclaration[] }],
                        },
                        callbacks: {
                            onopen: () => { console.log("[Singularity Agent] Reconnected"); },
                            onmessage: (msg) => retryQueue.push(msg),
                            onerror: (event) => {
                                console.error("[Singularity Agent] WS Error:", getLiveEventMessage(event));
                                try {
                                    controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "error", text: "Connection error" })}\n\n`));
                                } catch { }
                            },
                            onclose: () => { console.log("[Singularity Agent] Disconnected"); },
                        },
                    };
                    session = await ai.live.connect(retryAgentConnectConfig);

                    session.sendClientContent({ turns: [{ role: "user", parts }] });
                    await pollSession(session, retryQueue, "reconnect");
                    session.close();
                }

                if (totalResponseChars > 0 && isTooShort(accumulatedText)) {
                    console.log("[Agent] Response too short, falling back to gemini-3.1-flash-lite-preview...");
                    const previousAnswer = accumulatedText;
                    controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "clear" })}\n\n`));
                    controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "rechecking" })}\n\n`));
                    totalResponseChars = 0;
                    accumulatedText = "";
                    try {
                        const { generateContent } = await import("@/lib/ai-provider");
                        const fallbackConfig = { ...aiConfig, model: "gemini-3.1-flash-lite-preview" };
                        const continuation = await checkAndContinue(generateContent, fallbackConfig, systemInstruction, fullPrompt, previousAnswer);
                        if (continuation) {
                            console.log("[Agent] Text API continuation appended.");
                            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "response", text: continuation })}\n\n`));
                        } else {
                            console.log("[Agent] Text API confirmed answer was complete.");
                        }
                    } catch (error) {
                        console.error("[Agent] Text API fallback failed:", error);
                    }
                }

                if (totalResponseChars === 0) {
                    console.log("[Agent] All attempts returned 0 chars");
                }

                const { logAIUsage: logAgentUsage } = await import("@/lib/ai-usage");
                const agentInputTokens = Math.ceil((agentPrompt || "").length / 4);
                const agentOutputTokens = Math.ceil((accumulatedText || "").length / 4);
                logAgentUsage({
                    agencyId,
                    userId: authenticatedUserId,
                    feature: "singularity-agent",
                    model: modelId,
                    provider: aiConfig.provider,
                    inputTokens: agentInputTokens,
                    outputTokens: agentOutputTokens,
                    totalTokens: agentInputTokens + agentOutputTokens,
                });

                controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "done" })}\n\n`));
                controller.close();
            } catch (error: unknown) {
                const errorMessage = getErrorMessage(error, "Agent error");
                console.error("[Singularity Agent] Error:", errorMessage);
                try {
                    controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "error", text: errorMessage })}\n\n`));
                    controller.close();
                } catch { }
            }
        },
    });

    return createEventStreamResponse(stream);
}

import type { AIConfig } from "@/lib/types";
import {
    buildSingularityMultimodalParts,
    checkAndContinue,
    createEventStreamResponse,
    getErrorMessage,
    getLiveEventMessage,
    getOutputTranscriptionText,
    hasInlineAttachments,
    isTooShort,
} from "@/lib/singularity-route-helpers";
import type { Part as LivePart, LiveConnectParameters, LiveServerMessage } from "@google/genai";

type ChatImageInput = {
    mimeType?: string;
    base64?: string;
};

type ChatDocumentInput = {
    fileName?: string;
    mimeType?: string;
    base64?: string;
    textContent?: string;
};

type ChatModeOptions = {
    aiConfig: AIConfig;
    fullPrompt: string;
    images?: ChatImageInput[];
    documents?: ChatDocumentInput[];
    agencyId: string;
    authenticatedUserId: string;
    modelId: string;
};

async function handleNonLiveChatMode({
    aiConfig,
    fullPrompt,
    images,
    documents,
    agencyId,
    authenticatedUserId,
    modelId,
}: ChatModeOptions): Promise<Response> {
    const { generateContent, generateContentWithParts } = await import("@/lib/ai-provider");
    const { logAIUsage } = await import("@/lib/ai-usage");
    const { text: result, tokens } = hasInlineAttachments(images, documents)
        ? await generateContentWithParts(
            aiConfig,
            buildSingularityMultimodalParts(fullPrompt, images, documents)
        )
        : await generateContent(aiConfig, fullPrompt);

    logAIUsage({
        agencyId,
        userId: authenticatedUserId,
        feature: "singularity-chat",
        model: modelId,
        provider: aiConfig.provider,
        ...tokens,
    });

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
        async start(controller) {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "response", text: result })}\n\n`));

            if (isTooShort(result)) {
                console.log("[Singularity Chat] Response too short, falling back to gemini-3.1-flash-lite-preview...");
                controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "clear" })}\n\n`));
                controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "rechecking" })}\n\n`));

                try {
                    const fallbackConfig = { ...aiConfig, model: "gemini-3.1-flash-lite-preview" };
                    const continuation = await checkAndContinue(generateContent, fallbackConfig, "", fullPrompt, result);
                    if (continuation) {
                        console.log("[Singularity Chat] Appending continuation.");
                        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "response", text: continuation })}\n\n`));
                    } else {
                        console.log("[Singularity Chat] AI confirmed answer was complete.");
                    }
                } catch (err) {
                    console.error("[Singularity Chat] Fallback check failed:", err);
                }
            }

            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "done" })}\n\n`));
            controller.close();
        },
    });

    return createEventStreamResponse(stream);
}

async function handleLiveChatMode({
    aiConfig,
    fullPrompt,
    images,
    documents,
    agencyId,
    authenticatedUserId,
    modelId,
}: ChatModeOptions): Promise<Response> {
    const { GoogleGenAI, Modality } = await import("@google/genai");
    const ai = new GoogleGenAI({ apiKey: aiConfig.apiKey });
    const messageQueue: LiveServerMessage[] = [];
    const encoder = new TextEncoder();

    const stream = new ReadableStream({
        async start(controller) {
            try {
                let done = false;
                const liveChatConnectConfig: LiveConnectParameters = {
                    model: `models/${modelId}`,
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
                        onopen: () => { },
                        onmessage: (msg) => messageQueue.push(msg),
                        onerror: (event) => {
                            console.error("[Singularity Stream] Error:", getLiveEventMessage(event));
                            done = true;
                            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "error", text: "Connection error" })}\n\n`));
                        },
                        onclose: () => { },
                    },
                };
                const session = await ai.live.connect(liveChatConnectConfig);

                const parts: LivePart[] = [];
                if (images && images.length > 0) {
                    for (const img of images) {
                        if (!img.mimeType || !img.base64) continue;
                        parts.push({
                            inlineData: {
                                mimeType: img.mimeType,
                                data: img.base64,
                            },
                        });
                    }
                }
                if (documents && documents.length > 0) {
                    for (const doc of documents) {
                        if (doc.mimeType === "application/pdf" && doc.base64) {
                            parts.push({
                                inlineData: {
                                    mimeType: "application/pdf",
                                    data: doc.base64,
                                },
                            });
                        }
                    }
                }

                parts.push({ text: fullPrompt });

                session.sendClientContent({
                    turns: [{ role: "user", parts }],
                });

                let liveChatAccumulatedText = "";
                const timeout = setTimeout(() => { done = true; }, 60000);

                const waitMsg = (): Promise<LiveServerMessage | null> => new Promise((resolve) => {
                    const check = () => {
                        if (done) {
                            resolve(null);
                            return;
                        }
                        const msg = messageQueue.shift();
                        if (msg) resolve(msg);
                        else setTimeout(check, 50);
                    };
                    check();
                });

                while (!done) {
                    const msg = await waitMsg();
                    if (!msg) break;

                    if (msg.serverContent?.modelTurn?.parts) {
                        for (const part of msg.serverContent.modelTurn.parts) {
                            if (part.text) {
                                liveChatAccumulatedText += part.text;
                                controller.enqueue(encoder.encode(
                                    `data: ${JSON.stringify({ type: "thinking", text: part.text })}\n\n`
                                ));
                            }
                        }
                    }

                    const transcriptChunk = getOutputTranscriptionText(msg);
                    if (transcriptChunk) {
                        liveChatAccumulatedText += transcriptChunk;
                        controller.enqueue(encoder.encode(
                            `data: ${JSON.stringify({ type: "response", text: transcriptChunk })}\n\n`
                        ));
                    }

                    if (msg.serverContent?.turnComplete) {
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
                    const remainingTranscript = getOutputTranscriptionText(remaining);
                    if (remainingTranscript) {
                        liveChatAccumulatedText += remainingTranscript;
                        controller.enqueue(encoder.encode(
                            `data: ${JSON.stringify({ type: "response", text: remainingTranscript })}\n\n`
                        ));
                        drainDeadline = Math.max(drainDeadline, Date.now() + 2000);
                    }
                }

                clearTimeout(timeout);
                session.close();

                const { logAIUsage: logLiveChatUsage } = await import("@/lib/ai-usage");
                const chatInputTokens = Math.ceil((fullPrompt || "").length / 4);
                const chatOutputTokens = Math.ceil((liveChatAccumulatedText || "").length / 4);
                logLiveChatUsage({
                    agencyId,
                    userId: authenticatedUserId,
                    feature: "singularity-chat",
                    model: modelId,
                    provider: aiConfig.provider,
                    inputTokens: chatInputTokens,
                    outputTokens: chatOutputTokens,
                    totalTokens: chatInputTokens + chatOutputTokens,
                });

                controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "done" })}\n\n`));
                controller.close();
            } catch (error: unknown) {
                console.error("[Singularity Stream] Error:", error);
                const msg = getErrorMessage(error, "");
                const isSafe = msg.startsWith("Unauthorized") || msg.startsWith("AI permissions")
                    || msg.startsWith("Plan limit") || msg.includes("quota") || msg.includes("rate limit");
                const safeMsg = isSafe ? msg : "Something went wrong. Please try again.";
                controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "error", text: safeMsg })}\n\n`));
                controller.close();
            }
        },
    });

    return createEventStreamResponse(stream);
}

export async function handleChatModeRequest(options: ChatModeOptions): Promise<Response> {
    if (options.modelId.includes("native-audio")) {
        return handleLiveChatMode(options);
    }

    return handleNonLiveChatMode(options);
}

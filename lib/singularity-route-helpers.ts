import "server-only";

import type { AIConfig, AIPermissions } from "@/lib/types";
import type { MultimodalPart } from "@/lib/ai-provider-shared";
import type { LiveCallbacks, LiveServerMessage } from "@google/genai";

const TOOL_PERMISSION_FLAGS: Record<string, keyof AIPermissions> = {
    pay_employee: "canPayroll",
    bulk_pay_employees: "canPayroll",
    approve_invoice_payment: "canManageInvoices",
    reject_invoice_payment: "canManageInvoices",
    update_invoice_status: "canManageInvoices",
    bulk_create_invoices: "canManageInvoices",
    create_refund: "canRefund",
    create_employee: "canCreateEmployee",
    delete_project: "canDelete",
    delete_client: "canDelete",
    delete_transaction: "canDelete",
    delete_service: "canDelete",
};

const MAX_MESSAGE_CHARS = 50_000;
const MAX_HISTORY_MESSAGES = 200;
const MAX_HISTORY_CHARS = 250_000;
const MAX_IMAGES = 4;
const MAX_DOCUMENTS = 4;
const MAX_IMAGE_BASE64_CHARS = Math.ceil(10 * 1024 * 1024 * 4 / 3) + 1024;
const MAX_DOCUMENT_BASE64_CHARS = Math.ceil(20 * 1024 * 1024 * 4 / 3) + 1024;
const MAX_DOCUMENT_TEXT_CHARS = 100_000;
const MAX_TOTAL_DOCUMENT_TEXT_CHARS = MAX_DOCUMENTS * MAX_DOCUMENT_TEXT_CHARS;
const MAX_FILENAME_CHARS = 255;
const MAX_MIME_TYPE_CHARS = 120;

type GenerateContentFn = (
    config: AIConfig,
    prompt: string,
    systemInstruction?: string
) => Promise<{ text: string; tokens?: unknown }>;

export type SingularityHistoryMessage = {
    role?: string;
    content?: string;
};

export type UploadedImage = {
    mimeType?: string;
    base64?: string;
};

export type UploadedDocument = {
    fileName?: string;
    mimeType?: string;
    base64?: string;
    textContent?: string;
};

export type SingularityRequestBody = {
    history?: SingularityHistoryMessage[];
    message?: string;
    images?: UploadedImage[];
    documents?: UploadedDocument[];
    mode?: string;
    isHeavyTask?: boolean;
};

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function toToolArgs(value: unknown): Record<string, unknown> {
    return isRecord(value) ? value : {};
}

export function normalizeSingularityRequestBody(requestBody: Partial<SingularityRequestBody>) {
    return {
        history: Array.isArray(requestBody.history) ? requestBody.history : [],
        message: typeof requestBody.message === "string" ? requestBody.message : "",
        images: Array.isArray(requestBody.images) ? requestBody.images : [],
        documents: Array.isArray(requestBody.documents) ? requestBody.documents : [],
        mode: requestBody.mode,
        isHeavyTask: requestBody.isHeavyTask === true,
    };
}

export function validateSingularityPayloadLimits({
    history,
    message,
    images,
    documents,
}: {
    history: SingularityHistoryMessage[];
    message: string;
    images: UploadedImage[];
    documents: UploadedDocument[];
}): string | null {
    if (message.length > MAX_MESSAGE_CHARS) {
        return `Message too long (max ${MAX_MESSAGE_CHARS.toLocaleString()} characters)`;
    }

    if (history.length > MAX_HISTORY_MESSAGES) {
        return `Too many history messages (max ${MAX_HISTORY_MESSAGES})`;
    }

    const historyChars = history.reduce((total, entry) => {
        const content = typeof entry.content === "string" ? entry.content : "";
        return total + content.length;
    }, 0);
    if (historyChars + message.length > MAX_HISTORY_CHARS) {
        return `Conversation context too large (max ${MAX_HISTORY_CHARS.toLocaleString()} characters)`;
    }

    if (images.length > MAX_IMAGES) {
        return `Too many images (max ${MAX_IMAGES})`;
    }
    for (const image of images) {
        if (typeof image.mimeType !== "string" || image.mimeType.length > MAX_MIME_TYPE_CHARS || !image.mimeType.startsWith("image/")) {
            return "Invalid image attachment type";
        }
        if (typeof image.base64 !== "string" || image.base64.length === 0 || image.base64.length > MAX_IMAGE_BASE64_CHARS) {
            return "Image attachment is missing or too large";
        }
    }

    if (documents.length > MAX_DOCUMENTS) {
        return `Too many documents (max ${MAX_DOCUMENTS})`;
    }

    let totalDocumentTextChars = 0;
    for (const doc of documents) {
        if (doc.fileName && doc.fileName.length > MAX_FILENAME_CHARS) {
            return "Document filename is too long";
        }
        if (doc.mimeType && doc.mimeType.length > MAX_MIME_TYPE_CHARS) {
            return "Document MIME type is too long";
        }
        if (doc.textContent) {
            totalDocumentTextChars += doc.textContent.length;
            if (doc.textContent.length > MAX_DOCUMENT_TEXT_CHARS) {
                return `Document text is too large (max ${MAX_DOCUMENT_TEXT_CHARS.toLocaleString()} characters per document)`;
            }
        }
        if (doc.base64 && doc.base64.length > MAX_DOCUMENT_BASE64_CHARS) {
            return "Document attachment is too large";
        }
    }

    if (totalDocumentTextChars > MAX_TOTAL_DOCUMENT_TEXT_CHARS) {
        return "Uploaded document text is too large";
    }

    return null;
}

export function buildConversationPrompt(history: SingularityHistoryMessage[], message: string) {
    let fullPrompt = "";

    if (history.length > 0) {
        fullPrompt += history
            .map((entry) => `${entry.role === "user" ? "User" : "Singularity"}: ${entry.content}`)
            .join("\n\n");
        fullPrompt += "\n\n";
    }

    fullPrompt += `User: ${message}`;
    return fullPrompt;
}

export function buildSingularityMultimodalParts(
    prompt: string,
    images: UploadedImage[] = [],
    documents: UploadedDocument[] = []
): MultimodalPart[] {
    const parts: MultimodalPart[] = [{ text: prompt }];

    for (const image of images) {
        if (!image.mimeType || !image.base64) continue;
        parts.push({
            inlineData: {
                mimeType: image.mimeType,
                data: image.base64,
            },
        });
    }

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

    return parts;
}

export function hasInlineAttachments(images: UploadedImage[] = [], documents: UploadedDocument[] = []) {
    return images.some((image) => Boolean(image.mimeType && image.base64))
        || documents.some((doc) => doc.mimeType === "application/pdf" && Boolean(doc.base64));
}

export function getErrorMessage(error: unknown, fallback = "Unknown error"): string {
    if (error instanceof Error && error.message) {
        return error.message;
    }

    if (typeof error === "string" && error.trim()) {
        return error;
    }

    return fallback;
}

export function getOutputTranscriptionText(message: LiveServerMessage): string | null {
    return message.serverContent?.outputTranscription?.text ?? null;
}

export function getLiveEventMessage(event: Parameters<NonNullable<LiveCallbacks["onerror"]>>[0]): string {
    if (typeof event.message === "string" && event.message.trim()) {
        return event.message;
    }

    return getErrorMessage(event.error, "Connection error");
}

export function filterToolsByPermissions<T extends { name: string }>(tools: T[], aiPerms: AIPermissions): T[] {
    return tools.filter((tool) => {
        const requiredFlag = TOOL_PERMISSION_FLAGS[tool.name];
        if (!requiredFlag) return true;
        return aiPerms[requiredFlag];
    });
}

export function isTooShort(text: string): boolean {
    const trimmed = text.trim();
    if (!trimmed) return true;
    if (trimmed.length > 80) return false;
    if (/[.!?]$/.test(trimmed)) return false;
    if (/```\s*$/.test(trimmed)) return false;
    if (/[)}\]>:`"']$/.test(trimmed)) return false;
    return trimmed.split("\n").filter((line) => line.trim()).length < 2;
}

export async function checkAndContinue(
    generateContent: GenerateContentFn,
    aiConfig: AIConfig,
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

    if (!trimmed || trimmed.toUpperCase() === "COMPLETE") return null;

    return trimmed;
}

export function createEventStreamResponse(stream: ReadableStream) {
    return new Response(stream, {
        headers: {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache",
            Connection: "keep-alive",
        },
    });
}

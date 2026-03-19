import "server-only";

import type { AIConfig, AIPermissions } from "@/lib/types";
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
    };
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

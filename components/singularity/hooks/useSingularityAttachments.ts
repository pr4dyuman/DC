import { useCallback, useState, type DragEvent } from "react";

import {
    ACCEPTED_DOCS,
    DOC_EXTENSIONS,
    type Attachment,
} from "../singularity-chat-shared";

const MAX_ATTACHMENT_COUNT = 4;
const MAX_IMAGE_SIZE_BYTES = 10 * 1024 * 1024;
const MAX_DOCUMENT_SIZE_BYTES = 20 * 1024 * 1024;
const MAX_TEXT_CONTENT_LENGTH = 100000;

function createAttachmentId(prefix: "img" | "doc") {
    return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
}

async function processFile(file: File): Promise<Attachment | null> {
    if (file.type.startsWith("image/")) {
        if (file.size > MAX_IMAGE_SIZE_BYTES) {
            return null;
        }

        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = () => {
                const base64Full = reader.result as string;
                resolve({
                    id: createAttachmentId("img"),
                    file,
                    preview: base64Full,
                    base64: base64Full.split(",")[1],
                    mimeType: file.type,
                    fileType: "image",
                });
            };
            reader.readAsDataURL(file);
        });
    }

    const extension = `.${file.name.split(".").pop()?.toLowerCase()}`;
    const isDocument = ACCEPTED_DOCS.includes(file.type) || DOC_EXTENSIONS.includes(extension);
    if (!isDocument || file.size > MAX_DOCUMENT_SIZE_BYTES) {
        return null;
    }

    try {
        let textContent = "";

        if (file.type === "application/pdf" || extension === ".pdf") {
            const arrayBuffer = await file.arrayBuffer();
            const bytes = new Uint8Array(arrayBuffer);
            let binary = "";
            for (let index = 0; index < bytes.length; index += 1) {
                binary += String.fromCharCode(bytes[index]);
            }
            const base64 = btoa(binary);
            return {
                id: createAttachmentId("doc"),
                file,
                preview: "",
                base64,
                mimeType: "application/pdf",
                fileType: "document",
                fileName: file.name,
                textContent: `[PDF Document: ${file.name} - ${(file.size / 1024).toFixed(0)}KB. Content will be extracted by AI.]`,
            };
        }

        textContent = await file.text();
        if (textContent.length > MAX_TEXT_CONTENT_LENGTH) {
            textContent = `${textContent.slice(0, MAX_TEXT_CONTENT_LENGTH)}\n\n[... truncated - document too large, showing first 100K characters ...]`;
        }

        return {
            id: createAttachmentId("doc"),
            file,
            preview: "",
            base64: "",
            mimeType: file.type || "text/plain",
            fileType: "document",
            fileName: file.name,
            textContent,
        };
    } catch {
        return null;
    }
}

export function useSingularityAttachments() {
    const [attachments, setAttachments] = useState<Attachment[]>([]);
    const [isDragOver, setIsDragOver] = useState(false);

    const handleFileSelect = useCallback(async (files: FileList | null) => {
        if (!files) {
            return;
        }

        const nextAttachments: Attachment[] = [];
        for (const file of Array.from(files).slice(0, MAX_ATTACHMENT_COUNT)) {
            const attachment = await processFile(file);
            if (attachment) {
                nextAttachments.push(attachment);
            }
        }

        setAttachments((previous) => [...previous, ...nextAttachments].slice(0, MAX_ATTACHMENT_COUNT));
    }, []);

    const removeAttachment = useCallback((id: string) => {
        setAttachments((previous) => previous.filter((attachment) => attachment.id !== id));
    }, []);

    const clearAttachments = useCallback(() => {
        setAttachments([]);
        setIsDragOver(false);
    }, []);

    const handleDragOver = useCallback((event: DragEvent) => {
        event.preventDefault();
        setIsDragOver(true);
    }, []);

    const handleDragLeave = useCallback(() => {
        setIsDragOver(false);
    }, []);

    const handleDrop = useCallback(async (event: DragEvent) => {
        event.preventDefault();
        setIsDragOver(false);
        await handleFileSelect(event.dataTransfer.files);
    }, [handleFileSelect]);

    return {
        attachments,
        isDragOver,
        handleFileSelect,
        removeAttachment,
        clearAttachments,
        handleDragOver,
        handleDragLeave,
        handleDrop,
    };
}

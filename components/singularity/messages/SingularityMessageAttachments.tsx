"use client";

import { FileCode, FileSpreadsheet, FileText, Paperclip } from "lucide-react";

import { cn } from "@/lib/utils";

import type { MessageAttachment } from "../singularity-chat-shared";

type SingularityMessageAttachmentsProps = {
    role: "user" | "model";
    images?: string[];
    attachments?: MessageAttachment[];
};

export function SingularityMessageAttachments({
    role,
    images,
    attachments,
}: SingularityMessageAttachmentsProps) {
    const imageList = images?.filter(Boolean) ?? [];
    const documentList = attachments ?? [];

    if (imageList.length === 0 && documentList.length === 0) {
        return null;
    }

    return (
        <>
            {imageList.length > 0 && (
                <div className="flex gap-2 flex-wrap">
                    {imageList.map((image, index) => (
                        /* eslint-disable-next-line @next/next/no-img-element -- dynamic chat images are user-generated data URLs with unknown aspect ratios */
                        <img
                            key={`${image}-${index}`}
                            src={image}
                            alt="Attached"
                            className="max-w-[200px] max-h-[200px] rounded-xl border border-neutral-200 dark:border-neutral-700 object-cover"
                        />
                    ))}
                </div>
            )}

            {documentList.length > 0 && (
                <div className="flex gap-2 flex-wrap">
                    {documentList.map((attachment, index) => (
                        <div
                            key={`${attachment.fileName}-${index}`}
                            className={cn(
                                "flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium",
                                role === "user"
                                    ? "bg-neutral-700/50 text-neutral-200"
                                    : "bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 border border-neutral-200 dark:border-neutral-700",
                            )}
                        >
                            {attachment.mimeType === "application/pdf" ? (
                                <FileText className="w-3.5 h-3.5 text-red-400 shrink-0" />
                            ) : attachment.mimeType === "text/csv" ? (
                                <FileSpreadsheet className="w-3.5 h-3.5 text-green-400 shrink-0" />
                            ) : attachment.mimeType === "application/json" || attachment.mimeType === "text/html" ? (
                                <FileCode className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                            ) : (
                                <Paperclip className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                            )}
                            <span className="truncate max-w-[200px]">{attachment.fileName}</span>
                        </div>
                    ))}
                </div>
            )}
        </>
    );
}

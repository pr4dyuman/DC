"use client";

import Image from "next/image";
import { FileText, X } from "lucide-react";

import type { Attachment } from "../singularity-chat-shared";

type PreviewSize = "large" | "small";

const PREVIEW_STYLES: Record<PreviewSize, {
    box: string;
    documentBox: string;
    icon: string;
    label: string;
    removeButton: string;
    removeIcon: string;
    imageSizes: string;
}> = {
    large: {
        box: "w-16 h-16",
        documentBox: "w-16 h-16 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 flex flex-col items-center justify-center gap-1",
        icon: "w-5 h-5 text-neutral-500",
        label: "text-[9px] font-medium text-neutral-500 text-center leading-tight px-1 truncate w-full",
        removeButton: "absolute -top-1.5 -right-1.5 w-5 h-5 bg-neutral-800 dark:bg-neutral-200 text-white dark:text-black rounded-full flex items-center justify-center opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-all duration-200 shadow-sm",
        removeIcon: "w-3 h-3",
        imageSizes: "64px",
    },
    small: {
        box: "w-14 h-14",
        documentBox: "w-14 h-14 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 flex flex-col items-center justify-center gap-1",
        icon: "w-4 h-4 text-neutral-500",
        label: "text-[8px] font-medium text-neutral-400 text-center",
        removeButton: "absolute -top-1.5 -right-1.5 w-4 h-4 bg-neutral-800 dark:bg-neutral-200 text-white dark:text-black rounded-full flex items-center justify-center opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-all duration-200",
        removeIcon: "w-2.5 h-2.5",
        imageSizes: "56px",
    },
};

type SingularityAttachmentPreviewStripProps = {
    attachments: Attachment[];
    onRemove: (id: string) => void;
    size?: PreviewSize;
};

export function SingularityAttachmentPreviewStrip({
    attachments,
    onRemove,
    size = "large",
}: SingularityAttachmentPreviewStripProps) {
    if (attachments.length === 0) {
        return null;
    }

    const styles = PREVIEW_STYLES[size];

    return (
        <div className="flex gap-2.5 mb-3 px-1 animate-in slide-in-from-bottom-2 duration-200">
            {attachments.map((attachment) => (
                <div key={attachment.id} className="relative group">
                    {attachment.fileType === "image" ? (
                        <div className={`relative ${styles.box}`}>
                            <Image
                                src={attachment.preview}
                                alt="Attachment"
                                fill
                                sizes={styles.imageSizes}
                                className="object-cover rounded-xl border border-neutral-200 dark:border-neutral-700"
                                unoptimized
                            />
                        </div>
                    ) : (
                        <div className={styles.documentBox}>
                            <FileText className={styles.icon} />
                            <span className={styles.label}>
                                {attachment.fileName?.split(".").pop()?.toUpperCase()}
                            </span>
                        </div>
                    )}
                    <button
                        onClick={() => onRemove(attachment.id)}
                        aria-label={`Remove attachment ${attachment.fileName || ""}`.trim()}
                        title="Remove attachment"
                        className={styles.removeButton}
                    >
                        <X className={styles.removeIcon} />
                    </button>
                </div>
            ))}
        </div>
    );
}

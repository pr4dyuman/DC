"use client";

import { Check, Copy } from "lucide-react";

import { cn } from "@/lib/utils";

type SingularityMessageBubbleProps = {
    role: "user" | "model";
    content: string;
    isStreaming?: boolean;
    renderedHtml?: string;
    isCopied: boolean;
    onCopy: () => void;
};

export function SingularityMessageBubble({
    role,
    content,
    isStreaming,
    renderedHtml,
    isCopied,
    onCopy,
}: SingularityMessageBubbleProps) {
    return (
        <div
            className={cn(
                "relative group rounded-2xl p-3 sm:p-4 text-sm leading-relaxed transition-all duration-300",
                role === "user"
                    ? "bg-neutral-100 dark:bg-neutral-900 text-neutral-800 dark:text-neutral-200 rounded-br-sm"
                    : "text-neutral-800 dark:text-neutral-200",
            )}
        >
            {role === "model" ? (
                <div
                    className="singularity-response prose prose-sm max-w-none text-neutral-800 dark:text-neutral-200"
                    dangerouslySetInnerHTML={{ __html: renderedHtml || "" }}
                />
            ) : (
                <p className="whitespace-pre-wrap">{content}</p>
            )}

            {role === "model" && content && !isStreaming && (
                <button
                    onClick={onCopy}
                    aria-label="Copy message"
                    title="Copy message"
                    className="absolute -bottom-1 right-0 opacity-100 md:opacity-0 md:group-hover:opacity-100 p-1.5 rounded-lg bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300 transition-all duration-200 shadow-sm"
                >
                    {isCopied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                </button>
            )}
        </div>
    );
}

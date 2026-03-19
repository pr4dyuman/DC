"use client";

import type { KeyboardEventHandler, RefObject } from "react";
import { Plus, Send, Square } from "lucide-react";

import { cn } from "@/lib/utils";

import type { Attachment } from "../singularity-chat-shared";
import { SingularityAttachmentPreviewStrip } from "./SingularityAttachmentPreviewStrip";
import { SingularityModeDropdown } from "./SingularityModeDropdown";

type SingularityMode = "chat" | "agent";
type ComposerVariant = "large" | "small";

export type SingularityComposerProps = {
    variant: ComposerVariant;
    attachments: Attachment[];
    inputValue: string;
    isAgent: boolean;
    isLoading: boolean;
    showModeDropdown: boolean;
    disableTextarea?: boolean;
    inputRef: RefObject<HTMLTextAreaElement | null>;
    fileInputRef: RefObject<HTMLInputElement | null>;
    onInputChange: (value: string) => void;
    onKeyDown: KeyboardEventHandler<HTMLTextAreaElement>;
    onRemoveAttachment: (id: string) => void;
    onFileSelect: (files: FileList | null) => void;
    onModeToggle: () => void;
    onModeClose: () => void;
    onModeSwitch: (mode: SingularityMode) => void;
    onSend: () => void;
    onStop: () => void;
};

const COMPOSER_STYLES: Record<ComposerVariant, {
    wrapper: string;
    textarea: string;
    toolbar: string;
    plusIcon: string;
    previewSize: "large" | "small";
}> = {
    large: {
        wrapper: "w-full",
        textarea: "w-full bg-transparent border-none focus:ring-0 focus:outline-none resize-none py-3.5 sm:py-4 px-4 sm:px-5 text-sm sm:text-base text-neutral-800 dark:text-neutral-200 placeholder:text-neutral-400 dark:placeholder:text-neutral-500 min-h-[48px] max-h-40",
        toolbar: "flex items-center justify-between px-3 sm:px-4 pb-2.5 sm:pb-3",
        plusIcon: "w-5 h-5",
        previewSize: "large",
    },
    small: {
        wrapper: "max-w-3xl mx-auto",
        textarea: "w-full bg-transparent border-none focus:ring-0 focus:outline-none resize-none py-3 px-4 text-sm text-neutral-800 dark:text-neutral-200 placeholder:text-neutral-400 dark:placeholder:text-neutral-500 min-h-[40px] max-h-32",
        toolbar: "flex items-center justify-between px-3 pb-2",
        plusIcon: "w-4 h-4",
        previewSize: "small",
    },
};

export function SingularityComposer({
    variant,
    attachments,
    inputValue,
    isAgent,
    isLoading,
    showModeDropdown,
    disableTextarea = false,
    inputRef,
    fileInputRef,
    onInputChange,
    onKeyDown,
    onRemoveAttachment,
    onFileSelect,
    onModeToggle,
    onModeClose,
    onModeSwitch,
    onSend,
    onStop,
}: SingularityComposerProps) {
    const styles = COMPOSER_STYLES[variant];
    const canSend = inputValue.trim() || attachments.length > 0;

    return (
        <div className={styles.wrapper}>
            <SingularityAttachmentPreviewStrip
                attachments={attachments}
                onRemove={onRemoveAttachment}
                size={styles.previewSize}
            />
            <div className="relative bg-neutral-100 dark:bg-neutral-900 rounded-2xl transition-all duration-300 focus-within:ring-1 focus-within:ring-neutral-300 dark:focus-within:ring-neutral-700">
                <textarea
                    ref={inputRef}
                    value={inputValue}
                    onChange={(event) => onInputChange(event.target.value)}
                    onKeyDown={onKeyDown}
                    placeholder={isAgent ? "Ask Singularity Agent..." : "Ask Singularity..."}
                    className={styles.textarea}
                    rows={1}
                    disabled={disableTextarea}
                />
                <div className={styles.toolbar}>
                    <div className="flex items-center gap-1">
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            disabled={isLoading || attachments.length >= 4}
                            className="p-1.5 rounded-full hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-500 dark:text-neutral-400 disabled:opacity-30 transition-colors"
                            title={isAgent ? "Attach file" : "Attach image"}
                        >
                            <Plus className={styles.plusIcon} />
                        </button>
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept={isAgent ? "image/*,.pdf,.txt,.md,.csv,.json,.html,.doc,.docx,.prd" : "image/*"}
                            multiple
                            className="hidden"
                            onChange={(event) => {
                                onFileSelect(event.target.files);
                                event.target.value = "";
                            }}
                        />
                    </div>
                    <div className="flex items-center gap-1.5">
                        <SingularityModeDropdown
                            isOpen={showModeDropdown}
                            isAgent={isAgent}
                            onToggle={onModeToggle}
                            onClose={onModeClose}
                            onModeSwitch={onModeSwitch}
                        />
                        {isLoading ? (
                            <button
                                onClick={onStop}
                                className="p-1.5 rounded-full bg-red-500 hover:bg-red-600 text-white transition-all duration-200 hover:scale-105 active:scale-95 animate-pulse"
                                title="Stop generating"
                            >
                                <Square className="w-3.5 h-3.5 fill-current" />
                            </button>
                        ) : (
                            <button
                                onClick={onSend}
                                disabled={!canSend}
                                className={cn(
                                    "p-1.5 rounded-full transition-all duration-200",
                                    canSend
                                        ? "bg-neutral-800 dark:bg-neutral-200 text-white dark:text-black hover:scale-105 active:scale-95"
                                        : "text-neutral-300 dark:text-neutral-600 cursor-not-allowed",
                                )}
                            >
                                <Send className="w-4 h-4" />
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

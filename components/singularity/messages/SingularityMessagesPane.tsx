"use client";

import type { RefObject } from "react";
import { cn } from "@/lib/utils";
import type { Message } from "../singularity-chat-shared";
import { SingularityAssistantStatus } from "./SingularityAssistantStatus";
import { SingularityMessageAttachments } from "./SingularityMessageAttachments";
import { SingularityMessageAvatar } from "./SingularityMessageAvatar";
import { SingularityMessageBubble } from "./SingularityMessageBubble";
import { SingularityMessageStreamingIndicator } from "./SingularityMessageStreamingIndicator";
import { SingularityThinkingPanel } from "./SingularityThinkingPanel";
import { SingularityToolActionsPanel } from "./SingularityToolActionsPanel";

type SingularityMessagesPaneProps = {
    messages: Message[];
    scrollRef: RefObject<HTMLDivElement | null>;
    messagesEndRef: RefObject<HTMLDivElement | null>;
    isLoading: boolean;
    isAgent: boolean;
    streamingPhase: "idle" | "thinking" | "responding" | "rechecking";
    expandedThinking: Set<string>;
    copiedId: string | null;
    undoingCheckpoint: string | null;
    getUndoCheckpointId: (message: Message) => string | null;
    renderMarkdown: (content: string) => string;
    onToggleThinking: (messageId: string) => void;
    onCopyMessage: (messageId: string, content: string) => void;
    onUndo: (checkpointId: string) => void;
};

export function SingularityMessagesPane({
    messages,
    scrollRef,
    messagesEndRef,
    isLoading,
    isAgent,
    streamingPhase,
    expandedThinking,
    copiedId,
    undoingCheckpoint,
    getUndoCheckpointId,
    renderMarkdown,
    onToggleThinking,
    onCopyMessage,
    onUndo,
}: SingularityMessagesPaneProps) {
    return (
        <div ref={scrollRef} className="flex-1 overflow-y-auto py-4 sm:py-6 scroll-smooth no-scrollbar">
            <div className="max-w-4xl mx-auto px-4 sm:px-8 space-y-4 sm:space-y-6">
                {messages.map((message) => {
                    const undoCheckpointId = message.isStreaming
                        ? null
                        : getUndoCheckpointId(message);

                    return (
                        <div
                            key={message.id}
                            className={cn(
                                "flex gap-2 sm:gap-3 singularity-msg-enter",
                                message.role === "user" ? "flex-row-reverse" : "flex-row"
                            )}
                        >
                            <SingularityMessageAvatar role={message.role} isAgent={isAgent} />
                            <div className="flex flex-col gap-1.5 sm:gap-2 max-w-[85%] sm:max-w-[75%] min-w-0">
                                {message.role === "model" && message.thinking && (
                                    <SingularityThinkingPanel
                                        content={message.thinking}
                                        isExpanded={expandedThinking.has(message.id)}
                                        onToggle={() => onToggleThinking(message.id)}
                                    />
                                )}

                                <SingularityMessageAttachments
                                    role={message.role}
                                    images={message.images}
                                    attachments={message.attachments}
                                />

                                {message.role === "model" && message.toolActions && message.toolActions.length > 0 && (
                                    <SingularityToolActionsPanel
                                        toolActions={message.toolActions}
                                        undoCheckpointId={undoCheckpointId}
                                        isUndoing={undoingCheckpoint === undoCheckpointId}
                                        onUndo={onUndo}
                                    />
                                )}

                                {(message.content || message.role === "user") && (
                                    <SingularityMessageBubble
                                        role={message.role}
                                        content={message.content}
                                        isStreaming={message.isStreaming}
                                        renderedHtml={message.role === "model" ? renderMarkdown(message.content) : undefined}
                                        isCopied={copiedId === message.id}
                                        onCopy={() => onCopyMessage(message.id, message.content)}
                                    />
                                )}

                                {message.role === "model" && !message.content && message.isStreaming && (
                                    <SingularityMessageStreamingIndicator
                                        isAgent={isAgent}
                                        phase={streamingPhase}
                                        hasToolActions={Boolean(message.toolActions?.length)}
                                    />
                                )}
                            </div>
                        </div>
                    );
                })}

                {isLoading && messages.length > 0 && messages[messages.length - 1]?.role === "user" && (
                    <SingularityAssistantStatus isAgent={isAgent} />
                )}

                {streamingPhase === "rechecking" && (
                    <SingularityAssistantStatus
                        isAgent={isAgent}
                        label="Refining response..."
                        className="singularity-msg-enter"
                    />
                )}

                <div ref={messagesEndRef} />
            </div>
        </div>
    );
}

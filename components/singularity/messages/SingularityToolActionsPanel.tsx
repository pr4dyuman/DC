"use client";

import { AlertCircle, CheckCircle2, Loader2, Undo2, Wrench } from "lucide-react";

import { cn } from "@/lib/utils";

import type { ToolAction } from "../singularity-chat-shared";

type SingularityToolActionsPanelProps = {
    toolActions: ToolAction[];
    undoCheckpointId?: string | null;
    isUndoing: boolean;
    onUndo: (checkpointId: string) => void;
};

export function SingularityToolActionsPanel({
    toolActions,
    undoCheckpointId,
    isUndoing,
    onUndo,
}: SingularityToolActionsPanelProps) {
    if (toolActions.length === 0) {
        return null;
    }

    return (
        <div className="rounded-xl border border-neutral-200 dark:border-neutral-700 overflow-hidden">
            <div className="flex items-center gap-2 px-3 py-2 border-b border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800/50">
                <Wrench className="w-3 h-3 text-neutral-500" />
                <span className="text-[10px] font-medium text-neutral-500 uppercase tracking-wider">Actions</span>
                <span className="text-[10px] text-neutral-400 bg-neutral-200 dark:bg-neutral-700 px-1.5 py-0.5 rounded-full">{toolActions.length}</span>
            </div>
            <div className="p-1.5 space-y-1">
                {toolActions.map((toolAction, index) => (
                    <div
                        key={`${toolAction.name}-${index}`}
                        className={cn(
                            "flex items-start gap-2.5 px-3 py-2 rounded-lg text-xs transition-all duration-300",
                            toolAction.status === "calling"
                                ? "bg-blue-50 dark:bg-blue-500/5 border border-blue-200 dark:border-blue-500/15"
                                : toolAction.success
                                    ? "bg-green-50 dark:bg-green-500/5"
                                    : "bg-red-50 dark:bg-red-500/5",
                        )}
                    >
                        <div
                            className={cn(
                                "w-5 h-5 rounded-md flex items-center justify-center shrink-0 mt-0.5",
                                toolAction.status === "calling"
                                    ? "bg-blue-100 dark:bg-blue-500/10 text-blue-500"
                                    : toolAction.success
                                        ? "bg-green-100 dark:bg-green-500/10 text-green-500"
                                        : "bg-red-100 dark:bg-red-500/10 text-red-500",
                            )}
                        >
                            {toolAction.status === "calling" ? (
                                <Loader2 className="w-3 h-3 animate-spin" />
                            ) : toolAction.success ? (
                                <CheckCircle2 className="w-3 h-3" />
                            ) : (
                                <AlertCircle className="w-3 h-3" />
                            )}
                        </div>
                        <div className="flex-1 min-w-0">
                            <span className="font-medium text-neutral-700 dark:text-neutral-300">
                                {toolAction.status === "calling" ? `${toolAction.displayName}...` : toolAction.displayName}
                            </span>
                            {toolAction.summary && toolAction.status !== "calling" && (
                                <p className="text-neutral-400 dark:text-neutral-500 mt-0.5 text-[11px] leading-relaxed">
                                    {toolAction.summary}
                                </p>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            {undoCheckpointId && (
                <div className="px-1.5 pb-1.5">
                    <button
                        onClick={() => onUndo(undoCheckpointId)}
                        disabled={isUndoing}
                        className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium bg-amber-50 dark:bg-amber-500/5 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-500/15 hover:bg-amber-100 dark:hover:bg-amber-500/10 transition-all duration-200"
                    >
                        {isUndoing ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                            <Undo2 className="w-3.5 h-3.5" />
                        )}
                        <span>Undo these actions</span>
                    </button>
                </div>
            )}
        </div>
    );
}

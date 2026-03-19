"use client";

import type { KeyboardEvent } from "react";

import { AlertTriangle, Loader2, Trash2 } from "lucide-react";

import type { DeleteConfirmModalState } from "../hooks/useSingularitySessions";

type ActiveDeleteConfirmModalState = Exclude<DeleteConfirmModalState, null>;

type SingularityDeleteConfirmModalProps = {
    modal: ActiveDeleteConfirmModalState;
    onPasswordChange: (value: string) => void;
    onPasswordKeyDown: (event: KeyboardEvent<HTMLInputElement>) => void;
    onConfirm: () => void;
    onClose: () => void;
};

export function SingularityDeleteConfirmModal({
    modal,
    onPasswordChange,
    onPasswordKeyDown,
    onConfirm,
    onClose,
}: SingularityDeleteConfirmModalProps) {
    const showPasswordPrompt = modal.hasAgentMessages;
    const confirmDisabled = showPasswordPrompt && (!modal.password.trim() || modal.verifying);

    return (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-card border border-border rounded-2xl shadow-2xl max-w-sm w-full p-5 sm:p-6 space-y-4 animate-in zoom-in-95 fade-in duration-200">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-destructive/10 flex items-center justify-center shrink-0">
                        <AlertTriangle className="w-5 h-5 text-destructive" />
                    </div>
                    <div>
                        <h3 className="text-sm font-bold text-foreground">
                            {modal.type === "delete" ? "Delete Chat" : "Clear Chat"}
                        </h3>
                        <p className="text-xs text-muted-foreground">
                            {modal.type === "delete"
                                ? `"${modal.sessionTitle}"`
                                : "All messages will be removed"}
                        </p>
                    </div>
                </div>

                <div className="rounded-xl bg-muted/50 border border-border/40 p-3 space-y-2">
                    {modal.hasAgentMessages && (
                        <div className="flex items-start gap-2 p-2 rounded-lg bg-amber-500/5 border border-amber-500/20">
                            <AlertTriangle className="w-3.5 h-3.5 text-amber-500 mt-0.5 shrink-0" />
                            <p className="text-xs text-amber-600 dark:text-amber-400">
                                <strong>Agent actions cannot be undone.</strong> Any projects, tasks, clients, or data the AI created or modified will remain in your system.
                            </p>
                        </div>
                    )}
                    <ul className="text-xs text-muted-foreground space-y-1">
                        <li className="flex items-start gap-1.5">
                            <span className="text-destructive mt-0.5">-</span>
                            {modal.type === "delete"
                                ? "This chat and its undo checkpoints will be permanently deleted"
                                : "Messages and undo checkpoints will be cleared"}
                        </li>
                        <li className="flex items-start gap-1.5">
                            <span className="text-destructive mt-0.5">-</span>
                            You will <strong className="text-foreground">no longer be able to undo</strong> any actions from this chat
                        </li>
                    </ul>
                </div>

                {showPasswordPrompt && (
                    <div>
                        <input
                            type="password"
                            placeholder="Enter your password to confirm"
                            value={modal.password}
                            onChange={(event) => onPasswordChange(event.target.value)}
                            onKeyDown={onPasswordKeyDown}
                            className="w-full h-10 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-destructive/50"
                            autoFocus
                        />
                        {modal.passwordError && (
                            <p className="text-xs text-red-500 mt-1.5">{modal.passwordError}</p>
                        )}
                    </div>
                )}

                <div className="flex gap-2">
                    <button
                        onClick={onConfirm}
                        disabled={confirmDisabled}
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-medium rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
                    >
                        {modal.verifying ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                        {modal.verifying ? "Verifying..." : (modal.type === "delete" ? "Delete Chat" : "Clear Messages")}
                    </button>
                    <button
                        onClick={onClose}
                        className="px-4 py-2.5 text-xs font-medium rounded-xl bg-muted text-muted-foreground hover:bg-muted/80 transition-colors"
                    >
                        Cancel
                    </button>
                </div>
            </div>
        </div>
    );
}

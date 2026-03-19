"use client";

import { Undo2 } from "lucide-react";

type SingularityUndoConfirmModalProps = {
    totalActions: number;
    onConfirm: () => void;
    onClose: () => void;
};

export function SingularityUndoConfirmModal({
    totalActions,
    onConfirm,
    onClose,
}: SingularityUndoConfirmModalProps) {
    return (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-card border border-border rounded-2xl shadow-2xl max-w-sm w-full p-5 sm:p-6 space-y-4 animate-in zoom-in-95 fade-in duration-200">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-cyan-500/10 flex items-center justify-center shrink-0">
                        <Undo2 className="w-5 h-5 text-cyan-500" />
                    </div>
                    <div>
                        <h3 className="text-sm font-bold text-foreground">Undo Actions</h3>
                        <p className="text-xs text-muted-foreground">
                            {totalActions} action{totalActions !== 1 ? "s" : ""} will be reversed
                        </p>
                    </div>
                </div>

                <div className="rounded-xl bg-muted/50 border border-border/40 p-3 space-y-1.5">
                    <p className="text-xs text-foreground font-medium">What will happen:</p>
                    <ul className="text-xs text-muted-foreground space-y-1">
                        <li className="flex items-start gap-1.5">
                            <span className="text-cyan-500 mt-0.5">-</span>
                            Only <strong className="text-foreground">this response&apos;s</strong> database changes will be reversed
                        </li>
                        <li className="flex items-start gap-1.5">
                            <span className="text-cyan-500 mt-0.5">-</span>
                            Previous and later actions are <strong className="text-foreground">not affected</strong>
                        </li>
                        <li className="flex items-start gap-1.5">
                            <span className="text-cyan-500 mt-0.5">-</span>
                            Messages from this point will be removed from chat
                        </li>
                    </ul>
                </div>

                <div className="flex gap-2">
                    <button
                        onClick={onConfirm}
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-medium rounded-xl bg-cyan-600 text-white hover:bg-cyan-700 transition-colors shadow-sm"
                    >
                        <Undo2 className="w-3.5 h-3.5" />
                        Undo {totalActions} Action{totalActions !== 1 ? "s" : ""}
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

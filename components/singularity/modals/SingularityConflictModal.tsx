"use client";

import { AlertTriangle } from "lucide-react";

import type { RollbackAnalysis } from "../singularity-chat-shared";

type SingularityConflictModalProps = {
    analysis: RollbackAnalysis;
    onUndoSafe: () => void;
    onForceUndo: () => void;
    onClose: () => void;
};

export function SingularityConflictModal({
    analysis,
    onUndoSafe,
    onForceUndo,
    onClose,
}: SingularityConflictModalProps) {
    return (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-card border border-border rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-4">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
                        <AlertTriangle className="w-5 h-5 text-amber-500" />
                    </div>
                    <div>
                        <h3 className="text-sm font-bold text-foreground">Conflicts Detected</h3>
                        <p className="text-xs text-muted-foreground">
                            {analysis.safeActions.length} of {analysis.totalActions} actions can be safely undone
                        </p>
                    </div>
                </div>

                <div className="space-y-2 max-h-48 overflow-y-auto">
                    {analysis.conflictedActions.map((conflictedAction, index) => (
                        <div key={index} className="flex items-start gap-2 p-2.5 rounded-lg bg-amber-500/5 border border-amber-500/20 text-xs">
                            <AlertTriangle className="w-3.5 h-3.5 text-amber-500 mt-0.5 shrink-0" />
                            <div>
                                <span className="font-medium text-foreground">{conflictedAction.conflict.entityName}</span>
                                <span className="text-muted-foreground">-- {conflictedAction.conflict.reason}</span>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="flex gap-2">
                    <button
                        onClick={onUndoSafe}
                        className="flex-1 px-3 py-2 text-xs font-medium rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                    >
                        Undo Safe Only ({analysis.safeActions.length})
                    </button>
                    <button
                        onClick={onForceUndo}
                        className="flex-1 px-3 py-2 text-xs font-medium rounded-lg bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors"
                    >
                        Force Undo All
                    </button>
                    <button
                        onClick={onClose}
                        className="px-3 py-2 text-xs font-medium rounded-lg bg-muted text-muted-foreground hover:bg-muted/80 transition-colors"
                    >
                        Cancel
                    </button>
                </div>

                <p className="text-[10px] text-muted-foreground text-center">
                    Warning: &quot;Force Undo All&quot; will discard changes you made after the AI created these items
                </p>
            </div>
        </div>
    );
}

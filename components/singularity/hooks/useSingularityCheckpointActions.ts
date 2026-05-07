import { useState } from "react";

import type {
    CheckpointAction,
    CheckpointCreateResponse,
    CheckpointInfo,
    Message,
    RollbackAnalysis,
} from "../singularity-chat-shared";

type RollbackModalState = { analysis: RollbackAnalysis; loading: boolean } | null;
type UndoConfirmModalState = { checkpointId: string; label: string; totalActions: number } | null;

type UseSingularityCheckpointActionsParams = {
    checkpoints: CheckpointInfo[];
    setCheckpoints: React.Dispatch<React.SetStateAction<CheckpointInfo[]>>;
    messagesRef: React.MutableRefObject<Message[]>;
    sessionIdRef: React.MutableRefObject<string | null>;
    setMessages: React.Dispatch<React.SetStateAction<Message[]>>;
    saveMessages: (msgs: Message[], sid: string | null, options?: { allowEmpty?: boolean }) => Promise<void>;
};

export function useSingularityCheckpointActions({
    checkpoints,
    setCheckpoints,
    messagesRef,
    sessionIdRef,
    setMessages,
    saveMessages,
}: UseSingularityCheckpointActionsParams) {
    const [rollbackModal, setRollbackModal] = useState<RollbackModalState>(null);
    const [undoConfirmModal, setUndoConfirmModal] = useState<UndoConfirmModalState>(null);
    const [undoingCheckpoint, setUndoingCheckpoint] = useState<string | null>(null);

    const saveCheckpoint = async (rollbackActions: CheckpointAction[], label: string, relatedMessageId?: string) => {
        const activeSessionId = sessionIdRef.current;
        if (!activeSessionId || rollbackActions.length === 0) {
            return;
        }

        try {
            const response = await fetch("/api/singularity/history/checkpoint", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    sessionId: activeSessionId,
                    messageIndex: messagesRef.current.filter((message) => !message.isStreaming).length,
                    actions: rollbackActions,
                    label,
                }),
            });
            const data: CheckpointCreateResponse = await response.json();
            setCheckpoints((previous) => [{
                id: data.checkpointId,
                label,
                messageIndex: messagesRef.current.length,
                messageId: relatedMessageId,
                createdAt: new Date().toISOString(),
            }, ...previous]);
        } catch (error) {
            console.error("Failed to save checkpoint:", error);
        }
    };

    const handleUndo = async (checkpointId: string) => {
        setUndoingCheckpoint(checkpointId);

        try {
            const response = await fetch("/api/singularity/history/checkpoint", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action: "analyze", checkpointId }),
            });
            const analysis: RollbackAnalysis = await response.json();

            if (analysis.conflictedActions.length === 0) {
                setUndoConfirmModal({
                    checkpointId,
                    label: analysis.label || "these actions",
                    totalActions: analysis.totalActions,
                });
            } else {
                setRollbackModal({ analysis, loading: false });
            }
        } catch (error) {
            console.error("Undo analysis failed:", error);
        } finally {
            setUndoingCheckpoint(null);
        }
    };

    const executeUndo = async (checkpointId: string, scope: "safe" | "all") => {
        try {
            const response = await fetch("/api/singularity/history/checkpoint", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ checkpointId, scope }),
            });
            await response.json();

            const checkpoint = checkpoints.find((item) => item.id === checkpointId);
            if (checkpoint) {
                setMessages((previous) => previous.slice(0, checkpoint.messageIndex));
            }

            setCheckpoints((previous) => previous.filter((item) => item.id !== checkpointId));
            setRollbackModal(null);
            setUndoConfirmModal(null);

            const truncated = messagesRef.current.slice(0, checkpoint?.messageIndex || messagesRef.current.length);
            await saveMessages(truncated, sessionIdRef.current);
        } catch (error) {
            console.error("Rollback failed:", error);
        }
    };

    return {
        rollbackModal,
        setRollbackModal,
        undoConfirmModal,
        setUndoConfirmModal,
        undoingCheckpoint,
        saveCheckpoint,
        handleUndo,
        executeUndo,
    };
}

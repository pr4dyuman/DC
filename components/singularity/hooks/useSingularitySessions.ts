import { useCallback, useEffect, useRef, useState } from "react";

import type {
    ChatSessionSummary,
    CheckpointAction,
    CheckpointInfo,
    Message,
    PersistedMessage,
    SessionResponse,
} from "../singularity-chat-shared";

type Mode = "chat" | "agent";
type StreamingPhase = "idle" | "thinking" | "responding" | "rechecking";
export type DeleteConfirmModalState = {
    type: "clear" | "delete";
    sessionId?: string;
    sessionTitle?: string;
    hasAgentMessages: boolean;
    password: string;
    passwordError: string;
    verifying: boolean;
} | null;

type UseSingularitySessionsParams = {
    userId?: string;
    mode: Mode;
    messages: Message[];
    setMessages: React.Dispatch<React.SetStateAction<Message[]>>;
    setMode: React.Dispatch<React.SetStateAction<Mode>>;
    clearAttachments: () => void;
    setCheckpoints: React.Dispatch<React.SetStateAction<CheckpointInfo[]>>;
    setIsLoading: React.Dispatch<React.SetStateAction<boolean>>;
    setStreamingPhase: React.Dispatch<React.SetStateAction<StreamingPhase>>;
    pendingRollbackRef: React.MutableRefObject<CheckpointAction[]>;
};

type SaveMessagesOptions = {
    allowEmpty?: boolean;
};

function buildSavePayload(msgs: Message[], sid: string, options: SaveMessagesOptions = {}): string | null {
    const persistable = msgs
        .filter((message) => !message.isStreaming)
        .map((message) => ({
            role: message.role,
            content: message.content,
            thinking: message.thinking,
            images: message.images,
            attachments: message.attachments,
            toolActions: message.toolActions?.map((toolAction) => ({
                name: toolAction.name,
                displayName: toolAction.displayName,
                status: toolAction.status,
                summary: toolAction.summary,
                success: toolAction.success,
            })),
            timestamp: message.timestamp instanceof Date ? message.timestamp.toISOString() : message.timestamp,
        }));

    if (persistable.length === 0 && !options.allowEmpty) {
        return null;
    }

    const firstUserMessage = persistable.find((message) => message.role === "user");
    const title = firstUserMessage ? firstUserMessage.content.slice(0, 60) : undefined;

    return JSON.stringify({ sessionId: sid, messages: persistable, title });
}

function restoreMessages(messages: PersistedMessage[]): Message[] {
    return messages.map((message, index) => ({
        ...message,
        id: message.id || `msg-${index}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        timestamp: new Date(message.timestamp),
        isStreaming: false,
    }));
}

export function useSingularitySessions({
    userId,
    mode,
    messages,
    setMessages,
    setMode,
    clearAttachments,
    setCheckpoints,
    setIsLoading,
    setStreamingPhase,
    pendingRollbackRef,
}: UseSingularitySessionsParams) {
    const [sessionId, setSessionId] = useState<string | null>(null);
    const [sessions, setSessions] = useState<ChatSessionSummary[]>([]);
    const [showHistory, setShowHistory] = useState(false);
    const [deleteConfirmModal, setDeleteConfirmModal] = useState<DeleteConfirmModalState>(null);

    const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const messagesRef = useRef<Message[]>(messages);
    const sessionIdRef = useRef<string | null>(sessionId);
    const userIdRef = useRef<string | undefined>(userId);

    useEffect(() => {
        messagesRef.current = messages;
    }, [messages]);

    useEffect(() => {
        sessionIdRef.current = sessionId;
    }, [sessionId]);

    useEffect(() => {
        userIdRef.current = userId;
    }, [userId]);

    const createNewSession = useCallback(async () => {
        if (!userId) {
            return null;
        }

        try {
            const response = await fetch("/api/singularity/history", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ userId, mode }),
            });
            const data = await response.json();
            setSessionId(data.sessionId);
            return (data.sessionId as string | undefined) ?? null;
        } catch (error) {
            console.error("Failed to create session:", error);
            return null;
        }
    }, [mode, userId]);

    const fetchSessions = useCallback(async () => {
        if (!userId) {
            return;
        }

        try {
            const response = await fetch(`/api/singularity/history?userId=${userId}`);
            const data = await response.json();
            setSessions(data);
        } catch (error) {
            console.error("Failed to fetch sessions:", error);
        }
    }, [userId]);

    useEffect(() => {
        if (!userId) {
            return;
        }

        const timeoutId = window.setTimeout(() => {
            void fetchSessions();
        }, 0);

        return () => {
            window.clearTimeout(timeoutId);
        };
    }, [fetchSessions, userId]);

    const loadSession = useCallback(async (sid: string) => {
        try {
            const response = await fetch(`/api/singularity/history?sessionId=${sid}`);
            const data: SessionResponse = await response.json();
            setSessionId(sid);
            setMode(data.mode || "chat");
            setMessages(restoreMessages(data.messages || []));
            setShowHistory(false);

            const checkpointResponse = await fetch(`/api/singularity/history/checkpoint?sessionId=${sid}`);
            const checkpointData = await checkpointResponse.json();
            setCheckpoints(checkpointData || []);
        } catch (error) {
            console.error("Failed to load session:", error);
        }
    }, [setCheckpoints, setMessages, setMode]);

    const newChat = useCallback(async () => {
        setMessages([]);
        clearAttachments();
        setCheckpoints([]);
        setIsLoading(false);
        setStreamingPhase("idle");
        pendingRollbackRef.current = [];
        setSessionId(null);
        fetchSessions();
        setShowHistory(false);
    }, [clearAttachments, fetchSessions, pendingRollbackRef, setCheckpoints, setIsLoading, setMessages, setStreamingPhase]);

    const requestDeleteSession = useCallback((sid: string) => {
        const session = sessions.find((item) => item.id === sid);
        const hasAgentActions = session?.mode === "agent";
        setDeleteConfirmModal({
            type: "delete",
            sessionId: sid,
            sessionTitle: session?.title || "this chat",
            hasAgentMessages: hasAgentActions,
            password: "",
            passwordError: "",
            verifying: false,
        });
    }, [sessions]);

    const executeDeleteSession = useCallback(async () => {
        if (!deleteConfirmModal?.sessionId) {
            return;
        }

        const sid = deleteConfirmModal.sessionId;

        try {
            await fetch(`/api/singularity/history?id=${sid}`, { method: "DELETE" });
            setSessions((previous) => previous.filter((session) => session.id !== sid));
            if (sid === sessionId) {
                await newChat();
            }
        } catch (error) {
            console.error("Failed to delete session:", error);
        }

        setDeleteConfirmModal(null);
    }, [deleteConfirmModal, newChat, sessionId]);

    const saveMessages = useCallback(async (msgs: Message[], sid: string | null, options: SaveMessagesOptions = {}) => {
        if (!sid || !userId) {
            return;
        }

        const payload = buildSavePayload(msgs, sid, options);
        if (!payload) {
            return;
        }

        try {
            const response = await fetch("/api/singularity/history", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: payload,
            });

            if (!response.ok) {
                console.error("[Singularity Save] Server error:", response.status);
            }
        } catch (error) {
            console.error("[Singularity Save] Network error:", error);
        }
    }, [userId]);

    useEffect(() => {
        const anyStreaming = messages.some((message) => message.isStreaming);

        if (!anyStreaming && messages.length > 0 && sessionId) {
            if (saveTimeoutRef.current) {
                clearTimeout(saveTimeoutRef.current);
            }

            saveMessages(messages, sessionId);
            saveTimeoutRef.current = setTimeout(fetchSessions, 800);
        }

        return () => {
            if (saveTimeoutRef.current) {
                clearTimeout(saveTimeoutRef.current);
            }
        };
    }, [fetchSessions, messages, saveMessages, sessionId]);

    useEffect(() => {
        const emergencySave = () => {
            const activeSessionId = sessionIdRef.current;
            const activeUserId = userIdRef.current;
            const currentMessages = messagesRef.current;

            if (!activeSessionId || !activeUserId || currentMessages.length === 0) {
                return;
            }

            const payload = buildSavePayload(currentMessages, activeSessionId);
            if (!payload) {
                return;
            }

            navigator.sendBeacon(
                "/api/singularity/history",
                new Blob([payload], { type: "application/json" })
            );
        };

        const onVisibility = () => {
            if (document.visibilityState === "hidden") {
                emergencySave();
            }
        };

        document.addEventListener("visibilitychange", onVisibility);
        window.addEventListener("beforeunload", emergencySave);

        return () => {
            document.removeEventListener("visibilitychange", onVisibility);
            window.removeEventListener("beforeunload", emergencySave);
        };
    }, []);

    return {
        sessionId,
        setSessionId,
        sessions,
        showHistory,
        setShowHistory,
        deleteConfirmModal,
        setDeleteConfirmModal,
        messagesRef,
        sessionIdRef,
        createNewSession,
        fetchSessions,
        loadSession,
        newChat,
        requestDeleteSession,
        executeDeleteSession,
        saveMessages,
    };
}

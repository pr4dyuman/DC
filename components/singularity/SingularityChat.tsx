"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import DOMPurify from "dompurify";
import { cn } from "@/lib/utils";
import { verifyAgentPassword } from "@/lib/actions";
import {
    AGENT_SUGGESTIONS,
    CHAT_SUGGESTIONS,
    SUGGESTION_SEED_HISTORY,
    type CheckpointAction,
    type CheckpointInfo,
    type Message,
    type SingularityRequestBody,
} from "./singularity-chat-shared";
import { SingularityDragOverlay } from "./layout/SingularityDragOverlay";
import { useSingularityAttachments } from "./hooks/useSingularityAttachments";
import { SingularityAssistantStatus } from "./messages/SingularityAssistantStatus";
import { SingularityConflictModal } from "./modals/SingularityConflictModal";
import { SingularityComposer } from "./layout/SingularityComposer";
import { SingularityDeleteConfirmModal } from "./modals/SingularityDeleteConfirmModal";
import { SingularityEmptyState } from "./layout/SingularityEmptyState";
import { SingularityHeaderBar } from "./layout/SingularityHeaderBar";
import { SingularityHistorySidebar } from "./layout/SingularityHistorySidebar";
import { SingularityMessageAttachments } from "./messages/SingularityMessageAttachments";
import { SingularityMessageAvatar } from "./messages/SingularityMessageAvatar";
import { SingularityMessageBubble } from "./messages/SingularityMessageBubble";
import { SingularityMessagesPane } from "./messages/SingularityMessagesPane";
import { SingularityMessageStreamingIndicator } from "./messages/SingularityMessageStreamingIndicator";
import { SingularityNavigationMenu } from "./layout/SingularityNavigationMenu";
import { SingularityThinkingPanel } from "./messages/SingularityThinkingPanel";
import { SingularityToolActionsPanel } from "./messages/SingularityToolActionsPanel";
import { SingularityUndoConfirmModal } from "./modals/SingularityUndoConfirmModal";
import { useSingularityCheckpointActions } from "./hooks/useSingularityCheckpointActions";
import { useSingularitySessions } from "./hooks/useSingularitySessions";

// Simple markdown-to-HTML renderer
function renderMarkdown(text: string): string {
    if (!text) return '';
    const html = text
        .replace(/```(\w*)\n([\s\S]*?)```/g, '<pre class="bg-muted border border-border rounded-lg p-3 my-2 overflow-x-auto text-xs font-mono"><code>$2</code></pre>')
        .replace(/`([^`]+)`/g, '<code class="bg-muted px-1.5 py-0.5 rounded text-xs font-mono text-violet-600 dark:text-violet-300">$1</code>')
        .replace(/\*\*([^*]+)\*\*/g, '<strong class="font-semibold text-foreground">$1</strong>')
        .replace(/\*([^*]+)\*/g, '<em>$1</em>')
        .replace(/^### (.+)$/gm, '<h3 class="text-sm font-bold mt-3 mb-1 text-foreground">$1</h3>')
        .replace(/^## (.+)$/gm, '<h2 class="text-base font-bold mt-4 mb-1.5 text-foreground">$1</h2>')
        .replace(/^# (.+)$/gm, '<h1 class="text-lg font-bold mt-4 mb-2 text-foreground">$1</h1>')
        .replace(/^[\-\*] (.+)$/gm, '<li class="ml-4 list-disc list-inside">$1</li>')
        .replace(/^\d+\. (.+)$/gm, '<li class="ml-4 list-decimal list-inside">$1</li>')
        .replace(/^- \[x\] (.+)$/gm, '<li class="ml-4 flex items-center gap-1.5"><span class="text-emerald-400">✓</span> <span class="line-through opacity-60">$1</span></li>')
        .replace(/^- \[ \] (.+)$/gm, '<li class="ml-4 flex items-center gap-1.5"><span class="text-muted-foreground">○</span> $1</li>')
        .replace(/\n\n/g, '<div class="h-2"></div>')
        .replace(/\n/g, '<br/>');
    return DOMPurify.sanitize(html);
}

export function SingularityChat({ userId, agencyName = 'Agency OS', role }: { userId?: string; agencyName?: string; role?: string }) {
    const [messages, setMessages] = useState<Message[]>([]);
    const [inputValue, setInputValue] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [expandedThinking, setExpandedThinking] = useState<Set<string>>(new Set());
    const [copiedId, setCopiedId] = useState<string | null>(null);
    const [streamingPhase, setStreamingPhase] = useState<'idle' | 'thinking' | 'responding' | 'rechecking'>('idle');
    const [mode, setMode] = useState<'chat' | 'agent'>('agent');
    const isAdmin = role === 'admin';
    const [isHeavyTask, setIsHeavyTask] = useState<boolean>(() => {
        if (typeof window !== 'undefined') {
            return localStorage.getItem('singularity_heavy_tasks') === 'true';
        }
        return false;
    });
    const handleToggleHeavyTask = () => {
        setIsHeavyTask(prev => {
            const next = !prev;
            localStorage.setItem('singularity_heavy_tasks', String(next));
            return next;
        });
    };

    const [checkpoints, setCheckpoints] = useState<CheckpointInfo[]>([]);
    const [showNavMenu, setShowNavMenu] = useState(false);
    const [showModeDropdown, setShowModeDropdown] = useState(false);

    const pendingRollbackRef = useRef<CheckpointAction[]>([]); // Accumulates rollback data during a single agent response
    const {
        attachments,
        isDragOver,
        handleFileSelect,
        removeAttachment,
        clearAttachments,
        handleDragOver,
        handleDragLeave,
        handleDrop,
    } = useSingularityAttachments();
    const {
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
    } = useSingularitySessions({
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
    });
    const {
        rollbackModal,
        setRollbackModal,
        undoConfirmModal,
        setUndoConfirmModal,
        undoingCheckpoint,
        saveCheckpoint,
        handleUndo,
        executeUndo,
    } = useSingularityCheckpointActions({
        checkpoints,
        setCheckpoints,
        messagesRef,
        sessionIdRef,
        setMessages,
        saveMessages,
    });

    const scrollRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLTextAreaElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const abortControllerRef = useRef<AbortController | null>(null);

    // Smooth auto-scroll
    useEffect(() => {
        if (scrollRef.current) {
            requestAnimationFrame(() => {
                scrollRef.current!.scrollTo({
                    top: scrollRef.current!.scrollHeight,
                    behavior: 'smooth'
                });
            });
        }
    }, [messages, streamingPhase]);

    useEffect(() => { inputRef.current?.focus(); }, []);

    // Auto-resize textarea
    useEffect(() => {
        if (inputRef.current) {
            inputRef.current.style.height = 'auto';
            inputRef.current.style.height = Math.min(inputRef.current.scrollHeight, 160) + 'px';
        }
    }, [inputValue]);

    const executeClearChat = () => {
        setMessages([]);
        clearAttachments();
        setCheckpoints([]);
        // Persist the cleared state to DB
        if (sessionId) {
            saveMessages([], sessionId, { allowEmpty: true });
        }
        setDeleteConfirmModal(null);
    };

    // Save messages to DB — works both as regular fetch and via sendBeacon
    // Trigger save immediately when streaming finishes (no debounce)
    // ---- Emergency save on navigation / tab-close ----
    // Uses sendBeacon (fire-and-forget, survives page unload)
    useEffect(() => {
        const emergencySave = () => undefined;

        // visibilitychange fires when switching tabs or navigating in SPA
        const onVisibility = () => { if (document.visibilityState === 'hidden') emergencySave(); };
        document.addEventListener('visibilitychange', onVisibility);
        window.addEventListener('beforeunload', emergencySave);

        return () => {
            document.removeEventListener('visibilitychange', onVisibility);
            window.removeEventListener('beforeunload', emergencySave);
        };
    }, []); // empty deps — refs always have latest values


    // ===================== CHECKPOINT UNDO =====================

    const handleModeSwitch = (newMode: 'chat' | 'agent') => {
        if (newMode === mode) return;
        setMode(newMode);
        newChat();
        // Update mode on server
        if (sessionId) {
            fetch('/api/singularity/history', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ sessionId, mode: newMode }),
            }).catch(() => { });
        }
    }; /*

                    textContent: `[PDF Document: ${file.name} — ${(file.size / 1024).toFixed(0)}KB. Content will be extracted by AI.]`,
                };
                    textContent = textContent.slice(0, 100000) + '\n\n[... truncated — document too large, showing first 100K characters ...]';
                }
            }

            return {
                id: `doc-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
                file,
                preview: '',
                base64: '',
                mimeType: file.type || 'text/plain',
                fileType: 'document',
                fileName: file.name,
                textContent,
            };
        } catch {
            return null;
        }
    }, []);

    */

    const handleStop = useCallback(() => {
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
            abortControllerRef.current = null;
        }
        setIsLoading(false);
        setStreamingPhase('idle');
        // Mark any streaming messages as done
        setMessages(prev => prev.map(m => m.isStreaming ? { ...m, isStreaming: false, content: m.content || '(Stopped by user)' } : m));
    }, []);

    const handleSend = async (overrideMessage?: string) => {
        const msg = (overrideMessage || inputValue).trim();
        if ((!msg && attachments.length === 0) || isLoading) return;


        const currentAttachments = [...attachments];
        setInputValue("");
        clearAttachments();

        const userMsg: Message = {
            id: `user-${Date.now()}`,
            role: 'user',
            content: msg,
            images: currentAttachments.filter(a => a.fileType === 'image' && a.preview).map(a => a.preview),
            attachments: currentAttachments.filter(a => a.fileType === 'document').map(a => ({ fileName: a.fileName || a.file.name, fileType: 'document' as const, mimeType: a.mimeType })),
            timestamp: new Date(),
        };

        // Add user message and switch to chat view BEFORE session creation
        // This prevents the welcome screen from staying visible during the network call
        setMessages(prev => [...prev, userMsg]);
        setIsLoading(true);
        setStreamingPhase(mode === 'chat' ? 'thinking' : 'responding');

        // Lazily create session on first message (after UI is already in chat state)
        let currentSessionId = sessionId;
        if (!currentSessionId && userId) {
            currentSessionId = await createNewSession();
            if (currentSessionId) setSessionId(currentSessionId);
        }

        const msgId = `model-${Date.now()}`;
        const aiMsg: Message = {
            id: msgId,
            role: 'model',
            content: '',
            thinking: mode === 'chat' ? '' : undefined,
            timestamp: new Date(),
            isStreaming: true,
            toolActions: mode === 'agent' ? [] : undefined,
        };
        setMessages(prev => [...prev, aiMsg]);

        if (mode === 'chat') {
            setExpandedThinking(prev => new Set(prev).add(msgId));
        }

        try {
            let history = messages
                .filter(m => !m.isStreaming)
                .map(m => ({ role: m.role, content: m.content }));

            // Inject seed history when clicking a suggestion on empty chat
            if (history.length === 0 && overrideMessage && SUGGESTION_SEED_HISTORY[overrideMessage]) {
                history = SUGGESTION_SEED_HISTORY[overrideMessage];
            }

            const body: SingularityRequestBody = { history, message: msg, mode };
            if (isAdmin && isHeavyTask) body.isHeavyTask = true;
            if (userId) body.userId = userId;

            // Separate images and documents
            const imageAttachments = currentAttachments.filter(a => a.fileType === 'image');
            const docAttachments = currentAttachments.filter(a => a.fileType === 'document');

            if (imageAttachments.length > 0) {
                body.images = imageAttachments.map(a => ({
                    base64: a.base64,
                    mimeType: a.mimeType,
                }));
            }
            if (docAttachments.length > 0) {
                body.documents = docAttachments.map(a => ({
                    fileName: a.fileName,
                    mimeType: a.mimeType,
                    textContent: a.textContent,
                    base64: a.base64 || undefined,
                }));
            }

            const controller = new AbortController();
            abortControllerRef.current = controller;

            const response = await fetch('/api/singularity', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
                signal: controller.signal,
            });

            if (!response.ok) throw new Error('Failed to connect');

            const reader = response.body?.getReader();
            const decoder = new TextDecoder();
            let buffer = '';

            if (reader) {
                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;

                    buffer += decoder.decode(value, { stream: true });
                    const lines = buffer.split('\n');
                    buffer = lines.pop() || '';

                    for (const line of lines) {
                        if (!line.startsWith('data: ')) continue;
                        try {
                            const data = JSON.parse(line.slice(6));

                            if (data.type === 'thinking') {
                                setStreamingPhase('thinking');
                                setMessages(prev => prev.map(m =>
                                    m.id === msgId ? { ...m, thinking: (m.thinking || '') + data.text } : m
                                ));
                            } else if (data.type === 'response') {
                                setStreamingPhase('responding');
                                setMessages(prev => prev.map(m =>
                                    m.id === msgId ? { ...m, content: (m.content || '') + data.text } : m
                                ));
                            } else if (data.type === 'tool_call') {
                                // Agent mode: tool is being called
                                setMessages(prev => prev.map(m =>
                                    m.id === msgId ? {
                                        ...m,
                                        toolActions: [...(m.toolActions || []), {
                                            name: data.name,
                                            displayName: data.displayName || data.name,
                                            status: 'calling' as const,
                                        }]
                                    } : m
                                ));
                            } else if (data.type === 'tool_result') {
                                // Agent mode: tool finished-- capture rollback data
                                if (data.rollbackData) {
                                    pendingRollbackRef.current.push(...data.rollbackData);
                                }
                                setMessages(prev => prev.map(m =>
                                    m.id === msgId ? {
                                        ...m,
                                        toolActions: (() => {
                                            let hasMatched = false;
                                            return (m.toolActions || []).map(ta => {
                                                if (!hasMatched && ta.name === data.name && ta.status === 'calling') {
                                                    hasMatched = true;
                                                    return { ...ta, status: data.success ? 'done' as const : 'error' as const, summary: data.summary, success: data.success, rollbackData: data.rollbackData };
                                                }
                                                return ta;
                                            });
                                        })()
                                    } : m
                                ));
                            } else if (data.type === 'done') {
                                setMessages(prev => prev.map(m =>
                                    m.id === msgId ? { ...m, isStreaming: false } : m
                                ));
                                setExpandedThinking(prev => {
                                    const next = new Set(prev);
                                    next.delete(msgId);
                                    return next;
                                });
                            } else if (data.type === 'clear') {
                                // Server is retrying — reset accumulated response
                                setMessages(prev => prev.map(m =>
                                    m.id === msgId ? { ...m, content: '', thinking: mode === 'chat' ? '' : undefined, toolActions: mode === 'agent' ? [] : undefined } : m
                                ));
                            } else if (data.type === 'rechecking') {
                                setStreamingPhase('rechecking');
                            } else if (data.type === 'error') {
                                setMessages(prev => prev.map(m =>
                                    m.id === msgId ? { ...m, content: 'An error occurred. Please try again.', isStreaming: false } : m
                                ));
                            }
                        } catch { }
                    }
                }

                // Process remaining buffer
                if (buffer.trim()) {
                    for (const line of buffer.split('\n')) {
                        if (!line.startsWith('data: ')) continue;
                        try {
                            const data = JSON.parse(line.slice(6));
                            if (data.type === 'response') {
                                setMessages(prev => prev.map(m =>
                                    m.id === msgId ? { ...m, content: (m.content || '') + data.text } : m
                                ));
                            } else if (data.type === 'done') {
                                setMessages(prev => prev.map(m =>
                                    m.id === msgId ? { ...m, isStreaming: false } : m
                                ));
                                setExpandedThinking(prev => {
                                    const next = new Set(prev);
                                    next.delete(msgId);
                                    return next;
                                });
                            }
                        } catch { }
                    }
                }

                // Safety: ensure streaming flag is cleared
                setMessages(prev => prev.map(m =>
                    m.id === msgId && m.isStreaming ? { ...m, isStreaming: false } : m
                ));
            }
        } catch (error) {
            const errorName = typeof error === 'object' && error !== null && 'name' in error
                ? String((error as { name?: unknown }).name)
                : '';
            const isAbortError = errorName === 'AbortError';
            if (isAbortError) {
                return;
            }
            console.error(error);
            setMessages(prev => prev.map(m =>
                m.id === msgId ? { ...m, content: "I encountered an error. Please try again.", isStreaming: false } : m
            ));
        } finally {
            abortControllerRef.current = null;
            setIsLoading(false);
            setStreamingPhase('idle');
            inputRef.current?.focus();

            // Explicit save using local currentSessionId (avoids React state timing issues)
            // The useEffect may also fire, but duplicate saves are harmless (idempotent PUT).
            if (currentSessionId) {
                setTimeout(() => {
                    saveMessages(messagesRef.current, currentSessionId!);
                }, 100);
            }

            // Save checkpoint if there were tool actions with rollback data
            if (pendingRollbackRef.current.length > 0) {
                const actions = [...pendingRollbackRef.current];
                pendingRollbackRef.current = [];
                const label = actions.map(a => a.toolName).join(', ');
                saveCheckpoint(actions, label, msgId);
            }
        }
    };

    const handleDeleteWithPassword = async () => {
        if (!deleteConfirmModal || !deleteConfirmModal.password.trim() || deleteConfirmModal.verifying) return;
        setDeleteConfirmModal(prev => prev ? { ...prev, verifying: true, passwordError: '' } : null);
        try {
            const result = await verifyAgentPassword(deleteConfirmModal.password);
            if (result.success) {
                if (deleteConfirmModal.type === 'delete') {
                    await executeDeleteSession();
                } else {
                    executeClearChat();
                }
            } else {
                setDeleteConfirmModal(prev => prev ? { ...prev, verifying: false, passwordError: result.error || 'Incorrect password' } : null);
            }
        } catch {
            setDeleteConfirmModal(prev => prev ? { ...prev, verifying: false, passwordError: 'Verification failed. Try again.' } : null);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    const suggestions = mode === 'agent' ? AGENT_SUGGESTIONS : CHAT_SUGGESTIONS;
    const isAgent = mode === 'agent';
    const getUndoCheckpointId = (message: Message): string | null => {
        const checkpoint = checkpoints.find((item) => {
            if (item.messageId) {
                return item.messageId === message.id;
            }

            const messageIndex = messages.indexOf(message);
            return item.messageIndex >= messageIndex - 1 && item.messageIndex <= messageIndex + 2;
        });

        return checkpoint?.id ?? null;
    };

    const handleToggleThinking = (messageId: string) => {
        setExpandedThinking((previous) => {
            const next = new Set(previous);
            if (next.has(messageId)) {
                next.delete(messageId);
            } else {
                next.add(messageId);
            }
            return next;
        });
    };

    const handleCopyMessage = (messageId: string, content: string) => {
        navigator.clipboard.writeText(content);
        setCopiedId(messageId);
        setTimeout(() => setCopiedId(null), 2000);
    };

    return (
        <div
            className="flex flex-col h-[100dvh] relative bg-white dark:bg-black"
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
        >
            {isDragOver && <SingularityDragOverlay />}

            <SingularityHeaderBar
                onToggleMenu={() => {
                    setShowNavMenu(!showNavMenu);
                    setShowHistory(false);
                }}
                onNewChat={newChat}
                onToggleHistory={() => {
                    setShowHistory(!showHistory);
                    setShowNavMenu(false);
                    void fetchSessions();
                }}
                isAdmin={isAdmin}
                isHeavyTask={isHeavyTask}
                onToggleHeavyTask={handleToggleHeavyTask}
            />


            {/* ••• Navigation Menu — Left Side ••• */}
            <SingularityNavigationMenu
                showNavMenu={showNavMenu}
                agencyName={agencyName}
                onClose={() => setShowNavMenu(false)}
            />



            <SingularityHistorySidebar
                showHistory={showHistory}
                sessions={sessions}
                activeSessionId={sessionId}
                onClose={() => setShowHistory(false)}
                onLoadSession={loadSession}
                onRequestDeleteSession={requestDeleteSession}
            />
            {/*
                Header
                <div className="flex items-center px-5 py-4 border-b border-neutral-200 dark:border-neutral-800">
                    <div className="flex items-center gap-2.5">
                        <History className="w-5 h-5 text-neutral-500" />
                        <h3 className="text-sm font-semibold text-neutral-800 dark:text-neutral-200">History</h3>
                        <span className="text-[10px] text-neutral-500 bg-neutral-100 dark:bg-neutral-800 px-1.5 py-0.5 rounded-full">{sessions.filter(s => s.messageCount > 0).length}</span>
                    </div>
                </div>
                <div className="flex-1 overflow-y-auto no-scrollbar">
                    {sessions.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-40 text-neutral-500 text-xs">
                            <Clock className="w-8 h-8 mb-2 opacity-20" />
                            No conversations yet
                        </div>
                    ) : (
                        <div className="p-2 space-y-3">
                            {(() => {
                                const now = new Date();
                                const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                                const yesterday = new Date(today.getTime() - 86400000);
                                const weekAgo = new Date(today.getTime() - 7 * 86400000);

                                const groups: { label: string; items: typeof sessions }[] = [
                                    { label: 'Today', items: sessions.filter(s => new Date(s.updatedAt) >= today && s.messageCount > 0) },
                                    { label: 'Yesterday', items: sessions.filter(s => { const d = new Date(s.updatedAt); return d >= yesterday && d < today && s.messageCount > 0; }) },
                                    { label: 'This Week', items: sessions.filter(s => { const d = new Date(s.updatedAt); return d >= weekAgo && d < yesterday && s.messageCount > 0; }) },
                                    { label: 'Older', items: sessions.filter(s => new Date(s.updatedAt) < weekAgo && s.messageCount > 0) },
                                ];

                                return groups.filter(g => g.items.length > 0).map(group => (
                                    <div key={group.label} className="space-y-1">
                                        <p className="text-[10px] font-medium text-neutral-400 uppercase tracking-wider px-2 pt-1">{group.label}</p>
                                        {group.items.map(s => (
                                            <div key={s.id} className={cn(
                                                "group flex items-start gap-2.5 px-3 py-2.5 rounded-xl cursor-pointer transition-all duration-200",
                                                s.id === sessionId
                                                    ? "bg-neutral-100 dark:bg-neutral-800/80"
                                                    : "hover:bg-neutral-50 dark:hover:bg-neutral-900 hover:text-neutral-900 dark:hover:text-neutral-200"
                                            )}>
                                                <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5 text-neutral-400 dark:text-neutral-500">
                                                    {s.mode === 'agent' ? <Bot className="w-3.5 h-3.5" /> : <MessageSquare className="w-3.5 h-3.5" />}
                                                </div>
                                                <button type="button" className="flex-1 min-w-0 text-left" onClick={() => loadSession(s.id)}>
                                                    <p className="text-xs font-medium text-neutral-800 dark:text-neutral-200 truncate">{s.title}</p>
                                                    <p className="text-[10px] text-neutral-400 mt-0.5 flex items-center gap-1.5">
                                                        <span>{s.messageCount} messages</span>
                                                        <span className="opacity-40">·</span>
                                                        <span>{(() => {
                                                            const diff = Date.now() - new Date(s.updatedAt).getTime();
                                                            const mins = Math.floor(diff / 60000);
                                                            if (mins < 1) return 'Just now';
                                                            if (mins < 60) return `${mins}m ago`;
                                                            const hrs = Math.floor(mins / 60);
                                                            if (hrs < 24) return `${hrs}h ago`;
                                                            return `${Math.floor(hrs / 24)}d ago`;
                                                        })()}</span>
                                                    </p>
                                                </button>
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); requestDeleteSession(s.id); }}
                                                    className="opacity-100 md:opacity-0 md:group-hover:opacity-100 p-1 hover:bg-destructive/10 rounded-lg transition-all mt-0.5"
                                                    aria-label="Delete conversation"
                                                    title="Delete conversation"
                                                >
                                                    <Trash2 className="w-3 h-3 text-neutral-400 hover:text-destructive" />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                ));
                            })()}
                        </div>
                    )}
                </div>
            </div>


            */}

            {rollbackModal && (
                <SingularityConflictModal
                    analysis={rollbackModal.analysis}
                    onUndoSafe={() => executeUndo(rollbackModal.analysis.checkpointId, "safe")}
                    onForceUndo={() => executeUndo(rollbackModal.analysis.checkpointId, "all")}
                    onClose={() => setRollbackModal(null)}
                />
            )}

            {undoConfirmModal && (
                <SingularityUndoConfirmModal
                    totalActions={undoConfirmModal.totalActions}
                    onConfirm={async () => {
                        const checkpointId = undoConfirmModal.checkpointId;
                        setUndoConfirmModal(null);
                        await executeUndo(checkpointId, "all");
                    }}
                    onClose={() => setUndoConfirmModal(null)}
                />
            )}{/*
                        <div className="bg-card border border-border rounded-2xl shadow-2xl max-w-sm w-full p-5 sm:p-6 space-y-4 animate-in zoom-in-95 fade-in duration-200">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-cyan-500/10 flex items-center justify-center shrink-0">
                                    <Undo2 className="w-5 h-5 text-cyan-500" />
                                </div>
                                <div>
                                    <h3 className="text-sm font-bold text-foreground">Undo Actions</h3>
                                    <p className="text-xs text-muted-foreground">
                                        {undoConfirmModal.totalActions} action{undoConfirmModal.totalActions !== 1 ? 's' : ''} will be reversed
                                    </p>
                                </div>
                            </div>

                            <div className="rounded-xl bg-muted/50 border border-border/40 p-3 space-y-1.5">
                                <p className="text-xs text-foreground font-medium">What will happen:</p>
                                <ul className="text-xs text-muted-foreground space-y-1">
                                    <li className="flex items-start gap-1.5">
                                        <span className="text-cyan-500 mt-0.5">•</span>
                                        Only <strong className="text-foreground">this response&apos;s</strong> database changes will be reversed
                                    </li>
                                    <li className="flex items-start gap-1.5">
                                        <span className="text-cyan-500 mt-0.5">•</span>
                                        Previous and later actions are <strong className="text-foreground">not affected</strong>
                                    </li>
                                    <li className="flex items-start gap-1.5">
                                        <span className="text-cyan-500 mt-0.5">•</span>
                                        Messages from this point will be removed from chat
                                    </li>
                                </ul>
                            </div>

                            <div className="flex gap-2">
                                <button
                                    onClick={async () => {
                                        const cpId = undoConfirmModal.checkpointId;
                                        setUndoConfirmModal(null);
                                        await executeUndo(cpId, 'all');
                                    }}
                                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-medium rounded-xl bg-cyan-600 text-white hover:bg-cyan-700 transition-colors shadow-sm"
                                >
                                    <Undo2 className="w-3.5 h-3.5" />
                                    Undo {undoConfirmModal.totalActions} Action{undoConfirmModal.totalActions !== 1 ? 's' : ''}
                                </button>
                                <button
                                    onClick={() => setUndoConfirmModal(null)}
                                    className="px-4 py-2.5 text-xs font-medium rounded-xl bg-muted text-muted-foreground hover:bg-muted/80 transition-colors"
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }

            */}

            {deleteConfirmModal && (
                <SingularityDeleteConfirmModal
                    modal={deleteConfirmModal}
                    onPasswordChange={(value) => {
                        setDeleteConfirmModal((previous) => previous ? { ...previous, password: value, passwordError: "" } : null);
                    }}
                    onPasswordKeyDown={(event) => {
                        if (event.key === "Enter") {
                            void handleDeleteWithPassword();
                        }
                    }}
                    onConfirm={() => {
                        if (deleteConfirmModal.hasAgentMessages) {
                            void handleDeleteWithPassword();
                            return;
                        }
                        if (deleteConfirmModal.type === "delete") {
                            void executeDeleteSession();
                            return;
                        }
                        executeClearChat();
                    }}
                    onClose={() => setDeleteConfirmModal(null)}
                />
            )}{/*
                        <div className="bg-card border border-border rounded-2xl shadow-2xl max-w-sm w-full p-5 sm:p-6 space-y-4 animate-in zoom-in-95 fade-in duration-200">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-destructive/10 flex items-center justify-center shrink-0">
                                    <AlertTriangle className="w-5 h-5 text-destructive" />
                                </div>
                                <div>
                                    <h3 className="text-sm font-bold text-foreground">
                                        {deleteConfirmModal.type === 'delete' ? 'Delete Chat' : 'Clear Chat'}
                                    </h3>
                                    <p className="text-xs text-muted-foreground">
                                        {deleteConfirmModal.type === 'delete'
                                            ? `"${deleteConfirmModal.sessionTitle}"`
                                            : 'All messages will be removed'}
                                    </p>
                                </div>
                            </div>

                            <div className="rounded-xl bg-muted/50 border border-border/40 p-3 space-y-2">
                                {deleteConfirmModal.hasAgentMessages && (
                                    <div className="flex items-start gap-2 p-2 rounded-lg bg-amber-500/5 border border-amber-500/20">
                                        <AlertTriangle className="w-3.5 h-3.5 text-amber-500 mt-0.5 shrink-0" />
                                        <p className="text-xs text-amber-600 dark:text-amber-400">
                                            <strong>Agent actions cannot be undone.</strong> Any projects, tasks, clients, or data the AI created or modified will remain in your system.
                                        </p>
                                    </div>
                                )}
                                <ul className="text-xs text-muted-foreground space-y-1">
                                    <li className="flex items-start gap-1.5">
                                        <span className="text-destructive mt-0.5">•</span>
                                        {deleteConfirmModal.type === 'delete'
                                            ? 'This chat and its undo checkpoints will be permanently deleted'
                                            : 'Messages and undo checkpoints will be cleared'}
                                    </li>
                                    <li className="flex items-start gap-1.5">
                                        <span className="text-destructive mt-0.5">•</span>
                                        You will <strong className="text-foreground">no longer be able to undo</strong> any actions from this chat
                                    </li>
                                </ul>
                            </div>

                            {deleteConfirmModal.hasAgentMessages && (
                                <div>
                                    <input
                                        type="password"
                                        placeholder="Enter your password to confirm"
                                        value={deleteConfirmModal.password}
                                        onChange={(e) => setDeleteConfirmModal(prev => prev ? { ...prev, password: e.target.value, passwordError: '' } : null)}
                                        onKeyDown={(e) => { if (e.key === 'Enter') handleDeleteWithPassword(); }}
                                        className="w-full h-10 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-destructive/50"
                                        autoFocus
                                    />
                                    {deleteConfirmModal.passwordError && (
                                        <p className="text-xs text-red-500 mt-1.5">{deleteConfirmModal.passwordError}</p>
                                    )}
                                </div>
                            )}

                            <div className="flex gap-2">
                                <button
                                    onClick={deleteConfirmModal.hasAgentMessages
                                        ? handleDeleteWithPassword
                                        : (deleteConfirmModal.type === 'delete' ? executeDeleteSession : executeClearChat)
                                    }
                                    disabled={deleteConfirmModal.hasAgentMessages && (!deleteConfirmModal.password.trim() || deleteConfirmModal.verifying)}
                                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-medium rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
                                >
                                    {deleteConfirmModal.verifying ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                                    {deleteConfirmModal.verifying ? 'Verifying...' : (deleteConfirmModal.type === 'delete' ? 'Delete Chat' : 'Clear Messages')}
                                </button>
                                <button
                                    onClick={() => setDeleteConfirmModal(null)}
                                    className="px-4 py-2.5 text-xs font-medium rounded-xl bg-muted text-muted-foreground hover:bg-muted/80 transition-colors"
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }

            */}

            {/* Gemini-style Layout */}
            {
                messages.length === 0 && !isLoading ? (
                    <SingularityEmptyState
                        composerProps={{
                            attachments,
                            inputValue,
                            isAgent,
                            isLoading,
                            showModeDropdown,
                            disableTextarea: isLoading,
                            inputRef,
                            fileInputRef,
                            onInputChange: setInputValue,
                            onKeyDown: handleKeyDown,
                            onRemoveAttachment: removeAttachment,
                            onFileSelect: handleFileSelect,
                            onModeToggle: () => setShowModeDropdown((previous) => !previous),
                            onModeClose: () => setShowModeDropdown(false),
                            onModeSwitch: handleModeSwitch,
                            onSend: () => handleSend(),
                            onStop: handleStop,
                        }}
                        suggestions={suggestions}
                        onSelectSuggestion={(label) => handleSend(label)}
                    />
                ) : (
                    /* CHAT STATE: Messages + bottom input */
                    <>
                        {/* Messages Area */}
                        <SingularityMessagesPane
                            messages={messages}
                            scrollRef={scrollRef}
                            messagesEndRef={messagesEndRef}
                            isLoading={isLoading}
                            isAgent={isAgent}
                            streamingPhase={streamingPhase}
                            expandedThinking={expandedThinking}
                            copiedId={copiedId}
                            undoingCheckpoint={undoingCheckpoint}
                            getUndoCheckpointId={getUndoCheckpointId}
                            renderMarkdown={renderMarkdown}
                            onToggleThinking={handleToggleThinking}
                            onCopyMessage={handleCopyMessage}
                            onUndo={handleUndo}
                        />
                        {false && (
                        <div ref={scrollRef} className="flex-1 overflow-y-auto py-4 sm:py-6 scroll-smooth no-scrollbar">
                            <div className="max-w-4xl mx-auto px-4 sm:px-8 space-y-4 sm:space-y-6">
                                {/* Messages */}
                                {messages.map((msg) => (
                                    <div key={msg.id} className={cn("flex gap-2 sm:gap-3 singularity-msg-enter", msg.role === 'user' ? 'flex-row-reverse' : 'flex-row')}>
                                        <SingularityMessageAvatar role={msg.role} isAgent={isAgent} />
                                        <div className="flex flex-col gap-1.5 sm:gap-2 max-w-[85%] sm:max-w-[75%] min-w-0">
                                            {/* Thinking Section */}
                                            {msg.role === 'model' && msg.thinking && (
                                                <SingularityThinkingPanel
                                                    content={msg.thinking}
                                                    isExpanded={expandedThinking.has(msg.id)}
                                                    onToggle={() => handleToggleThinking(msg.id)}
                                                />
                                            )}

                                            <SingularityMessageAttachments
                                                role={msg.role}
                                                images={msg.images}
                                                attachments={msg.attachments}
                                            />

                                            {/* Tool Actions */}
                                            {msg.role === 'model' && msg.toolActions && msg.toolActions.length > 0 && (
                                                <SingularityToolActionsPanel
                                                    toolActions={msg.toolActions}
                                                    undoCheckpointId={msg.isStreaming ? null : getUndoCheckpointId(msg)}
                                                    isUndoing={undoingCheckpoint === getUndoCheckpointId(msg)}
                                                    onUndo={handleUndo}
                                                />
                                            )}

                                            {/* Response Bubble */}
                                            {(msg.content || msg.role === 'user') && (
                                                <SingularityMessageBubble
                                                    role={msg.role}
                                                    content={msg.content}
                                                    isStreaming={msg.isStreaming}
                                                    renderedHtml={msg.role === "model" ? renderMarkdown(msg.content) : undefined}
                                                    isCopied={copiedId === msg.id}
                                                    onCopy={() => handleCopyMessage(msg.id, msg.content)}
                                                />
                                            )}

                                            {/* Streaming indicator */}
                                            {msg.role === 'model' && !msg.content && msg.isStreaming && (
                                                <SingularityMessageStreamingIndicator
                                                    isAgent={isAgent}
                                                    phase={streamingPhase}
                                                    hasToolActions={Boolean(msg.toolActions?.length)}
                                                />
                                            )}
                                        </div>
                                    </div>
                                ))}

                                {/* Loading Indicator */}
                                {isLoading && messages.length > 0 && messages[messages.length - 1]?.role === 'user' && (
                                    <SingularityAssistantStatus isAgent={isAgent} />
                                )}

                                {/* Rechecking Indicator — shows when AI is refining a short response */}
                                {streamingPhase === 'rechecking' && (
                                    <SingularityAssistantStatus
                                        isAgent={isAgent}
                                        label="Refining response..."
                                        className="singularity-msg-enter"
                                    />
                                )}

                                <div ref={messagesEndRef} />
                            </div>
                        </div>
                        )}

                        {/* Bottom Input Area (when chatting) */}
                        <div className="sticky bottom-0 shrink-0 bg-white dark:bg-black pb-4 pb-safe sm:pb-5 pt-2 px-4 sm:px-8">
                            <SingularityComposer
                                variant="small"
                                attachments={attachments}
                                inputValue={inputValue}
                                isAgent={isAgent}
                                isLoading={isLoading}
                                showModeDropdown={showModeDropdown}
                                inputRef={inputRef}
                                fileInputRef={fileInputRef}
                                onInputChange={setInputValue}
                                onKeyDown={handleKeyDown}
                                onRemoveAttachment={removeAttachment}
                                onFileSelect={handleFileSelect}
                                onModeToggle={() => setShowModeDropdown((previous) => !previous)}
                                onModeClose={() => setShowModeDropdown(false)}
                                onModeSwitch={handleModeSwitch}
                                onSend={() => handleSend()}
                                onStop={handleStop}
                            />
                        </div>
                    </>
                )
            }

        </div >
    );
}

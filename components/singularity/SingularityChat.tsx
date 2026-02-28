"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import {
    Sparkles, User, ChevronDown, ChevronRight,
    Brain, Copy, Check, Trash2, ArrowRight, Image as ImageIcon, X,
    Bot, MessageSquare, Wrench, CheckCircle2, AlertCircle, Loader2,
    Paperclip, FileText, FileSpreadsheet, FileCode,
    Plus, Clock, Undo2, History, Shield, AlertTriangle
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Attachment {
    id: string;
    file: File;
    preview: string;
    base64: string;
    mimeType: string;
    textContent?: string; // Extracted text from documents
    fileType: 'image' | 'document';
    fileName?: string;
}

interface ToolAction {
    name: string;
    displayName: string;
    status: 'calling' | 'done' | 'error';
    summary?: string;
    success?: boolean;
    rollbackData?: any[];
}

interface Message {
    id: string;
    role: 'user' | 'model';
    content: string;
    thinking?: string;
    images?: string[];
    timestamp: Date;
    isStreaming?: boolean;
    toolActions?: ToolAction[];
}

interface ChatSessionSummary {
    id: string;
    title: string;
    mode: 'chat' | 'agent';
    updatedAt: string;
    messageCount: number;
}

interface CheckpointInfo {
    id: string;
    label: string;
    messageIndex: number;
    createdAt: string;
}

interface RollbackAnalysis {
    checkpointId: string;
    label: string;
    totalActions: number;
    safeActions: any[];
    conflictedActions: { action: any; conflict: { entityType: string; entityId: string; entityName: string; reason: string } }[];
}

const CHAT_SUGGESTIONS = [
    "Help me draft a proposal for a new client project",
    "What are the best practices for managing remote teams?",
    "Write a follow-up email to a client about project delays",
    "Help me plan a sprint for our upcoming product launch",
];

const AGENT_SUGGESTIONS = [
    "Create a new project called 'Website Redesign' with 5 tasks for planning, design, development, testing, and launch",
    "Show me our financial summary — total revenue, expenses, and pending invoices",
    "Who on the team has the most tasks? Show me everyone's workload",
    "List all our active projects and flag any that have overdue tasks",
];

// Simple markdown-to-HTML renderer
function renderMarkdown(text: string): string {
    if (!text) return '';
    return text
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
}

export function SingularityChat({ userId }: { userId?: string }) {
    const [messages, setMessages] = useState<Message[]>([]);
    const [inputValue, setInputValue] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [expandedThinking, setExpandedThinking] = useState<Set<string>>(new Set());
    const [copiedId, setCopiedId] = useState<string | null>(null);
    const [streamingPhase, setStreamingPhase] = useState<'idle' | 'thinking' | 'responding'>('idle');
    const [attachments, setAttachments] = useState<Attachment[]>([]);
    const [isDragOver, setIsDragOver] = useState(false);
    const [mode, setMode] = useState<'chat' | 'agent'>('chat');

    // Session & History state
    const [sessionId, setSessionId] = useState<string | null>(null);
    const [sessions, setSessions] = useState<ChatSessionSummary[]>([]);
    const [showHistory, setShowHistory] = useState(false);
    const [checkpoints, setCheckpoints] = useState<CheckpointInfo[]>([]);
    const [rollbackModal, setRollbackModal] = useState<{ analysis: RollbackAnalysis; loading: boolean } | null>(null);
    const [undoConfirmModal, setUndoConfirmModal] = useState<{ checkpointId: string; label: string; totalActions: number } | null>(null);
    const [deleteConfirmModal, setDeleteConfirmModal] = useState<{ type: 'clear' | 'delete'; sessionId?: string; sessionTitle?: string; hasAgentMessages: boolean } | null>(null);
    const [undoingCheckpoint, setUndoingCheckpoint] = useState<string | null>(null);
    const pendingRollbackRef = useRef<any[]>([]); // Accumulates rollback data during a single agent response

    const scrollRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLTextAreaElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

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

    const toggleThinking = (id: string) => {
        setExpandedThinking(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const copyToClipboard = async (text: string, id: string) => {
        await navigator.clipboard.writeText(text);
        setCopiedId(id);
        setTimeout(() => setCopiedId(null), 2000);
    };

    const clearChat = () => {
        // Check if there are agent messages with tool actions
        const hasAgentActions = messages.some(m => m.role === 'model' && m.toolActions && m.toolActions.length > 0);
        if (messages.length > 0) {
            setDeleteConfirmModal({ type: 'clear', hasAgentMessages: hasAgentActions });
        }
    };

    const executeClearChat = () => {
        setMessages([]);
        setAttachments([]);
        setCheckpoints([]);
        // Persist the cleared state to DB
        if (sessionId) {
            saveMessages([], sessionId);
        }
        setDeleteConfirmModal(null);
    };

    // ===================== SESSION MANAGEMENT =====================

    // Initialize a new session on mount
    useEffect(() => {
        if (userId && !sessionId) {
            createNewSession();
            fetchSessions();
        }
    }, [userId]);

    const createNewSession = async () => {
        if (!userId) return;
        try {
            const res = await fetch('/api/singularity/history', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId, mode }),
            });
            const data = await res.json();
            setSessionId(data.sessionId);
            return data.sessionId;
        } catch (err) {
            console.error('Failed to create session:', err);
        }
    };

    const fetchSessions = async () => {
        if (!userId) return;
        try {
            const res = await fetch(`/api/singularity/history?userId=${userId}`);
            const data = await res.json();
            setSessions(data);
        } catch (err) {
            console.error('Failed to fetch sessions:', err);
        }
    };

    const loadSession = async (sid: string) => {
        try {
            const res = await fetch(`/api/singularity/history?sessionId=${sid}`);
            const data = await res.json();
            setSessionId(sid);
            setMode(data.mode || 'chat');
            setMessages((data.messages || []).map((m: any, i: number) => ({
                ...m,
                id: m.id || `msg-${i}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
                timestamp: new Date(m.timestamp),
                isStreaming: false,
            })));
            setShowHistory(false);
            // Load checkpoints for this session
            const cpRes = await fetch(`/api/singularity/history/checkpoint?sessionId=${sid}`);
            const cpData = await cpRes.json();
            setCheckpoints(cpData || []);
        } catch (err) {
            console.error('Failed to load session:', err);
        }
    };

    const newChat = async () => {
        setMessages([]);
        setAttachments([]);
        setCheckpoints([]);
        setIsLoading(false);
        setStreamingPhase('idle');
        pendingRollbackRef.current = [];
        const newId = await createNewSession();
        setSessionId(newId || null);
        fetchSessions();
        setShowHistory(false);
    };

    const requestDeleteSession = (sid: string) => {
        const session = sessions.find(s => s.id === sid);
        const hasAgentActions = session?.mode === 'agent';
        setDeleteConfirmModal({
            type: 'delete',
            sessionId: sid,
            sessionTitle: session?.title || 'this chat',
            hasAgentMessages: hasAgentActions,
        });
    };

    const executeDeleteSession = async () => {
        if (!deleteConfirmModal?.sessionId) return;
        const sid = deleteConfirmModal.sessionId;
        try {
            await fetch(`/api/singularity/history?id=${sid}`, { method: 'DELETE' });
            setSessions(prev => prev.filter(s => s.id !== sid));
            if (sid === sessionId) {
                newChat();
            }
        } catch (err) {
            console.error('Failed to delete session:', err);
        }
        setDeleteConfirmModal(null);
    };

    // Auto-save messages after streaming completes (debounced)
    const saveMessages = useCallback(async (msgs: Message[], sid: string | null) => {
        if (!sid || !userId) return;
        const persistable = msgs.filter(m => !m.isStreaming).map(m => ({
            role: m.role,
            content: m.content,
            thinking: m.thinking,
            images: m.images,
            toolActions: m.toolActions?.map(ta => ({
                name: ta.name,
                displayName: ta.displayName,
                status: ta.status,
                summary: ta.summary,
                success: ta.success,
            })),
            timestamp: m.timestamp instanceof Date ? m.timestamp.toISOString() : m.timestamp,
        }));
        if (persistable.length === 0) return;

        // Auto-title from first user message
        const firstUser = persistable.find(m => m.role === 'user');
        const title = firstUser ? firstUser.content.slice(0, 60) : undefined;

        try {
            await fetch('/api/singularity/history', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ sessionId: sid, messages: persistable, title }),
            });
        } catch (err) {
            console.error('Failed to save messages:', err);
        }
    }, [userId]);

    // Trigger save whenever streaming finishes
    useEffect(() => {
        const anyStreaming = messages.some(m => m.isStreaming);
        if (!anyStreaming && messages.length > 0 && sessionId) {
            if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
            saveTimeoutRef.current = setTimeout(() => {
                saveMessages(messages, sessionId);
                fetchSessions();
            }, 500);
        }
        return () => { if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current); };
    }, [messages, sessionId]);

    // ===================== CHECKPOINT UNDO =====================

    const saveCheckpoint = async (rollbackActions: any[], label: string) => {
        if (!sessionId || rollbackActions.length === 0) return;
        try {
            const res = await fetch('/api/singularity/history/checkpoint', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    sessionId,
                    messageIndex: messages.filter(m => !m.isStreaming).length,
                    actions: rollbackActions,
                    label,
                }),
            });
            const data = await res.json();
            setCheckpoints(prev => [{ id: data.checkpointId, label, messageIndex: messages.length, createdAt: new Date().toISOString() }, ...prev]);
        } catch (err) {
            console.error('Failed to save checkpoint:', err);
        }
    };

    const handleUndo = async (checkpointId: string) => {
        setUndoingCheckpoint(checkpointId);
        try {
            // First analyze for conflicts
            const res = await fetch('/api/singularity/history/checkpoint', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'analyze', checkpointId }),
            });
            const analysis: RollbackAnalysis = await res.json();

            if (analysis.conflictedActions.length === 0) {
                // No conflicts — show confirmation modal
                setUndoConfirmModal({
                    checkpointId,
                    label: analysis.label || 'these actions',
                    totalActions: analysis.totalActions,
                });
            } else {
                // Has conflicts — show conflict modal
                setRollbackModal({ analysis, loading: false });
            }
        } catch (err) {
            console.error('Undo analysis failed:', err);
        } finally {
            setUndoingCheckpoint(null);
        }
    };

    const executeUndo = async (checkpointId: string, scope: 'safe' | 'all') => {
        try {
            const res = await fetch('/api/singularity/history/checkpoint', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ checkpointId, scope }),
            });
            const result = await res.json();

            // Find the checkpoint to get messageIndex
            const cp = checkpoints.find(c => c.id === checkpointId);
            if (cp) {
                // Truncate messages to checkpoint
                setMessages(prev => prev.slice(0, cp.messageIndex));
            }

            // Remove the checkpoint from UI
            setCheckpoints(prev => prev.filter(c => c.id !== checkpointId));
            setRollbackModal(null);

            // Save updated messages
            const truncated = messages.slice(0, cp?.messageIndex || messages.length);
            saveMessages(truncated, sessionId);
        } catch (err) {
            console.error('Rollback failed:', err);
        }
    };

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
    };

    // File handling — images AND documents
    const ACCEPTED_DOCS = ['application/pdf', 'text/plain', 'text/markdown', 'text/csv', 'application/json', 'text/html'];
    const DOC_EXTENSIONS = ['.pdf', '.txt', '.md', '.csv', '.json', '.html', '.prd', '.doc', '.docx'];

    const processFile = async (file: File): Promise<Attachment | null> => {
        // Image files — same as before
        if (file.type.startsWith('image/')) {
            if (file.size > 10 * 1024 * 1024) return null;
            return new Promise((resolve) => {
                const reader = new FileReader();
                reader.onload = () => {
                    const base64Full = reader.result as string;
                    resolve({
                        id: `img-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
                        file,
                        preview: base64Full,
                        base64: base64Full.split(',')[1],
                        mimeType: file.type,
                        fileType: 'image',
                    });
                };
                reader.readAsDataURL(file);
            });
        }

        // Document files — extract text
        const ext = '.' + file.name.split('.').pop()?.toLowerCase();
        const isDoc = ACCEPTED_DOCS.includes(file.type) || DOC_EXTENSIONS.includes(ext);
        if (!isDoc) return null;
        if (file.size > 20 * 1024 * 1024) return null; // 20MB limit for docs

        try {
            let textContent = '';

            if (file.type === 'application/pdf' || ext === '.pdf') {
                // PDF: Read as base64 and send to server for extraction
                const arrayBuffer = await file.arrayBuffer();
                const bytes = new Uint8Array(arrayBuffer);
                let binary = '';
                for (let i = 0; i < bytes.length; i++) {
                    binary += String.fromCharCode(bytes[i]);
                }
                const base64 = btoa(binary);
                return {
                    id: `doc-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
                    file,
                    preview: '',
                    base64,
                    mimeType: 'application/pdf',
                    fileType: 'document',
                    fileName: file.name,
                    textContent: `[PDF Document: ${file.name} — ${(file.size / 1024).toFixed(0)}KB. Content will be extracted by AI.]`,
                };
            } else {
                // Text-based files: Read as text directly
                textContent = await file.text();
                if (textContent.length > 100000) {
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
    };

    const handleFileSelect = async (files: FileList | null) => {
        if (!files) return;
        const newAttachments: Attachment[] = [];
        for (const file of Array.from(files).slice(0, 4)) {
            const att = await processFile(file);
            if (att) newAttachments.push(att);
        }
        setAttachments(prev => [...prev, ...newAttachments].slice(0, 4));
    };

    const removeAttachment = (id: string) => {
        setAttachments(prev => prev.filter(a => a.id !== id));
    };

    // Drag and drop
    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragOver(true);
    }, []);
    const handleDragLeave = useCallback(() => setIsDragOver(false), []);
    const handleDrop = useCallback(async (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragOver(false);
        await handleFileSelect(e.dataTransfer.files);
    }, []);

    const handleSend = async (overrideMessage?: string) => {
        const msg = (overrideMessage || inputValue).trim();
        if ((!msg && attachments.length === 0) || isLoading) return;

        const currentAttachments = [...attachments];
        setInputValue("");
        setAttachments([]);
        const msgId = `model-${Date.now()}`;

        const userMsg: Message = {
            id: `user-${Date.now()}`,
            role: 'user',
            content: msg,
            images: currentAttachments.map(a => a.preview),
            timestamp: new Date(),
        };

        setMessages(prev => [...prev, userMsg]);
        setIsLoading(true);
        setStreamingPhase(mode === 'chat' ? 'thinking' : 'responding');

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
            const history = messages
                .filter(m => !m.isStreaming)
                .map(m => ({ role: m.role, content: m.content }));

            const body: any = { history, message: msg, mode };
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

            const response = await fetch('/api/singularity', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
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
                                // Agent mode: tool finished — capture rollback data
                                if (data.rollbackData) {
                                    pendingRollbackRef.current.push(...data.rollbackData);
                                }
                                setMessages(prev => prev.map(m =>
                                    m.id === msgId ? {
                                        ...m,
                                        toolActions: (m.toolActions || []).map(ta =>
                                            ta.name === data.name && ta.status === 'calling'
                                                ? { ...ta, status: data.success ? 'done' as const : 'error' as const, summary: data.summary, success: data.success, rollbackData: data.rollbackData }
                                                : ta
                                        )
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
            console.error(error);
            setMessages(prev => prev.map(m =>
                m.id === msgId ? { ...m, content: "I encountered an error. Please try again.", isStreaming: false } : m
            ));
        } finally {
            setIsLoading(false);
            setStreamingPhase('idle');
            inputRef.current?.focus();

            // Save checkpoint if there were tool actions with rollback data
            if (pendingRollbackRef.current.length > 0) {
                const actions = [...pendingRollbackRef.current];
                pendingRollbackRef.current = [];
                const label = actions.map(a => a.toolName).join(', ');
                saveCheckpoint(actions, label);
            }
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

    return (
        <div
            className="flex flex-col h-screen max-w-4xl mx-auto relative"
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
        >
            {/* Drag Overlay */}
            {isDragOver && (
                <div className="absolute inset-0 z-50 bg-violet-100/80 dark:bg-violet-500/10 backdrop-blur-sm border-2 border-dashed border-violet-400 dark:border-violet-500/50 rounded-xl flex items-center justify-center">
                    <div className="text-center space-y-2">
                        <ImageIcon className="w-12 h-12 text-violet-500 dark:text-violet-400 mx-auto" />
                        <p className="text-violet-600 dark:text-violet-300 font-medium">Drop images here</p>
                    </div>
                </div>
            )}

            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between px-3 sm:px-6 py-2.5 sm:py-3 border-b border-border/20 gap-2 backdrop-blur-xl bg-background/80 z-30 sticky top-0">
                <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto justify-between sm:justify-start">
                    <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                        <div className="relative shrink-0">
                            <div className={cn(
                                "w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center shadow-lg transition-all duration-500",
                                isAgent
                                    ? "bg-gradient-to-br from-cyan-600 to-blue-600 shadow-cyan-500/25"
                                    : "bg-gradient-to-br from-violet-600 to-indigo-600 shadow-violet-500/25"
                            )}>
                                {isAgent ? <Bot className="w-[18px] h-[18px] sm:w-5 sm:h-5 text-white" /> : <Sparkles className="w-[18px] h-[18px] sm:w-5 sm:h-5 text-white" />}
                            </div>
                            <span className={cn(
                                "absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full border-2 border-background singularity-pulse-dot",
                                isAgent ? "bg-cyan-400" : "bg-emerald-400"
                            )} />
                        </div>
                        <div className="min-w-0">
                            <h1 className={cn(
                                "text-sm sm:text-lg font-bold bg-clip-text text-transparent tracking-tight transition-all duration-500",
                                isAgent
                                    ? "bg-gradient-to-r from-cyan-600 to-blue-600 dark:from-cyan-400 dark:to-blue-400"
                                    : "bg-gradient-to-r from-violet-600 to-indigo-600 dark:from-violet-400 dark:to-indigo-400"
                            )}>
                                Singularity
                            </h1>
                            <p className="text-[10px] sm:text-xs text-muted-foreground/80 truncate">
                                {isAgent ? "Agent Mode" : "AI Assistant"}
                                <span className="hidden sm:inline">{isAgent ? " • Connected to your agency" : " • Always ready"}</span>
                            </p>
                        </div>
                    </div>

                    {/* New Chat button — visible on mobile in the header row */}
                    <button onClick={newChat} className="sm:hidden flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground px-2 py-1.5 rounded-lg hover:bg-muted/60 transition-all shrink-0" title="New Chat">
                        <Plus className="w-3.5 h-3.5" />
                    </button>
                </div>

                <div className="flex items-center gap-1.5 sm:gap-2 w-full sm:w-auto">
                    {/* Mode Toggle — Pill with sliding highlight */}
                    <div className="relative flex items-center bg-muted/50 rounded-xl p-1 border border-border/30">
                        <div className={cn(
                            "absolute top-1 bottom-1 rounded-lg bg-background shadow-sm transition-all duration-300 ease-out",
                            mode === 'chat' ? "left-1 w-[calc(50%-4px)]" : "left-[calc(50%+2px)] w-[calc(50%-4px)]"
                        )} />
                        <button
                            onClick={() => handleModeSwitch('chat')}
                            className={cn(
                                "relative z-10 flex items-center gap-1.5 px-3 sm:px-3.5 py-1.5 rounded-lg text-xs font-medium transition-colors duration-200",
                                mode === 'chat' ? "text-foreground" : "text-muted-foreground hover:text-foreground"
                            )}
                        >
                            <MessageSquare className="w-3.5 h-3.5" />
                            <span>Chat</span>
                        </button>
                        <button
                            onClick={() => handleModeSwitch('agent')}
                            className={cn(
                                "relative z-10 flex items-center gap-1.5 px-3 sm:px-3.5 py-1.5 rounded-lg text-xs font-medium transition-colors duration-200",
                                mode === 'agent' ? "text-foreground" : "text-muted-foreground hover:text-foreground"
                            )}
                        >
                            <Bot className="w-3.5 h-3.5" />
                            <span>Agent</span>
                        </button>
                    </div>

                    {/* History & New Chat buttons */}
                    <button
                        onClick={() => { setShowHistory(!showHistory); fetchSessions(); }}
                        className={cn(
                            "flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-xl transition-all duration-200",
                            showHistory
                                ? "bg-primary/10 text-primary"
                                : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                        )}
                        title="Chat History"
                    >
                        <History className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">History</span>
                    </button>

                    <button
                        onClick={newChat}
                        className="hidden sm:flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground px-2.5 py-1.5 rounded-xl hover:bg-muted/50 transition-all duration-200"
                        title="New Chat"
                    >
                        <Plus className="w-3.5 h-3.5" />
                        <span>New</span>
                    </button>
                </div>
            </div>

            {/* History Sidebar */}
            {showHistory && (
                <div className="absolute top-0 right-0 w-full sm:w-80 h-full z-40 bg-card/95 backdrop-blur-xl border-l border-border/30 shadow-2xl animate-in slide-in-from-right duration-300 flex flex-col">
                    <div className="flex items-center justify-between px-4 py-3 border-b border-border/20 backdrop-blur-sm">
                        <div className="flex items-center gap-2">
                            <History className="w-4 h-4 text-muted-foreground" />
                            <h3 className="text-sm font-semibold text-foreground">History</h3>
                            <span className="text-[10px] text-muted-foreground bg-muted/60 px-1.5 py-0.5 rounded-full">{sessions.length}</span>
                        </div>
                        <button onClick={() => setShowHistory(false)} className="p-1.5 hover:bg-muted/60 rounded-lg transition-colors">
                            <X className="w-4 h-4 text-muted-foreground" />
                        </button>
                    </div>
                    <div className="flex-1 overflow-y-auto no-scrollbar">
                        {sessions.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-40 text-muted-foreground text-xs">
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
                                        { label: 'Today', items: sessions.filter(s => new Date(s.updatedAt) >= today) },
                                        { label: 'Yesterday', items: sessions.filter(s => { const d = new Date(s.updatedAt); return d >= yesterday && d < today; }) },
                                        { label: 'This Week', items: sessions.filter(s => { const d = new Date(s.updatedAt); return d >= weekAgo && d < yesterday; }) },
                                        { label: 'Older', items: sessions.filter(s => new Date(s.updatedAt) < weekAgo) },
                                    ];

                                    return groups.filter(g => g.items.length > 0).map(group => (
                                        <div key={group.label} className="space-y-1">
                                            <p className="text-[10px] font-medium text-muted-foreground/60 uppercase tracking-wider px-2 pt-1">{group.label}</p>
                                            {group.items.map(s => (
                                                <div key={s.id} className={cn(
                                                    "group flex items-start gap-2.5 px-3 py-2.5 rounded-xl cursor-pointer transition-all duration-200",
                                                    s.id === sessionId
                                                        ? isAgent
                                                            ? "bg-cyan-500/10 border border-cyan-500/20"
                                                            : "bg-violet-500/10 border border-violet-500/20"
                                                        : "hover:bg-muted/50 border border-transparent"
                                                )}>
                                                    <div className={cn(
                                                        "w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5",
                                                        s.mode === 'agent'
                                                            ? "bg-cyan-500/10 text-cyan-500"
                                                            : "bg-violet-500/10 text-violet-500"
                                                    )}>
                                                        {s.mode === 'agent' ? <Bot className="w-3.5 h-3.5" /> : <MessageSquare className="w-3.5 h-3.5" />}
                                                    </div>
                                                    <div className="flex-1 min-w-0" onClick={() => loadSession(s.id)}>
                                                        <p className="text-xs font-medium text-foreground truncate">{s.title}</p>
                                                        <p className="text-[10px] text-muted-foreground/70 mt-0.5 flex items-center gap-1.5">
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
                                                    </div>
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); requestDeleteSession(s.id); }}
                                                        className="opacity-0 group-hover:opacity-100 p-1 hover:bg-destructive/10 rounded-lg transition-all mt-0.5"
                                                    >
                                                        <Trash2 className="w-3 h-3 text-muted-foreground hover:text-destructive" />
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
            )}

            {/* Conflict Resolution Modal */}
            {rollbackModal && (
                <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-card border border-border rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
                                <AlertTriangle className="w-5 h-5 text-amber-500" />
                            </div>
                            <div>
                                <h3 className="text-sm font-bold text-foreground">Conflicts Detected</h3>
                                <p className="text-xs text-muted-foreground">
                                    {rollbackModal.analysis.safeActions.length} of {rollbackModal.analysis.totalActions} actions can be safely undone
                                </p>
                            </div>
                        </div>

                        <div className="space-y-2 max-h-48 overflow-y-auto">
                            {rollbackModal.analysis.conflictedActions.map((ca, i) => (
                                <div key={i} className="flex items-start gap-2 p-2.5 rounded-lg bg-amber-500/5 border border-amber-500/20 text-xs">
                                    <AlertTriangle className="w-3.5 h-3.5 text-amber-500 mt-0.5 shrink-0" />
                                    <div>
                                        <span className="font-medium text-foreground">{ca.conflict.entityName}</span>
                                        <span className="text-muted-foreground"> — {ca.conflict.reason}</span>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="flex gap-2">
                            <button
                                onClick={() => executeUndo(rollbackModal.analysis.checkpointId, 'safe')}
                                className="flex-1 px-3 py-2 text-xs font-medium rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                            >
                                Undo Safe Only ({rollbackModal.analysis.safeActions.length})
                            </button>
                            <button
                                onClick={() => executeUndo(rollbackModal.analysis.checkpointId, 'all')}
                                className="flex-1 px-3 py-2 text-xs font-medium rounded-lg bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors"
                            >
                                Force Undo All
                            </button>
                            <button
                                onClick={() => setRollbackModal(null)}
                                className="px-3 py-2 text-xs font-medium rounded-lg bg-muted text-muted-foreground hover:bg-muted/80 transition-colors"
                            >
                                Cancel
                            </button>
                        </div>

                        <p className="text-[10px] text-muted-foreground text-center">
                            ⚠️ "Force Undo All" will discard changes you made after the AI created these items
                        </p>
                    </div>
                </div>
            )}

            {/* Undo Confirmation Modal */}
            {undoConfirmModal && (
                <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
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
            )}

            {/* Delete / Clear Chat Warning Modal */}
            {deleteConfirmModal && (
                <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
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

                        <div className="flex gap-2">
                            <button
                                onClick={deleteConfirmModal.type === 'delete' ? executeDeleteSession : executeClearChat}
                                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-medium rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-colors shadow-sm"
                            >
                                <Trash2 className="w-3.5 h-3.5" />
                                {deleteConfirmModal.type === 'delete' ? 'Delete Chat' : 'Clear Messages'}
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
            )}

            {/* Messages Area */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 sm:px-6 py-2 sm:py-6 space-y-4 sm:space-y-8 scroll-smooth no-scrollbar">
                {/* Empty State */}
                {messages.length === 0 && !isLoading && (
                    <div className="flex flex-col items-center justify-center h-full text-center space-y-4 sm:space-y-8 animate-in fade-in duration-700">
                        <div className="space-y-2 sm:space-y-4">
                            <div className={cn(
                                "w-12 h-12 sm:w-20 sm:h-20 mx-auto rounded-xl sm:rounded-2xl flex items-center justify-center border shadow-xl sm:shadow-2xl transition-all duration-500 singularity-float",
                                isAgent
                                    ? "bg-gradient-to-br from-cyan-100 to-blue-100 dark:from-cyan-600/20 dark:to-blue-600/20 border-cyan-200 dark:border-cyan-500/20 shadow-cyan-500/15"
                                    : "bg-gradient-to-br from-violet-100 to-indigo-100 dark:from-violet-600/20 dark:to-indigo-600/20 border-violet-200 dark:border-violet-500/20 shadow-violet-500/15"
                            )}>
                                {isAgent
                                    ? <Bot className="w-6 h-6 sm:w-10 sm:h-10 text-cyan-500 dark:text-cyan-400" />
                                    : <Sparkles className="w-6 h-6 sm:w-10 sm:h-10 text-violet-500 dark:text-violet-400" />
                                }
                            </div>
                            <div>
                                <h2 className={cn(
                                    "text-lg sm:text-2xl font-bold bg-clip-text text-transparent singularity-shimmer",
                                    isAgent
                                        ? "bg-gradient-to-r from-cyan-600 via-blue-500 to-cyan-600 dark:from-cyan-300 via-blue-300 dark:to-cyan-300"
                                        : "bg-gradient-to-r from-violet-600 via-indigo-500 to-violet-600 dark:from-violet-300 via-indigo-300 dark:to-violet-300"
                                )}>
                                    {isAgent ? "What would you like me to do?" : "How can I help you today?"}
                                </h2>
                                <p className="text-[11px] sm:text-sm text-muted-foreground/70 mt-1 sm:mt-2 max-w-md px-2 sm:px-0">
                                    {isAgent
                                        ? "I can manage your projects, clients, team, and finances."
                                        : "Strategy, coding, writing, analysis — ask anything."
                                    }
                                </p>
                            </div>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-2.5 w-full max-w-lg">
                            {suggestions.map((s, i) => (
                                <button key={i} onClick={() => handleSend(s)} className={cn(
                                    "group text-left p-3 sm:p-3.5 rounded-xl border bg-card/50 transition-all duration-200 text-xs sm:text-sm text-muted-foreground hover:text-foreground hover:scale-[1.02] active:scale-[0.98]",
                                    isAgent
                                        ? "border-border/30 hover:bg-cyan-500/5 hover:border-cyan-500/30 hover:shadow-sm hover:shadow-cyan-500/5"
                                        : "border-border/30 hover:bg-violet-500/5 hover:border-violet-500/30 hover:shadow-sm hover:shadow-violet-500/5"
                                )}>
                                    <span className="line-clamp-1 sm:line-clamp-2">{s}</span>
                                    <ArrowRight className={cn(
                                        "w-3.5 h-3.5 mt-1.5 opacity-0 group-hover:opacity-100 transition-all duration-200 -translate-x-1 group-hover:translate-x-0 hidden sm:block",
                                        isAgent ? "text-cyan-500 dark:text-cyan-400" : "text-violet-500 dark:text-violet-400"
                                    )} />
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* Messages */}
                {messages.map((msg) => (
                    <div key={msg.id} className={cn("flex gap-2 sm:gap-3 singularity-msg-enter", msg.role === 'user' ? 'flex-row-reverse' : 'flex-row')}>
                        {/* Avatar */}
                        <div className={cn(
                            "w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center shrink-0 shadow-sm mt-1 transition-all duration-300",
                            msg.role === 'user'
                                ? 'bg-primary/15 text-primary border border-primary/20'
                                : isAgent
                                    ? 'bg-gradient-to-br from-cyan-600 to-blue-600 text-white singularity-avatar-glow'
                                    : 'bg-gradient-to-br from-violet-600 to-indigo-600 text-white singularity-avatar-glow'
                        )}
                            style={msg.role !== 'user' ? { '--glow-color': isAgent ? 'rgba(6, 182, 212, 0.3)' : 'rgba(139, 92, 246, 0.3)' } as React.CSSProperties : {}}
                        >
                            {msg.role === 'user'
                                ? <User className="w-4 h-4" />
                                : isAgent
                                    ? <Bot className={cn("w-4 h-4", msg.isStreaming && "animate-pulse")} />
                                    : <Sparkles className={cn("w-4 h-4", msg.isStreaming && "animate-spin")} style={msg.isStreaming ? { animationDuration: '3s' } : {}} />
                            }
                        </div>

                        <div className={cn("max-w-[85%] sm:max-w-[80%] space-y-2", msg.role === 'user' ? 'items-end' : 'items-start')}>
                            {/* User Images */}
                            {msg.images && msg.images.length > 0 && (
                                <div className="flex gap-2 flex-wrap">
                                    {msg.images.map((img, i) => (
                                        <img key={i} src={img} alt="Uploaded" className="w-24 h-24 object-cover rounded-xl border border-border/30 shadow-sm" />
                                    ))}
                                </div>
                            )}

                            {/* Thinking Section (Chat mode only) */}
                            {msg.role === 'model' && !isAgent && (msg.thinking || (msg.isStreaming && streamingPhase === 'thinking')) && (
                                <>
                                    <button onClick={() => toggleThinking(msg.id)} className="flex items-center gap-1.5 text-xs text-violet-500/70 hover:text-violet-600 dark:text-violet-400/70 dark:hover:text-violet-400 transition-colors">
                                        <Brain className={cn("w-3.5 h-3.5", msg.isStreaming && streamingPhase === 'thinking' && "animate-pulse")} />
                                        <span>{msg.isStreaming && streamingPhase === 'thinking' ? 'Thinking...' : 'Thinking'}</span>
                                        {expandedThinking.has(msg.id) ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                                    </button>

                                    <div className={cn(
                                        "overflow-hidden transition-all duration-300 ease-in-out",
                                        expandedThinking.has(msg.id) ? "max-h-[300px] opacity-100" : "max-h-0 opacity-0"
                                    )}>
                                        {msg.thinking && (
                                            <div
                                                className="rounded-xl p-3.5 text-xs leading-relaxed font-mono whitespace-pre-wrap overflow-y-auto max-h-[280px] no-scrollbar"
                                                style={{
                                                    background: 'var(--card)',
                                                    color: 'var(--muted-foreground)',
                                                    border: '1px solid var(--border)',
                                                }}
                                            >
                                                {msg.thinking}
                                                {msg.isStreaming && streamingPhase === 'thinking' && (
                                                    <span className="inline-block w-1.5 h-3.5 ml-0.5 animate-pulse rounded-sm" style={{ background: 'var(--primary)' }} />
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </>
                            )}

                            {/* Tool Actions (Agent mode only) */}
                            {msg.role === 'model' && msg.toolActions && msg.toolActions.length > 0 && (
                                <div className="rounded-xl border border-border/30 bg-card/50 overflow-hidden">
                                    <div className="flex items-center gap-2 px-3 py-2 border-b border-border/20 bg-muted/30">
                                        <Wrench className="w-3 h-3 text-muted-foreground" />
                                        <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Actions</span>
                                        <span className="text-[10px] text-muted-foreground/60 bg-muted/60 px-1.5 py-0.5 rounded-full">{msg.toolActions.length}</span>
                                    </div>
                                    <div className="p-1.5 space-y-1 singularity-stagger">
                                        {msg.toolActions.map((ta, i) => (
                                            <div key={`${ta.name}-${i}`} className={cn(
                                                "flex items-start gap-2.5 px-3 py-2 rounded-lg text-xs transition-all duration-300 singularity-msg-enter",
                                                ta.status === 'calling'
                                                    ? "bg-cyan-500/5 border border-cyan-500/15 singularity-calling-pulse"
                                                    : ta.success
                                                        ? "bg-emerald-500/5"
                                                        : "bg-red-500/5"
                                            )}>
                                                <div className={cn(
                                                    "w-5 h-5 rounded-md flex items-center justify-center shrink-0 mt-0.5",
                                                    ta.status === 'calling'
                                                        ? "bg-cyan-500/10 text-cyan-500"
                                                        : ta.success
                                                            ? "bg-emerald-500/10 text-emerald-500"
                                                            : "bg-red-500/10 text-red-500"
                                                )}>
                                                    {ta.status === 'calling' ? (
                                                        <Loader2 className="w-3 h-3 animate-spin" />
                                                    ) : ta.success ? (
                                                        <CheckCircle2 className="w-3 h-3" />
                                                    ) : (
                                                        <AlertCircle className="w-3 h-3" />
                                                    )}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <span className="font-medium text-foreground">
                                                        {ta.status === 'calling' ? `${ta.displayName}...` : ta.displayName}
                                                    </span>
                                                    {ta.summary && ta.status !== 'calling' && (
                                                        <p className="text-muted-foreground/70 mt-0.5 text-[11px] leading-relaxed">{ta.summary}</p>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    {/* Undo Checkpoint button — integrated in action group footer */}
                                    {!msg.isStreaming && (() => {
                                        const msgIndex = messages.indexOf(msg);
                                        const cp = checkpoints.find(c => c.messageIndex >= msgIndex - 1 && c.messageIndex <= msgIndex + 2);
                                        if (!cp) return null;
                                        return (
                                            <div className="px-1.5 pb-1.5">
                                                <button
                                                    onClick={() => handleUndo(cp.id)}
                                                    disabled={undoingCheckpoint === cp.id}
                                                    className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium bg-amber-500/8 text-amber-600 dark:text-amber-400 border border-amber-500/15 hover:bg-amber-500/15 transition-all duration-200"
                                                >
                                                    {undoingCheckpoint === cp.id
                                                        ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                                        : <Undo2 className="w-3.5 h-3.5" />
                                                    }
                                                    <span>Undo these actions</span>
                                                </button>
                                            </div>
                                        );
                                    })()}
                                </div>
                            )}

                            {/* Response Bubble */}
                            {(msg.content || msg.role === 'user') && (
                                <div className={cn(
                                    "relative group rounded-2xl p-3 sm:p-4 text-sm leading-relaxed shadow-sm transition-all duration-300",
                                    msg.role === 'user'
                                        ? 'bg-gradient-to-br from-primary to-primary/90 text-primary-foreground rounded-br-sm'
                                        : isAgent
                                            ? 'bg-card border-l-2 border-l-cyan-500/40 border border-border/20 text-foreground rounded-bl-sm'
                                            : 'bg-card border-l-2 border-l-violet-500/40 border border-border/20 text-foreground rounded-bl-sm'
                                )}>
                                    {msg.role === 'model' ? (
                                        <div
                                            className="prose-sm singularity-response"
                                            dangerouslySetInnerHTML={{ __html: renderMarkdown(msg.content) }}
                                        />
                                    ) : (
                                        <div className="whitespace-pre-wrap">{msg.content}</div>
                                    )}
                                    {msg.isStreaming && streamingPhase === 'responding' && (
                                        <span className="inline-block w-1.5 h-4 bg-foreground/40 ml-0.5 animate-pulse rounded-sm" />
                                    )}

                                    {msg.role === 'model' && !msg.isStreaming && msg.content && (
                                        <div className="absolute -bottom-8 right-0 opacity-0 group-hover:opacity-100 transition-all duration-200">
                                            <button onClick={() => copyToClipboard(msg.content, msg.id)} className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground bg-card border border-border/40 rounded-lg px-2.5 py-1 transition-colors shadow-sm">
                                                {copiedId === msg.id
                                                    ? <><Check className="w-3 h-3 text-emerald-400" /> Copied</>
                                                    : <><Copy className="w-3 h-3" /> Copy</>
                                                }
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Streaming placeholder */}
                            {msg.role === 'model' && !msg.content && msg.isStreaming && (
                                !isAgent ? (
                                    streamingPhase === 'thinking' && (
                                        <div className="flex items-center gap-2 pl-1">
                                            <div className="flex gap-1 text-violet-400">
                                                <span className="singularity-typing-dot" />
                                                <span className="singularity-typing-dot" />
                                                <span className="singularity-typing-dot" />
                                            </div>
                                            <span className="text-xs text-muted-foreground/50">Thinking...</span>
                                        </div>
                                    )
                                ) : (
                                    !msg.toolActions?.length && (
                                        <div className="flex items-center gap-2 pl-1">
                                            <div className="flex gap-1 text-cyan-400">
                                                <span className="singularity-typing-dot" />
                                                <span className="singularity-typing-dot" />
                                                <span className="singularity-typing-dot" />
                                            </div>
                                            <span className="text-xs text-muted-foreground/50">Processing...</span>
                                        </div>
                                    )
                                )
                            )}
                        </div>
                    </div>
                ))}
            </div>

            {/* Input Area */}
            <div className="px-3 sm:px-6 pb-4 sm:pb-5 pt-2 sm:pt-3">
                {/* Attachment Previews */}
                {attachments.length > 0 && (
                    <div className="flex gap-2.5 mb-3 px-1 animate-in slide-in-from-bottom-2 duration-200">
                        {attachments.map(att => (
                            <div key={att.id} className="relative group">
                                {att.fileType === 'image' ? (
                                    <img src={att.preview} alt="Attachment" className="w-[72px] h-[72px] object-cover rounded-xl border border-border/30 shadow-sm" />
                                ) : (
                                    <div className="w-[72px] h-[72px] rounded-xl border border-border/30 shadow-sm bg-muted/30 flex flex-col items-center justify-center gap-1.5">
                                        <FileText className="w-5 h-5 text-cyan-500" />
                                        <span className="text-[9px] font-medium text-muted-foreground/70 text-center leading-tight px-1 truncate w-full">{att.fileName?.split('.').pop()?.toUpperCase()}</span>
                                    </div>
                                )}
                                <button onClick={() => removeAttachment(att.id)} className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-200 shadow-sm hover:scale-110">
                                    <X className="w-3 h-3" />
                                </button>
                            </div>
                        ))}
                    </div>
                )}

                {/* Gradient separator line */}
                <div className="h-px mb-3 bg-gradient-to-r from-transparent via-border/40 to-transparent" />

                <div className={cn(
                    "relative flex items-end gap-1.5 sm:gap-2 bg-card border p-2 sm:p-2.5 rounded-2xl transition-all duration-300",
                    isAgent
                        ? "border-border/40 focus-within:border-cyan-500/40 focus-within:shadow-[0_0_24px_rgba(6,182,212,0.08)] dark:focus-within:shadow-[0_0_24px_rgba(6,182,212,0.15)]"
                        : "border-border/40 focus-within:border-violet-500/40 focus-within:shadow-[0_0_24px_rgba(139,92,246,0.08)] dark:focus-within:shadow-[0_0_24px_rgba(139,92,246,0.15)]"
                )}>
                    {/* File Upload Button */}
                    <>
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            disabled={isLoading || attachments.length >= 4}
                            className={cn(
                                "h-9 w-9 sm:h-10 sm:w-10 flex items-center justify-center rounded-xl text-muted-foreground/50 disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-200 mb-0.5 shrink-0",
                                isAgent
                                    ? "hover:text-cyan-500 dark:hover:text-cyan-400 hover:bg-cyan-500/10"
                                    : "hover:text-violet-500 dark:hover:text-violet-400 hover:bg-violet-500/10"
                            )}
                            title={isAgent ? "Attach file (PDF, TXT, images...)" : "Attach image"}
                        >
                            {isAgent ? <Paperclip className="w-5 h-5" /> : <ImageIcon className="w-5 h-5" />}
                        </button>
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept={isAgent ? "image/*,.pdf,.txt,.md,.csv,.json,.html,.doc,.docx,.prd" : "image/*"}
                            multiple
                            className="hidden"
                            onChange={(e) => { handleFileSelect(e.target.files); e.target.value = ''; }}
                        />
                    </>

                    <textarea
                        ref={inputRef}
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder={
                            isAgent
                                ? "Ask about your agency or tell me what to do..."
                                : attachments.length > 0
                                    ? "Describe what you'd like to know about the image..."
                                    : "Message Singularity..."
                        }
                        className="flex-1 max-h-40 min-h-[40px] sm:min-h-[44px] bg-transparent border-none focus:ring-0 focus:outline-none resize-none py-2 sm:py-2.5 px-1 text-sm placeholder:text-muted-foreground/35"
                        rows={1}
                        disabled={isLoading}
                    />
                    <button
                        onClick={() => handleSend()}
                        disabled={(!inputValue.trim() && attachments.length === 0) || isLoading}
                        className={cn(
                            "h-9 w-9 flex items-center justify-center rounded-xl transition-all duration-200 mb-0.5 shrink-0",
                            (inputValue.trim() || attachments.length > 0) && !isLoading
                                ? isAgent
                                    ? "bg-gradient-to-br from-cyan-600 to-blue-600 text-white shadow-md shadow-cyan-500/25 hover:shadow-lg hover:shadow-cyan-500/40 hover:scale-105 active:scale-95"
                                    : "bg-gradient-to-br from-violet-600 to-indigo-600 text-white shadow-md shadow-violet-500/25 hover:shadow-lg hover:shadow-violet-500/40 hover:scale-105 active:scale-95"
                                : "bg-muted/60 text-muted-foreground/25 cursor-not-allowed"
                        )}
                    >
                        <ArrowRight className="w-4 h-4" />
                    </button>
                </div>
                <p className="text-center text-[10px] text-muted-foreground/50 mt-2 sm:mt-2.5 hidden sm:block">
                    {isAgent
                        ? "Agent mode can read your agency data and perform actions on your behalf."
                        : "Singularity can analyze images and answer questions. Drag & drop or click 📷 to attach."
                    }
                </p>
            </div >

            {/* Custom styles for markdown rendering */}
            < style jsx global > {`
                .singularity-response li { margin: 2px 0; }
                .singularity-response pre { margin: 8px 0; }
                .singularity-response h1, .singularity-response h2, .singularity-response h3 { margin-top: 12px; }

                /* Floating animation for empty state icon */
                @keyframes singularity-float {
                    0%, 100% { transform: translateY(0px); }
                    50% { transform: translateY(-8px); }
                }
                .singularity-float { animation: singularity-float 3s ease-in-out infinite; }

                /* Gradient shimmer effect */
                @keyframes singularity-shimmer {
                    0% { background-position: -200% center; }
                    100% { background-position: 200% center; }
                }
                .singularity-shimmer {
                    background-size: 200% auto;
                    animation: singularity-shimmer 4s linear infinite;
                }

                /* Pulsing status dot */
                @keyframes singularity-dot-pulse {
                    0%, 100% { box-shadow: 0 0 0 0 currentColor; opacity: 1; }
                    50% { box-shadow: 0 0 0 4px currentColor; opacity: 0.4; }
                }
                .singularity-pulse-dot { animation: singularity-dot-pulse 2s ease-in-out infinite; }

                /* Bouncing dots for typing indicator */
                @keyframes singularity-bounce {
                    0%, 80%, 100% { transform: scale(0.6); opacity: 0.4; }
                    40% { transform: scale(1); opacity: 1; }
                }
                .singularity-typing-dot {
                    display: inline-block;
                    width: 6px; height: 6px;
                    border-radius: 50%;
                    background: currentColor;
                    animation: singularity-bounce 1.4s infinite ease-in-out both;
                }
                .singularity-typing-dot:nth-child(1) { animation-delay: -0.32s; }
                .singularity-typing-dot:nth-child(2) { animation-delay: -0.16s; }
                .singularity-typing-dot:nth-child(3) { animation-delay: 0s; }

                /* Slide up animation for messages and cards */
                @keyframes singularity-slide-up {
                    from { opacity: 0; transform: translateY(12px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .singularity-msg-enter { animation: singularity-slide-up 0.3s ease-out both; }

                /* Stagger for tool cards */
                .singularity-stagger > *:nth-child(1) { animation-delay: 0ms; }
                .singularity-stagger > *:nth-child(2) { animation-delay: 60ms; }
                .singularity-stagger > *:nth-child(3) { animation-delay: 120ms; }
                .singularity-stagger > *:nth-child(4) { animation-delay: 180ms; }
                .singularity-stagger > *:nth-child(5) { animation-delay: 240ms; }

                /* Glow ring for AI avatar */
                .singularity-avatar-glow {
                    box-shadow: 0 0 12px -2px var(--glow-color, rgba(139, 92, 246, 0.3));
                }

                /* Smooth pulse for calling state border */
                @keyframes singularity-border-pulse {
                    0%, 100% { border-color: rgba(6, 182, 212, 0.2); }
                    50% { border-color: rgba(6, 182, 212, 0.5); }
                }
                .singularity-calling-pulse { animation: singularity-border-pulse 1.5s ease-in-out infinite; }
            `}</style >
        </div >
    );
}

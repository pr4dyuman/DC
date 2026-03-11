"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import {
    Sparkles, User, ChevronDown, ChevronRight,
    Brain, Copy, Check, Trash2, ArrowRight, Image as ImageIcon, X,
    Bot, MessageSquare, Wrench, CheckCircle2, AlertCircle, Loader2,
    Paperclip, FileText, FileSpreadsheet, FileCode,
    Plus, Clock, Undo2, History, AlertTriangle, Menu, Send,
    Home, LayoutDashboard, FolderKanban, Mail, Users, DollarSign, UserCircle, Settings
} from "lucide-react";
import Link from "next/link";
import DOMPurify from "dompurify";
import { cn } from "@/lib/utils";
import { verifyAgentPassword } from "@/lib/actions";

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
    { emoji: "\u270F\uFE0F", label: "Write anything" },
    { emoji: "\uD83D\uDCE7", label: "Draft an email" },
    { emoji: "\uD83D\uDCA1", label: "Brainstorm ideas" },
    { emoji: "\uD83D\uDCCB", label: "Plan a sprint" },
    { emoji: "\uD83D\uDD0D", label: "Research a topic" },
];

const AGENT_SUGGESTIONS = [
    { emoji: "\uD83C\uDFAF", label: "Create a project" },
    { emoji: "\uD83D\uDCCA", label: "Finance summary" },
    { emoji: "\uD83D\uDC65", label: "Team workload" },
    { emoji: "\uD83D\uDCCB", label: "List projects" },
    { emoji: "\u2705", label: "Add a client" },
];

// Seed histories for suggestion pills so AI gets context on first click
const SUGGESTION_SEED_HISTORY: Record<string, { role: 'user' | 'model'; content: string }[]> = {
    // Chat mode
    "Write anything": [
        { role: "user", content: "Hi, I need help writing something." },
        { role: "model", content: "Sure! What would you like me to help you write? I can draft emails, reports, proposals, social media posts, or anything else you need." },
    ],
    "Draft an email": [
        { role: "user", content: "I need to draft a professional email." },
        { role: "model", content: "I'd be happy to help draft an email. Who is it for, and what's the main purpose or message you'd like to convey?" },
    ],
    "Brainstorm ideas": [
        { role: "user", content: "I want to brainstorm some ideas." },
        { role: "model", content: "Let's brainstorm! What topic or area are you looking for ideas in? Marketing, product features, content, business strategies?" },
    ],
    "Plan a sprint": [
        { role: "user", content: "Help me plan a sprint for my team." },
        { role: "model", content: "Let's plan your sprint. How long is the sprint, and what are the key goals or features you want to deliver?" },
    ],
    "Research a topic": [
        { role: "user", content: "I need to research a topic." },
        { role: "model", content: "I can help with research. What topic would you like me to look into? I'll provide a comprehensive overview." },
    ],
    // Agent mode
    "Create a project": [
        { role: "user", content: "I want to create a new project." },
        { role: "model", content: "I can help set up a new project. What's the project name, and do you have details like the client, deadline, or budget in mind?" },
    ],
    "Finance summary": [
        { role: "user", content: "Show me a summary of the finances." },
        { role: "model", content: "I'll pull up the financial overview for you. Let me check the latest invoices, payments, and revenue data." },
    ],
    "Team workload": [
        { role: "user", content: "How is the team workload looking?" },
        { role: "model", content: "Let me check the current task distribution and workload across your team members." },
    ],
    "List projects": [
        { role: "user", content: "Can you list all the current projects?" },
        { role: "model", content: "Sure, let me fetch all your active projects with their status and details." },
    ],
    "Add a client": [
        { role: "user", content: "I need to add a new client." },
        { role: "model", content: "I can add a new client for you. What's the client's name, email, and company? I'll also need a phone number if available." },
    ],
};

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

export function SingularityChat({ userId }: { userId?: string }) {
    const [messages, setMessages] = useState<Message[]>([]);
    const [inputValue, setInputValue] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [expandedThinking, setExpandedThinking] = useState<Set<string>>(new Set());
    const [copiedId, setCopiedId] = useState<string | null>(null);
    const [streamingPhase, setStreamingPhase] = useState<'idle' | 'thinking' | 'responding' | 'rechecking'>('idle');
    const [attachments, setAttachments] = useState<Attachment[]>([]);
    const [isDragOver, setIsDragOver] = useState(false);
    const [mode, setMode] = useState<'chat' | 'agent'>('agent');

    // Session & History state
    const [sessionId, setSessionId] = useState<string | null>(null);
    const [sessions, setSessions] = useState<ChatSessionSummary[]>([]);
    const [showHistory, setShowHistory] = useState(false);
    const [checkpoints, setCheckpoints] = useState<CheckpointInfo[]>([]);
    const [rollbackModal, setRollbackModal] = useState<{ analysis: RollbackAnalysis; loading: boolean } | null>(null);
    const [undoConfirmModal, setUndoConfirmModal] = useState<{ checkpointId: string; label: string; totalActions: number } | null>(null);
    const [deleteConfirmModal, setDeleteConfirmModal] = useState<{ type: 'clear' | 'delete'; sessionId?: string; sessionTitle?: string; hasAgentMessages: boolean; password: string; passwordError: string; verifying: boolean } | null>(null);
    const [showNavMenu, setShowNavMenu] = useState(false);
    const [showModeDropdown, setShowModeDropdown] = useState(false);
    const [undoingCheckpoint, setUndoingCheckpoint] = useState<string | null>(null);

    const pendingRollbackRef = useRef<any[]>([]); // Accumulates rollback data during a single agent response

    const scrollRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLTextAreaElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    // Refs to track latest values inside event handlers (avoids stale closures)
    const messagesRef = useRef<Message[]>(messages);
    const sessionIdRef = useRef<string | null>(sessionId);
    const userIdRef = useRef<string | undefined>(userId);
    useEffect(() => { messagesRef.current = messages; }, [messages]);
    useEffect(() => { sessionIdRef.current = sessionId; }, [sessionId]);
    useEffect(() => { userIdRef.current = userId; }, [userId]);

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
            setDeleteConfirmModal({ type: 'clear', hasAgentMessages: hasAgentActions, password: '', passwordError: '', verifying: false });
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
        if (userId) {
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
        setSessionId(null);
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
            password: '',
            passwordError: '',
            verifying: false,
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

    // Save messages to DB — works both as regular fetch and via sendBeacon
    const buildSavePayload = (msgs: Message[], sid: string) => {
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
        if (persistable.length === 0) return null;
        const firstUser = persistable.find(m => m.role === 'user');
        const title = firstUser ? firstUser.content.slice(0, 60) : undefined;
        return JSON.stringify({ sessionId: sid, messages: persistable, title });
    };

    const saveMessages = useCallback(async (msgs: Message[], sid: string | null) => {
        if (!sid || !userId) return;
        const payload = buildSavePayload(msgs, sid);
        if (!payload) return;
        try {
            const res = await fetch('/api/singularity/history', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: payload,
            });
            if (!res.ok) {
                console.error('[Singularity Save] Server error:', res.status);
            }
        } catch (err) {
            console.error('[Singularity Save] Network error:', err);
        }
    }, [userId]);

    // Trigger save immediately when streaming finishes (no debounce)
    useEffect(() => {
        const anyStreaming = messages.some(m => m.isStreaming);
        if (!anyStreaming && messages.length > 0 && sessionId) {
            if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
            saveMessages(messages, sessionId);
            // Refresh session list shortly after (non-blocking)
            saveTimeoutRef.current = setTimeout(fetchSessions, 800);
        }
        return () => { if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current); };
    }, [messages, sessionId]);

    // ---- Emergency save on navigation / tab-close ----
    // Uses sendBeacon (fire-and-forget, survives page unload)
    useEffect(() => {
        const emergencySave = () => {
            const sid = sessionIdRef.current;
            const uid = userIdRef.current;
            const msgs = messagesRef.current;
            if (!sid || !uid || msgs.length === 0) return;
            const payload = buildSavePayload(msgs, sid);
            if (!payload) return;
            navigator.sendBeacon(
                '/api/singularity/history',
                new Blob([payload], { type: 'application/json' })
            );
        };

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
                // No conflicts-- show confirmation modal
                setUndoConfirmModal({
                    checkpointId,
                    label: analysis.label || 'these actions',
                    totalActions: analysis.totalActions,
                });
            } else {
                // Has conflicts-- show conflict modal
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

    // File handling-- images AND documents
    const ACCEPTED_DOCS = ['application/pdf', 'text/plain', 'text/markdown', 'text/csv', 'application/json', 'text/html'];
    const DOC_EXTENSIONS = ['.pdf', '.txt', '.md', '.csv', '.json', '.html', '.prd', '.doc', '.docx'];

    const processFile = async (file: File): Promise<Attachment | null> => {
        // Image files-- same as before
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

        // Document files-- extract text
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

        const userMsg: Message = {
            id: `user-${Date.now()}`,
            role: 'user',
            content: msg,
            images: currentAttachments.map(a => a.preview),
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

        // Hoisted above try so finally block can access them for sendBeacon save
        let accumContent = '';
        let accumThinking = '';

        try {
            let history = messages
                .filter(m => !m.isStreaming)
                .map(m => ({ role: m.role, content: m.content }));

            // Inject seed history when clicking a suggestion on empty chat
            if (history.length === 0 && overrideMessage && SUGGESTION_SEED_HISTORY[overrideMessage]) {
                history = SUGGESTION_SEED_HISTORY[overrideMessage];
            }

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
                                accumThinking += data.text;
                                setStreamingPhase('thinking');
                                setMessages(prev => prev.map(m =>
                                    m.id === msgId ? { ...m, thinking: (m.thinking || '') + data.text } : m
                                ));
                            } else if (data.type === 'response') {
                                accumContent += data.text;
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
                                accumContent += data.text;
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
                saveCheckpoint(actions, label);
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

    return (
        <div
            className="flex flex-col h-[100dvh] relative bg-white dark:bg-black"
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
        >
            {/* Drag Overlay */}
            {isDragOver && (
                <div className="absolute inset-0 z-50 bg-white/80 dark:bg-white/5 backdrop-blur-sm border-2 border-dashed border-neutral-400 dark:border-neutral-600 rounded-xl flex items-center justify-center">
                    <div className="text-center space-y-2">
                        <ImageIcon className="w-12 h-12 text-neutral-400 mx-auto" />
                        <p className="text-neutral-600 dark:text-neutral-300 font-medium">Drop files here</p>
                    </div>
                </div>
            )}

            {/* Full-width Header-- icons at viewport corners */}
            <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 z-30">
                {/* Left corner-- Hamburger */}
                <button
                    onClick={() => { setShowNavMenu(!showNavMenu); setShowHistory(false); }}
                    className="relative z-[60] p-2 rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-900 transition-colors"
                    title="Menu"
                >
                    <Menu className="w-5 h-5 text-neutral-500 dark:text-neutral-400" />
                </button>

                {/* Center - Title only */}
                <h1 className="text-base sm:text-lg font-medium text-neutral-800 dark:text-neutral-200 tracking-tight">
                    Singularity
                </h1>















                {/* Right corner-- New Chat + History */}
                <div className="flex items-center gap-1">
                    <button
                        onClick={newChat}
                        className="p-2 rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-900 transition-colors"
                        title="New Chat"
                    >
                        <Plus className="w-5 h-5 text-neutral-500 dark:text-neutral-400" />
                    </button>
                    <button
                        onClick={() => { setShowHistory(!showHistory); setShowNavMenu(false); fetchSessions(); }}
                        className="relative z-[60] p-2 rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-900 transition-colors"
                        title="Chat History"
                    >
                        <History className="w-5 h-5 text-neutral-500 dark:text-neutral-400" />
                    </button>
                </div>
            </div>


            {/* ••• Navigation Menu — Left Side ••• */}
            {/* Backdrop */}
            <div
                className={cn(
                    "fixed inset-0 z-40 bg-black/40 backdrop-blur-sm transition-all duration-300",
                    showNavMenu ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
                )}
                onClick={() => setShowNavMenu(false)}
            />
            {/* Panel */}
            <div className={cn(
                "fixed top-0 left-0 w-72 sm:w-80 h-full z-50 bg-white dark:bg-neutral-950 border-r border-neutral-200 dark:border-neutral-800 shadow-2xl flex flex-col transition-transform duration-300 ease-in-out",
                showNavMenu ? "translate-x-0" : "-translate-x-full"
            )}>
                {/* Brand header */}
                <div className="flex items-center px-5 py-4 border-b border-neutral-200 dark:border-neutral-800">
                    <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-cyan-500 flex items-center justify-center">
                            <Sparkles className="w-4 h-4 text-white" />
                        </div>
                        <span className="text-sm font-semibold text-neutral-800 dark:text-neutral-200">AgencyOS</span>
                    </div>
                </div>

                {/* Nav items */}
                <nav className="flex-1 overflow-y-auto no-scrollbar py-3 px-3">
                    <div className="space-y-0.5">
                        {[
                            { icon: LayoutDashboard, label: "Dashboard", href: "/dashboard" },
                            { icon: FolderKanban, label: "Projects", href: "/dashboard/projects" },
                            { icon: Sparkles, label: "Singularity", href: "/dashboard/singularity", active: true },
                        ].map((item) => (
                            <Link
                                key={item.label}
                                href={item.href}
                                onClick={() => setShowNavMenu(false)}
                                className={cn(
                                    "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all duration-200",
                                    item.active
                                        ? "bg-neutral-100 dark:bg-neutral-800/80 text-neutral-900 dark:text-white font-medium"
                                        : "text-neutral-600 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-900 hover:text-neutral-900 dark:hover:text-neutral-200"
                                )}
                            >
                                <item.icon className="w-[18px] h-[18px]" />
                                <span>{item.label}</span>
                            </Link>
                        ))}
                    </div>

                    <div className="my-3 border-t border-neutral-200 dark:border-neutral-800" />

                    <div className="space-y-0.5">
                        {[
                            { icon: Mail, label: "Messages", href: "/dashboard/messages" },
                            { icon: Users, label: "Team", href: "/dashboard/team" },
                            { icon: DollarSign, label: "Finance", href: "/dashboard/finance" },
                            { icon: UserCircle, label: "Clients", href: "/dashboard/clients" },
                        ].map((item) => (
                            <Link
                                key={item.label}
                                href={item.href}
                                onClick={() => setShowNavMenu(false)}
                                className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-neutral-600 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-900 hover:text-neutral-900 dark:hover:text-neutral-200 transition-all duration-200"
                            >
                                <item.icon className="w-[18px] h-[18px]" />
                                <span>{item.label}</span>
                            </Link>
                        ))}
                    </div>

                    <div className="my-3 border-t border-neutral-200 dark:border-neutral-800" />

                    <Link
                        href="/dashboard/settings"
                        onClick={() => setShowNavMenu(false)}
                        className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-neutral-600 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-900 hover:text-neutral-900 dark:hover:text-neutral-200 transition-all duration-200"
                    >
                        <Settings className="w-[18px] h-[18px]" />
                        <span>Settings</span>
                    </Link>
                </nav>
            </div>



            {/* History Sidebar -- Right Side */}
            {/* Backdrop */}
            <div
                className={cn(
                    "fixed inset-0 z-40 bg-black/40 backdrop-blur-sm transition-all duration-300",
                    showHistory ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
                )}
                onClick={() => setShowHistory(false)}
            />
            {/* Panel */}
            <div className={cn(
                "fixed top-0 right-0 w-72 sm:w-80 h-full z-50 bg-white dark:bg-neutral-950 border-l border-neutral-200 dark:border-neutral-800 shadow-2xl flex flex-col transition-transform duration-300 ease-in-out",
                showHistory ? "translate-x-0" : "translate-x-full"
            )}>
                {/* Header */}
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
                                                <div className="flex-1 min-w-0" onClick={() => loadSession(s.id)}>
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
                                                </div>
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); requestDeleteSession(s.id); }}
                                                    className="opacity-0 group-hover:opacity-100 p-1 hover:bg-destructive/10 rounded-lg transition-all mt-0.5"
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


            {/* Conflict Resolution Modal */}
            {
                rollbackModal && (
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
                                            <span className="text-muted-foreground">-- {ca.conflict.reason}</span>
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
                )
            }

            {/* Undo Confirmation Modal */}
            {
                undoConfirmModal && (
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
                )
            }

            {/* Delete / Clear Chat Warning Modal */}
            {
                deleteConfirmModal && (
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

            {/* Gemini-style Layout */}
            {
                messages.length === 0 && !isLoading ? (
                    /* EMPTY STATE: Centered greeting + input + pills */
                    <div className="flex-1 flex flex-col items-center justify-center px-4 sm:px-6">
                        <div className="w-full max-w-3xl space-y-6 sm:space-y-8 animate-in fade-in duration-700">
                            {/* Greeting */}
                            <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                    <Sparkles className="w-5 h-5 sm:w-6 sm:h-6 text-blue-500" />
                                    <span className="text-lg sm:text-xl font-medium text-neutral-800 dark:text-neutral-200">
                                        Hi there
                                    </span>
                                </div>
                                <h2 className="text-2xl sm:text-4xl font-normal text-neutral-400 dark:text-neutral-500 tracking-tight">
                                    Where should we start?
                                </h2>
                            </div>

                            {/* Input Box */}
                            <div className="w-full">
                                {/* Attachment Previews */}
                                {attachments.length > 0 && (
                                    <div className="flex gap-2.5 mb-3 px-1 animate-in slide-in-from-bottom-2 duration-200">
                                        {attachments.map(att => (
                                            <div key={att.id} className="relative group">
                                                {att.fileType === 'image' ? (
                                                    <img src={att.preview} alt="Attachment" className="w-16 h-16 object-cover rounded-xl border border-neutral-200 dark:border-neutral-700" />
                                                ) : (
                                                    <div className="w-16 h-16 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 flex flex-col items-center justify-center gap-1">
                                                        <FileText className="w-5 h-5 text-neutral-500" />
                                                        <span className="text-[9px] font-medium text-neutral-500 text-center leading-tight px-1 truncate w-full">{att.fileName?.split('.').pop()?.toUpperCase()}</span>
                                                    </div>
                                                )}
                                                <button onClick={() => removeAttachment(att.id)} className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-neutral-800 dark:bg-neutral-200 text-white dark:text-black rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-200 shadow-sm">
                                                    <X className="w-3 h-3" />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                                <div className="relative bg-neutral-100 dark:bg-neutral-900 rounded-2xl transition-all duration-300 focus-within:ring-1 focus-within:ring-neutral-300 dark:focus-within:ring-neutral-700">
                                    <textarea
                                        ref={inputRef}
                                        value={inputValue}
                                        onChange={(e) => setInputValue(e.target.value)}
                                        onKeyDown={handleKeyDown}
                                        placeholder={isAgent ? "Ask Singularity Agent..." : "Ask Singularity..."}
                                        className="w-full bg-transparent border-none focus:ring-0 focus:outline-none resize-none py-3.5 sm:py-4 px-4 sm:px-5 text-sm sm:text-base text-neutral-800 dark:text-neutral-200 placeholder:text-neutral-400 dark:placeholder:text-neutral-500 min-h-[48px] max-h-40"
                                        rows={1}
                                        disabled={isLoading}
                                    />
                                    {/* Toolbar row */}
                                    <div className="flex items-center justify-between px-3 sm:px-4 pb-2.5 sm:pb-3">
                                        <div className="flex items-center gap-1">
                                            <button
                                                onClick={() => fileInputRef.current?.click()}
                                                disabled={isLoading || attachments.length >= 4}
                                                className="p-1.5 rounded-full hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-500 dark:text-neutral-400 disabled:opacity-30 transition-colors"
                                                title={isAgent ? "Attach file" : "Attach image"}
                                            >
                                                <Plus className="w-5 h-5" />
                                            </button>
                                            <input
                                                ref={fileInputRef}
                                                type="file"
                                                accept={isAgent ? "image/*,.pdf,.txt,.md,.csv,.json,.html,.doc,.docx,.prd" : "image/*"}
                                                multiple
                                                className="hidden"
                                                onChange={(e) => { handleFileSelect(e.target.files); e.target.value = ''; }}
                                            />
                                        </div>
                                        <div className="flex items-center gap-1.5">
                                            {/* Mode Dropdown */}
                                            <div className="relative">
                                                <button
                                                    onClick={() => setShowModeDropdown(prev => !prev)}
                                                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-medium bg-neutral-200 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-300 dark:hover:bg-neutral-700 transition-all duration-200"
                                                >
                                                    <span>{isAgent ? "Agent" : "Chat"}</span>
                                                    <ChevronDown className={cn("w-3 h-3 transition-transform duration-200", showModeDropdown && "rotate-180")} />
                                                </button>
                                                {showModeDropdown && (
                                                    <>
                                                        <div className="fixed inset-0 z-[70]" onClick={() => setShowModeDropdown(false)} />
                                                        <div className="absolute bottom-full mb-2 right-0 z-[80] w-56 sm:w-64 bg-neutral-900 rounded-2xl shadow-2xl border border-neutral-700/50 overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-150">
                                                            <div className="px-4 pt-3 pb-1">
                                                                <p className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">Singularity</p>
                                                            </div>
                                                            <div className="p-1.5 space-y-0.5">
                                                                <button
                                                                    onClick={() => { handleModeSwitch("chat"); setShowModeDropdown(false); }}
                                                                    className={cn(
                                                                        "w-full flex items-center justify-between px-3 py-2.5 rounded-xl transition-all duration-150 text-left",
                                                                        !isAgent ? "bg-neutral-800" : "hover:bg-neutral-800/60"
                                                                    )}
                                                                >
                                                                    <div>
                                                                        <p className="text-[13px] font-semibold text-white">Chat</p>
                                                                        <p className="text-[11px] text-neutral-400 mt-0.5">General assistant, answers quickly</p>
                                                                    </div>
                                                                    {!isAgent && (
                                                                        <div className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center shrink-0 ml-2">
                                                                            <Check className="w-3 h-3 text-white" />
                                                                        </div>
                                                                    )}
                                                                </button>
                                                                <button
                                                                    onClick={() => { handleModeSwitch("agent"); setShowModeDropdown(false); }}
                                                                    className={cn(
                                                                        "w-full flex items-center justify-between px-3 py-2.5 rounded-xl transition-all duration-150 text-left",
                                                                        isAgent ? "bg-neutral-800" : "hover:bg-neutral-800/60"
                                                                    )}
                                                                >
                                                                    <div>
                                                                        <p className="text-[13px] font-semibold text-white">Agent</p>
                                                                        <p className="text-[11px] text-neutral-400 mt-0.5">Takes actions, manages your workspace</p>
                                                                    </div>
                                                                    {isAgent && (
                                                                        <div className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center shrink-0 ml-2">
                                                                            <Check className="w-3 h-3 text-white" />
                                                                        </div>
                                                                    )}
                                                                </button>
                                                            </div>
                                                        </div>
                                                    </>
                                                )}
                                            </div>
                                            {/* Send */}
                                            <button
                                                onClick={() => handleSend()}
                                                disabled={(!inputValue.trim() && attachments.length === 0) || isLoading}
                                                className={cn(
                                                    "p-1.5 rounded-full transition-all duration-200",
                                                    (inputValue.trim() || attachments.length > 0) && !isLoading
                                                        ? "bg-neutral-800 dark:bg-neutral-200 text-white dark:text-black hover:scale-105 active:scale-95"
                                                        : "text-neutral-300 dark:text-neutral-600 cursor-not-allowed"
                                                )}
                                            >
                                                <Send className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Suggestion Pills */}
                            <div className="flex flex-wrap justify-center gap-2">
                                {suggestions.map((s, i) => (
                                    <button
                                        key={i}
                                        onClick={() => handleSend(s.label)}
                                        className="flex items-center gap-1.5 px-4 py-2 rounded-full text-sm bg-neutral-100 dark:bg-neutral-900 text-neutral-700 dark:text-neutral-300 border border-neutral-200 dark:border-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-800 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
                                    >
                                        <span>{s.emoji}</span>
                                        <span>{s.label}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                ) : (
                    /* CHAT STATE: Messages + bottom input */
                    <>
                        {/* Messages Area */}
                        <div ref={scrollRef} className="flex-1 overflow-y-auto py-4 sm:py-6 scroll-smooth no-scrollbar">
                            <div className="max-w-4xl mx-auto px-4 sm:px-8 space-y-4 sm:space-y-6">
                                {/* Messages */}
                                {messages.map((msg) => (
                                    <div key={msg.id} className={cn("flex gap-2 sm:gap-3 singularity-msg-enter", msg.role === 'user' ? 'flex-row-reverse' : 'flex-row')}>
                                        {/* Avatar */}
                                        <div className={cn(
                                            "w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center shrink-0 shadow-sm mt-1 transition-all duration-300",
                                            msg.role === 'user'
                                                ? 'bg-neutral-200 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-300'
                                                : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 border border-neutral-200 dark:border-neutral-700'
                                        )}>
                                            {msg.role === 'user'
                                                ? <User className="w-4 h-4" />
                                                : isAgent
                                                    ? <Bot className="w-4 h-4" />
                                                    : <Sparkles className="w-4 h-4" />
                                            }
                                        </div>
                                        <div className="flex flex-col gap-1.5 sm:gap-2 max-w-[85%] sm:max-w-[75%] min-w-0">
                                            {/* Thinking Section */}
                                            {msg.role === 'model' && msg.thinking && (
                                                <div className="rounded-xl overflow-hidden border border-neutral-200 dark:border-neutral-700">
                                                    <button
                                                        onClick={() => setExpandedThinking(prev => {
                                                            const next = new Set(prev);
                                                            next.has(msg.id) ? next.delete(msg.id) : next.add(msg.id);
                                                            return next;
                                                        })}
                                                        className="flex items-center gap-2 w-full px-3 py-2 text-xs font-medium text-neutral-500 hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors"
                                                    >
                                                        <Brain className="w-3.5 h-3.5" />
                                                        <span>Thinking</span>
                                                        {expandedThinking.has(msg.id) ? <ChevronDown className="w-3.5 h-3.5 ml-auto" /> : <ChevronRight className="w-3.5 h-3.5 ml-auto" />}
                                                    </button>
                                                    {expandedThinking.has(msg.id) && (
                                                        <div className="px-3 pb-3 text-xs text-neutral-400 dark:text-neutral-500 leading-relaxed border-t border-neutral-200 dark:border-neutral-700 pt-2 max-h-60 overflow-y-auto whitespace-pre-wrap">
                                                            {msg.thinking}
                                                        </div>
                                                    )}
                                                </div>
                                            )}

                                            {/* Image Attachments */}
                                            {msg.images && msg.images.length > 0 && (
                                                <div className="flex gap-2 flex-wrap">
                                                    {msg.images.map((img, i) => (
                                                        <img key={i} src={img} alt="Attached" className="max-w-[200px] max-h-[200px] rounded-xl border border-neutral-200 dark:border-neutral-700 object-cover" />
                                                    ))}
                                                </div>
                                            )}

                                            {/* Tool Actions */}
                                            {msg.role === 'model' && msg.toolActions && msg.toolActions.length > 0 && (
                                                <div className="rounded-xl border border-neutral-200 dark:border-neutral-700 overflow-hidden">
                                                    <div className="flex items-center gap-2 px-3 py-2 border-b border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800/50">
                                                        <Wrench className="w-3 h-3 text-neutral-500" />
                                                        <span className="text-[10px] font-medium text-neutral-500 uppercase tracking-wider">Actions</span>
                                                        <span className="text-[10px] text-neutral-400 bg-neutral-200 dark:bg-neutral-700 px-1.5 py-0.5 rounded-full">{msg.toolActions.length}</span>
                                                    </div>
                                                    <div className="p-1.5 space-y-1">
                                                        {msg.toolActions.map((ta, i) => (
                                                            <div key={`${ta.name}-${i}`} className={cn(
                                                                "flex items-start gap-2.5 px-3 py-2 rounded-lg text-xs transition-all duration-300",
                                                                ta.status === 'calling'
                                                                    ? "bg-blue-50 dark:bg-blue-500/5 border border-blue-200 dark:border-blue-500/15"
                                                                    : ta.success
                                                                        ? "bg-green-50 dark:bg-green-500/5"
                                                                        : "bg-red-50 dark:bg-red-500/5"
                                                            )}>
                                                                <div className={cn(
                                                                    "w-5 h-5 rounded-md flex items-center justify-center shrink-0 mt-0.5",
                                                                    ta.status === 'calling'
                                                                        ? "bg-blue-100 dark:bg-blue-500/10 text-blue-500"
                                                                        : ta.success
                                                                            ? "bg-green-100 dark:bg-green-500/10 text-green-500"
                                                                            : "bg-red-100 dark:bg-red-500/10 text-red-500"
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
                                                                    <span className="font-medium text-neutral-700 dark:text-neutral-300">
                                                                        {ta.status === 'calling' ? `${ta.displayName}...` : ta.displayName}
                                                                    </span>
                                                                    {ta.summary && ta.status !== 'calling' && (
                                                                        <p className="text-neutral-400 dark:text-neutral-500 mt-0.5 text-[11px] leading-relaxed">{ta.summary}</p>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>

                                                    {/* Undo button */}
                                                    {!msg.isStreaming && (() => {
                                                        const msgIndex = messages.indexOf(msg);
                                                        const cp = checkpoints.find(c => c.messageIndex >= msgIndex - 1 && c.messageIndex <= msgIndex + 2);
                                                        if (!cp) return null;
                                                        return (
                                                            <div className="px-1.5 pb-1.5">
                                                                <button
                                                                    onClick={() => handleUndo(cp.id)}
                                                                    disabled={undoingCheckpoint === cp.id}
                                                                    className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium bg-amber-50 dark:bg-amber-500/5 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-500/15 hover:bg-amber-100 dark:hover:bg-amber-500/10 transition-all duration-200"
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
                                                    "relative group rounded-2xl p-3 sm:p-4 text-sm leading-relaxed transition-all duration-300",
                                                    msg.role === 'user'
                                                        ? 'bg-neutral-100 dark:bg-neutral-900 text-neutral-800 dark:text-neutral-200 rounded-br-sm'
                                                        : 'text-neutral-800 dark:text-neutral-200'
                                                )}>
                                                    {msg.role === 'model' ? (
                                                        <div
                                                            className="singularity-response prose prose-sm max-w-none text-neutral-800 dark:text-neutral-200"
                                                            dangerouslySetInnerHTML={{ __html: renderMarkdown(msg.content) }}
                                                        />
                                                    ) : (
                                                        <p className="whitespace-pre-wrap">{msg.content}</p>
                                                    )}
                                                    {/* Copy button */}
                                                    {msg.role === 'model' && msg.content && !msg.isStreaming && (
                                                        <button
                                                            onClick={() => {
                                                                navigator.clipboard.writeText(msg.content);
                                                                setCopiedId(msg.id);
                                                                setTimeout(() => setCopiedId(null), 2000);
                                                            }}
                                                            className="absolute -bottom-1 right-0 opacity-0 group-hover:opacity-100 p-1.5 rounded-lg bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300 transition-all duration-200 shadow-sm"
                                                        >
                                                            {copiedId === msg.id ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                                                        </button>
                                                    )}
                                                </div>
                                            )}

                                            {/* Streaming indicator */}
                                            {msg.role === 'model' && !msg.content && msg.isStreaming && (
                                                !isAgent ? (
                                                    streamingPhase === 'thinking' && (
                                                        <div className="flex items-center gap-2 pl-1">
                                                            <div className="flex gap-1 text-neutral-400">
                                                                <span className="singularity-typing-dot" />
                                                                <span className="singularity-typing-dot" />
                                                                <span className="singularity-typing-dot" />
                                                            </div>
                                                            <span className="text-xs text-neutral-400">Thinking...</span>
                                                        </div>
                                                    )
                                                ) : (
                                                    !msg.toolActions?.length && (
                                                        <div className="flex items-center gap-2 pl-1">
                                                            <div className="flex gap-1 text-neutral-400">
                                                                <span className="singularity-typing-dot" />
                                                                <span className="singularity-typing-dot" />
                                                                <span className="singularity-typing-dot" />
                                                            </div>
                                                            <span className="text-xs text-neutral-400">Processing...</span>
                                                        </div>
                                                    )
                                                )
                                            )}
                                        </div>
                                    </div>
                                ))}

                                {/* Loading Indicator */}
                                {isLoading && messages.length > 0 && messages[messages.length - 1]?.role === 'user' && (
                                    <div className="flex gap-2 sm:gap-3">
                                        <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center shrink-0 bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-300">
                                            {isAgent ? <Bot className="w-4 h-4" /> : <Sparkles className="w-4 h-4" />}
                                        </div>
                                        <div className="flex items-center gap-2 pt-2">
                                            <div className="flex gap-1 text-neutral-400">
                                                <span className="singularity-typing-dot" />
                                                <span className="singularity-typing-dot" />
                                                <span className="singularity-typing-dot" />
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Rechecking Indicator — shows when AI is refining a short response */}
                                {streamingPhase === 'rechecking' && (
                                    <div className="flex gap-2 sm:gap-3 singularity-msg-enter">
                                        <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center shrink-0 bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-300">
                                            {isAgent ? <Bot className="w-4 h-4" /> : <Sparkles className="w-4 h-4" />}
                                        </div>
                                        <div className="flex items-center gap-2 pt-2">
                                            <div className="flex gap-1 text-neutral-400">
                                                <span className="singularity-typing-dot" />
                                                <span className="singularity-typing-dot" />
                                                <span className="singularity-typing-dot" />
                                            </div>
                                            <span className="text-xs text-neutral-400 ml-1">Refining response...</span>
                                        </div>
                                    </div>
                                )}

                                <div ref={messagesEndRef} />
                            </div>
                        </div>

                        {/* Bottom Input Area (when chatting) */}
                        <div className="sticky bottom-0 shrink-0 bg-white dark:bg-black pb-4 pb-safe sm:pb-5 pt-2 px-4 sm:px-8">
                            <div className="max-w-3xl mx-auto">
                                {/* Attachment Previews */}
                                {attachments.length > 0 && (
                                    <div className="flex gap-2.5 mb-3 px-1 animate-in slide-in-from-bottom-2 duration-200">
                                        {attachments.map(att => (
                                            <div key={att.id} className="relative group">
                                                {att.fileType === 'image' ? (
                                                    <img src={att.preview} alt="Attachment" className="w-14 h-14 object-cover rounded-xl border border-neutral-200 dark:border-neutral-700" />
                                                ) : (
                                                    <div className="w-14 h-14 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 flex flex-col items-center justify-center gap-1">
                                                        <FileText className="w-4 h-4 text-neutral-500" />
                                                        <span className="text-[8px] font-medium text-neutral-400 text-center">{att.fileName?.split('.').pop()?.toUpperCase()}</span>
                                                    </div>
                                                )}
                                                <button onClick={() => removeAttachment(att.id)} className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-neutral-800 dark:bg-neutral-200 text-white dark:text-black rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-200">
                                                    <X className="w-2.5 h-2.5" />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                                <div className="relative bg-neutral-100 dark:bg-neutral-900 rounded-2xl transition-all duration-300 focus-within:ring-1 focus-within:ring-neutral-300 dark:focus-within:ring-neutral-700">
                                    <textarea
                                        ref={inputRef}
                                        value={inputValue}
                                        onChange={(e) => setInputValue(e.target.value)}
                                        onKeyDown={handleKeyDown}
                                        placeholder={isAgent ? "Ask Singularity Agent..." : "Ask Singularity..."}
                                        className="w-full bg-transparent border-none focus:ring-0 focus:outline-none resize-none py-3 px-4 text-sm text-neutral-800 dark:text-neutral-200 placeholder:text-neutral-400 dark:placeholder:text-neutral-500 min-h-[40px] max-h-32"
                                        rows={1}

                                    />
                                    <div className="flex items-center justify-between px-3 pb-2">
                                        <div className="flex items-center gap-1">
                                            <button
                                                onClick={() => fileInputRef.current?.click()}
                                                disabled={isLoading || attachments.length >= 4}
                                                className="p-1.5 rounded-full hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-500 dark:text-neutral-400 disabled:opacity-30 transition-colors"
                                                title={isAgent ? "Attach file" : "Attach image"}
                                            >
                                                <Plus className="w-4 h-4" />
                                            </button>
                                            <input
                                                type="file"
                                                accept={isAgent ? "image/*,.pdf,.txt,.md,.csv,.json,.html,.doc,.docx,.prd" : "image/*"}
                                                multiple
                                                className="hidden"
                                                onChange={(e) => { handleFileSelect(e.target.files); e.target.value = ""; }}
                                            />
                                        </div>
                                        <div className="flex items-center gap-1.5">
                                            {/* Mode Dropdown */}
                                            <div className="relative">
                                                <button
                                                    onClick={() => setShowModeDropdown(prev => !prev)}
                                                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-medium bg-neutral-200 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-300 dark:hover:bg-neutral-700 transition-all duration-200"
                                                >
                                                    <span>{isAgent ? "Agent" : "Chat"}</span>
                                                    <ChevronDown className={cn("w-3 h-3 transition-transform duration-200", showModeDropdown && "rotate-180")} />
                                                </button>
                                                {showModeDropdown && (
                                                    <>
                                                        <div className="fixed inset-0 z-[70]" onClick={() => setShowModeDropdown(false)} />
                                                        <div className="absolute bottom-full mb-2 right-0 z-[80] w-56 sm:w-64 bg-neutral-900 rounded-2xl shadow-2xl border border-neutral-700/50 overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-150">
                                                            <div className="px-4 pt-3 pb-1">
                                                                <p className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">Singularity</p>
                                                            </div>
                                                            <div className="p-1.5 space-y-0.5">
                                                                <button
                                                                    onClick={() => { handleModeSwitch("chat"); setShowModeDropdown(false); }}
                                                                    className={cn(
                                                                        "w-full flex items-center justify-between px-3 py-2.5 rounded-xl transition-all duration-150 text-left",
                                                                        !isAgent ? "bg-neutral-800" : "hover:bg-neutral-800/60"
                                                                    )}
                                                                >
                                                                    <div>
                                                                        <p className="text-[13px] font-semibold text-white">Chat</p>
                                                                        <p className="text-[11px] text-neutral-400 mt-0.5">General assistant, answers quickly</p>
                                                                    </div>
                                                                    {!isAgent && (
                                                                        <div className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center shrink-0 ml-2">
                                                                            <Check className="w-3 h-3 text-white" />
                                                                        </div>
                                                                    )}
                                                                </button>
                                                                <button
                                                                    onClick={() => { handleModeSwitch("agent"); setShowModeDropdown(false); }}
                                                                    className={cn(
                                                                        "w-full flex items-center justify-between px-3 py-2.5 rounded-xl transition-all duration-150 text-left",
                                                                        isAgent ? "bg-neutral-800" : "hover:bg-neutral-800/60"
                                                                    )}
                                                                >
                                                                    <div>
                                                                        <p className="text-[13px] font-semibold text-white">Agent</p>
                                                                        <p className="text-[11px] text-neutral-400 mt-0.5">Takes actions, manages your workspace</p>
                                                                    </div>
                                                                    {isAgent && (
                                                                        <div className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center shrink-0 ml-2">
                                                                            <Check className="w-3 h-3 text-white" />
                                                                        </div>
                                                                    )}
                                                                </button>
                                                            </div>
                                                        </div>
                                                    </>
                                                )}
                                            </div>
                                            {/* Send */}
                                            <button
                                                onClick={() => handleSend()}
                                                disabled={(!inputValue.trim() && attachments.length === 0) || isLoading}
                                                className={cn(
                                                    "p-1.5 rounded-full transition-all duration-200",
                                                    (inputValue.trim() || attachments.length > 0) && !isLoading
                                                        ? "bg-neutral-800 dark:bg-neutral-200 text-white dark:text-black hover:scale-105 active:scale-95"
                                                        : "text-neutral-300 dark:text-neutral-600 cursor-not-allowed"
                                                )}
                                            >
                                                <Send className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </>
                )
            }

        </div >
    );
}

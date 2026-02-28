"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import {
    Sparkles, User, ChevronDown, ChevronRight,
    Brain, Copy, Check, Trash2, ArrowRight, Image as ImageIcon, X,
    Bot, MessageSquare, Wrench, CheckCircle2, AlertCircle, Loader2,
    Paperclip, FileText, FileSpreadsheet, FileCode
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

const CHAT_SUGGESTIONS = [
    "What's a good project management strategy for a small agency?",
    "Help me write a client proposal for a web redesign",
    "Explain microservices architecture in simple terms",
    "Create a content calendar for social media marketing",
];

const AGENT_SUGGESTIONS = [
    "What projects do we have and what's their status?",
    "Show me the team workload — who has the most tasks?",
    "What's our financial summary this month?",
    "Create a task for the homepage redesign project",
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
    const scrollRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLTextAreaElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

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

    const clearChat = () => { setMessages([]); setAttachments([]); };

    const handleModeSwitch = (newMode: 'chat' | 'agent') => {
        if (newMode === mode) return;
        setMode(newMode);
        setMessages([]);
        setAttachments([]);
        setIsLoading(false);
        setStreamingPhase('idle');
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
                                // Agent mode: tool finished
                                setMessages(prev => prev.map(m =>
                                    m.id === msgId ? {
                                        ...m,
                                        toolActions: (m.toolActions || []).map(ta =>
                                            ta.name === data.name && ta.status === 'calling'
                                                ? { ...ta, status: data.success ? 'done' as const : 'error' as const, summary: data.summary, success: data.success }
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
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between px-3 sm:px-6 py-2.5 sm:py-4 border-b border-border/30 gap-2">
                <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto justify-between sm:justify-start">
                    <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                        <div className="relative shrink-0">
                            <div className={cn(
                                "w-8 h-8 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center shadow-lg transition-all duration-300",
                                isAgent
                                    ? "bg-gradient-to-br from-cyan-600 to-blue-600 shadow-cyan-500/20"
                                    : "bg-gradient-to-br from-violet-600 to-indigo-600 shadow-violet-500/20"
                            )}>
                                {isAgent ? <Bot className="w-4 h-4 sm:w-5 sm:h-5 text-white" /> : <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-white" />}
                            </div>
                            <span className={cn(
                                "absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full border-2 border-background",
                                isAgent ? "bg-cyan-400" : "bg-emerald-400"
                            )} />
                        </div>
                        <div className="min-w-0">
                            <h1 className={cn(
                                "text-sm sm:text-lg font-bold bg-clip-text text-transparent transition-all duration-300",
                                isAgent
                                    ? "bg-gradient-to-r from-cyan-600 to-blue-600 dark:from-cyan-400 dark:to-blue-400"
                                    : "bg-gradient-to-r from-violet-600 to-indigo-600 dark:from-violet-400 dark:to-indigo-400"
                            )}>
                                Singularity
                            </h1>
                            <p className="text-[10px] sm:text-xs text-muted-foreground truncate">
                                {isAgent ? "Agent Mode" : "AI Assistant"}
                                <span className="hidden sm:inline">{isAgent ? " • Connected to your agency" : " • Always Ready"}</span>
                            </p>
                        </div>
                    </div>

                    {/* Clear button — visible on mobile in the header row */}
                    {messages.length > 0 && (
                        <button onClick={clearChat} className="sm:hidden flex items-center gap-1 text-xs text-muted-foreground hover:text-destructive px-2 py-1 rounded-lg hover:bg-destructive/10 transition-all shrink-0">
                            <Trash2 className="w-3.5 h-3.5" />
                        </button>
                    )}
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                    {/* Mode Toggle */}
                    <div className="flex items-center bg-muted/60 rounded-lg p-0.5 border border-border/30">
                        <button
                            onClick={() => handleModeSwitch('chat')}
                            className={cn(
                                "flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-200",
                                mode === 'chat'
                                    ? "bg-background text-foreground shadow-sm"
                                    : "text-muted-foreground hover:text-foreground"
                            )}
                        >
                            <MessageSquare className="w-3.5 h-3.5" />
                            <span>Chat</span>
                        </button>
                        <button
                            onClick={() => handleModeSwitch('agent')}
                            className={cn(
                                "flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-200",
                                mode === 'agent'
                                    ? "bg-background text-foreground shadow-sm"
                                    : "text-muted-foreground hover:text-foreground"
                            )}
                        >
                            <Bot className="w-3.5 h-3.5" />
                            <span>Agent</span>
                        </button>
                    </div>

                    {/* Clear button — visible on desktop */}
                    {messages.length > 0 && (
                        <button onClick={clearChat} className="hidden sm:flex items-center gap-1.5 text-xs text-muted-foreground hover:text-destructive px-3 py-1.5 rounded-lg hover:bg-destructive/10 transition-all">
                            <Trash2 className="w-3.5 h-3.5" /> Clear
                        </button>
                    )}
                </div>
            </div>

            {/* Messages Area */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 sm:px-6 py-4 sm:py-6 space-y-8 scroll-smooth no-scrollbar">
                {/* Empty State */}
                {messages.length === 0 && !isLoading && (
                    <div className="flex flex-col items-center justify-center h-full text-center space-y-8 animate-in fade-in duration-700">
                        <div className="space-y-4">
                            <div className={cn(
                                "w-14 h-14 sm:w-20 sm:h-20 mx-auto rounded-2xl flex items-center justify-center border shadow-2xl transition-all duration-300",
                                isAgent
                                    ? "bg-gradient-to-br from-cyan-100 to-blue-100 dark:from-cyan-600/20 dark:to-blue-600/20 border-cyan-200 dark:border-cyan-500/20 shadow-cyan-500/10"
                                    : "bg-gradient-to-br from-violet-100 to-indigo-100 dark:from-violet-600/20 dark:to-indigo-600/20 border-violet-200 dark:border-violet-500/20 shadow-violet-500/10"
                            )}>
                                {isAgent
                                    ? <Bot className="w-7 h-7 sm:w-10 sm:h-10 text-cyan-500 dark:text-cyan-400" />
                                    : <Sparkles className="w-7 h-7 sm:w-10 sm:h-10 text-violet-500 dark:text-violet-400" />
                                }
                            </div>
                            <div>
                                <h2 className={cn(
                                    "text-xl sm:text-2xl font-bold bg-clip-text text-transparent",
                                    isAgent
                                        ? "bg-gradient-to-r from-cyan-600 to-blue-600 dark:from-cyan-300 dark:to-blue-300"
                                        : "bg-gradient-to-r from-violet-600 to-indigo-600 dark:from-violet-300 dark:to-indigo-300"
                                )}>
                                    {isAgent ? "What would you like me to do?" : "How can I help you today?"}
                                </h2>
                                <p className="text-xs sm:text-sm text-muted-foreground mt-1.5 sm:mt-2 max-w-md px-2 sm:px-0">
                                    {isAgent
                                        ? "Access your projects, clients, team, and finances."
                                        : "Strategy, coding, writing, analysis — ask anything."
                                    }
                                </p>
                            </div>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 w-full max-w-lg">
                            {suggestions.map((s, i) => (
                                <button key={i} onClick={() => handleSend(s)} className={cn(
                                    "group text-left p-3.5 rounded-xl border bg-card/50 transition-all duration-200 text-sm text-muted-foreground hover:text-foreground",
                                    isAgent
                                        ? "border-border/40 hover:bg-cyan-500/5 hover:border-cyan-500/30"
                                        : "border-border/40 hover:bg-violet-500/5 hover:border-violet-500/30"
                                )}>
                                    <span className="line-clamp-2">{s}</span>
                                    <ArrowRight className={cn(
                                        "w-3.5 h-3.5 mt-1.5 opacity-0 group-hover:opacity-100 transition-all duration-200 -translate-x-1 group-hover:translate-x-0",
                                        isAgent ? "text-cyan-500 dark:text-cyan-400" : "text-violet-500 dark:text-violet-400"
                                    )} />
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* Messages */}
                {messages.map((msg) => (
                    <div key={msg.id} className={cn("flex gap-2 sm:gap-3", msg.role === 'user' ? 'flex-row-reverse' : 'flex-row')}>
                        {/* Avatar */}
                        <div className={cn(
                            "w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center shrink-0 shadow-sm mt-1 transition-all duration-300",
                            msg.role === 'user'
                                ? 'bg-primary/15 text-primary border border-primary/20'
                                : isAgent
                                    ? 'bg-gradient-to-br from-cyan-600 to-blue-600 text-white'
                                    : 'bg-gradient-to-br from-violet-600 to-indigo-600 text-white'
                        )}>
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
                                <div className="space-y-1.5">
                                    {msg.toolActions.map((ta, i) => (
                                        <div key={`${ta.name}-${i}`} className={cn(
                                            "flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-300",
                                            ta.status === 'calling'
                                                ? "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20"
                                                : ta.success
                                                    ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                                                    : "bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20"
                                        )}>
                                            {ta.status === 'calling' ? (
                                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                            ) : ta.success ? (
                                                <CheckCircle2 className="w-3.5 h-3.5" />
                                            ) : (
                                                <AlertCircle className="w-3.5 h-3.5" />
                                            )}
                                            <span>
                                                {ta.status === 'calling'
                                                    ? `${ta.displayName}...`
                                                    : ta.summary || ta.displayName
                                                }
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Response Bubble */}
                            {(msg.content || msg.role === 'user') && (
                                <div className={cn(
                                    "relative group rounded-2xl p-3 sm:p-4 text-sm leading-relaxed shadow-sm transition-all duration-300",
                                    msg.role === 'user'
                                        ? 'bg-primary text-primary-foreground rounded-br-sm'
                                        : 'bg-card border border-border/30 text-foreground rounded-bl-sm'
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
                                        <div className="text-xs text-muted-foreground/40 italic pl-1 animate-pulse">
                                            Crafting response...
                                        </div>
                                    )
                                ) : (
                                    !msg.toolActions?.length && (
                                        <div className="text-xs text-muted-foreground/40 italic pl-1 animate-pulse">
                                            Processing your request...
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
                    <div className="flex gap-2 mb-3 px-1 animate-in slide-in-from-bottom-2 duration-200">
                        {attachments.map(att => (
                            <div key={att.id} className="relative group">
                                {att.fileType === 'image' ? (
                                    <img src={att.preview} alt="Attachment" className="w-16 h-16 object-cover rounded-xl border border-border/40 shadow-sm" />
                                ) : (
                                    <div className="w-16 h-16 rounded-xl border border-border/40 shadow-sm bg-muted/50 flex flex-col items-center justify-center gap-1">
                                        <FileText className="w-5 h-5 text-cyan-500" />
                                        <span className="text-[9px] text-muted-foreground text-center leading-tight px-1 truncate w-full">{att.fileName?.split('.').pop()?.toUpperCase()}</span>
                                    </div>
                                )}
                                <button onClick={() => removeAttachment(att.id)} className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-sm">
                                    <X className="w-3 h-3" />
                                </button>
                            </div>
                        ))}
                    </div>
                )}

                {/* Gradient separator line */}
                <div className="h-px mb-3 bg-gradient-to-r from-transparent via-border/60 to-transparent" />

                <div className={cn(
                    "relative flex items-end gap-1.5 sm:gap-2 bg-card border p-2 sm:p-2.5 rounded-2xl transition-all duration-300",
                    isAgent
                        ? "border-border/50 focus-within:border-cyan-500/50 focus-within:shadow-[0_0_20px_rgba(6,182,212,0.08)] dark:focus-within:shadow-[0_0_20px_rgba(6,182,212,0.15)]"
                        : "border-border/50 focus-within:border-violet-500/50 focus-within:shadow-[0_0_20px_rgba(139,92,246,0.08)] dark:focus-within:shadow-[0_0_20px_rgba(139,92,246,0.15)]"
                )}>
                    {/* File Upload Button — both modes */}
                    <>
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            disabled={isLoading || attachments.length >= 4}
                            className={cn(
                                "h-9 w-9 sm:h-10 sm:w-10 flex items-center justify-center rounded-xl text-muted-foreground/60 disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-200 mb-0.5 shrink-0",
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
                        className="flex-1 max-h-40 min-h-[40px] sm:min-h-[44px] bg-transparent border-none focus:ring-0 focus:outline-none resize-none py-2 sm:py-2.5 px-1 text-sm placeholder:text-muted-foreground/40"
                        rows={1}
                        disabled={isLoading}
                    />
                    <button
                        onClick={() => handleSend()}
                        disabled={(!inputValue.trim() && attachments.length === 0) || isLoading}
                        className={cn(
                            "h-9 w-9 flex items-center justify-center rounded-lg transition-all duration-200 mb-0.5 shrink-0",
                            (inputValue.trim() || attachments.length > 0) && !isLoading
                                ? isAgent
                                    ? "bg-gradient-to-br from-cyan-600 to-blue-600 text-white shadow-md shadow-cyan-500/25 hover:shadow-lg hover:shadow-cyan-500/40 hover:scale-105 active:scale-95"
                                    : "bg-gradient-to-br from-violet-600 to-indigo-600 text-white shadow-md shadow-violet-500/25 hover:shadow-lg hover:shadow-violet-500/40 hover:scale-105 active:scale-95"
                                : "bg-muted/80 text-muted-foreground/30 cursor-not-allowed"
                        )}
                    >
                        <ArrowRight className="w-4 h-4" />
                    </button>
                </div>
                <p className="text-center text-[10px] text-muted-foreground/60 mt-2 sm:mt-2.5 hidden sm:block">
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
            `}</style >
        </div >
    );
}

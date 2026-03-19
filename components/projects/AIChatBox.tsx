"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { X, Sparkles, User, Bot, ArrowRight, Loader2 } from "lucide-react";
import { createAISession, sendAIMessage, closeAISession, extractTaskFields } from "@/lib/actions";
import type { ChatMessage, ExtractedTaskFields } from "@/lib/actions";
import { toast } from "sonner";

interface AIChatBoxProps {
    projectId: string;
    taskState: {
        title: string;
        description: string;
    };
    userId: string;
    availableCategories?: string[];
    onClose: () => void;
    onApply: (fields: ExtractedTaskFields) => void;
}

export function AIChatBox({ projectId, taskState, userId, availableCategories = [], onClose, onApply }: AIChatBoxProps) {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [inputValue, setInputValue] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [sessionId, setSessionId] = useState<string | null>(null);
    const [isConnecting, setIsConnecting] = useState(true);
    const [applyingIdx, setApplyingIdx] = useState<number | null>(null);
    const scrollRef = useRef<HTMLDivElement>(null);
    const sessionRef = useRef<string | null>(null);
    const initialContextRef = useRef({
        projectId,
        title: taskState.title,
        description: taskState.description,
        userId,
    });

    // Keep ref in sync with state
    useEffect(() => {
        sessionRef.current = sessionId;
    }, [sessionId]);

    // Auto-scroll to bottom
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages, isLoading]);

    // Create persistent session on mount
    useEffect(() => {
        let mounted = true;
        const initSession = async () => {
            const initialContext = initialContextRef.current;
            try {
                setIsConnecting(true);
                const id = await createAISession(
                    initialContext.projectId,
                    initialContext.title,
                    initialContext.description,
                    initialContext.userId
                );
                if (mounted) {
                    setSessionId(id);
                    setIsConnecting(false);
                }
            } catch (error) {
                console.error('[AIChatBox] Failed to create session:', error);
                if (mounted) {
                    setIsConnecting(false);
                    setSessionId('legacy');
                }
            }
        };
        initSession();

        // Close session on unmount using ref for latest value
        return () => {
            mounted = false;
            if (sessionRef.current && sessionRef.current !== 'legacy') {
                closeAISession(sessionRef.current).catch(() => { });
            }
        };
    }, []); // Only on mount

    // Close session handler
    const handleClose = useCallback(() => {
        if (sessionId && sessionId !== 'legacy') {
            closeAISession(sessionId).catch(() => { });
        }
        onClose();
    }, [sessionId, onClose]);

    const handleSend = async () => {
        if (!inputValue.trim() || isLoading || !sessionId) return;

        const userMsg = inputValue.trim();
        setInputValue("");

        // Optimistic Update
        const newHistory = [...messages, { role: 'user', content: userMsg } as ChatMessage];
        setMessages(newHistory);
        setIsLoading(true);

        try {
            const aiResponse = await sendAIMessage(
                sessionId,
                userMsg,
                // Legacy fallback params
                projectId,
                taskState.title,
                taskState.description,
                messages, // Previous history for legacy mode
                userId
            );

            setMessages(prev => [...prev, { role: 'model', content: aiResponse }]);
        } catch (error) {
            console.error(error);
            setMessages(prev => [...prev, { role: 'model', content: "Sorry, I encountered an error. Please try again." }]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleApply = async (content: string, msgIdx: number) => {
        setApplyingIdx(msgIdx);
        try {
            const fields = await extractTaskFields(content, availableCategories);
            onApply(fields);
            toast.success("Task fields applied from AI response");
        } catch (error) {
            console.error('[AIChatBox] Apply error:', error);
            // Fallback: just use as description
            onApply({ description: content });
            toast.success("Applied as description (AI extraction unavailable)");
        } finally {
            setApplyingIdx(null);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    return (
        <div className="flex flex-col h-full bg-background/95 backdrop-blur-sm shadow-2xl z-50 animate-in slide-in-from-bottom lg:slide-in-from-right duration-300 w-full lg:w-[400px] inset-0 max-sm:absolute lg:static lg:border-l border-border min-h-0">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-border/50 bg-muted/30">
                <div className="flex items-center gap-2 text-primary">
                    <Sparkles className="w-5 h-5 fill-primary/20" />
                    <h3 className="font-semibold text-sm">Singularity</h3>
                    {sessionId && sessionId !== 'legacy' && (
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" title="Live session active" />
                    )}
                </div>
                <button
                    onClick={handleClose}
                    className="p-1 hover:bg-muted rounded-full transition-colors text-muted-foreground"
                >
                    <X className="w-5 h-5" />
                </button>
            </div>

            {/* Messages Area */}
            <div
                ref={scrollRef}
                className="flex-1 overflow-y-auto p-4 space-y-6 scroll-smooth no-scrollbar"
            >
                {isConnecting && (
                    <div className="flex flex-col items-center justify-center h-full text-center p-4 text-muted-foreground space-y-3 opacity-80">
                        <div className="w-12 h-12 rounded-full bg-indigo-500/15 flex items-center justify-center mb-2">
                            <Sparkles className="w-6 h-6 text-indigo-500 animate-spin" />
                        </div>
                        <p className="text-sm font-medium text-foreground">Connecting to Singularity...</p>
                    </div>
                )}

                {!isConnecting && messages.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-full text-center p-4 text-muted-foreground space-y-3 opacity-80">
                        <div className="w-12 h-12 rounded-full bg-indigo-500/15 flex items-center justify-center mb-2">
                            <Sparkles className="w-6 h-6 text-indigo-500" />
                        </div>
                        <p className="text-sm font-medium text-foreground">How can I help with this task?</p>
                        <p className="text-xs max-w-[200px]">
                            Try &quot;Write a complete task for this&quot;, &quot;Add acceptance criteria&quot;, or &quot;Break this down into steps&quot;.
                        </p>
                    </div>
                )}

                {messages.map((msg, idx) => (
                    <div
                        key={idx}
                        className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
                    >
                        {/* Avatar */}
                        <div className={`
                            w-8 h-8 rounded-full flex items-center justify-center shrink-0 border shadow-sm
                            ${msg.role === 'user' ? 'bg-primary/20 text-primary' : 'bg-emerald-900/30 text-emerald-400'}
                        `}>
                            {msg.role === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                        </div>

                        {/* Bubble */}
                        <div className={`
                            relative group max-w-[85%] rounded-2xl p-3.5 text-sm leading-relaxed shadow-sm
                            ${msg.role === 'user'
                                ? 'bg-primary text-primary-foreground rounded-br-none'
                                : 'bg-card border border-border/60 text-foreground rounded-bl-none'
                            }
                        `}>
                            <div className="whitespace-pre-wrap">{msg.content}</div>

                            {/* Action Buttons (AI Only) */}
                            {msg.role === 'model' && (
                                <div className="mt-3 pt-2 border-t border-border/10 flex justify-end opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity">
                                    <button
                                        onClick={() => handleApply(msg.content, idx)}
                                        disabled={applyingIdx !== null}
                                        className="flex items-center gap-1.5 text-xs font-medium text-emerald-500 hover:text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 px-2.5 py-1.5 rounded-md transition-colors disabled:opacity-50"
                                        title="AI will extract title, description, category, and priority from this response"
                                    >
                                        {applyingIdx === idx ? (
                                            <>
                                                <Loader2 className="w-3 h-3 animate-spin" /> Extracting...
                                            </>
                                        ) : (
                                            <>
                                                <Sparkles className="w-3 h-3" /> Apply to Task
                                            </>
                                        )}
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                ))}

                {isLoading && (
                    <div className="flex gap-3">
                        <div className="w-8 h-8 rounded-full bg-emerald-500/15 flex items-center justify-center shrink-0">
                            <Bot className="w-4 h-4 text-emerald-500" />
                        </div>
                        <div className="bg-card border border-border/60 rounded-2xl rounded-bl-none p-4 shadow-sm flex items-center gap-1.5">
                            <span className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                            <span className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                            <span className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce"></span>
                        </div>
                    </div>
                )}
            </div>

            {/* Input Area */}
            <div className="p-4 bg-background border-t border-border/50">
                <div className="relative flex items-end gap-2 bg-muted/40 p-1.5 rounded-xl border focus-within:ring-2 focus-within:ring-indigo-500/20 focus-within:border-indigo-500/50 transition-all">
                    <textarea
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Ask Singularity to refine or generate..."
                        className="flex-1 max-h-32 min-h-[44px] bg-transparent border-none focus:ring-0 resize-none py-2.5 px-3 text-sm"
                        rows={1}
                        disabled={isConnecting}
                    />
                    <button
                        onClick={handleSend}
                        disabled={!inputValue.trim() || isLoading || isConnecting}
                        className="h-9 w-9 flex items-center justify-center rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors mb-0.5"
                    >
                        <ArrowRight className="w-4 h-4" />
                    </button>
                </div>
                <div className="text-center mt-2">
                    <p className="text-[10px] text-muted-foreground">Click &quot;Apply to Task&quot; on any response to auto-fill all task fields.</p>
                </div>
            </div>
        </div>
    );
}

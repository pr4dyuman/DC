"use client";

import { useState, useRef, useEffect } from "react";
import { Send, X, Sparkles, User, Bot, CornerDownLeft, ArrowRight, Check } from "lucide-react";
import { chatWithTaskAI, ChatMessage } from "@/lib/actions";
import { cn } from "@/lib/utils"; // Assuming this exists, if not I'll standard tailwind string interpolation

interface AIChatBoxProps {
    projectId: string;
    taskState: {
        title: string;
        description: string;
    };
    userId: string;
    onClose: () => void;
    onApply: (content: string) => void;
}

export function AIChatBox({ projectId, taskState, userId, onClose, onApply }: AIChatBoxProps) {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [inputValue, setInputValue] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);

    // Auto-scroll to bottom
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages, isLoading]);

    const handleSend = async () => {
        if (!inputValue.trim() || isLoading) return;

        const userMsg = inputValue.trim();
        setInputValue("");

        // Optimistic Update
        const newHistory = [...messages, { role: 'user', content: userMsg } as ChatMessage];
        setMessages(newHistory);
        setIsLoading(true);

        try {
            const aiResponse = await chatWithTaskAI(
                projectId,
                taskState.title,
                taskState.description,
                messages, // Send previous history
                userMsg,
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

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    return (
        <div className="flex flex-col h-full bg-background/95 backdrop-blur-sm shadow-2xl z-50 animate-in slide-in-from-right duration-300 w-full lg:w-[400px] absolute inset-0 lg:static lg:border-l border-border">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-border/50 bg-muted/30">
                <div className="flex items-center gap-2 text-primary">
                    <Sparkles className="w-5 h-5 fill-primary/20" />
                    <h3 className="font-semibold text-sm">AI Task Assistant</h3>
                </div>
                <button
                    onClick={onClose}
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
                {messages.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-full text-center p-4 text-muted-foreground space-y-3 opacity-80">
                        <div className="w-12 h-12 rounded-full bg-indigo-100 flex items-center justify-center mb-2">
                            <Sparkles className="w-6 h-6 text-indigo-600" />
                        </div>
                        <p className="text-sm font-medium text-foreground">How can I help with this task?</p>
                        <p className="text-xs max-w-[200px]">
                            Try "Critique my draft", "Add acceptance criteria", or "Summarize the assets".
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
                                        onClick={() => onApply(msg.content)}
                                        className="flex items-center gap-1.5 text-xs font-medium text-emerald-600 hover:text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-2 py-1 rounded-md transition-colors"
                                        title="Replace Description with this content"
                                    >
                                        <Check className="w-3 h-3" /> Apply to Task
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                ))}

                {isLoading && (
                    <div className="flex gap-3">
                        <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                            <Bot className="w-4 h-4 text-emerald-700" />
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
                        placeholder="Ask AI to refine or generate..."
                        className="flex-1 max-h-32 min-h-[44px] bg-transparent border-none focus:ring-0 resize-none py-2.5 px-3 text-sm"
                        rows={1}
                    />
                    <button
                        onClick={handleSend}
                        disabled={!inputValue.trim() || isLoading}
                        className="h-9 w-9 flex items-center justify-center rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors mb-0.5"
                    >
                        <ArrowRight className="w-4 h-4" />
                    </button>
                </div>
                <div className="text-center mt-2">
                    <p className="text-[10px] text-muted-foreground">AI can help you write, format, and structure your task.</p>
                </div>
            </div>
        </div>
    );
}

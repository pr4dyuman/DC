"use client";

import { Bot, Clock, History, MessageSquare, Trash2 } from "lucide-react";

import { cn } from "@/lib/utils";

import type { ChatSessionSummary } from "../singularity-chat-shared";

type SingularityHistorySidebarProps = {
    showHistory: boolean;
    sessions: ChatSessionSummary[];
    activeSessionId: string | null;
    onClose: () => void;
    onLoadSession: (sessionId: string) => void;
    onRequestDeleteSession: (sessionId: string) => void;
};

function formatRelativeTime(updatedAt: string) {
    const diff = Date.now() - new Date(updatedAt).getTime();
    const minutes = Math.floor(diff / 60000);

    if (minutes < 1) {
        return "Just now";
    }
    if (minutes < 60) {
        return `${minutes}m ago`;
    }

    const hours = Math.floor(minutes / 60);
    if (hours < 24) {
        return `${hours}h ago`;
    }

    return `${Math.floor(hours / 24)}d ago`;
}

function groupSessions(sessions: ChatSessionSummary[]) {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today.getTime() - 86400000);
    const weekAgo = new Date(today.getTime() - 7 * 86400000);

    return [
        { label: "Today", items: sessions.filter((session) => new Date(session.updatedAt) >= today && session.messageCount > 0) },
        { label: "Yesterday", items: sessions.filter((session) => {
            const updatedAt = new Date(session.updatedAt);
            return updatedAt >= yesterday && updatedAt < today && session.messageCount > 0;
        }) },
        { label: "This Week", items: sessions.filter((session) => {
            const updatedAt = new Date(session.updatedAt);
            return updatedAt >= weekAgo && updatedAt < yesterday && session.messageCount > 0;
        }) },
        { label: "Older", items: sessions.filter((session) => new Date(session.updatedAt) < weekAgo && session.messageCount > 0) },
    ].filter((group) => group.items.length > 0);
}

export function SingularityHistorySidebar({
    showHistory,
    sessions,
    activeSessionId,
    onClose,
    onLoadSession,
    onRequestDeleteSession,
}: SingularityHistorySidebarProps) {
    return (
        <>
            <div
                className={cn(
                    "fixed inset-0 z-40 bg-black/40 backdrop-blur-sm transition-all duration-300",
                    showHistory ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none",
                )}
                onClick={onClose}
            />
            <div
                className={cn(
                    "fixed top-0 right-0 w-72 sm:w-80 h-full z-50 bg-white dark:bg-neutral-950 border-l border-neutral-200 dark:border-neutral-800 shadow-2xl flex flex-col transition-transform duration-300 ease-in-out",
                    showHistory ? "translate-x-0" : "translate-x-full",
                )}
            >
                <div className="flex items-center px-5 py-4 border-b border-neutral-200 dark:border-neutral-800">
                    <div className="flex items-center gap-2.5">
                        <History className="w-5 h-5 text-neutral-500" />
                        <h3 className="text-sm font-semibold text-neutral-800 dark:text-neutral-200">History</h3>
                        <span className="text-[10px] text-neutral-500 bg-neutral-100 dark:bg-neutral-800 px-1.5 py-0.5 rounded-full">
                            {sessions.filter((session) => session.messageCount > 0).length}
                        </span>
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
                            {groupSessions(sessions).map((group) => (
                                <div key={group.label} className="space-y-1">
                                    <p className="text-[10px] font-medium text-neutral-400 uppercase tracking-wider px-2 pt-1">{group.label}</p>
                                    {group.items.map((session) => (
                                        <div
                                            key={session.id}
                                            className={cn(
                                                "group flex items-start gap-2.5 px-3 py-2.5 rounded-xl cursor-pointer transition-all duration-200",
                                                session.id === activeSessionId
                                                    ? "bg-neutral-100 dark:bg-neutral-800/80"
                                                    : "hover:bg-neutral-50 dark:hover:bg-neutral-900 hover:text-neutral-900 dark:hover:text-neutral-200",
                                            )}
                                        >
                                            <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5 text-neutral-400 dark:text-neutral-500">
                                                {session.mode === "agent" ? <Bot className="w-3.5 h-3.5" /> : <MessageSquare className="w-3.5 h-3.5" />}
                                            </div>
                                            <button type="button" className="flex-1 min-w-0 text-left" onClick={() => onLoadSession(session.id)}>
                                                <p className="text-xs font-medium text-neutral-800 dark:text-neutral-200 truncate">{session.title}</p>
                                                <p className="text-[10px] text-neutral-400 mt-0.5 flex items-center gap-1.5">
                                                    <span>{session.messageCount} messages</span>
                                                    <span className="opacity-40">&middot;</span>
                                                    <span>{formatRelativeTime(session.updatedAt)}</span>
                                                </p>
                                            </button>
                                            <button
                                                onClick={(event) => {
                                                    event.stopPropagation();
                                                    onRequestDeleteSession(session.id);
                                                }}
                                                className="opacity-100 md:opacity-0 md:group-hover:opacity-100 p-1 hover:bg-destructive/10 rounded-lg transition-all mt-0.5"
                                                aria-label="Delete conversation"
                                                title="Delete conversation"
                                            >
                                                <Trash2 className="w-3 h-3 text-neutral-400 hover:text-destructive" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </>
    );
}

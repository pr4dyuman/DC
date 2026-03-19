"use client";

import { History, Menu, Plus } from "lucide-react";

type SingularityHeaderBarProps = {
    onToggleMenu: () => void;
    onNewChat: () => void;
    onToggleHistory: () => void;
};

export function SingularityHeaderBar({
    onToggleMenu,
    onNewChat,
    onToggleHistory,
}: SingularityHeaderBarProps) {
    return (
        <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 z-30">
            <button
                onClick={onToggleMenu}
                className="relative z-[60] p-2 rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-900 transition-colors"
                title="Menu"
            >
                <Menu className="w-5 h-5 text-neutral-500 dark:text-neutral-400" />
            </button>

            <h1 className="text-base sm:text-lg font-medium text-neutral-800 dark:text-neutral-200 tracking-tight">
                Singularity
            </h1>

            <div className="flex items-center gap-1">
                <button
                    onClick={onNewChat}
                    className="p-2 rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-900 transition-colors"
                    title="New Chat"
                >
                    <Plus className="w-5 h-5 text-neutral-500 dark:text-neutral-400" />
                </button>
                <button
                    onClick={onToggleHistory}
                    className="relative z-[60] p-2 rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-900 transition-colors"
                    title="Chat History"
                >
                    <History className="w-5 h-5 text-neutral-500 dark:text-neutral-400" />
                </button>
            </div>
        </div>
    );
}

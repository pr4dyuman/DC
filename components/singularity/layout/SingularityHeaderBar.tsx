"use client";

import { Zap, History, Menu, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

type SingularityHeaderBarProps = {
    onToggleMenu: () => void;
    onNewChat: () => void;
    onToggleHistory: () => void;
    isAdmin?: boolean;
    isHeavyTask?: boolean;
    onToggleHeavyTask?: () => void;
};

export function SingularityHeaderBar({
    onToggleMenu,
    onNewChat,
    onToggleHistory,
    isAdmin,
    isHeavyTask,
    onToggleHeavyTask,
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

            <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-medium text-neutral-800 dark:text-neutral-200 tracking-tight">
                    Singularity
                </h1>
                {isAdmin && isHeavyTask && (
                    <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-amber-500/15 text-amber-500 border border-amber-500/30 leading-none">
                        Heavy
                    </span>
                )}
            </div>

            <div className="flex items-center gap-1">
                {/* Heavy Tasks toggle — admin only */}
                {isAdmin && (
                    <button
                        onClick={onToggleHeavyTask}
                        className={cn(
                            "p-2 rounded-full transition-colors",
                            isHeavyTask
                                ? "bg-amber-500/15 text-amber-500 hover:bg-amber-500/25"
                                : "hover:bg-neutral-100 dark:hover:bg-neutral-900 text-neutral-500 dark:text-neutral-400"
                        )}
                        title={isHeavyTask ? "Heavy Tasks: ON — click to disable" : "Heavy Tasks: OFF — click to enable"}
                    >
                        <Zap className={cn("w-5 h-5", isHeavyTask && "fill-amber-400")} />
                    </button>
                )}
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

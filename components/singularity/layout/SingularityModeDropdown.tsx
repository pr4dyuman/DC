"use client";

import { Check, ChevronDown } from "lucide-react";

import { cn } from "@/lib/utils";

type SingularityMode = "chat" | "agent";

type SingularityModeDropdownProps = {
    isOpen: boolean;
    isAgent: boolean;
    onToggle: () => void;
    onClose: () => void;
    onModeSwitch: (mode: SingularityMode) => void;
};

export function SingularityModeDropdown({
    isOpen,
    isAgent,
    onToggle,
    onClose,
    onModeSwitch,
}: SingularityModeDropdownProps) {
    return (
        <div className="relative">
            <button
                onClick={onToggle}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-medium bg-neutral-200 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-300 dark:hover:bg-neutral-700 transition-all duration-200"
            >
                <span>{isAgent ? "Agent" : "Chat"}</span>
                <ChevronDown className={cn("w-3 h-3 transition-transform duration-200", isOpen && "rotate-180")} />
            </button>
            {isOpen && (
                <>
                    <div className="fixed inset-0 z-[70]" onClick={onClose} />
                    <div className="absolute bottom-full mb-2 right-0 z-[80] w-56 sm:w-64 bg-neutral-900 rounded-2xl shadow-2xl border border-neutral-700/50 overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-150">
                        <div className="px-4 pt-3 pb-1">
                            <p className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">Singularity</p>
                        </div>
                        <div className="p-1.5 space-y-0.5">
                            <button
                                onClick={() => {
                                    onModeSwitch("chat");
                                    onClose();
                                }}
                                className={cn(
                                    "w-full flex items-center justify-between px-3 py-2.5 rounded-xl transition-all duration-150 text-left",
                                    !isAgent ? "bg-neutral-800" : "hover:bg-neutral-800/60",
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
                                onClick={() => {
                                    onModeSwitch("agent");
                                    onClose();
                                }}
                                className={cn(
                                    "w-full flex items-center justify-between px-3 py-2.5 rounded-xl transition-all duration-150 text-left",
                                    isAgent ? "bg-neutral-800" : "hover:bg-neutral-800/60",
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
    );
}

"use client";

import { createPortal } from "react-dom";
import type { Task } from "@/lib/types";
import { STATUS_ORDER } from "./task-card-shared";

type TaskCardStatusSheetProps = {
    open: boolean;
    taskTitle: string;
    currentStatus: Task["status"];
    onSelectStatus: (status: Task["status"]) => void;
    onClose: () => void;
};

export function TaskCardStatusSheet({
    open,
    taskTitle,
    currentStatus,
    onSelectStatus,
    onClose,
}: TaskCardStatusSheetProps) {
    if (!open || typeof document === "undefined") return null;

    return createPortal(
        <div
            className="fixed inset-0 z-[99999] flex items-end justify-center bg-black/40 backdrop-blur-[2px]"
            onClick={(event) => {
                event.stopPropagation();
                onClose();
            }}
        >
            <div
                className="w-full max-w-sm mx-4 mb-6 rounded-xl border border-border bg-popover shadow-2xl overflow-hidden animate-in slide-in-from-bottom-4 duration-200"
                onClick={(event) => event.stopPropagation()}
            >
                <div className="px-4 py-3 text-xs font-bold uppercase tracking-widest text-muted-foreground border-b border-border bg-muted/30">
                    Move &ldquo;{taskTitle.length > 30 ? `${taskTitle.slice(0, 30)}…` : taskTitle}&rdquo;
                </div>
                {STATUS_ORDER.map((status) => (
                    <button
                        key={status}
                        onClick={() => onSelectStatus(status)}
                        className={`w-full text-left px-4 py-3.5 text-sm flex items-center gap-3 transition-colors active:bg-accent/80 ${status === currentStatus ? "bg-primary/5 text-primary font-semibold" : "text-foreground hover:bg-accent"}`}
                    >
                        <span
                            className={`inline-block w-2.5 h-2.5 rounded-full shrink-0 ${status === "Done"
                                ? "bg-emerald-500"
                                : status === "In Progress"
                                    ? "bg-blue-500"
                                    : status === "Review"
                                        ? "bg-yellow-500"
                                        : "bg-muted-foreground/40"
                                }`}
                        />
                        <span className="flex-1">{status}</span>
                        {status === currentStatus && <span className="text-primary text-base">✓</span>}
                    </button>
                ))}
                <button
                    onClick={onClose}
                    className="w-full text-center px-4 py-3 text-sm font-medium text-muted-foreground border-t border-border hover:bg-accent transition-colors"
                >
                    Cancel
                </button>
            </div>
        </div>,
        document.body
    );
}

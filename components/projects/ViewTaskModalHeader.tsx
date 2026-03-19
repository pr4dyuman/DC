"use client";

import type { Task } from "@/lib/types";
import { AlertCircle, Clock, Flag, Tag } from "lucide-react";
import { PRIORITY_STYLES, type TaskStatusConfig } from "./view-task-modal-shared";

type ViewTaskModalHeaderProps = {
    task: Task;
    statusConfig: TaskStatusConfig;
    isOverdue: boolean;
    dueDiff: number | null;
};

export function ViewTaskModalHeader({
    task,
    statusConfig,
    isOverdue,
    dueDiff,
}: ViewTaskModalHeaderProps) {
    const StatusIcon = statusConfig.icon;

    return (
        <div className="space-y-3">
            <div className="flex items-center gap-2 flex-wrap">
                <span className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${statusConfig.color} transition-colors`}>
                    <StatusIcon className="w-3.5 h-3.5" />
                    {task.status}
                </span>
                {task.priority && (
                    <span className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${PRIORITY_STYLES[task.priority]}`}>
                        <Flag className="w-3 h-3" />
                        {task.priority} Priority
                    </span>
                )}
                {task.category && (
                    <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
                        <Tag className="w-3 h-3" />
                        {task.category}
                    </span>
                )}
                {task.estimatedHours && task.estimatedHours > 0 && (
                    <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20">
                        <Clock className="w-3 h-3" />
                        {task.estimatedHours}h
                    </span>
                )}
                {isOverdue && (
                    <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-500/10 text-red-500 border border-red-500/20">
                        <AlertCircle className="w-3 h-3" />
                        {Math.abs(dueDiff || 0)}d overdue
                    </span>
                )}
                {!isOverdue && dueDiff !== null && dueDiff <= 3 && task.status !== "Done" && (
                    <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-600 border border-amber-500/20">
                        <Clock className="w-3 h-3" />
                        {dueDiff === 0 ? "Due today" : `${dueDiff}d left`}
                    </span>
                )}
            </div>
            <h2 className="text-2xl font-bold text-foreground leading-tight break-words">
                {task.title}
            </h2>
        </div>
    );
}

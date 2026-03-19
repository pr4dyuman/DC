"use client";

import { differenceInCalendarDays } from "date-fns";
import { toLocalCalendarDay } from "@/lib/date-utils";
import type { Project, Service, User } from "@/lib/types";

export const STATUS_STYLES: Record<string, string> = {
    Active: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
    Completed: "bg-blue-500/15 text-blue-600 dark:text-blue-400",
    "On Hold": "bg-amber-500/15 text-amber-600 dark:text-amber-400",
    Cancelled: "bg-red-500/15 text-red-500",
};

export function DaysLabel({ dueDate, status }: { dueDate?: string; status: string }) {
    if (!dueDate || status === "Completed") return null;
    const today = toLocalCalendarDay(new Date());
    const due = toLocalCalendarDay(dueDate);
    if (!due || !today) return null;
    const diff = differenceInCalendarDays(due, today);

    if (diff < 0) {
        return (
            <span className="text-[10px] font-semibold text-red-500 whitespace-nowrap">
                {Math.abs(diff)}d overdue
            </span>
        );
    }
    if (diff === 0) {
        return <span className="text-[10px] font-semibold text-amber-500 whitespace-nowrap">Due today</span>;
    }
    if (diff <= 3) {
        return <span className="text-[10px] font-semibold text-amber-500 whitespace-nowrap">{diff}d left</span>;
    }
    return <span className="text-[10px] text-muted-foreground whitespace-nowrap">{diff}d left</span>;
}

export function TaskStatusPills({
    todo,
    inProgress,
    done,
}: {
    todo: number;
    inProgress: number;
    done: number;
}) {
    if (todo + inProgress + done === 0) {
        return <span className="text-[10px] text-muted-foreground">No tasks yet</span>;
    }

    return (
        <div className="flex items-center gap-2 text-[10px] font-medium">
            {todo > 0 && <span className="text-muted-foreground">{todo} Todo</span>}
            {inProgress > 0 && <span className="text-indigo-400">{inProgress} In Progress</span>}
            {done > 0 && <span className="text-emerald-500">{done} Done</span>}
        </div>
    );
}

export type SortOption = "dueDate" | "budget" | "name" | "progress";
export type ProjectServiceSummary = Pick<Service, "id" | "name">;
export type ProjectAssignee = Pick<User, "id" | "name" | "avatar">;
export type ProjectSummary = Project & {
    pct: number;
    done: number;
    inProgress: number;
    todo: number;
    total: number;
    isOverdue: boolean;
    assignees: ProjectAssignee[];
    totalAssignees: number;
};

"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { TaskAssignee } from "./task-card-shared";

type TaskCardAssigneeMenuProps = {
    open: boolean;
    assigneeOptions: TaskAssignee[];
    currentAssigneeId?: string;
    onSelect: (userId: string) => void;
};

export function TaskCardAssigneeMenu({
    open,
    assigneeOptions,
    currentAssigneeId,
    onSelect,
}: TaskCardAssigneeMenuProps) {
    if (!open) return null;

    return (
        <div
            className="absolute top-7 left-0 z-50 w-52 rounded-lg border border-border bg-popover shadow-lg py-1"
            onClick={(event) => event.stopPropagation()}
        >
            <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground border-b border-border mb-1">
                Assign to
            </div>
            <div className="max-h-48 overflow-y-auto no-scrollbar">
                {assigneeOptions.map((user) => (
                    <button
                        key={user.id}
                        onClick={() => onSelect(user.id)}
                        className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm hover:bg-accent transition-colors ${user.id === currentAssigneeId ? "bg-primary/5 text-primary font-medium" : "text-foreground"}`}
                    >
                        <Avatar className="h-6 w-6 border border-border shrink-0">
                            <AvatarImage src={user.avatar} />
                            <AvatarFallback className="text-[9px] bg-primary/10 text-primary font-bold">{user.name?.substring(0, 2).toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0 text-left">
                            <div className="truncate font-medium text-xs">{user.name}</div>
                            <div className="truncate text-[10px] text-muted-foreground">{user.jobTitle || user.role}</div>
                        </div>
                        {user.id === currentAssigneeId && <span className="text-xs text-primary shrink-0">✓</span>}
                    </button>
                ))}
            </div>
        </div>
    );
}

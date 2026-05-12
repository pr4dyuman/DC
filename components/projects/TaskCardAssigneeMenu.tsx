"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Check } from "lucide-react";
import type { TaskAssignee } from "./task-card-shared";

type TaskCardAssigneeMenuProps = {
    open: boolean;
    assigneeOptions: TaskAssignee[];
    currentAssigneeIds?: string[];
    onToggle: (userId: string) => void;
    onClear: () => void;
};

export function TaskCardAssigneeMenu({
    open,
    assigneeOptions,
    currentAssigneeIds = [],
    onToggle,
    onClear,
}: TaskCardAssigneeMenuProps) {
    if (!open) return null;

    return (
        <div
            className="absolute top-7 left-0 z-50 w-56 rounded-lg border border-border bg-popover shadow-lg py-1"
            onClick={(event) => event.stopPropagation()}
        >
            <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground border-b border-border mb-1">
                Assign to
            </div>
            <div className="max-h-56 overflow-y-auto no-scrollbar">
                {assigneeOptions.map((user) => {
                    const selected = currentAssigneeIds.includes(user.id);
                    return (
                        <button
                            key={user.id}
                            onClick={() => onToggle(user.id)}
                            className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm hover:bg-accent transition-colors ${selected ? "bg-primary/5 text-primary font-medium" : "text-foreground"}`}
                        >
                            <Avatar className="h-6 w-6 border border-border shrink-0">
                                <AvatarImage src={user.avatar} />
                                <AvatarFallback className="text-[9px] bg-primary/10 text-primary font-bold">{user.name?.substring(0, 2).toUpperCase()}</AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0 text-left">
                                <div className="truncate font-medium text-xs">{user.name}</div>
                                <div className="truncate text-[10px] text-muted-foreground">{user.jobTitle || user.role}</div>
                            </div>
                            {selected && <Check className="h-3.5 w-3.5 text-primary shrink-0" />}
                        </button>
                    );
                })}
                {currentAssigneeIds.length > 0 && (
                    <button
                        onClick={onClear}
                        className="w-full px-3 py-2 text-left text-xs font-medium text-muted-foreground hover:bg-accent hover:text-foreground"
                    >
                        Clear assignees
                    </button>
                )}
            </div>
        </div>
    );
}

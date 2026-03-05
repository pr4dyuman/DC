"use client";

import { useDroppable } from "@dnd-kit/core";
import { Task } from "@/lib/types";
import { TaskCard } from "./TaskCard";

interface DroppableColumnProps {
    id: string;
    title: string;
    tasks: Task[];
    users: any[];
    onViewTask: (task: Task) => void;
    onEditTask: (task: Task) => void;
    currentUserId?: string;
    aiEnabled?: boolean;
    readOnly?: boolean;
    permissions?: any;
    onQuickEdit?: (taskId: string, patch: Partial<Task>) => void;
}

export function DroppableColumn({ id, title, tasks, users, onViewTask, onEditTask, currentUserId, aiEnabled, readOnly, permissions, onQuickEdit }: DroppableColumnProps) {
    const { setNodeRef, isOver } = useDroppable({ id });

    return (
        <div
            ref={setNodeRef}
            className={`flex h-full min-w-0 w-full flex-col rounded-lg p-4 border transition-colors duration-200 overflow-hidden ${isOver
                ? 'bg-primary/5 border-primary/40 ring-2 ring-primary/20'
                : 'bg-muted/50 border-border/50'
                }`}
        >
            <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-sm uppercase text-muted-foreground flex items-center gap-2">
                    <span className={`inline-block w-2 h-2 rounded-full ${title === 'Done' ? 'bg-emerald-500' :
                            title === 'In Progress' ? 'bg-blue-500' :
                                title === 'Review' ? 'bg-yellow-500' :
                                    'bg-muted-foreground/40'
                        }`} />
                    {title}
                </h3>
                <span className="text-xs font-bold bg-background text-foreground px-2 py-0.5 rounded-full border">
                    {tasks.length}
                </span>
            </div>

            <div className="flex-1 flex flex-col gap-2 min-h-[60px] overflow-y-auto no-scrollbar">
                {tasks.length === 0 ? (
                    <div className={`flex-1 flex items-center justify-center rounded-md border border-dashed min-h-[80px] transition-colors ${isOver ? 'border-primary/40 bg-primary/5' : 'border-border/50'
                        }`}>
                        <p className="text-xs text-muted-foreground/50 select-none">
                            {isOver ? 'Drop here' : 'Drop tasks here'}
                        </p>
                    </div>
                ) : tasks.map((task) => (
                    <TaskCard
                        key={task.id}
                        task={task}
                        users={users}
                        onView={onViewTask}
                        onEdit={onEditTask}
                        currentUserId={currentUserId}
                        aiEnabled={aiEnabled}
                        readOnly={readOnly}
                        permissions={permissions}
                        onQuickEdit={onQuickEdit}
                    />
                ))}
            </div>
        </div>
    );
}

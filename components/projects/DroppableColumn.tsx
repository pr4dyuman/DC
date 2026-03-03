"use client";

import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
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
    const { setNodeRef } = useDroppable({ id });

    return (
        <div ref={setNodeRef} className="flex h-full min-w-0 w-full flex-col rounded-lg bg-muted/50 p-4 border border-border/50">
            <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-sm uppercase text-muted-foreground">{title}</h3>
                <span className="text-xs font-bold bg-background text-foreground px-2 py-0.5 rounded-full border">
                    {tasks.length}
                </span>
            </div>

            <SortableContext items={tasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
                <div className="flex-1 flex flex-col gap-2 min-h-[100px] overflow-y-auto no-scrollbar">
                    {tasks.length === 0 ? (
                        <div className="flex-1 flex items-center justify-center rounded-md border border-dashed border-border/50 min-h-[80px]">
                            <p className="text-xs text-muted-foreground/50 select-none">Drop tasks here</p>
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
            </SortableContext>
        </div>
    );
}

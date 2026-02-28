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
    permissions?: any; // Avoiding circular dependency/type import issues for now, or import UserPermissions
}

export function DroppableColumn({ id, title, tasks, users, onViewTask, onEditTask, currentUserId, aiEnabled, readOnly, permissions }: DroppableColumnProps) {
    const { setNodeRef } = useDroppable({ id });

    return (
        <div ref={setNodeRef} className="flex h-full min-w-0 w-full flex-col rounded-lg bg-muted/50 p-4 border border-border/50 overflow-hidden">
            <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-sm uppercase text-muted-foreground">{title}</h3>
                <span className="text-xs font-bold bg-background text-foreground px-2 py-0.5 rounded-full border">
                    {tasks.length}
                </span>
            </div>

            <SortableContext items={tasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
                <div className="flex-1 flex flex-col gap-2 min-h-[100px] overflow-y-auto no-scrollbar">
                    {tasks.map((task) => (
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
                        />
                    ))}
                </div>
            </SortableContext>
        </div>
    );
}

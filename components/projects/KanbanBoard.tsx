"use client";

import { useState, useEffect } from "react";
import {
    DndContext,
    DragOverlay,
    closestCorners,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragStartEvent,
    DragOverEvent,
    DragEndEvent,
} from "@dnd-kit/core";
import { arrayMove, sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { Task } from "@/lib/db";
import { updateTaskStatus } from "@/lib/actions"; // Server Action
import { TaskCard } from "./TaskCard";
import { DroppableColumn } from "./DroppableColumn";
import { ViewTaskModal } from "./ViewTaskModal";
import { EditTaskModal } from "./EditTaskModal";

const COLUMNS = ["Todo", "In Progress", "Review", "Done"];

interface KanbanBoardProps {
    initialTasks: Task[];
    projectId: string;
    categories?: { id: string; name: string }[];
    users?: any[];
    currentUserId?: string;
    aiEnabled?: boolean;
    selectedCategory?: string;
}

export function KanbanBoard({ initialTasks, projectId, users, categories = [], currentUserId, aiEnabled, selectedCategory = "All" }: KanbanBoardProps) {
    const [mounted, setMounted] = useState(false);
    const [tasks, setTasks] = useState<Task[]>(initialTasks);
    const [activeTask, setActiveTask] = useState<Task | null>(null);
    // const [selectedCategory, setSelectedCategory] = useState<string>("All"); // Lifted to parent

    // Use IDs to track open modals so we always get the latest task data from 'tasks' state
    const [viewTaskId, setViewTaskId] = useState<string | null>(null);
    const [editTaskId, setEditTaskId] = useState<string | null>(null);

    const viewingTask = tasks.find(t => t.id === viewTaskId);
    const editingTask = tasks.find(t => t.id === editTaskId);

    useEffect(() => {
        setMounted(true);
    }, []);

    useEffect(() => {
        setTasks(initialTasks);
    }, [initialTasks]);

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 5 } }), // Prevent accidental drags
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    );

    const handleDragStart = (event: DragStartEvent) => {
        setActiveTask(event.active.data.current?.task);
    };

    const handleDragOver = (event: DragOverEvent) => {
        // Optional: Add logic for realtime reordering visual feedback if needed
    };

    const handleDragEnd = async (event: DragEndEvent) => {
        const { active, over } = event;

        if (!over) return;

        const taskId = active.id as string;
        const overId = over.id as string;

        // Find the task and the column it was dropped into
        // If dropped on a column container
        let newStatus = overId;

        // If dropped on another task, find that task's status
        if (!COLUMNS.includes(overId)) {
            const overTask = tasks.find(t => t.id === overId);
            if (overTask) newStatus = overTask.status;
        }

        // Update Local State
        setTasks((prev) =>
            prev.map(t =>
                t.id === taskId ? { ...t, status: newStatus as Task['status'] } : t
            )
        );

        setActiveTask(null);

        // Persist to Server
        if (COLUMNS.includes(newStatus) || tasks.find(t => t.id === overId)) {
            await updateTaskStatus(taskId, newStatus as Task['status']);
        }
    };

    const filteredTasks = selectedCategory === "All"
        ? tasks
        : tasks.filter(t => t.category === selectedCategory);

    if (!mounted) {
        return (
            <div className="flex flex-col h-full">
                <div className="mb-4 flex gap-2">
                    <div className="h-9 w-24 bg-muted animate-pulse rounded"></div>
                </div>
                <div className="flex h-full gap-4 overflow-x-auto pb-4">
                    {COLUMNS.map((col) => (
                        <div key={col} className="flex h-full min-w-[290px] w-[290px] flex-col rounded-md bg-muted/50 p-4 border border-dashed">
                            <h3 className="font-semibold mb-3 text-sm text-gray-700">{col}</h3>
                        </div>
                    ))}
                </div>
            </div>
        )
    }

    return (
        <div className="flex flex-col h-full">
            {/* Filter UI removed - handled by parent ProjectView */}

            <DndContext
                sensors={sensors}
                collisionDetection={closestCorners}
                onDragStart={handleDragStart}
                onDragOver={handleDragOver}
                onDragEnd={handleDragEnd}
            >
                <div className="flex h-full gap-4 overflow-x-auto pb-4">
                    {COLUMNS.map((col) => (
                        <DroppableColumn
                            key={col}
                            id={col}
                            title={col}
                            tasks={filteredTasks.filter(t => t.status === col)}
                            users={users || []}
                            onViewTask={(task) => setViewTaskId(task.id)}
                            onEditTask={(task) => setEditTaskId(task.id)}
                            currentUserId={currentUserId}
                            aiEnabled={aiEnabled}
                        />
                    ))}
                </div>

                <DragOverlay>
                    {activeTask ? (
                        <TaskCard
                            task={activeTask}
                            users={users || []}
                            onView={() => { }}
                            onEdit={() => { }}
                            aiEnabled={aiEnabled}
                            currentUserId={currentUserId}
                        />
                    ) : null}
                </DragOverlay>
            </DndContext>

            {viewingTask && (
                <ViewTaskModal
                    task={viewingTask}
                    open={!!viewingTask}
                    setOpen={(open) => !open && setViewTaskId(null)}
                    onEdit={() => {
                        setEditTaskId(viewingTask.id);
                        setViewTaskId(null);
                    }}
                    users={users}
                />
            )}

            {editingTask && (
                <EditTaskModal
                    task={editingTask}
                    open={!!editingTask}
                    setOpen={(open) => !open && setEditTaskId(null)}
                />
            )}
        </div>
    );
}

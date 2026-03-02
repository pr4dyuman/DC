"use client";

import { useState, useEffect, useTransition } from "react";
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
import { Task, UserPermissions } from "@/lib/types";
import { updateTaskStatus, updateTask } from "@/lib/actions";
import { TaskCard } from "./TaskCard";
import { toast } from "sonner";
import { DroppableColumn } from "./DroppableColumn";
import { ViewTaskModal } from "./ViewTaskModal";
import { EditTaskModal } from "./EditTaskModal";

const COLUMNS = ["Todo", "In Progress", "Review", "Done"];

const COLUMN_COLORS: Record<string, string> = {
    "Todo": "text-muted-foreground",
    "In Progress": "text-blue-500",
    "Review": "text-yellow-500",
    "Done": "text-emerald-500",
};

interface KanbanBoardProps {
    initialTasks: Task[];
    projectId: string;
    categories?: { id: string; name: string }[];
    users?: any[];
    currentUserId?: string;
    aiEnabled?: boolean;
    selectedCategory?: string;
    readOnly?: boolean;
    permissions?: UserPermissions;
}

export function KanbanBoard({ initialTasks, projectId, users, categories = [], currentUserId, aiEnabled, selectedCategory = "All", readOnly = false, permissions }: KanbanBoardProps) {
    const [mounted, setMounted] = useState(false);
    const [tasks, setTasks] = useState<Task[]>(initialTasks);
    const [activeTask, setActiveTask] = useState<Task | null>(null);
    const [activeColumn, setActiveColumn] = useState(0); // mobile: which column tab is active

    const [viewTaskId, setViewTaskId] = useState<string | null>(null);
    const [editTaskId, setEditTaskId] = useState<string | null>(null);

    const viewingTask = tasks.find(t => t.id === viewTaskId);
    const editingTask = tasks.find(t => t.id === editTaskId);

    useEffect(() => { setMounted(true); }, []);
    useEffect(() => { setTasks(initialTasks); }, [initialTasks]);

    const pointerSensor = useSensor(PointerSensor, {
        activationConstraint: { distance: 5 },
        disabled: readOnly
    });
    const keyboardSensor = useSensor(KeyboardSensor, {
        coordinateGetter: sortableKeyboardCoordinates,
        disabled: readOnly
    });
    const sensors = useSensors(pointerSensor, keyboardSensor);

    const handleDragStart = (event: DragStartEvent) => {
        if (readOnly) return;
        if (permissions && !permissions.canManageTasks && !permissions.canMarkDone) return;
        setActiveTask(event.active.data.current?.task);
    };

    const handleDragOver = (event: DragOverEvent) => { };

    const handleDragEnd = async (event: DragEndEvent) => {
        if (readOnly) return;
        const { active, over } = event;
        if (!over) return;

        const taskId = active.id as string;
        const overId = over.id as string;

        let newStatus = overId;
        if (!COLUMNS.includes(overId)) {
            const overTask = tasks.find(t => t.id === overId);
            if (overTask) newStatus = overTask.status;
        }

        if (permissions) {
            if (newStatus === 'Done') {
                if (!permissions.canMarkDone) {
                    setActiveTask(null);
                    toast.error("You don't have permission to mark tasks as Done.");
                    return;
                }
            } else {
                if (!permissions.canManageTasks) {
                    setActiveTask(null);
                    toast.error("You don't have permission to manage task status.");
                    return;
                }
            }
        }

        setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: newStatus as Task['status'] } : t));
        setActiveTask(null);

        if (COLUMNS.includes(newStatus) || tasks.find(t => t.id === overId)) {
            try {
                await updateTaskStatus(taskId, newStatus as Task['status']);
            } catch (e) {
                setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: active.data.current?.task?.status } : t));
                toast.error("Failed to move task");
            }
        }
    };

    // Called from TaskCard for quick inline edits (priority / assignee)
    const handleQuickEdit = (taskId: string, patch: Partial<Task>) => {
        setTasks(prev => prev.map(t => t.id === taskId ? { ...t, ...patch } : t));
    };

    const filteredTasks = selectedCategory === "All"
        ? tasks
        : tasks.filter(t => t.category === selectedCategory);

    if (!mounted) {
        return (
            <div className="flex flex-col h-full">
                <div className="grid grid-cols-2 md:grid-cols-4 h-full gap-4 pb-4">
                    {COLUMNS.map((col) => (
                        <div key={col} className="flex h-full min-w-0 w-full flex-col rounded-md bg-muted/50 p-4 border border-dashed">
                            <h3 className="font-semibold mb-3 text-sm text-foreground">{col}</h3>
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full gap-4">
            {/* Mobile: column tab selector */}
            <div className="flex md:hidden rounded-lg bg-muted p-1 gap-1">
                {COLUMNS.map((col, i) => {
                    const count = filteredTasks.filter(t => t.status === col).length;
                    return (
                        <button
                            key={col}
                            onClick={() => setActiveColumn(i)}
                            className={`flex-1 flex items-center justify-center gap-1.5 rounded-md py-1.5 text-xs font-semibold transition-all ${activeColumn === i
                                ? 'bg-background shadow-sm text-foreground'
                                : 'text-muted-foreground hover:text-foreground'
                                }`}
                        >
                            <span className={activeColumn === i ? COLUMN_COLORS[col] : ''}>
                                {col === "In Progress" ? "Progress" : col}
                            </span>
                            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${activeColumn === i ? 'bg-primary/10 text-primary' : 'bg-muted-foreground/10'}`}>
                                {count}
                            </span>
                        </button>
                    );
                })}
            </div>

            <DndContext
                sensors={sensors}
                collisionDetection={closestCorners}
                onDragStart={handleDragStart}
                onDragOver={handleDragOver}
                onDragEnd={handleDragEnd}
            >
                {/* Desktop: all 4 columns */}
                <div className="hidden md:grid grid-cols-4 h-full gap-4 pb-4">
                    {COLUMNS.map((col) => (
                        <DroppableColumn
                            key={col}
                            id={col}
                            title={col}
                            tasks={filteredTasks.filter(t => t.status === col)}
                            users={users || []}
                            onViewTask={(task) => setViewTaskId(task.id)}
                            onEditTask={(task) => !readOnly && setEditTaskId(task.id)}
                            currentUserId={currentUserId}
                            aiEnabled={aiEnabled}
                            readOnly={readOnly}
                            permissions={permissions}
                            onQuickEdit={handleQuickEdit}
                        />
                    ))}
                </div>

                {/* Mobile: single active column */}
                <div className="flex md:hidden h-full pb-4">
                    <DroppableColumn
                        key={COLUMNS[activeColumn]}
                        id={COLUMNS[activeColumn]}
                        title={COLUMNS[activeColumn]}
                        tasks={filteredTasks.filter(t => t.status === COLUMNS[activeColumn])}
                        users={users || []}
                        onViewTask={(task) => setViewTaskId(task.id)}
                        onEditTask={(task) => !readOnly && setEditTaskId(task.id)}
                        currentUserId={currentUserId}
                        aiEnabled={aiEnabled}
                        readOnly={readOnly}
                        permissions={permissions}
                        onQuickEdit={handleQuickEdit}
                    />
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
                            permissions={permissions}
                            onQuickEdit={() => { }}
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
                    readOnly={readOnly}
                    permissions={permissions}
                    currentUserId={currentUserId}
                />
            )}

            {editingTask && (
                <EditTaskModal
                    task={editingTask}
                    open={!!editingTask}
                    setOpen={(open) => !open && setEditTaskId(null)}
                    permissions={permissions}
                    currentUserId={currentUserId}
                />
            )}
        </div>
    );
}

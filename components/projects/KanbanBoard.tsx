"use client";

import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import {
    DndContext,
    DragOverlay,
    KeyboardSensor,
    PointerSensor,
    TouchSensor,
    useSensor,
    useSensors,
    DragStartEvent,
    DragEndEvent,
    rectIntersection,
    CollisionDetection,
} from "@dnd-kit/core";
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

// Custom collision detection: checks if pointer is within any column's bounding rect
// Handles both desktop IDs ("Todo") and mobile IDs ("mobile-Todo")
const kanbanCollision: CollisionDetection = (args) => {
    const { pointerCoordinates, droppableContainers } = args;
    if (!pointerCoordinates) return rectIntersection(args);

    const { x, y } = pointerCoordinates;
    const collisions: { id: string | number; data: { droppableContainer: any; value: number } }[] = [];

    for (const container of droppableContainers) {
        const id = container.id as string;
        const colName = id.startsWith('mobile-') ? id.slice(7) : id;
        if (!COLUMNS.includes(colName)) continue;

        const rect = container.rect.current;
        if (!rect || (rect.width === 0 && rect.height === 0)) continue;

        if (
            x >= rect.left && x <= rect.left + rect.width &&
            y >= rect.top && y <= rect.top + rect.height
        ) {
            collisions.push({
                id: container.id,
                data: { droppableContainer: container, value: 0 },
            });
        }
    }

    return collisions;
};

export function KanbanBoard({ initialTasks, projectId, users, categories = [], currentUserId, aiEnabled, selectedCategory = "All", readOnly = false, permissions }: KanbanBoardProps) {
    const [mounted, setMounted] = useState(false);
    const [tasks, setTasks] = useState<Task[]>(initialTasks);
    const [activeTask, setActiveTask] = useState<Task | null>(null);
    const [activeColumn, setActiveColumn] = useState(0);
    const overlayRef = useRef<HTMLDivElement>(null);

    const [viewTaskId, setViewTaskId] = useState<string | null>(null);
    const [editTaskId, setEditTaskId] = useState<string | null>(null);

    const viewingTask = tasks.find(t => t.id === viewTaskId);
    const editingTask = tasks.find(t => t.id === editTaskId);

    useEffect(() => { setMounted(true); }, []);
    useEffect(() => { setTasks(initialTasks); }, [initialTasks]);

    // Track mouse/touch position for custom drag overlay — direct DOM manipulation for smooth 60fps
    useEffect(() => {
        if (!activeTask) return;
        let rafId: number;
        const updateOverlay = (clientX: number, clientY: number) => {
            cancelAnimationFrame(rafId);
            rafId = requestAnimationFrame(() => {
                if (overlayRef.current) {
                    overlayRef.current.style.transform = `translate3d(${clientX - 140}px, ${clientY - 20}px, 0)`;
                }
            });
        };
        const mouseHandler = (e: MouseEvent) => updateOverlay(e.clientX, e.clientY);
        const touchHandler = (e: TouchEvent) => {
            if (e.touches.length > 0) {
                updateOverlay(e.touches[0].clientX, e.touches[0].clientY);
            }
        };
        window.addEventListener('mousemove', mouseHandler, { passive: true });
        window.addEventListener('touchmove', touchHandler, { passive: true });
        return () => {
            window.removeEventListener('mousemove', mouseHandler);
            window.removeEventListener('touchmove', touchHandler);
            cancelAnimationFrame(rafId);
        };
    }, [activeTask]);

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
        useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } }),
        useSensor(KeyboardSensor)
    );

    const handleDragStart = (event: DragStartEvent) => {
        if (readOnly) return;
        if (permissions && !permissions.canManageTasks && !permissions.canMarkDone) return;
        const pointerEvent = event.activatorEvent as MouseEvent;
        if (pointerEvent && overlayRef.current) {
            overlayRef.current.style.transform = `translate3d(${pointerEvent.clientX - 140}px, ${pointerEvent.clientY - 20}px, 0)`;
        }
        setActiveTask(event.active.data.current?.task);
    };

    const handleDragEnd = async (event: DragEndEvent) => {
        const draggedTask = activeTask;
        setActiveTask(null);
        if (readOnly || !draggedTask) return;

        const { over } = event;
        if (!over) return;

        const taskId = draggedTask.id;
        const rawOverId = over.id as string;
        // Strip mobile- prefix if present
        const overId = rawOverId.startsWith('mobile-') ? rawOverId.slice(7) : rawOverId;

        // Determine target column
        let newStatus: string | null = null;
        if (COLUMNS.includes(overId)) {
            newStatus = overId;
        }

        if (!newStatus || newStatus === draggedTask.status) return;

        // Permission check
        if (permissions) {
            if (newStatus === 'Done' && !permissions.canMarkDone) {
                toast.error("You don't have permission to mark tasks as Done.");
                return;
            }
            if (newStatus !== 'Done' && !permissions.canManageTasks) {
                toast.error("You don't have permission to manage task status.");
                return;
            }
        }

        // Optimistic update
        setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: newStatus as Task['status'] } : t));

        try {
            await updateTaskStatus(taskId, newStatus as Task['status']);
        } catch (e) {
            setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: draggedTask.status } : t));
            toast.error("Failed to move task");
        }
    };

    const handleQuickEdit = (taskId: string, patch: Partial<Task>) => {
        setTasks(prev => prev.map(t => t.id === taskId ? { ...t, ...patch } : t));
    };

    // Mobile: direct status change (replaces drag-and-drop)
    const handleMobileStatusChange = async (taskId: string, newStatus: Task['status']) => {
        if (readOnly) return;
        const task = tasks.find(t => t.id === taskId);
        if (!task || task.status === newStatus) return;

        // Permission check
        if (permissions) {
            if (newStatus === 'Done' && !permissions.canMarkDone) {
                toast.error("You don't have permission to mark tasks as Done.");
                return;
            }
            if (newStatus !== 'Done' && !permissions.canManageTasks) {
                toast.error("You don't have permission to manage task status.");
                return;
            }
        }

        const oldStatus = task.status;
        // Optimistic update
        setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: newStatus } : t));

        try {
            await updateTaskStatus(taskId, newStatus);
            toast.success(`Moved to ${newStatus}`);
        } catch {
            setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: oldStatus } : t));
            toast.error("Failed to move task");
        }
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
                collisionDetection={kanbanCollision}
                onDragStart={handleDragStart}
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

                {/* Mobile: single active column — uses 'mobile-' prefix to avoid ID conflict with desktop */}
                <div className="flex md:hidden h-full pb-4">
                    <DroppableColumn
                        key={`mobile-${COLUMNS[activeColumn]}`}
                        id={`mobile-${COLUMNS[activeColumn]}`}
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
                        disableDrag={true}
                        onStatusChange={handleMobileStatusChange}
                    />
                </div>

                <DragOverlay dropAnimation={null} />
            </DndContext>

            {/* Custom drag overlay via portal to document.body */}
            {mounted && createPortal(
                <div
                    ref={overlayRef}
                    style={{
                        position: 'fixed',
                        left: 0,
                        top: 0,
                        width: 'min(280px, 85vw)',
                        zIndex: 99999,
                        pointerEvents: 'none',
                        willChange: 'transform',
                        display: activeTask ? 'block' : 'none',
                    }}
                >
                    {activeTask && (
                        <TaskCard
                            task={activeTask}
                            users={users || []}
                            onView={() => { }}
                            onEdit={() => { }}
                            aiEnabled={aiEnabled}
                            currentUserId={currentUserId}
                            permissions={permissions}
                            onQuickEdit={() => { }}
                            dragOverlay={true}
                        />
                    )}
                </div>,
                document.body
            )}

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

"use client";

import { useState, useEffect, useRef, useTransition } from "react";
import { useDateFormat } from "@/context/TimezoneContext";
import { useDraggable } from "@dnd-kit/core";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Task, UserPermissions, getDefaultUserPermissionsForRole } from "@/lib/types";
import { Sparkles, Calendar, ArrowRightLeft } from "lucide-react";
import { toLocalCalendarDay } from "@/lib/date-utils";
import { getTaskAssigneeIds } from "@/lib/task-assignees";
import { AIExplanationModal } from "./AIExplanationModal";
import { TaskCardAssigneeMenu } from "./TaskCardAssigneeMenu";
import { TaskCardStatusSheet } from "./TaskCardStatusSheet";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { updateTask, getUsers } from "@/lib/actions";
import {
    PRIORITY_CYCLE,
    PRIORITY_STYLES,
    type TaskAssignee,
    type TaskPriority,
} from "./task-card-shared";

interface TaskCardProps {
    task: Task;
    users?: TaskAssignee[];
    readOnly?: boolean;
    permissions?: UserPermissions;
    currentUserRole?: string;
    onQuickEdit?: (taskId: string, patch: Partial<Task>) => void;
    dragOverlay?: boolean;
    disableDrag?: boolean;
    onStatusChange?: (taskId: string, newStatus: Task["status"]) => void;
}

export function TaskCard({
    task,
    users = [],
    onView,
    onEdit,
    currentUserId,
    currentUserRole,
    readOnly,
    permissions,
    onQuickEdit,
    dragOverlay = false,
    disableDrag = false,
    onStatusChange,
}: TaskCardProps & {
    onView: (task: Task) => void;
    onEdit: (task: Task) => void;
    currentUserId?: string;
}) {
    const fmt = useDateFormat();
    const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
        id: task.id,
        data: { task },
        disabled: dragOverlay || disableDrag,
    });

    const searchParams = useSearchParams();
    const shouldHighlight = searchParams.get("task") === task.id;
    const [isHighlighted, setIsHighlighted] = useState(false);
    const cardRef = useRef<HTMLDivElement>(null);
    const [showAIModal, setShowAIModal] = useState(false);
    const [showAssigneeMenu, setShowAssigneeMenu] = useState(false);
    const [showStatusMenu, setShowStatusMenu] = useState(false);
    const assigneeMenuRef = useRef<HTMLDivElement>(null);
    const [isPending, startTransition] = useTransition();
    const [loadedAssigneeOptions, setLoadedAssigneeOptions] = useState<TaskAssignee[] | null>(null);
    const defaultAssigneeOptions = users.filter((user) => user.role?.toLowerCase() !== "client");
    const effectivePermissions = permissions ?? getDefaultUserPermissionsForRole(currentUserRole);

    useEffect(() => {
        if (shouldHighlight) {
            const frameId = window.requestAnimationFrame(() => {
                cardRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
                setIsHighlighted(true);
            });
            const timeoutId = window.setTimeout(() => setIsHighlighted(false), 2000);
            return () => {
                window.cancelAnimationFrame(frameId);
                window.clearTimeout(timeoutId);
            };
        }
    }, [shouldHighlight]);

    useEffect(() => {
        const handler = (event: MouseEvent) => {
            if (assigneeMenuRef.current && !assigneeMenuRef.current.contains(event.target as Node)) {
                setShowAssigneeMenu(false);
            }
        };
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, []);

    const canManageTaskFields = !readOnly && effectivePermissions.canManageTasks;
    const canOpenEditModal = !readOnly && (
        effectivePermissions.canManageTasks ||
        effectivePermissions.deleteAccess === "any" ||
        (effectivePermissions.deleteAccess === "own" && task.createdBy === currentUserId)
    );
    const canMoveTaskStatus = !readOnly && (effectivePermissions.canManageTasks || effectivePermissions.canMarkDone);
    const canReassignTask = !readOnly && (currentUserRole === "admin" || currentUserRole === "manager");

    useEffect(() => {
        if (!showAssigneeMenu || !canReassignTask) return;

        let cancelled = false;
        getUsers()
            .then((loadedUsers) => {
                if (!cancelled) {
                    setLoadedAssigneeOptions(loadedUsers.filter((user) => user.role !== "client"));
                }
            })
            .catch((error) => {
                console.error("Failed to load assignable users", error);
            });

        return () => {
            cancelled = true;
        };
    }, [showAssigneeMenu, canReassignTask]);

    const style: React.CSSProperties = dragOverlay
        ? { cursor: "grabbing" }
        : disableDrag
            ? { opacity: 1 }
            : { opacity: isDragging ? 0.4 : 1, cursor: "grab" };

    const assigneeOptions = loadedAssigneeOptions ?? defaultAssigneeOptions;
    const assigneeLookup = assigneeOptions.length > 0 ? assigneeOptions : users;
    const assigneeIds = getTaskAssigneeIds(task);
    const assignees = assigneeIds
        .map((assigneeId) => assigneeLookup.find((user) => user.id === assigneeId))
        .filter((user): user is TaskAssignee => Boolean(user));
    const assigneeLabel = assignees.length > 0
        ? assignees.map((assignee) => assignee.name).join(", ")
        : "Unassigned";

    const handlePriorityClick = (event: React.MouseEvent) => {
        event.stopPropagation();
        if (!canManageTaskFields) return;
        const current = (task.priority as TaskPriority) || "Medium";
        const next = PRIORITY_CYCLE[(PRIORITY_CYCLE.indexOf(current) + 1) % PRIORITY_CYCLE.length];
        onQuickEdit?.(task.id, { priority: next });
        startTransition(async () => {
            try {
                await updateTask(task.id, { priority: next });
            } catch (error) {
                onQuickEdit?.(task.id, { priority: current });
                toast.error(error instanceof Error ? error.message : "Failed to update priority");
            }
        });
    };

    const handleAssigneeToggle = (userId: string) => {
        if (!canReassignTask) return;
        const previousAssigneeIds = assigneeIds;
        const nextAssigneeIds = previousAssigneeIds.includes(userId)
            ? previousAssigneeIds.filter((id) => id !== userId)
            : [...previousAssigneeIds, userId];
        onQuickEdit?.(task.id, { assigneeIds: nextAssigneeIds, assigneeId: nextAssigneeIds[0] || "" });
        startTransition(async () => {
            try {
                await updateTask(task.id, { assigneeIds: nextAssigneeIds, assigneeId: nextAssigneeIds[0] || "" });
            } catch (error) {
                onQuickEdit?.(task.id, { assigneeIds: previousAssigneeIds, assigneeId: previousAssigneeIds[0] || "" });
                toast.error(error instanceof Error ? error.message : "Failed to update assignees");
            }
        });
    };

    const handleAssigneeClear = () => {
        if (!canReassignTask) return;
        const previousAssigneeIds = assigneeIds;
        onQuickEdit?.(task.id, { assigneeIds: [], assigneeId: "" });
        startTransition(async () => {
            try {
                await updateTask(task.id, { assigneeIds: [], assigneeId: "" });
            } catch (error) {
                onQuickEdit?.(task.id, { assigneeIds: previousAssigneeIds, assigneeId: previousAssigneeIds[0] || "" });
                toast.error(error instanceof Error ? error.message : "Failed to update assignees");
            }
        });
    };

    const handleStatusChange = (newStatus: Task["status"]) => {
        setShowStatusMenu(false);
        if (!canMoveTaskStatus || newStatus === task.status) return;
        onQuickEdit?.(task.id, { status: newStatus });
        onStatusChange?.(task.id, newStatus);
    };

    const handleEditClick = (event: React.MouseEvent) => {
        event.stopPropagation();
        onEdit(task);
    };

    const handleExplainClick = (event: React.MouseEvent) => {
        event.stopPropagation();
        setShowAIModal(true);
    };

    const priority = task.priority as TaskPriority | undefined;
    const today = toLocalCalendarDay(fmt.dateKey(new Date()));

    return (
        <div
            ref={dragOverlay ? undefined : setNodeRef}
            style={style}
            {...(dragOverlay ? {} : attributes)}
            {...(dragOverlay || disableDrag ? {} : listeners)}
            className={`mb-3 ${disableDrag ? "" : "touch-none"}`}
        >
            <div ref={cardRef}>
                <Card
                    onClick={() => onView(task)}
                    className={`cursor-pointer bg-card border-border hover:border-primary/50 transition-all duration-300 shadow-sm hover:shadow-md group relative ${isHighlighted ? "ring-2 ring-yellow-500 border-yellow-500 shadow-[0_0_15px_rgba(234,179,8,0.3)]" : ""} ${isPending ? "opacity-70" : ""}`}
                >
                    <div className="p-4 flex items-start justify-between gap-3">
                        <div className="flex-1 space-y-2 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                                <h4 className="font-medium text-sm text-foreground leading-tight break-words">{task.title}</h4>
                                <div className="flex items-center gap-1 shrink-0">
                                    <button
                                        onClick={handlePriorityClick}
                                        title={canManageTaskFields ? `Priority: ${priority || "None"} - click to change` : `Priority: ${priority || "None"}`}
                                        className={`text-[10px] sm:text-[9px] font-bold px-2 py-1 sm:px-1.5 sm:py-0.5 rounded-full transition-colors ${priority ? PRIORITY_STYLES[priority] : "bg-muted text-muted-foreground hover:bg-muted/80"} ${canManageTaskFields ? "cursor-pointer" : "cursor-default"}`}
                                    >
                                        {priority || "—"}
                                    </button>

                                    {canOpenEditModal && (
                                        <button
                                            onClick={handleEditClick}
                                            className="max-sm:opacity-100 opacity-0 group-hover:opacity-100 transition-opacity p-1.5 sm:p-1 hover:bg-accent rounded-md text-muted-foreground hover:text-foreground shrink-0"
                                            title="Edit task"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" /><path d="m15 5 4 4" /></svg>
                                        </button>
                                    )}
                                </div>
                            </div>

                            <div className="relative flex items-center gap-2" ref={assigneeMenuRef}>
                                <button
                                    onClick={(event) => {
                                        event.stopPropagation();
                                        if (canReassignTask && users.length > 0) setShowAssigneeMenu((previous) => !previous);
                                    }}
                                    className={`flex items-center gap-2 min-w-0 ${canReassignTask ? "cursor-pointer hover:opacity-80" : "cursor-default"}`}
                                    title={canReassignTask ? "Click to change assignees" : assigneeLabel}
                                >
                                    <div className="flex -space-x-1 shrink-0">
                                        {assignees.length > 0 ? assignees.slice(0, 3).map((assignee) => (
                                            <Avatar key={assignee.id} className={`h-5 w-5 border border-background transition-all ${canReassignTask ? "group-hover:ring-1 group-hover:ring-primary" : ""}`}>
                                                <AvatarImage src={assignee.avatar} />
                                                <AvatarFallback className="text-[9px] bg-primary/10 text-primary font-medium">
                                                    {assignee.name.substring(0, 2).toUpperCase()}
                                                </AvatarFallback>
                                            </Avatar>
                                        )) : (
                                            <Avatar className={`h-5 w-5 border border-border transition-all ${canReassignTask ? "group-hover:ring-1 group-hover:ring-primary" : ""}`}>
                                                <AvatarFallback className="text-[9px] bg-primary/10 text-primary font-medium">?</AvatarFallback>
                                            </Avatar>
                                        )}
                                    </div>
                                    <span className="text-xs text-muted-foreground font-medium truncate">
                                        {assignees.length === 1 ? (
                                            <>
                                                {assignees[0].name}
                                                {(assignees[0].jobTitle || (assignees[0].role && ["admin", "manager", "client"].includes(assignees[0].role.toLowerCase()))) && (
                                                    <span className="text-yellow-600 dark:text-yellow-500 ml-1">
                                                        ({assignees[0].jobTitle || (assignees[0].role ? assignees[0].role.charAt(0).toUpperCase() + assignees[0].role.slice(1) : "")})
                                                    </span>
                                                )}
                                            </>
                                        ) : assignees.length > 1 ? `${assignees.length} assignees` : "Unassigned"}
                                    </span>
                                </button>

                                <TaskCardAssigneeMenu
                                    open={showAssigneeMenu}
                                    assigneeOptions={assigneeOptions}
                                    currentAssigneeIds={assigneeIds}
                                    onToggle={handleAssigneeToggle}
                                    onClear={handleAssigneeClear}
                                />
                            </div>

                            {task.description && (
                                <div className="w-full overflow-hidden">
                                    <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed break-words">
                                        {task.description}
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="px-4 pb-3 pt-0">
                        <div className="flex items-center gap-2 text-[11px] sm:text-[10px] text-muted-foreground font-medium min-w-0 flex-wrap pt-2.5 border-t border-border/40">
                            {task.dueDate && (() => {
                                const due = toLocalCalendarDay(fmt.dateKey(task.dueDate));
                                const isOverdue = !!due && !!today && due < today && task.status !== "Done";
                                return (
                                    <div className={`flex items-center gap-1.5 shrink-0 ${isOverdue ? "text-red-500" : ""}`}>
                                        <Calendar className={`w-3 h-3 shrink-0 ${isOverdue ? "text-red-500" : "text-yellow-500"}`} />
                                        <span className={isOverdue ? "font-semibold" : ""}>{fmt.dateShort(task.dueDate)}{isOverdue ? " ⚠" : ""}</span>
                                    </div>
                                );
                            })()}

                            {task.category && (
                                <div className="flex items-center gap-1.5 text-muted-foreground/70 min-w-0 overflow-hidden">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-tag shrink-0"><path d="M12 2H2v10l9.29 9.29c.94.94 2.48.94 3.42 0l6.58-6.58c.94-.94.94-2.48 0-3.42L12 2Z" /><path d="M7 7h.01" /></svg>
                                    <span className="truncate">{task.category}</span>
                                </div>
                            )}

                            {task.estimatedHours && task.estimatedHours > 0 && (
                                <div className={`flex items-center gap-1 shrink-0 px-1.5 py-0.5 rounded-md font-semibold ${task.status === "Done" ? "bg-emerald-500/15 text-emerald-500" : "bg-cyan-500/15 text-cyan-500 dark:text-cyan-400"}`}>
                                    {task.status === "Done" ? (
                                        <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="shrink-0"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>
                                    ) : (
                                        <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
                                    )}
                                    <span>{task.estimatedHours}h</span>
                                </div>
                            )}

                            <div className="flex items-center shrink-0 ml-auto gap-1.5">
                                {disableDrag && canMoveTaskStatus && (
                                    <button
                                        onClick={(event) => {
                                            event.stopPropagation();
                                            setShowStatusMenu((previous) => !previous);
                                        }}
                                        className="flex items-center gap-1 transition-colors px-2 py-1 rounded-md text-muted-foreground/70 hover:text-foreground hover:bg-accent active:bg-accent"
                                        title="Move to..."
                                    >
                                        <ArrowRightLeft className="w-3.5 h-3.5 shrink-0" />
                                        <span className="text-[10px] font-semibold">Move</span>
                                    </button>
                                )}
                                {effectivePermissions.canUseAI && (
                                    <button
                                        onClick={handleExplainClick}
                                        className="flex items-center gap-1 transition-colors px-2 py-1 sm:px-1.5 sm:py-0.5 rounded-md text-muted-foreground/60 hover:text-foreground hover:bg-accent"
                                        title="Explain this task with AI"
                                    >
                                        <Sparkles className="w-3.5 h-3.5 sm:w-3 sm:h-3 shrink-0" />
                                        <span className="text-[10px] sm:text-[9px] font-medium">Explain</span>
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </Card>

                <AIExplanationModal
                    taskId={task.id}
                    open={showAIModal}
                    onOpenChange={setShowAIModal}
                    userId={currentUserId}
                />
            </div>

            <TaskCardStatusSheet
                open={showStatusMenu}
                taskTitle={task.title}
                currentStatus={task.status}
                onSelectStatus={handleStatusChange}
                onClose={() => setShowStatusMenu(false)}
            />
        </div>
    );
}

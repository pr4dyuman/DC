"use client";

import { useState, useEffect, useRef, useTransition } from "react";
import { createPortal } from "react-dom";
import { useDateFormat } from "@/context/TimezoneContext";
import { useDraggable } from "@dnd-kit/core";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Task, UserPermissions } from "@/lib/types";
import { Sparkles, Calendar, Flag, ArrowRightLeft } from "lucide-react";
import { toLocalCalendarDay } from "@/lib/date-utils";

const STATUS_ORDER = ['Todo', 'In Progress', 'Review', 'Done'] as const;
import { AIExplanationModal } from "./AIExplanationModal";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { updateTask, getUsers } from "@/lib/actions";

type TaskPriority = 'Low' | 'Medium' | 'High';
const PRIORITY_CYCLE: TaskPriority[] = ['Low', 'Medium', 'High'];
const PRIORITY_STYLES: Record<TaskPriority, string> = {
    High: 'bg-red-500/15 text-red-500 hover:bg-red-500/25',
    Medium: 'bg-amber-500/15 text-amber-500 hover:bg-amber-500/25',
    Low: 'bg-blue-500/15 text-blue-500 hover:bg-blue-500/25',
};

interface TaskCardProps {
    task: Task;
    users?: { id: string; name: string; avatar?: string; jobTitle?: string; role?: string }[];
    readOnly?: boolean;
    permissions?: UserPermissions;
    onQuickEdit?: (taskId: string, patch: Partial<Task>) => void;
    dragOverlay?: boolean;
    disableDrag?: boolean;
    onStatusChange?: (taskId: string, newStatus: Task['status']) => void;
}

export function TaskCard({ task, users = [], onView, onEdit, currentUserId, readOnly, permissions, onQuickEdit, dragOverlay = false, disableDrag = false, onStatusChange }: TaskCardProps & { onView: (task: Task) => void; onEdit: (task: Task) => void; currentUserId?: string }) {
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
    const [mounted, setMounted] = useState(false);
    const [assigneeOptions, setAssigneeOptions] = useState(users.filter(u => u.role?.toLowerCase() !== 'client'));

    useEffect(() => { setMounted(true); }, []);

    useEffect(() => {
        setAssigneeOptions(users.filter(u => u.role?.toLowerCase() !== 'client'));
    }, [users]);

    useEffect(() => {
        if (shouldHighlight) {
            setIsHighlighted(true);
            cardRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
            const t = setTimeout(() => setIsHighlighted(false), 2000);
            return () => clearTimeout(t);
        }
    }, [shouldHighlight]);

    // Close assignee menu on outside click
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (assigneeMenuRef.current && !assigneeMenuRef.current.contains(e.target as Node)) {
                setShowAssigneeMenu(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    const canEdit = !readOnly && ((permissions?.canManageTasks ?? true) || permissions?.deleteAccess === 'any' || (permissions?.deleteAccess === 'own' && task.createdBy === currentUserId));

    useEffect(() => {
        if (!showAssigneeMenu || !canEdit) return;

        let cancelled = false;
        getUsers()
            .then((loadedUsers) => {
                if (!cancelled) {
                    setAssigneeOptions(loadedUsers.filter((user) => user.role !== 'client'));
                }
            })
            .catch((error) => {
                console.error("Failed to load assignable users", error);
            });

        return () => {
            cancelled = true;
        };
    }, [showAssigneeMenu, canEdit]);

    const style: React.CSSProperties = dragOverlay
        ? { cursor: 'grabbing' }
        : disableDrag
            ? { opacity: 1 }
            : { opacity: isDragging ? 0.4 : 1, cursor: 'grab' };

    const assigneeLookup = assigneeOptions.length > 0 ? assigneeOptions : users;
    const assignee = assigneeLookup.find(u => u.id === task.assigneeId);


    // ── Quick: cycle priority ─────────────────────────────────────────────────
    const handlePriorityClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!canEdit) return;
        const current = (task.priority as TaskPriority) || 'Medium';
        const next = PRIORITY_CYCLE[(PRIORITY_CYCLE.indexOf(current) + 1) % PRIORITY_CYCLE.length];
        onQuickEdit?.(task.id, { priority: next });
        startTransition(async () => {
            try {
                await updateTask(task.id, { priority: next });
            } catch {
                onQuickEdit?.(task.id, { priority: current }); // revert
                toast.error("Failed to update priority");
            }
        });
    };

    // ── Quick: change assignee ────────────────────────────────────────────────
    const handleAssigneeChange = (e: React.MouseEvent, userId: string) => {
        e.stopPropagation();
        setShowAssigneeMenu(false);
        if (!canEdit) return;
        const prev = task.assigneeId;
        onQuickEdit?.(task.id, { assigneeId: userId });
        startTransition(async () => {
            try {
                await updateTask(task.id, { assigneeId: userId });
            } catch {
                onQuickEdit?.(task.id, { assigneeId: prev }); // revert
                toast.error("Failed to update assignee");
            }
        });
    };

    // ── Quick: change status (mobile) ──────────────────────────────────────────
    const handleStatusChange = (e: React.MouseEvent, newStatus: string) => {
        e.stopPropagation();
        setShowStatusMenu(false);
        if (!canEdit || newStatus === task.status) return;
        onQuickEdit?.(task.id, { status: newStatus as Task['status'] });
        onStatusChange?.(task.id, newStatus as Task['status']);
    };

    const handleEditClick = (e: React.MouseEvent) => { e.stopPropagation(); onEdit(task); };
    const handleExplainClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        setShowAIModal(true);
    };

    const priority = task.priority as TaskPriority | undefined;
    const today = toLocalCalendarDay(fmt.dateKey(new Date()));

    return (
        <div ref={dragOverlay ? undefined : setNodeRef} style={style} {...(dragOverlay ? {} : attributes)} {...(dragOverlay || disableDrag ? {} : listeners)} className={`mb-3 ${disableDrag ? '' : 'touch-none'}`}>
            <div ref={cardRef}>
                <Card
                    onClick={() => onView(task)}
                    className={`cursor-pointer bg-card border-border hover:border-primary/50 transition-all duration-300 shadow-sm hover:shadow-md group relative ${isHighlighted ? 'ring-2 ring-yellow-500 border-yellow-500 shadow-[0_0_15px_rgba(234,179,8,0.3)]' : ''} ${isPending ? 'opacity-70' : ''}`}
                >
                    {/* Header */}
                    <div className="p-4 flex items-start justify-between gap-3">
                        <div className="flex-1 space-y-2 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                                <h4 className="font-medium text-sm text-foreground leading-tight break-words">{task.title}</h4>
                                <div className="flex items-center gap-1 shrink-0">
                                    {/* Quick priority toggle */}
                                    <button
                                        onClick={handlePriorityClick}
                                        title={canEdit ? `Priority: ${priority || 'None'} — click to change` : `Priority: ${priority || 'None'}`}
                                        className={`text-[10px] sm:text-[9px] font-bold px-2 py-1 sm:px-1.5 sm:py-0.5 rounded-full transition-colors ${priority ? PRIORITY_STYLES[priority] : 'bg-muted text-muted-foreground hover:bg-muted/80'
                                            } ${canEdit ? 'cursor-pointer' : 'cursor-default'}`}
                                    >
                                        {priority || '—'}
                                    </button>

                                    {/* Edit pencil */}
                                    {canEdit && (
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

                            {/* Quick assignee change */}
                            <div className="relative flex items-center gap-2" ref={assigneeMenuRef}>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        if (canEdit && users.length > 0) setShowAssigneeMenu(v => !v);
                                    }}
                                    className={`flex items-center gap-2 min-w-0 ${canEdit ? 'cursor-pointer hover:opacity-80' : 'cursor-default'}`}
                                    title={canEdit ? "Click to change assignee" : assignee?.name || "Unassigned"}
                                >
                                    <Avatar className={`h-5 w-5 border border-border transition-all ${canEdit ? 'group-hover:ring-1 group-hover:ring-primary' : ''}`}>
                                        <AvatarImage src={assignee?.avatar} />
                                        <AvatarFallback className="text-[9px] bg-primary/10 text-primary font-medium">
                                            {assignee ? assignee.name.substring(0, 2).toUpperCase() : "?"}
                                        </AvatarFallback>
                                    </Avatar>
                                    <span className="text-xs text-muted-foreground font-medium truncate">
                                        {assignee ? (
                                            <>
                                                {assignee.name}
                                                {(assignee.jobTitle || (assignee.role && ['admin', 'manager', 'client'].includes(assignee.role.toLowerCase()))) && (
                                                    <span className="text-yellow-600 dark:text-yellow-500 ml-1">
                                                        ({assignee.jobTitle || (assignee.role ? assignee.role.charAt(0).toUpperCase() + assignee.role.slice(1) : '')})
                                                    </span>
                                                )}
                                            </>
                                        ) : "Unassigned"}
                                    </span>
                                </button>

                                {/* Assignee dropdown */}
                                {showAssigneeMenu && (
                                    <div
                                        className="absolute top-7 left-0 z-50 w-52 rounded-lg border border-border bg-popover shadow-lg py-1"
                                        onClick={e => e.stopPropagation()}
                                    >
                                        <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground border-b border-border mb-1">
                                            Assign to
                                        </div>
                                        <div className="max-h-48 overflow-y-auto no-scrollbar">
                                        {assigneeOptions.map(u => (
                                                <button
                                                    key={u.id}
                                                    onClick={(e) => handleAssigneeChange(e, u.id)}
                                                    className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm hover:bg-accent transition-colors ${u.id === task.assigneeId ? 'bg-primary/5 text-primary font-medium' : 'text-foreground'}`}
                                                >
                                                    <Avatar className="h-6 w-6 border border-border shrink-0">
                                                        <AvatarImage src={u.avatar} />
                                                        <AvatarFallback className="text-[9px] bg-primary/10 text-primary font-bold">{u.name?.substring(0, 2).toUpperCase()}</AvatarFallback>
                                                    </Avatar>
                                                    <div className="flex-1 min-w-0 text-left">
                                                        <div className="truncate font-medium text-xs">{u.name}</div>
                                                        <div className="truncate text-[10px] text-muted-foreground">{u.jobTitle || u.role}</div>
                                                    </div>
                                                    {u.id === task.assigneeId && <span className="text-xs text-primary shrink-0">✓</span>}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}
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

                    {/* Footer */}
                    <div className="px-4 pb-3 pt-0">
                        <div className="flex items-center gap-2 text-[11px] sm:text-[10px] text-muted-foreground font-medium min-w-0 flex-wrap pt-2.5 border-t border-border/40">
                            {task.dueDate && (() => {
                                const due = toLocalCalendarDay(fmt.dateKey(task.dueDate));
                                const isOverdue = !!due && !!today && due < today && task.status !== 'Done';
                                return (
                                    <div className={`flex items-center gap-1.5 shrink-0 ${isOverdue ? 'text-red-500' : ''}`}>
                                        <Calendar className={`w-3 h-3 shrink-0 ${isOverdue ? 'text-red-500' : 'text-yellow-500'}`} />
                                        <span className={isOverdue ? 'font-semibold' : ''}>{fmt.dateShort(task.dueDate)}{isOverdue ? ' ⚠' : ''}</span>
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
                                <div className={`flex items-center gap-1 shrink-0 px-1.5 py-0.5 rounded-md font-semibold ${task.status === 'Done' ? 'bg-emerald-500/15 text-emerald-500' : 'bg-cyan-500/15 text-cyan-500 dark:text-cyan-400'}`}>
                                    {task.status === 'Done' ? (
                                        <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="shrink-0"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>
                                    ) : (
                                        <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
                                    )}
                                    <span>{task.estimatedHours}h</span>
                                </div>
                            )}

                            <div className="flex items-center shrink-0 ml-auto gap-1.5">
                                {/* Mobile: quick status change */}
                                {disableDrag && canEdit && (
                                    <button
                                        onClick={(e) => { e.stopPropagation(); setShowStatusMenu(v => !v); }}
                                        className="flex items-center gap-1 transition-colors px-2 py-1 rounded-md text-muted-foreground/70 hover:text-foreground hover:bg-accent active:bg-accent"
                                        title="Move to..."
                                    >
                                        <ArrowRightLeft className="w-3.5 h-3.5 shrink-0" />
                                        <span className="text-[10px] font-semibold">Move</span>
                                    </button>
                                )}
                                <button
                                    onClick={handleExplainClick}
                                    className="flex items-center gap-1 transition-colors px-2 py-1 sm:px-1.5 sm:py-0.5 rounded-md text-muted-foreground/60 hover:text-foreground hover:bg-accent"
                                    title="Explain this task with AI"
                                >
                                    <Sparkles className="w-3.5 h-3.5 sm:w-3 sm:h-3 shrink-0" />
                                    <span className="text-[10px] sm:text-[9px] font-medium">Explain</span>
                                </button>
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

            {/* Portal: Status change bottom sheet (renders outside all overflow containers) */}
            {mounted && showStatusMenu && createPortal(
                <div
                    className="fixed inset-0 z-[99999] flex items-end justify-center bg-black/40 backdrop-blur-[2px]"
                    onClick={(e) => { e.stopPropagation(); setShowStatusMenu(false); }}
                >
                    <div
                        className="w-full max-w-sm mx-4 mb-6 rounded-xl border border-border bg-popover shadow-2xl overflow-hidden animate-in slide-in-from-bottom-4 duration-200"
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="px-4 py-3 text-xs font-bold uppercase tracking-widest text-muted-foreground border-b border-border bg-muted/30">
                            Move &ldquo;{task.title.length > 30 ? task.title.slice(0, 30) + '…' : task.title}&rdquo;
                        </div>
                        {STATUS_ORDER.map(s => (
                            <button
                                key={s}
                                onClick={(e) => handleStatusChange(e, s)}
                                className={`w-full text-left px-4 py-3.5 text-sm flex items-center gap-3 transition-colors active:bg-accent/80 ${s === task.status ? 'bg-primary/5 text-primary font-semibold' : 'text-foreground hover:bg-accent'}`}
                            >
                                <span className={`inline-block w-2.5 h-2.5 rounded-full shrink-0 ${s === 'Done' ? 'bg-emerald-500' :
                                    s === 'In Progress' ? 'bg-blue-500' :
                                        s === 'Review' ? 'bg-yellow-500' :
                                            'bg-muted-foreground/40'
                                    }`} />
                                <span className="flex-1">{s}</span>
                                {s === task.status && <span className="text-primary text-base">✓</span>}
                            </button>
                        ))}
                        <button
                            onClick={(e) => { e.stopPropagation(); setShowStatusMenu(false); }}
                            className="w-full text-center px-4 py-3 text-sm font-medium text-muted-foreground border-t border-border hover:bg-accent transition-colors"
                        >
                            Cancel
                        </button>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
}

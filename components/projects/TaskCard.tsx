"use client";

import { useState, useEffect, useRef } from "react";
import { format } from "date-fns";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Task } from "@/lib/types";
import { Sparkles, Calendar } from "lucide-react";
import { AIExplanationModal } from "./AIExplanationModal";
import { useSearchParams } from "next/navigation";

interface TaskCardProps {
    task: Task;
    aiEnabled?: boolean;
    users?: any[];
    readOnly?: boolean;
    permissions?: any; // Avoiding circular dependency
}

export function TaskCard({ task, users = [], onView, onEdit, currentUserId, aiEnabled, readOnly, permissions }: TaskCardProps & { onView: (task: Task) => void; onEdit: (task: Task) => void; currentUserId?: string; aiEnabled?: boolean }) {

    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging
    } = useSortable({ id: task.id, data: { task } });

    const searchParams = useSearchParams();
    const shouldHighlight = searchParams.get("task") === task.id;
    const [isHighlighted, setIsHighlighted] = useState(false);
    const cardRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (shouldHighlight) {
            setIsHighlighted(true);
            if (cardRef.current) {
                cardRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
            }
            const timer = setTimeout(() => {
                setIsHighlighted(false);
            }, 2000);
            return () => clearTimeout(timer);
        }
    }, [shouldHighlight]);

    const [showAIModal, setShowAIModal] = useState(false);

    // Hack: Infer current user ID from the user list if possible or passed prop
    // Ideally TaskCard should receive currentUserId prop. Let's fix this properly.
    // For now assuming the first user in list is NOT necessarily the current user.
    // We need to update component signature.


    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
    };

    const assignee = users.find(u => u.id === task.assigneeId);

    const handleCardClick = (e: React.MouseEvent) => {
        // Prevent opening if clicking specific interactive elements if any
        onView(task);
    };

    const handleEditClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        onEdit(task);
    };

    const handleExplainClick = (e: React.MouseEvent) => {
        e.stopPropagation();

        if (aiEnabled === false) {
            alert("Please enable AI features in Project Settings to use this.");
            return;
        }

        setShowAIModal(true);
    };

    const isAiDisabled = aiEnabled === false;

    return (
        <div ref={setNodeRef} style={style} {...attributes} {...listeners} className="touch-none mb-3">
            <div ref={cardRef}>
                <Card
                    onClick={handleCardClick}
                    className={`cursor-pointer bg-card border-border hover:border-primary/50 transition-all duration-500 shadow-sm hover:shadow-md group relative ${isHighlighted ? 'ring-2 ring-yellow-500 border-yellow-500 shadow-[0_0_15px_rgba(234,179,8,0.3)]' : ''}`}
                >
                    {/* Header with Title and Edit Button */}
                    <div className="p-4 flex items-start justify-between gap-3">
                        <div className="flex-1 space-y-2 min-w-0"> {/* Added min-w-0 for flex child truncation */}
                            <div className="flex items-start justify-between gap-2">
                                <h4 className="font-medium text-sm text-foreground leading-tight break-words">
                                    {task.title}
                                </h4>
                                {!readOnly && (
                                    (permissions?.canManageTasks ?? true) ||
                                    (permissions?.deleteAccess === 'any') ||
                                    (permissions?.deleteAccess === 'own' && task.createdBy === currentUserId)
                                ) && (
                                        <button
                                            onClick={handleEditClick}
                                            className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-accent rounded-md text-muted-foreground hover:text-foreground shrink-0"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-pencil"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" /><path d="m15 5 4 4" /></svg>
                                        </button>
                                    )}
                            </div>

                            <div className="flex items-center gap-2">
                                <Avatar className="h-5 w-5 border border-border">
                                    <AvatarImage src={assignee?.avatar} />
                                    <AvatarFallback className="text-[9px] bg-primary/10 text-primary font-medium">
                                        {assignee ? assignee.name.substring(0, 2).toUpperCase() : "?"}
                                    </AvatarFallback>
                                </Avatar>
                                <span className="text-xs text-muted-foreground font-medium truncate">
                                    {assignee ? (
                                        <>
                                            {assignee.name}
                                            {(assignee.jobTitle || ['admin', 'manager', 'client'].includes(assignee.role?.toLowerCase())) && (
                                                <span className="text-yellow-600 dark:text-yellow-500 ml-1">
                                                    ({assignee.jobTitle || assignee.role.charAt(0).toUpperCase() + assignee.role.slice(1)})
                                                </span>
                                            )}
                                        </>
                                    ) : "Unassigned"}
                                </span>
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

                    {/* Footer Info */}
                    <div className="px-4 pb-4 pt-0 flex items-center justify-between">
                        <div className="flex items-center gap-3 text-[10px] text-muted-foreground font-medium">
                            {task.dueDate && (
                                <div className="flex items-center gap-1.5">
                                    <Calendar className="w-3 h-3 text-yellow-500" />
                                    <span>{format(new Date(task.dueDate), "MMM d")}</span>
                                </div>
                            )}

                            {task.category && (
                                <div className="flex items-center gap-1.5 text-indigo-500/80">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-tag"><path d="M12 2H2v10l9.29 9.29c.94.94 2.48.94 3.42 0l6.58-6.58c.94-.94.94-2.48 0-3.42L12 2Z" /><path d="M7 7h.01" /></svg>
                                    <span className="truncate max-w-[100px]">{task.category}</span>
                                </div>
                            )}

                            <div className="flex items-center">
                                <button
                                    onClick={handleExplainClick}
                                    className={`flex items-center gap-1 transition-colors px-1.5 py-0.5 rounded-md ${isAiDisabled
                                        ? "text-zinc-300 dark:text-zinc-600 cursor-not-allowed"
                                        : "text-indigo-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30"}`}
                                    title={isAiDisabled ? "AI Disabled in Settings" : "Explain this task with AI"}
                                >
                                    <Sparkles className="w-3 h-3" />
                                    <span className="text-[9px] font-medium">Explain</span>
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
            </div >
        </div >
    );
}

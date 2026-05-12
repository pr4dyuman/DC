"use client";

import { useState, useTransition, useOptimistic } from "react";
import { differenceInCalendarDays } from "date-fns";
import { useDateFormat } from "@/context/TimezoneContext";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Task, Comment, UserPermissions, getDefaultUserPermissionsForRole } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { addComment } from "@/lib/actions";
import { toLocalCalendarDay } from "@/lib/date-utils";
import { Pencil } from "lucide-react";
import { ViewTaskModalComments } from "./ViewTaskModalComments";
import { ViewTaskModalDescription } from "./ViewTaskModalDescription";
import { ViewTaskModalHeader } from "./ViewTaskModalHeader";
import { ViewTaskModalMetadataGrid } from "./ViewTaskModalMetadataGrid";
import {
    STATUS_CONFIGS,
    type TaskAssignee,
    type ViewTaskCurrentUser,
} from "./view-task-modal-shared";

interface ViewTaskModalProps {
    task: Task;
    open: boolean;
    setOpen: (open: boolean) => void;
    onEdit: () => void;
    users?: TaskAssignee[];
    readOnly?: boolean;
    permissions?: UserPermissions;
    currentUserId?: string;
    currentUserRole?: string;
}

export function ViewTaskModal({
    task,
    open,
    setOpen,
    onEdit,
    users = [],
    readOnly,
    permissions,
    currentUserId,
    currentUserRole,
}: ViewTaskModalProps) {
    const fmt = useDateFormat();
    const assignee = users.find((user) => user.id === task.assigneeId);
    const currentUser: ViewTaskCurrentUser = users.find((user) => user.id === currentUserId) || {
        id: currentUserId || "",
        name: "You",
        avatar: "",
    };

    const [commentText, setCommentText] = useState("");
    const [isPending, startTransition] = useTransition();

    const [optimisticComments, addOptimisticComment] = useOptimistic(
        task.comments || [],
        (state: Comment[], newComment: Comment) => [...state, newComment]
    );

    const handleAddComment = () => {
        if (!commentText.trim() || !currentUserId) return;

        const tempComment: Comment = {
            id: Math.random().toString(),
            userId: currentUserId,
            text: commentText,
            timestamp: new Date().toISOString(),
        };

        startTransition(async () => {
            addOptimisticComment(tempComment);
            setCommentText("");
            await addComment(task.id, currentUserId, commentText);
        });
    };

    const today = toLocalCalendarDay(fmt.dateKey(new Date()));
    const dueDate = task.dueDate ? toLocalCalendarDay(fmt.dateKey(task.dueDate)) : null;
    const dueDiff = dueDate && today ? differenceInCalendarDays(dueDate, today) : null;
    const isOverdue = dueDiff !== null && dueDiff < 0 && task.status !== "Done";

    const statusConfig = STATUS_CONFIGS[task.status] || STATUS_CONFIGS.Todo;
    const effectivePermissions = permissions ?? getDefaultUserPermissionsForRole(currentUserRole);

    const comments = [...optimisticComments].sort(
        (first, second) =>
            new Date(first.timestamp).getTime() - new Date(second.timestamp).getTime()
    );

    const canEdit = !readOnly && (
        effectivePermissions.canManageTasks ||
        effectivePermissions.deleteAccess === "any" ||
        (effectivePermissions.deleteAccess === "own" && task.createdBy === currentUserId)
    );

    const createdByName = task.createdBy
        ? users.find((user) => user.id === task.createdBy)?.name || "Unknown"
        : undefined;

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogContent className="max-w-[95vw] sm:max-w-3xl p-0 gap-0 overflow-hidden border-none shadow-2xl bg-background max-h-[90dvh] flex flex-col">
                <DialogTitle className="sr-only">{task.title}</DialogTitle>

                <DialogHeader className="p-6 pb-4 border-b border-border bg-background shrink-0">
                    <ViewTaskModalHeader
                        task={task}
                        statusConfig={statusConfig}
                        isOverdue={isOverdue}
                        dueDiff={dueDiff}
                    />
                </DialogHeader>

                <div className="flex-1 overflow-y-auto p-6 space-y-8 no-scrollbar">
                    <ViewTaskModalMetadataGrid
                        task={task}
                        assignee={assignee}
                        createdByName={createdByName}
                    />

                    <ViewTaskModalDescription description={task.description} />

                    <ViewTaskModalComments
                        comments={comments}
                        users={users}
                        currentUserId={currentUserId}
                        currentUser={currentUser}
                        commentText={commentText}
                        setCommentText={setCommentText}
                        handleAddComment={handleAddComment}
                        isPending={isPending}
                    />
                </div>

                {canEdit && (
                    <div className="p-4 border-t border-border bg-muted/20 flex justify-end shrink-0">
                        <Button
                            onClick={() => {
                                setOpen(false);
                                onEdit();
                            }}
                            className="gap-2"
                        >
                            <Pencil className="h-4 w-4" />
                            Edit Task
                        </Button>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}

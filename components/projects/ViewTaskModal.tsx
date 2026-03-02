"use client";

import { useState, useTransition, useOptimistic } from "react";
import { format, differenceInCalendarDays } from "date-fns";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Task, Comment } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { addComment } from "@/lib/actions";
import {
    Calendar,
    Clock,
    Pencil,
    User,
    Tag,
    AlignLeft,
    CheckCircle2,
    Circle,
    Timer,
    AlertCircle,
    MessageSquare,
    Send,
    Flag,
} from "lucide-react";

interface ViewTaskModalProps {
    task: Task;
    open: boolean;
    setOpen: (open: boolean) => void;
    onEdit: () => void;
    users?: any[];
    readOnly?: boolean;
    permissions?: any;
    currentUserId?: string;
}

const PRIORITY_STYLES: Record<string, string> = {
    High: "bg-red-500/15 text-red-500 border-red-500/30",
    Medium: "bg-amber-500/15 text-amber-600 border-amber-500/30",
    Low: "bg-blue-500/15 text-blue-500 border-blue-500/30",
};

const STATUS_CONFIGS: Record<string, { color: string; icon: any }> = {
    Done: { color: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30", icon: CheckCircle2 },
    "In Progress": { color: "bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/30", icon: Timer },
    Review: { color: "bg-yellow-500/15 text-yellow-700 dark:text-yellow-400 border-yellow-500/30", icon: AlertCircle },
    Todo: { color: "bg-muted text-muted-foreground border-border", icon: Circle },
};

export function ViewTaskModal({ task, open, setOpen, onEdit, users = [], readOnly, permissions, currentUserId }: ViewTaskModalProps) {
    const assignee = users.find(u => u.id === task.assigneeId);
    // Fix: use actual logged-in user, not first user in array
    const currentUser = users.find(u => u.id === currentUserId) || { id: currentUserId || "", name: "You", avatar: "" };

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
            timestamp: new Date().toISOString()
        };
        startTransition(async () => {
            addOptimisticComment(tempComment);
            setCommentText("");
            await addComment(task.id, currentUserId, commentText);
        });
    };

    // Overdue/days calculation
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const dueDiff = task.dueDate ? differenceInCalendarDays(new Date(task.dueDate), today) : null;
    const isOverdue = dueDiff !== null && dueDiff < 0 && task.status !== 'Done';

    const statusConfig = STATUS_CONFIGS[task.status] || STATUS_CONFIGS.Todo;
    const StatusIcon = statusConfig.icon;

    const comments = [...optimisticComments].sort((a, b) =>
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );

    const canEdit = !readOnly && (
        (permissions?.canManageTasks ?? true) ||
        permissions?.deleteAccess === 'any' ||
        (permissions?.deleteAccess === 'own' && task.createdBy === currentUserId)
    );

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogContent className="max-w-3xl p-0 gap-0 overflow-hidden border-none shadow-2xl bg-background h-[85vh] flex flex-col">

                {/* Fixed Header */}
                <DialogHeader className="p-6 pb-4 border-b border-border bg-background shrink-0">
                    <div className="space-y-3">
                        <div className="flex items-center gap-2 flex-wrap">
                            <span className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${statusConfig.color} transition-colors`}>
                                <StatusIcon className="w-3.5 h-3.5" />
                                {task.status}
                            </span>
                            {task.priority && (
                                <span className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${PRIORITY_STYLES[task.priority]}`}>
                                    <Flag className="w-3 h-3" />
                                    {task.priority} Priority
                                </span>
                            )}
                            {task.category && (
                                <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
                                    <Tag className="w-3 h-3" />
                                    {task.category}
                                </span>
                            )}
                            {isOverdue && (
                                <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-500/10 text-red-500 border border-red-500/20">
                                    <AlertCircle className="w-3 h-3" />
                                    {Math.abs(dueDiff!)}d overdue
                                </span>
                            )}
                            {!isOverdue && dueDiff !== null && dueDiff <= 3 && task.status !== 'Done' && (
                                <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-600 border border-amber-500/20">
                                    <Clock className="w-3 h-3" />
                                    {dueDiff === 0 ? 'Due today' : `${dueDiff}d left`}
                                </span>
                            )}
                        </div>
                        <DialogTitle className="text-2xl font-bold text-foreground leading-tight break-words">
                            {task.title}
                        </DialogTitle>
                    </div>
                </DialogHeader>

                {/* Scrollable Body */}
                <div className="flex-1 overflow-y-auto p-6 space-y-8 no-scrollbar">

                    {/* Metadata Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-muted/30 p-5 rounded-xl border border-border/50">
                        {/* Assignee */}
                        <div className="flex flex-col space-y-3">
                            <div className="flex items-center gap-2 mb-1">
                                <div className="p-1.5 bg-background rounded-md border border-border shadow-sm">
                                    <User className="w-3.5 h-3.5 text-muted-foreground" />
                                </div>
                                <label className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground">Assignee</label>
                            </div>
                            <div className="flex items-center gap-3 pl-1">
                                <Avatar className="h-9 w-9 border-2 border-background shadow-sm">
                                    <AvatarImage src={assignee?.avatar} />
                                    <AvatarFallback className="bg-indigo-500/10 text-indigo-600 text-xs font-bold">
                                        {assignee?.name?.substring(0, 2).toUpperCase() || "?"}
                                    </AvatarFallback>
                                </Avatar>
                                <div className="flex flex-col">
                                    <span className="text-sm font-semibold text-foreground leading-none mb-1">
                                        {assignee ? assignee.name : "Unassigned"}
                                    </span>
                                    <span className="text-[11px] text-muted-foreground truncate max-w-[120px]">
                                        {assignee?.jobTitle || assignee?.email || ""}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Due Date */}
                        <div className="flex flex-col space-y-3 md:border-l md:border-border/50 md:pl-6">
                            <div className="flex items-center gap-2 mb-1">
                                <div className="p-1.5 bg-background rounded-md border border-border shadow-sm">
                                    <Calendar className={`w-3.5 h-3.5 ${isOverdue ? 'text-red-500' : 'text-yellow-500'}`} />
                                </div>
                                <label className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground">Due Date</label>
                            </div>
                            <div className="flex flex-col pl-1">
                                {task.dueDate ? (
                                    <>
                                        <span className={`text-sm font-semibold leading-none mb-1 ${isOverdue ? 'text-red-500' : 'text-foreground'}`}>
                                            {format(new Date(task.dueDate), "MMMM do, yyyy")}
                                        </span>
                                        <span className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                                            <Clock className="w-3 h-3" />
                                            {format(new Date(task.dueDate), "h:mm a")}
                                            {dueDiff !== null && (
                                                <span className={isOverdue ? 'text-red-500 font-semibold' : dueDiff <= 3 ? 'text-amber-500 font-semibold' : ''}>
                                                    {isOverdue ? ` • ${Math.abs(dueDiff)}d overdue` : dueDiff === 0 ? ' • Due today' : ` • ${dueDiff}d left`}
                                                </span>
                                            )}
                                        </span>
                                    </>
                                ) : (
                                    <span className="text-sm text-muted-foreground italic">No due date set</span>
                                )}
                            </div>
                        </div>

                        {/* Created On */}
                        <div className="flex flex-col space-y-3 md:border-l md:border-border/50 md:pl-6">
                            <div className="flex items-center gap-2 mb-1">
                                <div className="p-1.5 bg-background rounded-md border border-border shadow-sm">
                                    <Timer className="w-3.5 h-3.5 text-muted-foreground" />
                                </div>
                                <label className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground">Created On</label>
                            </div>
                            {task.createdAt ? (
                                <div className="flex flex-col pl-1">
                                    <span className="text-sm font-semibold text-foreground leading-none mb-1">
                                        {format(new Date(task.createdAt), "MMMM do, yyyy")}
                                    </span>
                                    <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                                        <span>{format(new Date(task.createdAt), "h:mm a")}</span>
                                        {task.createdBy && (
                                            <>
                                                <span className="w-1 h-1 rounded-full bg-border" />
                                                <span>by <span className="text-foreground font-medium">{users.find(u => u.id === task.createdBy)?.name || "Unknown"}</span></span>
                                            </>
                                        )}
                                    </div>
                                </div>
                            ) : (
                                <span className="text-sm text-muted-foreground italic pl-1">Unknown</span>
                            )}
                        </div>
                    </div>

                    {/* Description */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 pb-2 border-b border-border">
                            <AlignLeft className="w-5 h-5 text-indigo-500" />
                            <h3 className="text-lg font-semibold text-foreground">Description</h3>
                        </div>
                        {task.description ? (
                            <div className="text-sm leading-7 text-foreground break-words whitespace-pre-wrap">
                                {task.description}
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center py-10 text-muted-foreground bg-muted/30 rounded-lg border border-dashed border-border">
                                <AlignLeft className="w-8 h-8 mb-2 opacity-40" />
                                <p className="text-sm">No description provided for this task.</p>
                            </div>
                        )}
                    </div>

                    {/* Comments */}
                    <div className="space-y-6 pt-2">
                        <div className="flex items-center gap-2 pb-2 border-b border-border">
                            <MessageSquare className="w-5 h-5 text-indigo-500" />
                            <h3 className="text-lg font-semibold text-foreground">
                                Comments <span className="text-muted-foreground text-sm font-normal ml-1">({comments.length})</span>
                            </h3>
                        </div>

                        <div className="space-y-4">
                            {comments.length === 0 ? (
                                <p className="text-sm text-muted-foreground italic">No comments yet. Be the first to start a discussion.</p>
                            ) : comments.map((comment) => {
                                const commentUser = users.find(u => u.id === comment.userId);
                                const isMe = comment.userId === currentUserId;
                                return (
                                    <div key={comment.id} className={`flex gap-3 ${isMe ? 'flex-row-reverse' : ''}`}>
                                        <Avatar className="h-8 w-8 border border-border mt-1 shrink-0">
                                            <AvatarImage src={commentUser?.avatar} />
                                            <AvatarFallback className="bg-muted text-muted-foreground text-xs">
                                                {commentUser?.name?.substring(0, 2).toUpperCase() || "?"}
                                            </AvatarFallback>
                                        </Avatar>
                                        <div className={`flex-1 space-y-1 ${isMe ? 'items-end' : ''}`}>
                                            <div className={`flex items-center gap-2 ${isMe ? 'flex-row-reverse' : ''}`}>
                                                <span className="text-sm font-semibold text-foreground">
                                                    {isMe ? 'You' : (commentUser?.name || "Unknown")}
                                                </span>
                                                <span className="text-[10px] text-muted-foreground">
                                                    {format(new Date(comment.timestamp), "MMM d, p")}
                                                </span>
                                            </div>
                                            <div className={`text-sm text-foreground p-3 rounded-lg border border-border ${isMe ? 'bg-indigo-500/10 rounded-tr-none ml-8' : 'bg-muted/50 rounded-tl-none mr-8'}`}>
                                                {comment.text}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Add Comment */}
                        {currentUserId && (
                            <div className="flex gap-3 pt-2">
                                <Avatar className="h-8 w-8 border border-border mt-1 shrink-0">
                                    <AvatarImage src={currentUser?.avatar} />
                                    <AvatarFallback className="bg-indigo-500/10 text-indigo-600 text-xs">
                                        {currentUser?.name?.substring(0, 2).toUpperCase() || "ME"}
                                    </AvatarFallback>
                                </Avatar>
                                <div className="flex-1 space-y-2">
                                    <Textarea
                                        placeholder="Ask a question or post an update..."
                                        value={commentText}
                                        onChange={(e) => setCommentText(e.target.value)}
                                        onKeyDown={e => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleAddComment(); }}
                                        className="min-h-[72px] text-sm resize-none"
                                    />
                                    <div className="flex items-center justify-between">
                                        <span className="text-[10px] text-muted-foreground">Ctrl+Enter to post</span>
                                        <Button
                                            size="sm"
                                            onClick={handleAddComment}
                                            disabled={!commentText.trim() || isPending}
                                            className="gap-2"
                                        >
                                            <Send className="w-3.5 h-3.5" />
                                            {isPending ? "Posting..." : "Post"}
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Fixed Footer */}
                {canEdit && (
                    <div className="p-4 border-t border-border bg-muted/20 flex justify-end shrink-0">
                        <Button
                            onClick={() => { setOpen(false); onEdit(); }}
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

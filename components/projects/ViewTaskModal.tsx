"use client";

import { useState, useTransition, useOptimistic } from "react";
import { format } from "date-fns";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Task, Comment } from "@/lib/db";
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
    Send
} from "lucide-react";

interface ViewTaskModalProps {
    task: Task;
    open: boolean;
    setOpen: (open: boolean) => void;
    onEdit: () => void;
    users?: any[];
}

export function ViewTaskModal({ task, open, setOpen, onEdit, users = [] }: ViewTaskModalProps) {
    const assignee = users.find(u => u.id === task.assigneeId);
    const [commentText, setCommentText] = useState("");
    const [isPending, startTransition] = useTransition();

    const [optimisticComments, addOptimisticComment] = useOptimistic(
        task.comments || [],
        (state: Comment[], newComment: Comment) => [newComment, ...state]
    );

    // Mock current user for now - in real app would come from auth context
    // Ideally we should pass currentUser from parent or context
    const currentUser = users[0] || { id: "u1", name: "Guest", avatar: "" };

    const handleAddComment = () => {
        if (!commentText.trim()) return;

        const tempComment: Comment = {
            id: Math.random().toString(),
            userId: currentUser.id,
            text: commentText,
            timestamp: new Date().toISOString()
        };

        startTransition(async () => {
            addOptimisticComment(tempComment);
            setCommentText(""); // Clear input immediately
            await addComment(task.id, currentUser.id, commentText);
        });
    };

    const getStatusConfig = (status: string) => {
        switch (status) {
            case "Done": return { color: "bg-green-100 text-green-700 border-green-200", icon: CheckCircle2 };
            case "In Progress": return { color: "bg-blue-100 text-blue-700 border-blue-200", icon: Timer };
            case "Review": return { color: "bg-yellow-100 text-yellow-700 border-yellow-200", icon: AlertCircle };
            default: return { color: "bg-slate-100 text-slate-700 border-slate-200", icon: Circle };
        }
    };

    const statusConfig = getStatusConfig(task.status);
    const StatusIcon = statusConfig.icon;

    // Use optimistic comments for rendering
    // Note: My reducer prepends new comment, and I also sort below, so sorting logic should be applied to optimisticComments.
    // Actually, simply sorting optimisticComments by timestamp desc handles both existing and new.
    const comments = [...optimisticComments].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogContent className="max-w-3xl p-0 gap-0 overflow-hidden border-none shadow-2xl bg-background h-[85vh] flex flex-col">

                {/* Fixed Header */}
                <DialogHeader className="p-6 pb-4 border-b border-border bg-background shrink-0">
                    <div className="flex items-start justify-between gap-4">
                        <div className="space-y-1.5 flex-1 pr-6">
                            <div className="flex items-center gap-2 mb-2">
                                <span className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${statusConfig.color} transition-colors`}>
                                    <StatusIcon className="w-3.5 h-3.5" />
                                    {task.status}
                                </span>
                                {task.category && (
                                    <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-indigo-50 text-indigo-700 border border-indigo-100">
                                        <Tag className="w-3 h-3" />
                                        {task.category}
                                    </span>
                                )}
                            </div>
                            <DialogTitle className="text-2xl font-bold text-foreground leading-tight break-words">
                                {task.title}
                            </DialogTitle>
                        </div>
                    </div>
                </DialogHeader>

                {/* Scrollable Body */}
                <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">

                    {/* Metadata Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-secondary/30 p-4 rounded-xl border border-border">
                        {/* Assignee Section */}
                        <div className="flex items-start gap-4">
                            <div className="p-2.5 bg-card rounded-lg border border-border shadow-sm">
                                <User className="w-5 h-5 text-zinc-400" />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Assignee</label>
                                <div className="flex items-center gap-2.5">
                                    <Avatar className="h-8 w-8 border border-zinc-200 dark:border-zinc-700">
                                        <AvatarImage src={assignee?.avatar} />
                                        <AvatarFallback className="bg-indigo-100 text-indigo-600 text-xs font-bold">
                                            {assignee?.name?.substring(0, 2).toUpperCase() || "?"}
                                        </AvatarFallback>
                                    </Avatar>
                                    <div className="flex flex-col">
                                        <span className="text-sm font-semibold text-foreground">
                                            {assignee ? assignee.name : "Unassigned"}
                                        </span>
                                        <span className="text-xs text-zinc-500">
                                            {assignee?.email || "No email"}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Dates Section */}
                        <div className="flex items-start gap-4">
                            <div className="p-2.5 bg-card rounded-lg border border-border shadow-sm">
                                <Calendar className="w-5 h-5 text-zinc-400" />
                            </div>
                            <div className="space-y-3 w-full">
                                <div className="flex flex-col space-y-1">
                                    <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Due Date</label>
                                    <div className="flex items-center gap-2 text-sm font-medium text-zinc-700 dark:text-zinc-300">
                                        {task.dueDate ? (
                                            <>
                                                <span>{format(new Date(task.dueDate), "PPP")}</span>
                                                <span className="text-zinc-300 px-1">•</span>
                                                <span className="text-zinc-500 text-xs flex items-center gap-1">
                                                    <Clock className="w-3 h-3" />
                                                    {format(new Date(task.dueDate), "p")}
                                                </span>
                                            </>
                                        ) : "No due date"}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Description Section */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 pb-2 border-b border-zinc-100 dark:border-zinc-800">
                            <AlignLeft className="w-5 h-5 text-indigo-500" />
                            <h3 className="text-lg font-semibold text-foreground">Description</h3>
                        </div>
                        <div className="prose prose-sm prose-zinc dark:prose-invert max-w-none">
                            {task.description ? (
                                <div className="text-base leading-7 text-zinc-700 dark:text-zinc-200 break-words whitespace-pre-wrap rounded-lg">
                                    {task.description}
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center py-10 text-muted-foreground bg-secondary/30 rounded-lg border border-dashed border-border">
                                    <AlignLeft className="w-10 h-10 mb-2 opacity-50" />
                                    <p className="text-sm">No description provided for this task.</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Comments Section */}
                    <div className="space-y-6 pt-4">
                        <div className="flex items-center gap-2 pb-2 border-b border-zinc-100 dark:border-zinc-800">
                            <MessageSquare className="w-5 h-5 text-indigo-500" />
                            <h3 className="text-lg font-semibold text-foreground">
                                Comments <span className="text-zinc-400 text-sm font-normal ml-1">({comments.length})</span>
                            </h3>
                        </div>

                        {/* Comment List */}
                        <div className="space-y-4">
                            {comments.length === 0 ? (
                                <p className="text-sm text-zinc-500 italic">No comments yet. Be the first to start a discussion.</p>
                            ) : (
                                comments.map((comment) => {
                                    const commentUser = users.find(u => u.id === comment.userId);
                                    return (
                                        <div key={comment.id} className="flex gap-3 group">
                                            <Avatar className="h-8 w-8 border border-zinc-200 dark:border-zinc-700 mt-1">
                                                <AvatarImage src={commentUser?.avatar} />
                                                <AvatarFallback className="bg-slate-100 text-slate-600 text-xs">
                                                    {commentUser?.name?.substring(0, 2).toUpperCase() || "U"}
                                                </AvatarFallback>
                                            </Avatar>
                                            <div className="flex-1 space-y-1">
                                                <div className="flex items-center justify-between">
                                                    <span className="text-sm font-semibold text-foreground">
                                                        {commentUser?.name || "Unknown User"}
                                                    </span>
                                                    <span className="text-[10px] text-zinc-400">
                                                        {format(new Date(comment.timestamp), "MMM d, p")}
                                                    </span>
                                                </div>
                                                <div className="text-sm text-foreground bg-secondary/50 p-3 rounded-lg rounded-tl-none border border-border">
                                                    {comment.text}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>

                        {/* Add Comment Input */}
                        <div className="flex gap-3 pt-2">
                            <Avatar className="h-8 w-8 border border-zinc-200 dark:border-zinc-700 mt-1">
                                <AvatarImage src={currentUser?.avatar} />
                                <AvatarFallback className="bg-indigo-50 text-indigo-600 text-xs">
                                    {currentUser?.name?.substring(0, 2).toUpperCase() || "ME"}
                                </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 space-y-2">
                                <Textarea
                                    placeholder="Ask a question or post an update..."
                                    value={commentText}
                                    onChange={(e) => setCommentText(e.target.value)}
                                    className="min-h-[80px] text-sm resize-none bg-card border-border focus:border-primary focus:ring-primary"
                                />
                                <div className="flex justify-end">
                                    <Button
                                        size="sm"
                                        onClick={handleAddComment}
                                        disabled={!commentText.trim() || isPending}
                                        className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2"
                                    >
                                        <Send className="w-3.5 h-3.5" />
                                        {isPending ? "Posting..." : "Post Comment"}
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </div>

                </div>

                {/* Fixed Footer */}
                <div className="p-4 border-t border-border bg-secondary/30 flex justify-end shrink-0">
                    <Button
                        onClick={() => { setOpen(false); onEdit(); }}
                        className="gap-2 bg-indigo-600 hover:bg-indigo-700 text-white shadow-md hover:shadow-lg transition-all duration-200"
                    >
                        <Pencil className="h-4 w-4" />
                        Edit Task
                    </Button>
                </div>

            </DialogContent>
        </Dialog>
    );
}

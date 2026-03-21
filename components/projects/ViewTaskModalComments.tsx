"use client";

import { useDateFormat } from "@/context/TimezoneContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { MentionTextarea } from "@/components/ui/mention-textarea";
import { renderCommentText } from "@/lib/mention-utils";
import type { Comment } from "@/lib/types";
import { MessageSquare, Send } from "lucide-react";
import type { TaskAssignee, ViewTaskCurrentUser } from "./view-task-modal-shared";

type ViewTaskModalCommentsProps = {
    comments: Comment[];
    users: TaskAssignee[];
    currentUserId?: string;
    currentUser: ViewTaskCurrentUser;
    commentText: string;
    setCommentText: (value: string) => void;
    handleAddComment: () => void;
    isPending: boolean;
};

export function ViewTaskModalComments({
    comments,
    users,
    currentUserId,
    currentUser,
    commentText,
    setCommentText,
    handleAddComment,
    isPending,
}: ViewTaskModalCommentsProps) {
    const fmt = useDateFormat();

    return (
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
                    const commentUser = users.find((user) => user.id === comment.userId);
                    const isMe = comment.userId === currentUserId;
                    return (
                        <div key={comment.id} className={`flex gap-3 ${isMe ? "flex-row-reverse" : ""}`}>
                            <Avatar className="h-8 w-8 border border-border mt-1 shrink-0">
                                <AvatarImage src={commentUser?.avatar} />
                                <AvatarFallback className="bg-muted text-muted-foreground text-xs">
                                    {commentUser?.name?.substring(0, 2).toUpperCase() || "?"}
                                </AvatarFallback>
                            </Avatar>
                            <div className={`flex-1 space-y-1 ${isMe ? "items-end" : ""}`}>
                                <div className={`flex items-center gap-2 ${isMe ? "flex-row-reverse" : ""}`}>
                                    <span className="text-sm font-semibold text-foreground">
                                        {isMe ? "You" : (commentUser?.name || "Unknown")}
                                    </span>
                                    <span className="text-[10px] text-muted-foreground">
                                        {fmt.dateTimeShort(comment.timestamp)}
                                    </span>
                                </div>
                                <div className={`text-sm text-foreground p-3 rounded-lg border border-border whitespace-pre-wrap ${isMe ? "bg-indigo-500/10 rounded-tr-none ml-8" : "bg-muted/50 rounded-tl-none mr-8"}`}>
                                    {renderCommentText(comment.text)}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {currentUserId && (
                <div className="flex gap-3 pt-2">
                    <Avatar className="h-8 w-8 border border-border mt-1 shrink-0">
                        <AvatarImage src={currentUser?.avatar} />
                        <AvatarFallback className="bg-indigo-500/10 text-indigo-600 text-xs">
                            {currentUser?.name?.substring(0, 2).toUpperCase() || "ME"}
                        </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 space-y-2">
                        <MentionTextarea
                            placeholder="Ask a question or post an update... Use @ to mention someone"
                            value={commentText}
                            onChange={setCommentText}
                            users={users}
                            onKeyDown={(event: React.KeyboardEvent<HTMLDivElement>) => {
                                if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) handleAddComment();
                            }}
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
    );
}

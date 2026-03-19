"use client";

import { differenceInCalendarDays } from "date-fns";
import { useDateFormat } from "@/context/TimezoneContext";
import { hasExplicitTime, toLocalCalendarDay } from "@/lib/date-utils";
import type { Task } from "@/lib/types";
import { Calendar, CheckCircle2, Clock, Timer, User } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { TaskAssignee } from "./view-task-modal-shared";

type ViewTaskModalMetadataGridProps = {
    task: Task;
    assignee?: TaskAssignee;
    createdByName?: string;
};

export function ViewTaskModalMetadataGrid({
    task,
    assignee,
    createdByName,
}: ViewTaskModalMetadataGridProps) {
    const fmt = useDateFormat();
    const today = toLocalCalendarDay(fmt.dateKey(new Date()));
    const dueDate = task.dueDate ? toLocalCalendarDay(fmt.dateKey(task.dueDate)) : null;
    const dueDiff = dueDate && today ? differenceInCalendarDays(dueDate, today) : null;
    const isOverdue = dueDiff !== null && dueDiff < 0 && task.status !== "Done";
    const showDueTime = hasExplicitTime(task.dueDate);

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 bg-muted/30 p-5 rounded-xl border border-border/50">
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

            <div className="flex flex-col space-y-3 md:border-l md:border-border/50 md:pl-6">
                <div className="flex items-center gap-2 mb-1">
                    <div className="p-1.5 bg-background rounded-md border border-border shadow-sm">
                        <Calendar className={`w-3.5 h-3.5 ${isOverdue ? "text-red-500" : "text-yellow-500"}`} />
                    </div>
                    <label className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground">Due Date</label>
                </div>
                <div className="flex flex-col pl-1">
                    {task.dueDate ? (
                        <>
                            <span className={`text-sm font-semibold leading-none mb-1 ${isOverdue ? "text-red-500" : "text-foreground"}`}>
                                {fmt.dateLong(task.dueDate)}
                            </span>
                            <span className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                                {showDueTime && (
                                    <>
                                        <Clock className="w-3 h-3" />
                                        {fmt.time12(task.dueDate)}
                                    </>
                                )}
                                {dueDiff !== null && (
                                    <span className={isOverdue ? "text-red-500 font-semibold" : dueDiff <= 3 ? "text-amber-500 font-semibold" : ""}>
                                        {isOverdue ? ` • ${Math.abs(dueDiff)}d overdue` : dueDiff === 0 ? " • Due today" : ` • ${dueDiff}d left`}
                                    </span>
                                )}
                            </span>
                        </>
                    ) : (
                        <span className="text-sm text-muted-foreground italic">No due date set</span>
                    )}
                </div>
            </div>

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
                            {fmt.dateLong(task.createdAt)}
                        </span>
                        <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                            <span>{fmt.time12(task.createdAt)}</span>
                            {createdByName && (
                                <>
                                    <span className="w-1 h-1 rounded-full bg-border" />
                                    <span>by <span className="text-foreground font-medium">{createdByName}</span></span>
                                </>
                            )}
                        </div>
                    </div>
                ) : (
                    <span className="text-sm text-muted-foreground italic pl-1">Unknown</span>
                )}
            </div>

            <div className="flex flex-col space-y-3 md:border-l md:border-border/50 md:pl-6">
                <div className="flex items-center gap-2 mb-1">
                    <div className="p-1.5 bg-background rounded-md border border-border shadow-sm">
                        <Clock className="w-3.5 h-3.5 text-cyan-500" />
                    </div>
                    <label className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground">Est. Hours</label>
                </div>
                <div className="flex flex-col pl-1">
                    {task.estimatedHours && task.estimatedHours > 0 ? (
                        <>
                            <span className="text-2xl font-bold text-cyan-500 dark:text-cyan-400 leading-none mb-1">
                                {task.estimatedHours}h
                            </span>
                            <span className="text-[11px] text-muted-foreground">
                                {task.status === "Done" ? (
                                    <span className="text-emerald-500 font-semibold flex items-center gap-1">
                                        <CheckCircle2 className="w-3 h-3" /> Completed
                                    </span>
                                ) : "Estimated"}
                            </span>
                        </>
                    ) : (
                        <span className="text-sm text-muted-foreground italic">Not set</span>
                    )}
                </div>
            </div>
        </div>
    );
}

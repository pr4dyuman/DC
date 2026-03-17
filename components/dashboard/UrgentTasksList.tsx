"use client";

import { useState, useEffect, useRef } from "react";
import { differenceInCalendarDays } from "date-fns";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useInView } from "react-intersection-observer";
import { getHighPriorityTasks } from "@/lib/actions";
import { Loader2, AlertCircle } from "lucide-react";
import Link from "next/link";
import { toLocalCalendarDay } from "@/lib/date-utils";

interface Task {
    id: string;
    title: string;
    dueDate: string;
    status: string;
    projectId: string;
    projectName: string;
    projectSlug: string;
}

interface UrgentTasksListProps {
    initialTasks: Task[];
}

export function UrgentTasksList({ initialTasks }: UrgentTasksListProps) {
    const [tasks, setTasks] = useState<Task[]>(initialTasks);
    const [offset, setOffset] = useState(initialTasks.length);
    const [hasMore, setHasMore] = useState(true);
    const [loading, setLoading] = useState(false);
    const { ref, inView } = useInView();
    const loadingRef = useRef(false);

    const loadMore = async () => {
        if (loading || !hasMore || loadingRef.current) return;
        loadingRef.current = true;
        setLoading(true);
        try {
            const newTasks = await getHighPriorityTasks(offset, 5);
            if (newTasks.length < 5) setHasMore(false);
            setTasks((prev) => {
                const existingIds = new Set(prev.map((t) => t.id));
                return [...prev, ...newTasks.filter((t: Task) => !existingIds.has(t.id))];
            });
            setOffset((prev) => prev + newTasks.length);
        } catch (error) {
            console.error("Failed to load more urgent tasks", error);
        } finally {
            setLoading(false);
            loadingRef.current = false;
        }
    };

    useEffect(() => {
        if (inView) loadMore();
    }, [inView]);

    const today = toLocalCalendarDay(new Date());

    return (
        <Card className="col-span-4 transition-all duration-300 hover:shadow-md">
            <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Urgent Tasks</CardTitle>
                <span className="text-xs text-amber-500 font-medium bg-amber-500/10 px-2 py-1 rounded-full">
                    High Priority
                </span>
            </CardHeader>
            <CardContent>
                <ScrollArea
                    className="h-[300px] group pr-4"
                    scrollBarClassName="opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                >
                    <div className="space-y-3">
                        {tasks.length === 0 && (
                            <p className="text-sm text-muted-foreground text-center py-8">🎉 No urgent tasks right now</p>
                        )}
                        {tasks.map((task) => {
                            const due = toLocalCalendarDay(task.dueDate);
                            const daysUntilDue = due && today ? differenceInCalendarDays(due, today) : null;
                            const isOverdue = daysUntilDue !== null && daysUntilDue < 0;
                            const isDueSoon = daysUntilDue !== null && daysUntilDue >= 0 && daysUntilDue <= 2;

                            return (
                                <Link
                                    key={task.id}
                                    href={`/dashboard/projects/${task.projectSlug}?task=${task.id}`}
                                    className="flex items-start gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors border border-transparent hover:border-border cursor-pointer block"
                                >
                                    {(isOverdue || isDueSoon) && (
                                        <AlertCircle className={`h-4 w-4 mt-0.5 shrink-0 ${isOverdue ? 'text-red-500' : 'text-amber-500'}`} />
                                    )}
                                    {!isOverdue && !isDueSoon && (
                                        <div className="h-4 w-4 mt-0.5 shrink-0 rounded-full border-2 border-muted-foreground/30" />
                                    )}
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium leading-none truncate">{task.title}</p>
                                        <p className="text-xs text-muted-foreground mt-1 truncate">
                                            <span className="text-indigo-400">{task.projectName}</span>
                                        </p>
                                        <p className={`text-xs mt-0.5 font-medium ${isOverdue ? 'text-red-400' : isDueSoon ? 'text-amber-400' : 'text-muted-foreground'}`}>
                                            {daysUntilDue === null
                                                ? 'No due date'
                                                : isOverdue
                                                ? `Overdue by ${Math.abs(daysUntilDue)}d`
                                                : daysUntilDue === 0
                                                    ? 'Due today'
                                                    : daysUntilDue === 1
                                                        ? 'Due tomorrow'
                                                        : `Due in ${daysUntilDue}d`}
                                        </p>
                                    </div>
                                    <div className={`ml-auto font-medium text-xs px-2 py-1 rounded-full shrink-0 ${task.status === 'In Progress' ? 'bg-amber-500/15 text-amber-400' : 'bg-muted text-muted-foreground'}`}>
                                        {task.status}
                                    </div>
                                </Link>
                            );
                        })}
                        {hasMore && (
                            <div ref={ref} className="flex justify-center p-4">
                                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                            </div>
                        )}
                    </div>
                </ScrollArea>
            </CardContent>
        </Card>
    );
}

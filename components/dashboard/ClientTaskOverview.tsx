"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CheckCircle2, Clock, AlertCircle, Calendar } from "lucide-react";
import { Task } from "@/lib/types";
import Link from "next/link";

interface ClientTaskOverviewProps {
    tasks: Task[];
    projects: any[];
}

export function ClientTaskOverview({ tasks, projects }: ClientTaskOverviewProps) {
    const todoTasks = tasks.filter(t => t.status === 'Todo').length;
    const inProgressTasks = tasks.filter(t => t.status === 'In Progress').length;
    const reviewTasks = tasks.filter(t => t.status === 'Review').length;
    const doneTasks = tasks.filter(t => t.status === 'Done').length;

    // Get tasks requiring client review
    const tasksForReview = tasks.filter(t => t.status === 'Review').slice(0, 5);

    // Get upcoming deadlines
    const upcomingTasks = tasks
        .filter(t => t.status !== 'Done' && new Date(t.dueDate) > new Date())
        .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
        .slice(0, 5);

    const getProjectName = (projectId: string) => {
        const project = projects.find(p => p.id === projectId);
        return project?.name || 'Unknown Project';
    };

    const getProjectSlug = (projectId: string) => {
        const project = projects.find(p => p.id === projectId);
        return project?.slug || project?.id || '';
    };

    return (
        <Card className="col-span-1 md:col-span-2 transition-all duration-300 hover:shadow-md">
            <CardHeader>
                <CardTitle>Task Overview</CardTitle>
            </CardHeader>
            <CardContent>
                {/* Task Statistics */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
                    <div className="p-3 rounded-lg bg-muted/50 border border-border">
                        <div className="flex items-center gap-2 mb-1">
                            <Clock className="h-3 w-3 text-muted-foreground" />
                            <span className="text-xs text-muted-foreground">To Do</span>
                        </div>
                        <div className="text-xl font-bold">{todoTasks}</div>
                    </div>

                    <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
                        <div className="flex items-center gap-2 mb-1">
                            <AlertCircle className="h-3 w-3 text-blue-400" />
                            <span className="text-xs text-muted-foreground">In Progress</span>
                        </div>
                        <div className="text-xl font-bold text-blue-400">{inProgressTasks}</div>
                    </div>

                    <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                        <div className="flex items-center gap-2 mb-1">
                            <Calendar className="h-3 w-3 text-amber-400" />
                            <span className="text-xs text-muted-foreground">Review</span>
                        </div>
                        <div className="text-xl font-bold text-amber-400">{reviewTasks}</div>
                    </div>

                    <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                        <div className="flex items-center gap-2 mb-1">
                            <CheckCircle2 className="h-3 w-3 text-emerald-400" />
                            <span className="text-xs text-muted-foreground">Done</span>
                        </div>
                        <div className="text-xl font-bold text-emerald-400">{doneTasks}</div>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Tasks for Review */}
                    <div>
                        <h4 className="text-sm font-semibold mb-3 text-muted-foreground">
                            Awaiting Your Review ({reviewTasks})
                        </h4>
                        <ScrollArea className="h-[180px]">
                            <div className="space-y-2">
                                {tasksForReview.length === 0 ? (
                                    <div className="text-center py-8 text-muted-foreground text-sm">
                                        No tasks awaiting review
                                    </div>
                                ) : (
                                    tasksForReview.map((task) => (
                                        <Link
                                            key={task.id}
                                            href={`/dashboard/projects/${getProjectSlug(task.projectId)}`}
                                        >
                                            <div className="p-3 rounded-lg border bg-card hover:bg-accent/50 transition cursor-pointer">
                                                <p className="text-sm font-medium">{task.title}</p>
                                                <p className="text-xs text-muted-foreground mt-1">
                                                    {getProjectName(task.projectId)}
                                                </p>
                                            </div>
                                        </Link>
                                    ))
                                )}
                            </div>
                        </ScrollArea>
                    </div>

                    {/* Upcoming Deadlines */}
                    <div>
                        <h4 className="text-sm font-semibold mb-3 text-muted-foreground">
                            Upcoming Deadlines
                        </h4>
                        <ScrollArea className="h-[180px]">
                            <div className="space-y-2">
                                {upcomingTasks.length === 0 ? (
                                    <div className="text-center py-8 text-muted-foreground text-sm">
                                        No upcoming deadlines
                                    </div>
                                ) : (
                                    upcomingTasks.map((task) => (
                                        <Link
                                            key={task.id}
                                            href={`/dashboard/projects/${getProjectSlug(task.projectId)}`}
                                        >
                                            <div className="p-3 rounded-lg border bg-card hover:bg-accent/50 transition cursor-pointer">
                                                <div className="flex items-start justify-between">
                                                    <div className="flex-1">
                                                        <p className="text-sm font-medium">{task.title}</p>
                                                        <p className="text-xs text-muted-foreground mt-1">
                                                            {getProjectName(task.projectId)}
                                                        </p>
                                                    </div>
                                                    <div className="text-xs text-amber-400 ml-2">
                                                        {new Date(task.dueDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                                                    </div>
                                                </div>
                                            </div>
                                        </Link>
                                    ))
                                )}
                            </div>
                        </ScrollArea>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}

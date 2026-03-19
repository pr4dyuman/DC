"use client";

import Link from "next/link";
import { Task, User } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { TabsContent } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { AlertCircle, Loader2, Search } from "lucide-react";

interface EmployeeProfileTasksTabProps {
    userRole: User["role"];
    filteredTasks: Task[];
    taskSearch: string;
    onTaskSearchChange: (value: string) => void;
    taskStatusFilter: string;
    onTaskStatusFilterChange: (value: string) => void;
    taskSortBy: string;
    onTaskSortByChange: (value: string) => void;
    taskVisibleCount: number;
    hasMoreTasks: boolean;
    taskSentinelRef: (node: HTMLDivElement | null) => void;
    formatDate: (value: string | Date) => string;
    isTaskOverdue: (task: Task) => boolean;
}

export function EmployeeProfileTasksTab({
    userRole,
    filteredTasks,
    taskSearch,
    onTaskSearchChange,
    taskStatusFilter,
    onTaskStatusFilterChange,
    taskSortBy,
    onTaskSortByChange,
    taskVisibleCount,
    hasMoreTasks,
    taskSentinelRef,
    formatDate,
    isTaskOverdue,
}: EmployeeProfileTasksTabProps) {
    return (
        <TabsContent value="tasks" className="animate-in slide-in-from-bottom-2 duration-300">
            <Card className="bg-card border-border">
                <CardHeader>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div>
                            <CardTitle>
                                {userRole === "client" ? "Project Tasks" : "Assigned Tasks"}
                            </CardTitle>
                            <CardDescription>
                                {userRole === "client" ? "Tasks across all projects" : "Current workload and status"}
                            </CardDescription>
                        </div>
                        <div className="flex gap-2">
                            <div className="relative">
                                <Search className="absolute left-2.5 top-2 w-3.5 h-3.5 text-muted-foreground" />
                                <input
                                    type="text"
                                    placeholder="Search tasks..."
                                    value={taskSearch}
                                    onChange={(event) => onTaskSearchChange(event.target.value)}
                                    className="bg-secondary border border-border rounded-lg py-1.5 pl-8 pr-3 text-xs w-40 focus:outline-none focus:ring-1 focus:ring-primary text-foreground placeholder:text-muted-foreground"
                                />
                            </div>
                            <select
                                value={taskStatusFilter}
                                onChange={(event) => onTaskStatusFilterChange(event.target.value)}
                                className="bg-secondary border border-border rounded-lg py-1.5 px-3 text-xs focus:outline-none focus:ring-1 focus:ring-primary text-foreground"
                            >
                                <option value="all">All Status</option>
                                <option value="Todo">Todo</option>
                                <option value="In Progress">In Progress</option>
                                <option value="Review">Review</option>
                                <option value="Done">Done</option>
                            </select>
                            <select
                                value={taskSortBy}
                                onChange={(event) => onTaskSortByChange(event.target.value)}
                                className="bg-secondary border border-border rounded-lg py-1.5 px-3 text-xs focus:outline-none focus:ring-1 focus:ring-primary text-foreground"
                            >
                                <option value="default">Sort: Default</option>
                                <option value="priority">Sort: Priority</option>
                                <option value="dueDate">Sort: Due Date</option>
                                <option value="newest">Sort: Newest</option>
                            </select>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        {filteredTasks.length === 0 ? (
                            <div className="text-center py-10 text-muted-foreground">
                                {taskSearch || taskStatusFilter !== "all"
                                    ? "No tasks match your filters."
                                    : "No tasks assigned yet."}
                            </div>
                        ) : (
                            filteredTasks.slice(0, taskVisibleCount).map((task) => {
                                const taskOverdue = isTaskOverdue(task);

                                return (
                                    <Link href={`/dashboard/projects/${task.projectId}?task=${task.id}`} key={task.id} className="block">
                                        <div
                                            className={cn(
                                                "flex items-center justify-between p-4 bg-muted/50 rounded-lg group hover:bg-muted transition-colors border hover:border-muted-foreground/30",
                                                taskOverdue ? "border-red-500/30 bg-red-500/5" : "border-border",
                                            )}
                                        >
                                            <div className="flex items-start gap-4">
                                                <div
                                                    className={`mt-1 h-3 w-3 rounded-full ${task.status === "Done"
                                                        ? "bg-green-500"
                                                        : task.status === "In Progress"
                                                            ? "bg-blue-500"
                                                            : task.status === "Review"
                                                                ? "bg-purple-500"
                                                                : "bg-muted-foreground/50"
                                                        }`}
                                                />
                                                <div>
                                                    <h4 className="font-medium text-foreground group-hover:text-primary transition-colors">{task.title}</h4>
                                                    <p className="text-sm text-muted-foreground mt-1 line-clamp-1">{task.description || "No description provided."}</p>

                                                    <div className="flex gap-2 mt-2">
                                                        <Badge variant="outline" className="text-xs border-border text-muted-foreground">
                                                            {task.priority || "Medium"}
                                                        </Badge>
                                                        {task.category && (
                                                            <Badge variant="outline" className="text-xs border-border text-muted-foreground">
                                                                {task.category}
                                                            </Badge>
                                                        )}
                                                        {taskOverdue && (
                                                            <Badge variant="outline" className="text-xs border-red-500/30 text-red-500 bg-red-500/10">
                                                                <AlertCircle className="h-3 w-3 mr-1" />
                                                                Overdue
                                                            </Badge>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="text-right shrink-0 ml-4">
                                                <span
                                                    className={cn(
                                                        "text-xs font-semibold px-2 py-1 rounded-full",
                                                        task.status === "Done"
                                                            ? "bg-green-500/10 text-green-500"
                                                            : task.status === "In Progress"
                                                                ? "bg-blue-500/10 text-blue-500"
                                                                : task.status === "Review"
                                                                    ? "bg-purple-500/10 text-purple-500"
                                                                    : "bg-muted text-muted-foreground",
                                                    )}
                                                >
                                                    {task.status}
                                                </span>
                                                {task.dueDate && (
                                                    <div
                                                        className={cn(
                                                            "text-xs mt-2",
                                                            taskOverdue ? "text-red-500 font-medium" : "text-muted-foreground",
                                                        )}
                                                    >
                                                        Due {formatDate(task.dueDate)}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </Link>
                                );
                            })
                        )}
                        {hasMoreTasks && (
                            <div ref={taskSentinelRef} className="flex justify-center py-4">
                                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>
        </TabsContent>
    );
}

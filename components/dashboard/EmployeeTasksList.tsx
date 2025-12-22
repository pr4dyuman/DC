"use client";

import { useState, useEffect } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useInView } from "react-intersection-observer";
import { getUserTasks } from "@/lib/actions";
import { Loader2, Calendar } from "lucide-react";
import Link from 'next/link';
import { Project } from "@/lib/db";

interface Task {
    id: string;
    title: string;
    dueDate: string;
    status: string;
    priority?: string;
    projectId: string;
}

interface EmployeeTasksListProps {
    initialTasks: Task[];
    userId: string;
    allProjects: Project[];
}

export function EmployeeTasksList({ initialTasks, userId, allProjects }: EmployeeTasksListProps) {
    const [tasks, setTasks] = useState<Task[]>(initialTasks);
    const [offset, setOffset] = useState(initialTasks.length);
    const [hasMore, setHasMore] = useState(true);
    const [loading, setLoading] = useState(false);
    const { ref, inView } = useInView();

    const loadMore = async () => {
        if (loading || !hasMore) return;
        setLoading(true);
        try {
            const newTasks = await getUserTasks(userId, offset, 5);
            if (newTasks.length < 5) {
                setHasMore(false);
            }
            // Filter out tasks already in 'tasks' to avoid duplicates if any weirdness
            const newUniqueTasks = newTasks.filter(nt => !tasks.some(t => t.id === nt.id));
            setTasks((prev) => [...prev, ...newUniqueTasks]);
            setOffset((prev) => prev + 5);
        } catch (error) {
            console.error("Failed to load more employee tasks", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (inView) {
            loadMore();
        }
    }, [inView]);

    const activeTasks = tasks.filter(t => t.status === 'In Progress' || t.status === 'Todo');

    return (
        <Card className="h-full transition-all duration-300 hover:shadow-md">
            <CardHeader>
                <CardTitle>My Active Tasks</CardTitle>
            </CardHeader>
            <CardContent>
                <ScrollArea
                    className="h-[300px] group pr-4"
                    scrollBarClassName="opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                >
                    <div className="space-y-4">
                        {activeTasks.length === 0 && (
                            <div className="text-center py-8 text-muted-foreground">
                                No tasks assigned correctly.
                            </div>
                        )}
                        {activeTasks.map((task) => {
                            const project = allProjects.find((p) => p.id === task.projectId);
                            const projectSlug = project?.slug || task.projectId;
                            return (
                                <Link key={task.id} href={`/dashboard/projects/${projectSlug}?task=${task.id}`} className="flex items-center p-3 rounded-lg hover:bg-slate-800/50 transition border border-transparent hover:border-slate-700 cursor-pointer">
                                    <div className={`w-2 h-2 rounded-full mr-4 ${task.status === 'In Progress' ? 'bg-amber-500' : 'bg-slate-500'}`} />
                                    <div className="flex-1 space-y-1">
                                        <p className="text-sm font-medium leading-none text-white">{task.title}</p>
                                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                                            <Calendar className="w-3 h-3 text-yellow-500" /> Due {new Date(task.dueDate).toLocaleDateString()}
                                        </p>
                                    </div>
                                    <div className={`px-2 py-1 rounded text-xs font-medium ${task.priority === 'High' ? 'bg-red-500/10 text-red-500' : 'bg-slate-500/10 text-slate-500'}`}>
                                        {task.priority || 'Normal'}
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

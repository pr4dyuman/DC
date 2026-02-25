"use client";

import { useState, useEffect } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useInView } from "react-intersection-observer";
import { getHighPriorityTasks } from "@/lib/actions";
import { Loader2 } from "lucide-react";

interface Task {
    id: string;
    title: string;
    dueDate: string;
    status: string;
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

    const loadMore = async () => {
        if (loading || !hasMore) return;
        setLoading(true);
        try {
            const newTasks = await getHighPriorityTasks(offset, 5);
            if (newTasks.length < 5) {
                setHasMore(false);
            }
            setTasks((prev) => [...prev, ...newTasks]);
            setOffset((prev) => prev + 5);
        } catch (error) {
            console.error("Failed to load more urgent tasks", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (inView) {
            loadMore();
        }
    }, [inView]);

    return (
        <Card className="col-span-4 transition-all duration-300 hover:shadow-md">
            <CardHeader>
                <CardTitle>Urgent Tasks</CardTitle>
            </CardHeader>
            <CardContent>
                <ScrollArea
                    className="h-[300px] group pr-4"
                    scrollBarClassName="opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                >
                    <div className="space-y-4">
                        {tasks.length === 0 && <p className="text-sm text-muted-foreground">No urgent tasks pending.</p>}
                        {tasks.map((task) => (
                            <div key={task.id} className="flex items-center p-2 rounded-lg hover:bg-muted/50 transition-colors">
                                <div className="ml-2 space-y-1">
                                    <p className="text-sm font-medium leading-none">{task.title}</p>
                                    <p className="text-sm text-muted-foreground">Due {new Date(task.dueDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                                </div>
                                <div className={`ml-auto font-medium text-xs px-2 py-1 rounded-full ${task.status === 'In Progress' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-700'}`}>
                                    {task.status}
                                </div>
                            </div>
                        ))}
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

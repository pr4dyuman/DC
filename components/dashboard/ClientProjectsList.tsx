"use client";

import { useState, useEffect } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useInView } from "react-intersection-observer";
import { getProjects } from "@/lib/actions";
import { Loader2 } from "lucide-react";
import Link from "next/link";
import { Project } from "@/lib/types";
import { toast } from "sonner";

interface ClientProjectsListProps {
    initialProjects: Project[];
}

export function ClientProjectsList({ initialProjects }: ClientProjectsListProps) {
    const [projects, setProjects] = useState<Project[]>(initialProjects);
    const [offset, setOffset] = useState(initialProjects.length);
    const [hasMore, setHasMore] = useState(true);
    const [loading, setLoading] = useState(false);
    const { ref, inView } = useInView();

    const loadMore = async () => {
        if (loading || !hasMore) return;
        setLoading(true);
        try {
            // Note: getProjects checks for client role internally via CurrentUser, but here we call it from client side?
            // Actually Server Actions calleed from Client Components run on Server, so `getCurrentUser()` inside `getProjects` will work 
            // and identify the user correctly as the logged in client.
            const newProjects = await getProjects(offset, 5);
            if (newProjects.length < 5) {
                setHasMore(false);
            }
            setProjects((prev) => [...prev, ...newProjects]);
            setOffset((prev) => prev + 5);
        } catch (error) {
            console.error("Failed to load more projects", error);
            toast.error("Failed to load more projects");
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
        <Card className="col-span-1 h-full transition-all duration-300 hover:shadow-md">
            <CardHeader>
                <CardTitle>Your Projects</CardTitle>
            </CardHeader>
            <CardContent>
                <ScrollArea
                    className="h-[300px] group pr-4"
                    scrollBarClassName="opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                >
                    {projects.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">No active projects.</div>
                    ) : (
                        <div className="space-y-4">
                            {projects.map(project => (
                                <Link key={project.id} href={`/dashboard/projects/${project.slug || project.id}`}>
                                    <div className="flex items-center justify-between p-4 rounded-xl border bg-card hover:bg-accent/50 transition-colors cursor-pointer group/item">
                                        <div>
                                            <h3 className="font-semibold group-hover/item:text-indigo-400 transition-colors">{project.name}</h3>
                                            <div className="flex gap-2 text-xs text-muted-foreground mt-1">
                                                {project.services.slice(0, 2).map(s => <span key={s}>{s}</span>)}
                                            </div>
                                        </div>
                                        <div className={`px-2 py-1 rounded-full text-xs font-medium ${project.status === 'Active' ? 'bg-green-500/10 text-green-500' :
                                            project.status === 'Completed' ? 'bg-blue-500/10 text-blue-500' :
                                                'bg-muted text-muted-foreground'
                                            }`}>
                                            {project.status}
                                        </div>
                                    </div>
                                </Link>
                            ))}
                            {hasMore && (
                                <div ref={ref} className="flex justify-center p-4">
                                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                                </div>
                            )}
                        </div>
                    )}
                </ScrollArea>
            </CardContent>
        </Card>
    );
}

"use client";

import Link from "next/link";
import { Project, Task, User } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { TabsContent } from "@/components/ui/tabs";
import { Calendar, Clock, FolderOpen, ListTodo } from "lucide-react";
import { cn } from "@/lib/utils";

interface EmployeeProfileProjectsTabProps {
    userName: string;
    userRole: User["role"];
    userProjects: Project[];
    tasks: Task[];
    formatDate: (value: string | Date) => string;
}

export function EmployeeProfileProjectsTab({
    userName,
    userRole,
    userProjects,
    tasks,
    formatDate,
}: EmployeeProfileProjectsTabProps) {
    return (
        <TabsContent value="projects" className="animate-in slide-in-from-bottom-2 duration-300">
            <Card className="bg-card border-border">
                <CardHeader>
                    <CardTitle>Projects</CardTitle>
                    <CardDescription>Projects {userRole === "client" ? "owned by" : "assigned to"} {userName}</CardDescription>
                </CardHeader>
                <CardContent>
                    {userProjects.length === 0 ? (
                        <div className="text-center py-10 text-muted-foreground">
                            <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center mx-auto mb-3">
                                <FolderOpen className="w-6 h-6 text-muted-foreground" />
                            </div>
                            <p>No projects yet.</p>
                        </div>
                    ) : (
                        <div className="grid gap-4 md:grid-cols-2">
                            {userProjects.map((project) => {
                                const projectTasks = tasks.filter((task) => task.projectId === project.id);
                                const projectTaskCount = projectTasks.length;
                                const projectDoneCount = projectTasks.filter((task) => task.status === "Done").length;
                                const projectTotalHours = projectTasks.reduce((sum, task) => sum + (task.estimatedHours || 0), 0);
                                const projectCompletedHours = projectTasks
                                    .filter((task) => task.status === "Done")
                                    .reduce((sum, task) => sum + (task.estimatedHours || 0), 0);

                                return (
                                    <Link href={`/dashboard/projects/${project.id}`} key={project.id} className="block">
                                        <div className="p-4 bg-muted/50 rounded-lg border border-border hover:border-primary/30 hover:bg-muted transition-all group cursor-pointer">
                                            <div className="flex items-center justify-between mb-2">
                                                <h4 className="font-semibold text-foreground group-hover:text-primary transition-colors">{project.name}</h4>
                                                <Badge
                                                    variant="secondary"
                                                    className={cn(
                                                        "text-[10px] capitalize",
                                                        project.status === "Active"
                                                            ? "bg-green-500/10 text-green-500 border-green-500/20"
                                                            : project.status === "Completed"
                                                                ? "bg-blue-500/10 text-blue-500 border-blue-500/20"
                                                                : "bg-muted text-muted-foreground border-border",
                                                    )}
                                                >
                                                    {project.status}
                                                </Badge>
                                            </div>
                                            <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
                                                {project.dueDate && (
                                                    <span className="flex items-center gap-1">
                                                        <Calendar className="w-3 h-3" />
                                                        Due {formatDate(project.dueDate)}
                                                    </span>
                                                )}
                                                {projectTaskCount > 0 && (
                                                    <span className="flex items-center gap-1">
                                                        <ListTodo className="w-3 h-3" />
                                                        {projectDoneCount}/{projectTaskCount} tasks done
                                                    </span>
                                                )}
                                                {projectTotalHours > 0 && (
                                                    <span className="flex items-center gap-1 text-cyan-500">
                                                        <Clock className="w-3 h-3" />
                                                        {projectCompletedHours}/{projectTotalHours}h
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </Link>
                                );
                            })}
                        </div>
                    )}
                </CardContent>
            </Card>
        </TabsContent>
    );
}

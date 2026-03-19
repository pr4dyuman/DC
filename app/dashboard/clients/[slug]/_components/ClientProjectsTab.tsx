"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Project } from "@/lib/types";

type ClientProjectsTabProps = {
    projects: Project[];
    formatMoney: (value?: number | null) => string;
    formatDate: (value?: string | Date) => string;
};

export function ClientProjectsTab({
    projects,
    formatMoney,
    formatDate,
}: ClientProjectsTabProps) {
    if (projects.length === 0) {
        return (
            <div className="text-center py-12 text-muted-foreground bg-muted/50 rounded-lg border border-dashed border-border text-sm">
                No projects found for this client.
            </div>
        );
    }

    return (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {projects.map((project) => (
                <Link href={`/dashboard/projects/${project.id}`} key={project.id}>
                    <Card className="bg-card border-border hover:border-primary/50 transition-all cursor-pointer h-full group">
                        <CardHeader>
                            <CardTitle className="flex justify-between items-start">
                                <span className="truncate group-hover:text-yellow-500 transition-colors">{project.name}</span>
                                <Badge
                                    variant="outline"
                                    className={
                                        project.status === "Active"
                                            ? "text-green-500 border-green-500/20"
                                            : project.status === "Completed"
                                                ? "text-blue-500 border-blue-500/20"
                                                : "text-muted-foreground border-border"
                                    }
                                >
                                    {project.status}
                                </Badge>
                            </CardTitle>
                            <CardDescription>{project.services?.join(", ")}</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="flex justify-between text-sm py-2 border-t border-border">
                                <span className="text-muted-foreground">Budget</span>
                                <span className="font-medium text-foreground">{formatMoney(project.budget)}</span>
                            </div>
                            {project.dueDate && (
                                <div className="flex justify-between text-sm pt-2">
                                    <span className="text-muted-foreground">Due Date</span>
                                    <span>{formatDate(project.dueDate)}</span>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </Link>
            ))}
        </div>
    );
}

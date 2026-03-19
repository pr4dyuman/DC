"use client";

import Link from "next/link";
import { AlertCircle } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
    DaysLabel,
    STATUS_STYLES,
    TaskStatusPills,
    type ProjectSummary,
} from "./projects-content-shared";

type ProjectSummaryRowProps = {
    project: ProjectSummary;
};

export function ProjectSummaryRow({ project }: ProjectSummaryRowProps) {
    return (
        <Link href={`/dashboard/projects/${project.slug || project.id}`} className="block group">
            <div className={`flex items-center gap-4 rounded-lg border px-4 py-3 bg-card transition-all hover:border-primary/50 hover:shadow-md ${project.isOverdue ? "border-red-500/30" : "border-border"}`}>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                        {project.isOverdue && <AlertCircle className="h-3.5 w-3.5 text-red-500 shrink-0" />}
                        <span className="font-medium text-sm truncate group-hover:text-primary transition-colors">{project.name}</span>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                        {project.client && project.client !== project.name && (
                            <span className="text-[10px] text-muted-foreground">{project.client}</span>
                        )}
                        <TaskStatusPills todo={project.todo} inProgress={project.inProgress} done={project.done} />
                    </div>
                </div>

                <div className="hidden sm:flex items-center gap-2 w-32">
                    <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                        <div className={`h-full rounded-full ${project.pct === 100 ? "bg-emerald-500" : project.pct >= 50 ? "bg-indigo-500" : "bg-amber-500"}`} style={{ width: `${project.pct}%` }} />
                    </div>
                    <span className="text-[10px] font-semibold text-muted-foreground w-7 shrink-0">{project.pct}%</span>
                </div>

                <div className="hidden md:flex -space-x-1.5">
                    {project.assignees.map((user) => (
                        <Avatar key={user.id} className="h-5 w-5 border border-background" title={user.name}>
                            <AvatarImage src={user.avatar} alt={user.name || "Team member"} />
                            <AvatarFallback className="text-[7px] bg-primary/10 text-primary font-bold">{user.name?.substring(0, 2).toUpperCase()}</AvatarFallback>
                        </Avatar>
                    ))}
                    {project.totalAssignees > 3 && (
                        <div className="h-5 w-5 rounded-full bg-muted border border-background flex items-center justify-center text-[7px] font-bold text-muted-foreground" title={`${project.totalAssignees - 3} more`}>
                            +{project.totalAssignees - 3}
                        </div>
                    )}
                </div>

                <span className={`shrink-0 px-2 py-0.5 rounded-full text-[10px] font-semibold ${STATUS_STYLES[project.status] || "bg-muted text-muted-foreground"}`}>{project.status}</span>

                <div className="w-16 text-right">
                    <DaysLabel dueDate={project.dueDate} status={project.status} />
                </div>
            </div>
        </Link>
    );
}

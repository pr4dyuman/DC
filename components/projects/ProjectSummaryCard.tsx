"use client";

import Link from "next/link";
import { AlertCircle } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useCurrency } from "@/context/CurrencyContext";
import {
    DaysLabel,
    STATUS_STYLES,
    TaskStatusPills,
    type ProjectServiceSummary,
    type ProjectSummary,
} from "./projects-content-shared";

type ProjectSummaryCardProps = {
    project: ProjectSummary;
    services: ProjectServiceSummary[];
};

export function ProjectSummaryCard({
    project,
    services,
}: ProjectSummaryCardProps) {
    const { format: formatMoney } = useCurrency();

    return (
        <Link href={`/dashboard/projects/${project.slug || project.id}`} className="block group">
            <Card className={`h-full transition-all border-border hover:border-primary/50 hover:shadow-lg ${project.isOverdue ? "border-red-500/30" : ""}`}>
                <CardHeader className="pb-2">
                    <div className="flex justify-between items-start gap-2">
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5">
                                {project.isOverdue && <AlertCircle className="h-3.5 w-3.5 text-red-500 shrink-0" />}
                                <h2 className="font-semibold leading-none tracking-tight text-base truncate group-hover:text-primary transition-colors">{project.name}</h2>
                            </div>
                            <div className="flex flex-wrap gap-1 mt-1.5">
                                {project.client && project.client !== project.name && (
                                    <Badge variant="outline" className="font-normal text-xs">{project.client}</Badge>
                                )}
                                {project.services?.slice(0, 2).map((serviceId: string) => {
                                    const service = services.find((item) => item.id === serviceId);
                                    if (!service) return null; // Skip stale/unresolvable IDs — never show raw UUIDs
                                    return (
                                        <Badge key={serviceId} variant="secondary" className="font-normal text-xs bg-yellow-500/10 text-yellow-600 border-yellow-500/20">
                                            {service.name}
                                        </Badge>
                                    );
                                })}
                            </div>
                        </div>
                        <span className={`shrink-0 px-2 py-0.5 rounded-full text-xs font-semibold ${STATUS_STYLES[project.status] || "bg-muted text-muted-foreground"}`}>
                            {project.status}
                        </span>
                    </div>
                </CardHeader>

                <CardContent className="space-y-3">
                    <TaskStatusPills todo={project.todo} inProgress={project.inProgress} done={project.done} />

                    <div className="space-y-1">
                        <div className="flex justify-between text-xs text-muted-foreground">
                            <span>{project.done}/{project.total} tasks</span>
                            <span className="font-semibold">{project.pct}%</span>
                        </div>
                        <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                            <div
                                className={`h-full rounded-full transition-all duration-500 ${project.pct === 100 ? "bg-emerald-500" : project.pct >= 50 ? "bg-indigo-500" : "bg-amber-500"}`}
                                style={{ width: `${project.pct}%` }}
                            />
                        </div>
                    </div>

                    <div className="flex items-center justify-between pt-0.5">
                        <div className="flex items-center gap-1.5">
                            <div className="flex -space-x-2">
                                {project.assignees.length > 0 ? project.assignees.map((user) => (
                                    <Avatar key={user.id} className="h-6 w-6 border-2 border-background" title={user.name}>
                                        <AvatarImage src={user.avatar} alt={user.name || "Team member"} />
                                        <AvatarFallback className="text-[8px] bg-primary/10 text-primary font-bold">
                                            {user.name?.substring(0, 2).toUpperCase()}
                                        </AvatarFallback>
                                    </Avatar>
                                )) : (
                                    <span className="text-[10px] text-muted-foreground">No assigned</span>
                                )}
                                {project.totalAssignees > 3 && (
                                    <div className="h-6 w-6 rounded-full bg-muted border-2 border-background flex items-center justify-center text-[8px] font-bold text-muted-foreground" title={`${project.totalAssignees - 3} more`}>
                                        +{project.totalAssignees - 3}
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            {(() => {
                                // Compute real deal value from service payment configs
                                // (mirrors ProjectFinanceSummary logic)
                                let totalFixed = 0;
                                let totalMonthly = 0;
                                if (project.serviceConfigs) {
                                    project.serviceConfigs.forEach((cfg: { paymentConfig?: { type?: string; paymentDetailsLater?: boolean; installmentAmount?: number; installments?: number; monthlyAmount?: number } }) => {
                                        const pc = cfg.paymentConfig;
                                        if (!pc || pc.paymentDetailsLater) return;
                                        if (pc.type === "installment" && pc.installmentAmount) {
                                            totalFixed += pc.installmentAmount * (pc.installments || 1);
                                        } else if (pc.type === "monthly" && pc.monthlyAmount) {
                                            totalMonthly += pc.monthlyAmount;
                                        }
                                    });
                                }
                                // Use service configs value; fall back to project.budget only if no configs set
                                const displayValue = totalFixed > 0 ? totalFixed : totalMonthly > 0 ? totalMonthly : project.budget || 0;
                                if (displayValue <= 0) return null;
                                return (
                                    <span className="text-xs text-muted-foreground font-medium">
                                        {formatMoney(displayValue)}{totalMonthly > 0 && totalFixed === 0 ? "/mo" : ""}
                                    </span>
                                );
                            })()}
                            <DaysLabel dueDate={project.dueDate} status={project.status} />
                        </div>
                    </div>
                </CardContent>
            </Card>
        </Link>
    );
}

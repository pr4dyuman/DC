"use client";

import { User } from "@/lib/types";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { AlertCircle, Banknote, Briefcase, Calendar, Flame, Mail, Phone } from "lucide-react";

interface EmployeeProfileHeaderCardProps {
    user: User;
    currentUserRole: string;
    isSelf: boolean;
    lastActiveText: string;
    isOnline: boolean;
    completedTasks: number;
    efficiency: number | null;
    completedHours: number;
    totalHours: number;
    streak: number;
    overdueTasks: number;
    joinedText: string | null;
}

export function EmployeeProfileHeaderCard({
    user,
    currentUserRole,
    isSelf,
    lastActiveText,
    isOnline,
    completedTasks,
    efficiency,
    completedHours,
    totalHours,
    streak,
    overdueTasks,
    joinedText,
}: EmployeeProfileHeaderCardProps) {
    const canViewSalary = Boolean(user.salary && user.salary > 0 && (isSelf || currentUserRole === "admin" || currentUserRole === "manager"));

    return (
        <div className="relative overflow-hidden rounded-lg border border-border bg-card shadow-sm">
            <div className="relative flex flex-col items-center gap-5 p-5 text-center sm:gap-8 sm:p-6 md:flex-row md:items-start md:p-8 md:text-left">
                <div className="relative shrink-0">
                    <Avatar className="h-20 w-20 border-4 border-border shadow-xl ring-2 ring-primary/20 sm:h-32 sm:w-32">
                        <AvatarImage src={user.avatar} className="object-cover" />
                        <AvatarFallback className="bg-muted text-xl text-primary sm:text-3xl">
                            {user.name ? user.name.substring(0, 2).toUpperCase() : "?"}
                        </AvatarFallback>
                    </Avatar>
                    {lastActiveText && (
                        <div
                            className={cn(
                                "absolute bottom-1 right-1 h-3.5 w-3.5 rounded-full border-2 border-background sm:bottom-2 sm:right-2 sm:h-4 sm:w-4",
                                isOnline ? "bg-green-500" : "bg-muted-foreground/40",
                            )}
                            title={isOnline ? "Online now" : `Last active ${lastActiveText}`}
                        />
                    )}
                </div>

                <div className="min-w-0 flex-1 space-y-3">
                    <div>
                        <div className="flex flex-wrap items-center justify-center gap-2 md:justify-start">
                            <h2 className="max-w-full truncate text-xl font-bold tracking-tight text-foreground sm:text-3xl">{user.name}</h2>
                            {lastActiveText && !isOnline && (
                                <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                                    {lastActiveText}
                                </span>
                            )}
                            {isOnline && (
                                <span className="rounded-full bg-green-500/10 px-2 py-0.5 text-xs font-medium text-green-500">
                                    Online
                                </span>
                            )}
                        </div>
                        {user.username && <p className="truncate text-sm font-medium text-muted-foreground sm:text-lg">@{user.username}</p>}
                        <p className="mt-1 flex flex-wrap items-center justify-center gap-1.5 text-sm font-medium text-primary sm:text-base md:justify-start">
                            <Briefcase className="h-3.5 w-3.5 shrink-0" />
                            <span>{user.jobTitle || "Team Member"}</span>
                            <span className="text-muted-foreground">-</span>
                            <span className="capitalize text-muted-foreground">{user.role}</span>
                            {user.employmentType && (
                                <>
                                    <span className="text-muted-foreground">-</span>
                                    <span className="text-xs text-muted-foreground sm:text-sm">{user.employmentType}</span>
                                </>
                            )}
                        </p>
                    </div>

                    <div className="flex flex-wrap justify-center gap-2 md:justify-start">
                        <Badge variant="secondary" className="max-w-full bg-muted px-2.5 py-1 text-xs text-muted-foreground hover:bg-accent">
                            <Mail className="mr-1.5 h-3 w-3 shrink-0 text-primary" />
                            <span className="truncate">{user.email}</span>
                        </Badge>
                        {user.contactNumber && (
                            <Badge variant="secondary" className="max-w-full bg-muted px-2.5 py-1 text-xs text-muted-foreground hover:bg-accent">
                                <Phone className="mr-1.5 h-3 w-3 shrink-0 text-primary" />
                                <span className="truncate">{user.contactNumber}</span>
                            </Badge>
                        )}
                        {canViewSalary && (
                            <Badge variant="secondary" className="bg-muted px-2.5 py-1 text-xs text-green-500 hover:bg-accent">
                                <Banknote className="mr-1.5 h-3 w-3 shrink-0" />
                                {user.salary?.toLocaleString()}/mo
                            </Badge>
                        )}
                        {joinedText && (
                            <Badge variant="secondary" className="bg-muted px-2.5 py-1 text-xs text-muted-foreground hover:bg-accent">
                                <Calendar className="mr-1.5 h-3 w-3 shrink-0 text-primary" />
                                Joined {joinedText}
                            </Badge>
                        )}
                    </div>
                </div>

                <div className="flex w-full flex-col gap-2 sm:gap-3 md:w-auto">
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3 md:grid-cols-2">
                        <Card className="border-border bg-muted/50 p-2.5 text-center sm:p-4">
                            <div className="text-lg font-bold text-foreground sm:text-2xl">{completedTasks}</div>
                            <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground sm:text-xs">Done</div>
                        </Card>
                        <Card className="border-border bg-muted/50 p-2.5 text-center sm:p-4">
                            <div className="text-lg font-bold text-primary sm:text-2xl">
                                {efficiency !== null ? `${efficiency}%` : "-"}
                            </div>
                            <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground sm:text-xs">
                                {user.role === "client" ? "Progress" : "Effic."}
                            </div>
                        </Card>
                        <Card className="border-cyan-500/20 bg-cyan-500/10 p-2.5 text-center sm:p-4">
                            <div className="text-lg font-bold text-cyan-500 sm:text-2xl">{completedHours}h</div>
                            <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground sm:text-xs">Done Hrs</div>
                        </Card>
                        <Card className="border-border bg-muted/50 p-2.5 text-center sm:p-4">
                            <div className="text-lg font-bold text-foreground sm:text-2xl">{totalHours}h</div>
                            <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground sm:text-xs">Total Hrs</div>
                        </Card>
                    </div>

                    {streak > 1 && (
                        <div className="flex items-center justify-center gap-1.5 rounded-lg border border-orange-500/20 bg-orange-500/10 px-3 py-1.5 text-xs font-medium text-orange-500">
                            <Flame className="h-3 w-3" />
                            {streak}-day streak
                        </div>
                    )}

                    {overdueTasks > 0 && (
                        <div className="flex items-center justify-center gap-1.5 rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-1.5 text-xs font-medium text-red-500">
                            <AlertCircle className="h-3 w-3" />
                            {overdueTasks} overdue
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

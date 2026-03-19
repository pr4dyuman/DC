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
        <div className="relative rounded-xl overflow-hidden bg-gradient-to-r from-secondary to-muted border border-border shadow-2xl">
            <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_30%_20%,_var(--tw-gradient-stops))] from-primary via-transparent to-transparent" />

            <div className="relative p-8 md:p-10 flex flex-col md:flex-row gap-8 items-center md:items-start text-center md:text-left">
                <div className="relative">
                    <Avatar className="h-32 w-32 border-4 border-border shadow-xl ring-2 ring-primary/20">
                        <AvatarImage src={user.avatar} className="object-cover" />
                        <AvatarFallback className="text-3xl bg-muted text-primary">
                            {user.name ? user.name.substring(0, 2).toUpperCase() : "?"}
                        </AvatarFallback>
                    </Avatar>
                    {lastActiveText && (
                        <div
                            className={cn(
                                "absolute bottom-2 right-2 h-4 w-4 rounded-full border-2 border-background",
                                isOnline ? "bg-green-500" : "bg-muted-foreground/40",
                            )}
                            title={isOnline ? "Online now" : `Last active ${lastActiveText}`}
                        />
                    )}
                </div>

                <div className="flex-1 space-y-4">
                    <div>
                        <div className="flex items-center justify-center md:justify-start gap-3">
                            <h2 className="text-3xl font-bold text-foreground tracking-tight">{user.name}</h2>
                            {lastActiveText && !isOnline && (
                                <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                                    {lastActiveText}
                                </span>
                            )}
                            {isOnline && (
                                <span className="text-xs text-green-500 bg-green-500/10 px-2 py-0.5 rounded-full font-medium">
                                    Online
                                </span>
                            )}
                        </div>
                        {user.username && <p className="text-muted-foreground font-medium text-lg">@{user.username}</p>}
                        <p className="text-primary font-medium text-lg mt-1 flex items-center justify-center md:justify-start gap-2">
                            <Briefcase className="h-4 w-4" />
                            {user.jobTitle || "Team Member"}
                            <span className="text-muted-foreground">•</span>
                            <span className="capitalize text-muted-foreground">{user.role}</span>
                            {user.employmentType && (
                                <>
                                    <span className="text-muted-foreground">•</span>
                                    <span className="text-muted-foreground text-sm">{user.employmentType}</span>
                                </>
                            )}
                        </p>
                    </div>

                    <div className="flex flex-wrap justify-center md:justify-start gap-3">
                        <Badge variant="secondary" className="bg-muted text-muted-foreground hover:bg-accent px-3 py-1">
                            <Mail className="mr-2 h-3 w-3 text-primary" />
                            {user.email}
                        </Badge>
                        {user.contactNumber && (
                            <Badge variant="secondary" className="bg-muted text-muted-foreground hover:bg-accent px-3 py-1">
                                <Phone className="mr-2 h-3 w-3 text-primary" />
                                {user.contactNumber}
                            </Badge>
                        )}
                        {canViewSalary && (
                            <Badge variant="secondary" className="bg-muted text-green-500 hover:bg-accent px-3 py-1">
                                <Banknote className="mr-2 h-3 w-3" />
                                {user.salary?.toLocaleString()}/mo
                            </Badge>
                        )}
                        {joinedText && (
                            <Badge variant="secondary" className="bg-muted text-muted-foreground hover:bg-accent px-3 py-1">
                                <Calendar className="mr-2 h-3 w-3 text-primary" />
                                Joined {joinedText}
                            </Badge>
                        )}
                    </div>
                </div>

                <div className="flex flex-col gap-3 min-w-[160px] sm:min-w-[200px]">
                    <div className="grid grid-cols-2 gap-3">
                        <Card className="bg-muted/50 border-border p-4 text-center">
                            <div className="text-2xl font-bold text-foreground">{completedTasks}</div>
                            <div className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Done</div>
                        </Card>
                        <Card className="bg-muted/50 border-border p-4 text-center">
                            <div className="text-2xl font-bold text-primary">
                                {efficiency !== null ? `${efficiency}%` : "—"}
                            </div>
                            <div className="text-xs text-muted-foreground uppercase tracking-wider font-medium">
                                {user.role === "client" ? "Progress" : "Efficiency"}
                            </div>
                        </Card>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <Card className="bg-cyan-500/10 border-cyan-500/20 p-4 text-center">
                            <div className="text-2xl font-bold text-cyan-500">{completedHours}h</div>
                            <div className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Completed</div>
                        </Card>
                        <Card className="bg-muted/50 border-border p-4 text-center">
                            <div className="text-2xl font-bold text-foreground">{totalHours}h</div>
                            <div className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Total Hours</div>
                        </Card>
                    </div>

                    {streak > 1 && (
                        <div className="flex items-center justify-center gap-1.5 text-xs font-medium text-orange-500 bg-orange-500/10 border border-orange-500/20 rounded-lg px-3 py-1.5">
                            <Flame className="h-3 w-3" />
                            {streak}-day streak
                        </div>
                    )}

                    {overdueTasks > 0 && (
                        <div className="flex items-center justify-center gap-1.5 text-xs font-medium text-red-500 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-1.5">
                            <AlertCircle className="h-3 w-3" />
                            {overdueTasks} overdue
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

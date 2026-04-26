"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Client, Task } from "@/lib/types";
import { AlertCircle, Building, Mail, MapPin, Phone } from "lucide-react";
import { cn } from "@/lib/utils";

type ClientProfileHeaderCardProps = {
    client: Client;
    lastActiveText: string;
    isOnline: boolean;
    activeProjects: number;
    completedProjects: number;
    pendingAmount?: number;
    allTasks: Task[];
    formatMoney: (value?: number | null) => string;
};

export function ClientProfileHeaderCard({
    client,
    lastActiveText,
    isOnline,
    activeProjects,
    completedProjects,
    pendingAmount,
    allTasks,
    formatMoney,
}: ClientProfileHeaderCardProps) {
    const totalHours = allTasks.reduce((sum, task) => sum + (task.estimatedHours || 0), 0);
    const completedHours = allTasks
        .filter((task) => task.status === "Done")
        .reduce((sum, task) => sum + (task.estimatedHours || 0), 0);

    return (
        <div className="relative overflow-hidden rounded-lg border border-border bg-card shadow-sm">
            <div className="relative flex flex-col items-center gap-5 p-5 text-center sm:gap-8 sm:p-6 md:flex-row md:items-start md:p-8 md:text-left">
                <div className="relative shrink-0">
                    <Avatar className="h-20 w-20 border-4 border-border shadow-xl ring-2 ring-yellow-500/20 sm:h-32 sm:w-32">
                        <AvatarImage src={client.logo} className="object-cover" />
                        <AvatarFallback className="bg-muted text-xl text-yellow-500 sm:text-3xl">
                            {client.name ? client.name.substring(0, 2).toUpperCase() : "?"}
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
                            <h2 className="max-w-full truncate text-xl font-bold tracking-tight text-foreground sm:text-3xl">{client.name}</h2>
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
                        {client.username && <p className="truncate text-sm font-medium text-muted-foreground sm:text-lg">@{client.username}</p>}
                        <p className="mt-1 flex flex-wrap items-center justify-center gap-2 text-sm font-medium text-yellow-500 sm:text-base md:justify-start">
                            <Building className="h-4 w-4 shrink-0" />
                            <span className="truncate">{client.companyName}</span>
                        </p>
                    </div>

                    <div className="flex flex-wrap justify-center gap-2 md:justify-start">
                        <Badge variant="secondary" className="max-w-full bg-muted px-2.5 py-1 text-xs text-muted-foreground hover:bg-accent">
                            <Mail className="mr-1.5 h-3 w-3 shrink-0 text-yellow-500" />
                            <span className="truncate">{client.email}</span>
                        </Badge>
                        {client.phone && (
                            <Badge variant="secondary" className="max-w-full bg-muted px-2.5 py-1 text-xs text-muted-foreground hover:bg-accent">
                                <Phone className="mr-1.5 h-3 w-3 shrink-0 text-yellow-500" />
                                <span className="truncate">{client.phone}</span>
                            </Badge>
                        )}
                        {client.address && (
                            <Badge variant="secondary" className="max-w-full bg-muted px-2.5 py-1 text-xs text-muted-foreground hover:bg-accent">
                                <MapPin className="mr-1.5 h-3 w-3 shrink-0 text-yellow-500" />
                                <span className="truncate">{client.address}</span>
                            </Badge>
                        )}
                    </div>
                </div>

                <div className="flex w-full min-w-0 flex-col gap-2 sm:gap-3 md:w-auto md:min-w-[200px]">
                    <div className="grid grid-cols-2 gap-2 sm:gap-3">
                        <Card className="border-border bg-muted/50 p-2.5 text-center sm:p-4">
                            <div className="text-lg font-bold text-foreground sm:text-2xl">{activeProjects}</div>
                            <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground sm:text-xs">Active</div>
                        </Card>
                        <Card className="border-border bg-muted/50 p-2.5 text-center sm:p-4">
                            <div className="text-lg font-bold text-green-500 sm:text-2xl">{completedProjects}</div>
                            <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground sm:text-xs">Done</div>
                        </Card>
                    </div>
                    <div className="grid grid-cols-2 gap-2 sm:gap-3">
                        <Card className="border-cyan-500/20 bg-cyan-500/10 p-2.5 text-center sm:p-4">
                            <div className="text-lg font-bold text-cyan-500 sm:text-2xl">{completedHours}h</div>
                            <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground sm:text-xs">Completed</div>
                        </Card>
                        <Card className="border-border bg-muted/50 p-2.5 text-center sm:p-4">
                            <div className="text-lg font-bold text-foreground sm:text-2xl">{totalHours}h</div>
                            <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground sm:text-xs">Total Hours</div>
                        </Card>
                    </div>
                    {!!pendingAmount && pendingAmount > 0 && (
                        <div className="flex items-center justify-center gap-1.5 rounded-lg border border-yellow-500/20 bg-yellow-500/10 px-3 py-1.5 text-xs font-medium text-yellow-500">
                            <AlertCircle className="h-3 w-3" />
                            {formatMoney(pendingAmount)} pending
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

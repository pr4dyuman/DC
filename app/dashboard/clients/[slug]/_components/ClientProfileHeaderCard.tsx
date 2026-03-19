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
        <div className="relative rounded-xl overflow-hidden bg-gradient-to-r from-secondary to-muted border border-border shadow-2xl">
            <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_30%_20%,_var(--tw-gradient-stops))] from-yellow-500 via-transparent to-transparent" />

            <div className="relative p-8 md:p-10 flex flex-col md:flex-row gap-8 items-center md:items-start text-center md:text-left">
                <div className="relative">
                    <Avatar className="h-32 w-32 border-4 border-border shadow-xl ring-2 ring-yellow-500/20">
                        <AvatarImage src={client.logo} className="object-cover" />
                        <AvatarFallback className="text-3xl bg-muted text-yellow-500">
                            {client.name ? client.name.substring(0, 2).toUpperCase() : "?"}
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
                            <h2 className="text-3xl font-bold text-foreground tracking-tight">{client.name}</h2>
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
                        {client.username && <p className="text-muted-foreground font-medium text-lg">@{client.username}</p>}
                        <p className="text-yellow-500 font-medium text-lg mt-1 flex items-center justify-center md:justify-start gap-2">
                            <Building className="h-4 w-4" />
                            {client.companyName}
                        </p>
                    </div>

                    <div className="flex flex-wrap justify-center md:justify-start gap-3">
                        <Badge variant="secondary" className="bg-muted text-muted-foreground hover:bg-accent px-3 py-1">
                            <Mail className="mr-2 h-3 w-3 text-yellow-500" />
                            {client.email}
                        </Badge>
                        {client.phone && (
                            <Badge variant="secondary" className="bg-muted text-muted-foreground hover:bg-accent px-3 py-1">
                                <Phone className="mr-2 h-3 w-3 text-yellow-500" />
                                {client.phone}
                            </Badge>
                        )}
                        {client.address && (
                            <Badge variant="secondary" className="bg-muted text-muted-foreground hover:bg-accent px-3 py-1">
                                <MapPin className="mr-2 h-3 w-3 text-yellow-500" />
                                {client.address}
                            </Badge>
                        )}
                    </div>
                </div>

                <div className="flex flex-col gap-3 min-w-[160px] sm:min-w-[200px]">
                    <div className="grid grid-cols-2 gap-3">
                        <Card className="bg-muted/50 border-border p-4 text-center">
                            <div className="text-2xl font-bold text-foreground">{activeProjects}</div>
                            <div className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Active</div>
                        </Card>
                        <Card className="bg-muted/50 border-border p-4 text-center">
                            <div className="text-2xl font-bold text-green-500">{completedProjects}</div>
                            <div className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Done</div>
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
                    {!!pendingAmount && pendingAmount > 0 && (
                        <div className="flex items-center justify-center gap-1.5 text-xs font-medium text-yellow-500 bg-yellow-500/10 border border-yellow-500/20 rounded-lg px-3 py-1.5">
                            <AlertCircle className="h-3 w-3" />
                            {formatMoney(pendingAmount)} pending
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

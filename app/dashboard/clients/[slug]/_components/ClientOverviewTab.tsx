"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Activity as ActivityType, Client } from "@/lib/types";
import { Activity, CheckCircle2, CreditCard, FileText, Mail, MapPin, Phone } from "lucide-react";

type ClientOverviewTabProps = {
    client: Client;
    activities: ActivityType[];
    activeProjects: number;
    completedProjects: number;
    lifetimeValue?: number;
    pendingAmount?: number;
    totalPaid?: number;
    dueInvoicesCount: number;
    formatMoney: (value?: number | null) => string;
    formatDateTime: (value?: string | Date) => string;
};

export function ClientOverviewTab({
    client,
    activities,
    activeProjects,
    completedProjects,
    lifetimeValue,
    pendingAmount,
    totalPaid,
    dueInvoicesCount,
    formatMoney,
    formatDateTime,
}: ClientOverviewTabProps) {
    const recentActivities = activities.slice(0, 5);

    return (
        <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card className="bg-card border-border">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Lifetime Value</CardTitle>
                        <CreditCard className="h-4 w-4 text-yellow-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-foreground">{formatMoney(lifetimeValue)}</div>
                        <p className="text-xs text-muted-foreground mt-1">Total paid amount</p>
                    </CardContent>
                </Card>

                <Card className="bg-card border-border">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Active Projects</CardTitle>
                        <Activity className="h-4 w-4 text-yellow-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-foreground">{activeProjects}</div>
                        <p className="text-xs text-muted-foreground mt-1">{completedProjects} completed projects</p>
                    </CardContent>
                </Card>

                <Card className="bg-card border-border">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Pending Invoices</CardTitle>
                        <FileText className="h-4 w-4 text-yellow-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-foreground">{formatMoney(pendingAmount)}</div>
                        <p className="text-xs text-muted-foreground mt-1">{dueInvoicesCount} invoices pending</p>
                    </CardContent>
                </Card>

                <Card className="bg-card border-border">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Paid Total</CardTitle>
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-foreground">{formatMoney(totalPaid)}</div>
                        <p className="text-xs text-muted-foreground mt-1">Settled payments</p>
                    </CardContent>
                </Card>
            </div>

            <div className="grid gap-6 md:grid-cols-3">
                <Card className="md:col-span-1 bg-card border-border h-fit">
                    <CardHeader>
                        <CardTitle>Contact Details</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {client.address && (
                            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                                <MapPin className="h-4 w-4 text-yellow-500" />
                                <div>
                                    <p className="text-sm font-medium text-foreground">Location</p>
                                    <p className="text-xs text-muted-foreground">{client.address}</p>
                                </div>
                            </div>
                        )}
                        <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                            <Mail className="h-4 w-4 text-yellow-500" />
                            <div className="overflow-hidden">
                                <p className="text-sm font-medium text-foreground">Email</p>
                                <p className="text-xs text-muted-foreground truncate" title={client.email}>{client.email}</p>
                            </div>
                        </div>
                        {client.phone && (
                            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                                <Phone className="h-4 w-4 text-yellow-500" />
                                <div>
                                    <p className="text-sm font-medium text-foreground">Phone</p>
                                    <p className="text-xs text-muted-foreground">{client.phone}</p>
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>

                <Card className="md:col-span-2 bg-card border-border">
                    <CardHeader>
                        <CardTitle>Recent Activity</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <ScrollArea className="h-[300px] pr-4">
                            <div className="space-y-6">
                                {recentActivities.length > 0 ? recentActivities.map((activity, index) => (
                                    <div key={activity.id || index} className="flex gap-4 relative">
                                        {index !== recentActivities.length - 1 && (
                                            <div className="absolute left-2.5 top-8 bottom-[-24px] w-px bg-border" />
                                        )}
                                        <div className="h-5 w-5 rounded-full bg-muted border-2 border-primary z-10 flex-shrink-0 mt-1" />
                                        <div>
                                            <p className="text-sm font-medium text-foreground">
                                                <span className="text-yellow-500">{activity.action}</span> {activity.target}
                                            </p>
                                            <p className="text-xs text-muted-foreground mt-1">
                                                {formatDateTime(activity.timestamp)}
                                            </p>
                                        </div>
                                    </div>
                                )) : (
                                    <p className="text-sm text-muted-foreground text-center py-8">No recent activity recorded.</p>
                                )}
                            </div>
                        </ScrollArea>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

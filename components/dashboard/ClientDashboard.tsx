"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FolderKanban, CreditCard, MessageSquare } from "lucide-react";
import { Project, Notification } from "@/lib/types";
import { ClientProjectsList } from "./ClientProjectsList";
import { ClientNotificationsList } from "./ClientNotificationsList";

interface ClientDashboardProps {
    initialProjects: Project[];
    initialNotifications: Notification[];
    clientName: string;
    clientId: string;
    metrics: {
        activeProjects: number;
        pendingInvoicesCount: number;
        totalDue: number;
        unreadNotificationsCount: number;
    }
}

export function ClientDashboard({ initialProjects, initialNotifications, clientName, clientId, metrics }: ClientDashboardProps) {
    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Welcome Banner */}
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-indigo-900 to-purple-900 p-8 text-white shadow-2xl">
                <div className="relative z-10">
                    <h1 className="text-3xl font-bold mb-2">Welcome back, {clientName}</h1>
                    <p className="text-indigo-200">Here&#39;s what&#39;s happening with your projects today.</p>
                </div>
                {/* Abstract Shapes */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
                <div className="absolute bottom-0 left-0 w-48 h-48 bg-purple-500/20 rounded-full blur-2xl translate-y-1/2 -translate-x-1/2"></div>
            </div>

            {/* Quick Stats Grid */}
            <div className="grid gap-4 md:grid-cols-3">
                <Card className="hover:border-indigo-500/50 transition-colors">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Active Projects</CardTitle>
                        <FolderKanban className="h-4 w-4 text-indigo-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{metrics.activeProjects}</div>
                        <p className="text-xs text-muted-foreground">In progress</p>
                    </CardContent>
                </Card>
                <Card className="hover:border-emerald-500/50 transition-colors">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">My Invoices</CardTitle>
                        <CreditCard className="h-4 w-4 text-emerald-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{metrics.pendingInvoicesCount} Pending</div>
                        <p className="text-xs text-muted-foreground">
                            {metrics.totalDue > 0 ? `Total Due: ₹${metrics.totalDue.toLocaleString()}` : "All catch up!"}
                        </p>
                    </CardContent>
                </Card>
                <Card className="hover:border-amber-500/50 transition-colors">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">New Updates</CardTitle>
                        <MessageSquare className="h-4 w-4 text-amber-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{metrics.unreadNotificationsCount}</div>
                        <p className="text-xs text-muted-foreground">Unread notifications</p>
                    </CardContent>
                </Card>
            </div>

            {/* Main Content Area */}
            <div className="grid gap-6 md:grid-cols-2">
                {/* Active Projects List */}
                <ClientProjectsList initialProjects={initialProjects} />

                {/* Notifications / Activity */}
                <ClientNotificationsList initialNotifications={initialNotifications} userId={clientId} />
            </div>
        </div>
    );
}


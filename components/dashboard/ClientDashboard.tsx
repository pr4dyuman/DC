"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity, CreditCard, FolderKanban, MessageSquare } from "lucide-react";
import Link from "next/link";
import { Project, Invoice, Notification } from "@/lib/db";

interface ClientDashboardProps {
    projects: Project[];
    invoices: Invoice[];
    notifications: Notification[];
    clientName: string;
}

export function ClientDashboard({ projects, invoices, notifications, clientName }: ClientDashboardProps) {
    const activeProjects = projects.filter(p => p.status === 'Active').length;
    const pendingInvoices = invoices.filter(i => i.status === 'Pending');
    const totalDue = pendingInvoices.reduce((acc, inv) => acc + inv.amount, 0);

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Welcome Banner */}
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-indigo-900 to-purple-900 p-8 text-white shadow-2xl">
                <div className="relative z-10">
                    <h1 className="text-3xl font-bold mb-2">Welcome back, {clientName}</h1>
                    <p className="text-indigo-200">Here's what's happening with your projects today.</p>
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
                        <div className="text-2xl font-bold">{activeProjects}</div>
                        <p className="text-xs text-muted-foreground">In progress</p>
                    </CardContent>
                </Card>
                <Card className="hover:border-emerald-500/50 transition-colors">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">My Invoices</CardTitle>
                        <CreditCard className="h-4 w-4 text-emerald-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{pendingInvoices.length} Pending</div>
                        <p className="text-xs text-muted-foreground">
                            {totalDue > 0 ? `Total Due: ₹${totalDue.toLocaleString()}` : "All catch up!"}
                        </p>
                    </CardContent>
                </Card>
                <Card className="hover:border-amber-500/50 transition-colors">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">New Updates</CardTitle>
                        <MessageSquare className="h-4 w-4 text-amber-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{notifications.filter(n => !n.read).length}</div>
                        <p className="text-xs text-muted-foreground">Unread notifications</p>
                    </CardContent>
                </Card>
            </div>

            {/* Main Content Area */}
            <div className="grid gap-6 md:grid-cols-2">
                {/* Active Projects List */}
                <Card className="col-span-1 h-full">
                    <CardHeader>
                        <CardTitle>Your Projects</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {projects.length === 0 ? (
                            <div className="text-center py-8 text-muted-foreground">No active projects.</div>
                        ) : (
                            <div className="space-y-4">
                                {projects.map(project => (
                                    <Link key={project.id} href={`/dashboard/projects/${project.id}`}>
                                        <div className="flex items-center justify-between p-4 rounded-xl border bg-card hover:bg-accent/50 transition-colors cursor-pointer group">
                                            <div>
                                                <h3 className="font-semibold group-hover:text-indigo-400 transition-colors">{project.name}</h3>
                                                <div className="flex gap-2 text-xs text-muted-foreground mt-1">
                                                    {project.services.slice(0, 2).map(s => <span key={s}>{s}</span>)}
                                                </div>
                                            </div>
                                            <div className={`px-2 py-1 rounded-full text-xs font-medium ${project.status === 'Active' ? 'bg-green-500/10 text-green-500' :
                                                    project.status === 'Completed' ? 'bg-blue-500/10 text-blue-500' :
                                                        'bg-zinc-800 text-zinc-400'
                                                }`}>
                                                {project.status}
                                            </div>
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Notifications / Activity */}
                <Card className="col-span-1 h-full">
                    <CardHeader>
                        <CardTitle>Recent Updates</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {notifications.length === 0 ? (
                            <div className="text-center py-8 text-muted-foreground">No new notifications.</div>
                        ) : (
                            <div className="space-y-4">
                                {notifications.slice(0, 5).map((n, i) => (
                                    <div key={i} className="flex gap-4 items-start p-3 rounded-lg hover:bg-white/5 transition">
                                        <div className="bg-indigo-500/10 p-2 rounded-full mt-1">
                                            <Activity className="w-4 h-4 text-indigo-400" />
                                        </div>
                                        <div>
                                            <p className="text-sm text-zinc-200">{n.message}</p>
                                            <p className="text-xs text-muted-foreground mt-1">
                                                {new Date(n.timestamp).toLocaleDateString()}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

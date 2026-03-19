"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FolderKanban, CreditCard, MessageSquare, CheckCircle2, Wallet } from "lucide-react";
import { Project, Notification, Transaction, Task, Invoice, Asset } from "@/lib/types";
import { ClientProjectsList } from "./ClientProjectsList";
import { ClientNotificationsList } from "./ClientNotificationsList";
import { ClientFinancialOverview } from "./ClientFinancialOverview";
import { ClientTaskOverview } from "./ClientTaskOverview";
import { ClientAssetsSection } from "./ClientAssetsSection";
import { useDateFormat } from "@/context/TimezoneContext";
import { useCurrency } from "@/context/CurrencyContext";
import Link from "next/link";


interface ClientDashboardProps {
    initialProjects: Project[];
    initialNotifications: Notification[];
    clientName: string;
    clientId: string;
    metrics: {
        activeProjects: number;
        completedProjects: number;
        pendingInvoicesCount: number;
        totalDue: number;
        unreadNotificationsCount: number;
        totalSpent: number;
        totalBudget: number;
        totalTasks: number;
        completedTasks: number;
    };
    transactions?: Transaction[];
    tasks?: Task[];
    invoices?: Invoice[];
    assets?: Asset[];
}

export function ClientDashboard({
    initialProjects,
    initialNotifications,
    clientName,
    clientId,
    metrics,
    transactions = [],
    tasks = [],
    invoices = [],
    assets = []
}: ClientDashboardProps) {
    const fmt = useDateFormat();
    const { format: formatMoney } = useCurrency();
    // Next invoice due date
    const pendingInvoices = invoices
        .filter(i => i.status === 'Pending' || i.status === 'Overdue')
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    const nextInvoiceDue = pendingInvoices[0]?.date
        ? fmt.dateShort(pendingInvoices[0].date)
        : null;

    // Per-project progress
    const projectProgress = initialProjects.map(p => {
        const pTasks = tasks.filter(t => t.projectId === p.id);
        const done = pTasks.filter(t => t.status === 'Done').length;
        const total = pTasks.length;
        const pct = total > 0 ? Math.round((done / total) * 100) : 0;
        return { id: p.id, name: p.name, slug: p.slug || p.id, pct, done, total };
    }).filter(p => p.total > 0).slice(0, 3);

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

            {/* Enhanced Quick Stats Grid */}
            <div className="grid gap-4 grid-cols-2 md:grid-cols-5">
                <Link href="/dashboard/projects" className="block">
                    <Card className="hover:border-indigo-500/50 transition-colors cursor-pointer h-full">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground">Active Projects</CardTitle>
                            <FolderKanban className="h-4 w-4 text-indigo-500" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{metrics.activeProjects}</div>
                            <p className="text-xs text-muted-foreground">In progress</p>
                        </CardContent>
                    </Card>
                </Link>

                <Link href="/dashboard/projects" className="block">
                    <Card className="hover:border-emerald-500/50 transition-colors cursor-pointer h-full">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground">Completed</CardTitle>
                            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{metrics.completedProjects}</div>
                            <p className="text-xs text-muted-foreground">Projects done</p>
                        </CardContent>
                    </Card>
                </Link>

                <Link href="/dashboard/finance?tab=invoices" className="block">
                    <Card className="hover:border-amber-500/50 transition-colors cursor-pointer h-full">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground">Pending Invoices</CardTitle>
                            <CreditCard className="h-4 w-4 text-amber-500" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{metrics.pendingInvoicesCount}</div>
                            <p className="text-xs text-muted-foreground">
                                {metrics.totalDue > 0 ? formatMoney(metrics.totalDue) : "All paid!"}
                            </p>
                            {nextInvoiceDue && (
                                <p className="text-xs text-amber-500 mt-1">Next due: {nextInvoiceDue}</p>
                            )}
                        </CardContent>
                    </Card>
                </Link>

                <Link href="/dashboard/finance?tab=history" className="block">
                    <Card className="hover:border-blue-500/50 transition-colors cursor-pointer h-full">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground">Total Spent</CardTitle>
                            <Wallet className="h-4 w-4 text-blue-500" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{formatMoney(metrics.totalSpent)}</div>
                            <p className="text-xs text-muted-foreground">Payments made</p>
                        </CardContent>
                    </Card>
                </Link>

                <Card className="hover:border-blue-500/50 transition-colors">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Notifications</CardTitle>
                        <MessageSquare className="h-4 w-4 text-blue-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{metrics.unreadNotificationsCount}</div>
                        <p className="text-xs text-muted-foreground">Unread updates</p>
                    </CardContent>
                </Card>
            </div>

            {/* Project Progress Bars */}
            {projectProgress.length > 0 && (
                <div className="rounded-lg border bg-card p-4 space-y-3">
                    <p className="text-sm font-semibold text-muted-foreground">Project Progress</p>
                    {projectProgress.map(p => (
                        <Link key={p.id} href={`/dashboard/projects/${p.slug}`} className="block group">
                            <div className="space-y-1">
                                <div className="flex justify-between text-xs">
                                    <span className="font-medium truncate group-hover:text-indigo-400 transition-colors">{p.name}</span>
                                    <span className="text-muted-foreground ml-2 shrink-0">{p.done}/{p.total} tasks · {p.pct}%</span>
                                </div>
                                <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                                    <div
                                        className={`h-full rounded-full transition-all duration-500 ${p.pct === 100 ? 'bg-emerald-500' : p.pct >= 50 ? 'bg-indigo-500' : 'bg-amber-500'
                                            }`}
                                        style={{ width: `${p.pct}%` }}
                                    />
                                </div>
                            </div>
                        </Link>
                    ))}
                </div>
            )}

            {/* Financial & Task Overview */}
            <div className="grid gap-6 grid-cols-1 lg:grid-cols-3">
                <ClientFinancialOverview
                    transactions={transactions}
                    totalSpent={metrics.totalSpent}
                    totalBudget={metrics.totalBudget}
                    pendingAmount={metrics.totalDue}
                />
                <ClientAssetsSection assets={assets} projects={initialProjects} />
            </div>

            {/* Task Overview */}
            <ClientTaskOverview tasks={tasks} projects={initialProjects} />

            {/* Projects & Notifications */}
            <div className="grid gap-6 md:grid-cols-2">
                <ClientProjectsList clientId={clientId} initialProjects={initialProjects} />
                <ClientNotificationsList initialNotifications={initialNotifications} userId={clientId} />
            </div>
        </div>
    );
}


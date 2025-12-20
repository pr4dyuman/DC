import { Suspense } from 'react';
import {
    getDashboardMetrics,
    getRevenueData,
    getProjectDistribution,
    getRecentActivity,
    getHighPriorityTasks,
    getUserTasks,
    getUser,
    getUserActivity,
    getProjects,
    getInvoices,
    getNotifications,
    getCurrentUser
} from "@/lib/actions";
import { getSessionId } from "@/lib/auth";

import { MetricCard } from "@/components/dashboard/MetricCard";
import { RevenueChart, ProjectDistributionChart } from "@/components/dashboard/Charts";
import { RecentActivity } from "@/components/dashboard/RecentActivity";
import { IndianRupee, Briefcase, FileText, Activity as ActivityIcon, CheckCircle2, Clock, Calendar } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ClientDashboard } from "@/components/dashboard/ClientDashboard"; // Named import

export default async function DashboardPage() {
    const currentUser = await getCurrentUser();
    if (!currentUser) redirect('/login');

    // Client Dashboard View
    if (currentUser.role === 'client') {
        const projects = await getProjects(); // Assuming getProjects is now filtered for client if called by client
        const invoices = await getInvoices(); // Assuming getInvoices is now filtered for client
        const notifications = await getNotifications(currentUser.id);

        return (
            <ClientDashboard
                projects={projects}
                invoices={invoices}
                notifications={notifications}
                clientName={currentUser.name}
            />
        );
    }

    // Admin/Employee Dashboard View
    const isAdmin = currentUser.role === 'admin' || currentUser.role === 'manager';
    const userId = currentUser.id;

    // Parallel Data Fetching based on Role
    let metrics: any = {}, revenueData, projectDist, activities, urgentTasks: any[] = [];
    let myTasks: any[] = [];
    let myProjects: any[] = [];
    let myActivity: any[] = [];

    if (isAdmin) {
        [metrics, revenueData, projectDist, activities, urgentTasks] = await Promise.all([
            getDashboardMetrics(),
            getRevenueData(),
            getProjectDistribution(),
            getRecentActivity(),
            getHighPriorityTasks()
        ]);
    } else {
        // Employee Data
        const allProjects = await getProjects(); // Filter in memory or fetch specifically
        myTasks = await getUserTasks(userId);
        myActivity = await getUserActivity(userId);

        // Compute Employee Metrics
        const activeTasks = myTasks.filter(t => t.status === 'In Progress').length;
        const pendingTasks = myTasks.filter(t => t.status === 'Todo').length;
        const completedTasks = myTasks.filter(t => t.status === 'Done').length;

        // Find projects user is involved in (via tasks or if array exists, but assignments are task based mainly)
        // Let's assume user is involved if they have tasks in it.
        const projectIds = new Set(myTasks.map(t => t.projectId));
        myProjects = allProjects.filter(p => projectIds.has(p.id));
    }

    if (isAdmin) {
        return (
            <div className="flex-1 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between space-y-4 sm:space-y-0">
                    <div>
                        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">Overview</h2>
                        <p className="text-muted-foreground hidden sm:block">Welcome back, {currentUser.name}</p>
                    </div>
                    {/* Date Picker & Download Report (Admin Only) */}
                    <div className="flex items-center space-x-2 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
                        <div className="hidden md:flex h-9 items-center rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm whitespace-nowrap">
                            <span className="text-muted-foreground mr-2">Dec 01, 2024 - Dec 31, 2024</span>
                        </div>
                        <button className="flex-1 sm:flex-none inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-9 px-4 py-2 whitespace-nowrap">
                            Download Report
                        </button>
                    </div>
                </div>

                <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
                    <MetricCard
                        title="Total Revenue"
                        value={`₹${metrics?.revenue.toLocaleString()}`}
                        description="+20.1% from last month"
                        icon={IndianRupee}
                    />
                    <MetricCard
                        title="Active Projects"
                        value={metrics?.activeProjects}
                        description="High priority: 2"
                        icon={Briefcase}
                    />
                    <MetricCard
                        title="Pending Invoices"
                        value={`₹${metrics?.pending.toLocaleString()}`}
                        description="2 invoices overdue"
                        icon={FileText}
                    />
                    <MetricCard
                        title="Team Utilization"
                        value={`${metrics?.utilization}%`}
                        description="4 active tasks"
                        icon={ActivityIcon}
                    />
                </div>

                <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-7">
                    <RevenueChart data={revenueData || []} />
                    <ProjectDistributionChart data={projectDist || []} />
                </div>

                <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-7">
                    <div className="col-span-4">
                        <Card>
                            <CardHeader>
                                <CardTitle>Urgent Tasks</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-4">
                                    {(urgentTasks?.length || 0) === 0 && <p className="text-sm text-muted-foreground">No urgent tasks pending.</p>}
                                    {urgentTasks?.map((task: any) => (
                                        <div key={task.id} className="flex items-center">
                                            <div className="ml-4 space-y-1">
                                                <p className="text-sm font-medium leading-none">{task.title}</p>
                                                <p className="text-sm text-muted-foreground">Due {new Date(task.dueDate).toLocaleDateString()}</p>
                                            </div>
                                            <div className={`ml-auto font-medium text-xs px-2 py-1 rounded-full ${task.status === 'In Progress' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-700'}`}>
                                                {task.status}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                    <RecentActivity activities={activities || []} />
                </div>
            </div>
        );
    }

    // EMPLOYEE VIEW
    return (
        <div className="flex-1 space-y-4">
            <div className="flex flex-col space-y-2">
                <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">My Dashboard</h2>
                <p className="text-muted-foreground">Welcome back, {currentUser.name}</p>
            </div>

            <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
                <MetricCard
                    title="Active Tasks"
                    value={myTasks?.filter((t: any) => t.status === 'In Progress').length || 0}
                    description="Tasks currently in progress"
                    icon={ActivityIcon}
                />
                <MetricCard
                    title="Pending Tasks"
                    value={myTasks?.filter((t: any) => t.status === 'Todo').length || 0}
                    description="Tasks waiting for you"
                    icon={Clock}
                />
                <MetricCard
                    title="Completed Tasks"
                    value={myTasks?.filter((t: any) => t.status === 'Done').length || 0}
                    description="Tasks finished (all time)"
                    icon={CheckCircle2}
                />
                <MetricCard
                    title="My Projects"
                    value={myProjects?.length || 0}
                    description="Projects involved in"
                    icon={Briefcase}
                />
            </div>

            <div className="grid gap-4 grid-cols-1 md:grid-cols-3">
                {/* My Active Tasks List */}
                <div className="col-span-2">
                    <Card className="h-full">
                        <CardHeader>
                            <CardTitle>My Active Tasks</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                {myTasks?.filter((t: any) => t.status === 'In Progress' || t.status === 'Todo').slice(0, 5).map((task: any) => (
                                    <Link key={task.id} href={`/dashboard/projects/${task.projectId}?task=${task.id}`} className="flex items-center p-3 rounded-lg hover:bg-slate-800/50 transition border border-transparent hover:border-slate-700 cursor-pointer">
                                        <div className={`w-2 h-2 rounded-full mr-4 ${task.status === 'In Progress' ? 'bg-amber-500' : 'bg-slate-500'}`} />
                                        <div className="flex-1 space-y-1">
                                            <p className="text-sm font-medium leading-none text-white">{task.title}</p>
                                            <p className="text-xs text-muted-foreground flex items-center gap-1">
                                                <Calendar className="w-3 h-3 text-yellow-500" /> Due {new Date(task.dueDate).toLocaleDateString()}
                                            </p>
                                        </div>
                                        <div className={`px-2 py-1 rounded text-xs font-medium ${task.priority === 'High' ? 'bg-red-500/10 text-red-500' : 'bg-slate-500/10 text-slate-500'}`}>
                                            {task.priority || 'Normal'}
                                        </div>
                                    </Link>
                                ))}
                                {(!myTasks || myTasks.length === 0) && (
                                    <div className="text-center py-8 text-muted-foreground">
                                        No tasks assigned correctly.
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* My Recent Activity */}
                <div className="col-span-1">
                    <RecentActivity activities={myActivity || []} />
                </div>
            </div>
        </div>
    );
}

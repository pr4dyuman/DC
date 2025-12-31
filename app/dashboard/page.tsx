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
import { RecentActivityList } from "@/components/dashboard/RecentActivityList";
import { UrgentTasksList } from "@/components/dashboard/UrgentTasksList";
import { EmployeeTasksList } from "@/components/dashboard/EmployeeTasksList";
import { IndianRupee, Briefcase, FileText, Activity as ActivityIcon, CheckCircle2, Clock, Calendar } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ClientDashboard } from "@/components/dashboard/ClientDashboard";

export default async function DashboardPage() {
    const currentUser = await getCurrentUser();
    if (!currentUser) redirect('/login');

    // Client Dashboard View
    if (currentUser.role === 'client') {
        // Fetch ALL data for metrics calculation (using default limit 1000 from actions)
        const projects = await getProjects();
        const invoices = await getInvoices();
        const notifications = await getNotifications(currentUser.id);

        const activeProjectsCount = projects.filter(p => p.status === 'Active').length;
        const pendingInvoices = invoices.filter(i => i.status === 'Pending');
        const totalDue = pendingInvoices.reduce((acc, inv) => acc + inv.amount, 0);
        const unreadNotificationsCount = notifications.filter(n => !n.read).length;

        const clientMetrics = {
            activeProjects: activeProjectsCount,
            pendingInvoicesCount: pendingInvoices.length,
            totalDue: totalDue,
            unreadNotificationsCount: unreadNotificationsCount
        };

        return (
            <ClientDashboard
                initialProjects={projects.slice(0, 5)}
                initialNotifications={notifications.slice(0, 5)}
                clientName={currentUser.name}
                clientId={currentUser.id}
                metrics={clientMetrics}
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
    let allProjects: any[] = [];

    if (isAdmin) {
        [metrics, revenueData, projectDist, activities, urgentTasks] = await Promise.all([
            getDashboardMetrics(),
            getRevenueData(),
            getProjectDistribution(),
            getRecentActivity(), // Defaults to limit 5
            getHighPriorityTasks() // Defaults to limit 5
        ]);
    } else {
        // Employee Data
        allProjects = await getProjects(); // Filter in memory or fetch specifically
        myTasks = await getUserTasks(userId); // Defaults to limit 1000, so we have all tasks for metrics
        myActivity = await getUserActivity(userId); // Defaults to 20 slice in action, slice to 5 for initial list if needed

        // Compute Employee Metrics
        const activeTasks = myTasks.filter(t => t.status === 'In Progress').length;
        const pendingTasks = myTasks.filter(t => t.status === 'Todo').length;
        const completedTasks = myTasks.filter(t => t.status === 'Done').length;

        // Find projects user is involved in
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
                        value={`₹${metrics?.revenue?.toLocaleString() ?? 0}`}
                        description={`${(metrics?.growth ?? 0) > 0 ? '+' : ''}${metrics?.growth ?? 0}% from last month`}
                        icon={IndianRupee}
                    />
                    <MetricCard
                        title="Active Projects"
                        value={metrics?.activeProjects ?? 0}
                        description={`High priority: ${metrics?.highPriorityCount ?? 0}`}
                        icon={Briefcase}
                    />
                    <MetricCard
                        title="Pending Invoices"
                        value={`₹${metrics?.pending?.toLocaleString() ?? 0}`}
                        description={`${metrics?.overdueCount ?? 0} invoices overdue`}
                        icon={FileText}
                    />
                    <MetricCard
                        title="Team Utilization"
                        value={`${metrics?.utilization ?? 0}%`}
                        description={`${metrics?.activeTasksCount ?? 0} active tasks`}
                        icon={ActivityIcon}
                    />
                </div>

                <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-7">
                    <RevenueChart data={revenueData || []} />
                    <ProjectDistributionChart data={projectDist || []} />
                </div>

                <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-7">
                    <UrgentTasksList initialTasks={urgentTasks || []} />
                    <RecentActivityList initialActivities={activities || []} />
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
                    <EmployeeTasksList
                        initialTasks={myTasks?.filter((t: any) => t.status === 'In Progress' || t.status === 'Todo').slice(0, 5) || []}
                        userId={userId}
                        allProjects={allProjects}
                    />
                </div>

                {/* My Recent Activity */}
                <div className="col-span-1">
                    <RecentActivityList initialActivities={myActivity?.slice(0, 5) || []} />
                </div>
            </div>
        </div>
    );
}

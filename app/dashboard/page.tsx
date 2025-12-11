import { Suspense } from 'react';
import {
    getDashboardMetrics,
    getRevenueData,
    getProjectDistribution,
    getRecentActivity
} from "@/lib/actions";

import { MetricCard } from "@/components/dashboard/MetricCard";
import { RevenueChart, ProjectDistributionChart } from "@/components/dashboard/Charts";
import { RecentActivity } from "@/components/dashboard/RecentActivity";
import { DollarSign, Briefcase, FileText, Activity as ActivityIcon } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

export default async function DashboardPage() {
    // Fetch data in parallel
    const [metrics, revenueData, projectDist, activities] = await Promise.all([
        getDashboardMetrics(),
        getRevenueData(),
        getProjectDistribution(),
        getRecentActivity()
    ]);

    return (
        <div className="flex-1 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between space-y-4 sm:space-y-0">
                <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">Overview</h2>
                <div className="flex items-center space-x-2 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
                    {/* Date Range Picker Placeholder */}
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
                    value={`$${metrics.revenue.toLocaleString()}`}
                    description="+20.1% from last month"
                    icon={DollarSign}
                />
                <MetricCard
                    title="Active Projects"
                    value={metrics.activeProjects}
                    description="High priority: 2"
                    icon={Briefcase}
                />
                <MetricCard
                    title="Pending Invoices"
                    value={`$${metrics.pending.toLocaleString()}`}
                    description="2 invoices overdue"
                    icon={FileText}
                />
                <MetricCard
                    title="Team Utilization"
                    value={`${metrics.utilization}%`}
                    description="4 active tasks"
                    icon={ActivityIcon}
                />
            </div>

            <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-7">
                <RevenueChart data={revenueData} />
                <ProjectDistributionChart data={projectDist} />
            </div>

            <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-7">
                <div className="col-span-4">
                    {/* Urgent Tasks Placeholder */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Urgent Tasks</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                <div className="flex items-center">
                                    <div className="ml-4 space-y-1">
                                        <p className="text-sm font-medium leading-none">Homepage Hero Section</p>
                                        <p className="text-sm text-muted-foreground">Due Tomorrow</p>
                                    </div>
                                    <div className="ml-auto font-medium text-amber-500">In Progress</div>
                                </div>
                                <div className="flex items-center">
                                    <div className="ml-4 space-y-1">
                                        <p className="text-sm font-medium leading-none">Keyword Research</p>
                                        <p className="text-sm text-muted-foreground">Due in 3 days</p>
                                    </div>
                                    <div className="ml-auto font-medium text-slate-500">Todo</div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
                <RecentActivity activities={activities} />
            </div>
        </div>
    );
}

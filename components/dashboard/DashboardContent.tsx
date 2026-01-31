import { Project, Invoice, Notification as AppNotification, Transaction, Task, Asset, User } from "@/lib/types";
// REMOVED db import
import { getDashboardMetrics, getRevenueData, getProjectDistribution, getRecentActivity, getUrgentTasks, getClientDashboardData, getEmployeeDashboardData } from "@/lib/actions";

import { MetricCard } from "@/components/dashboard/MetricCard";
import { RevenueChart, ProjectDistributionChart } from "@/components/dashboard/Charts";
import { RecentActivityList } from "@/components/dashboard/RecentActivityList";
import { UrgentTasksList } from "@/components/dashboard/UrgentTasksList";
import { EmployeeTasksList } from "@/components/dashboard/EmployeeTasksList";
import { IndianRupee, Briefcase, FileText, Activity as ActivityIcon, CheckCircle2, Clock } from "lucide-react";
import { ClientDashboard } from "@/components/dashboard/ClientDashboard";

export async function DashboardContent({ currentUser }: { currentUser: User }) {
    // Client Dashboard View
    if (currentUser.role === 'client') {
        const data = await getClientDashboardData(currentUser.id);
        
        return (
            <ClientDashboard
                initialProjects={data.projects.slice(0, 5)}
                initialNotifications={data.notifications}
                clientName={currentUser.name}
                clientId={currentUser.id}
                metrics={data.metrics}
                transactions={data.transactions}
                tasks={data.tasks}
                invoices={data.invoices}
                assets={data.assets}
            />
        );
    }

    // Admin/Employee Dashboard View
    const isAdmin = currentUser.role === 'admin' || currentUser.role === 'manager';
    const userId = currentUser.id;

    if (isAdmin) {
        // Parallel Fetch for Admin
        const [metrics, revenueData, projectDist, activities, urgentTasks] = await Promise.all([
             getDashboardMetrics(),
             getRevenueData(),
             getProjectDistribution(),
             getRecentActivity(),
             getUrgentTasks()
        ]);
        
        return (
            <div className="flex-1 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between space-y-4 sm:space-y-0">
                    <div>
                        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">Overview</h2>
                        <p className="text-muted-foreground hidden sm:block">Welcome back, {currentUser.name}</p>
                    </div>
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
    const data = await getEmployeeDashboardData(userId);
    const myTasks = data.tasks;
    // const myActivity = data.activities; // Not used in layout logic directly but available
    const myProjects = data.projects;

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
                        allProjects={myProjects}
                    />
                </div>

                {/* My Recent Activity */}
                <div className="col-span-1">
                    <RecentActivityList initialActivities={data.activities?.slice(0, 5) || []} />
                </div>
            </div>
        </div>
    );
}

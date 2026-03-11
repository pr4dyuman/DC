import { Project, Invoice, Notification as AppNotification, Transaction, Task, Asset, User } from "@/lib/types";
import { fmtDateShort, getLocaleForTimezone } from "@/lib/date-utils";
import { getDashboardMetrics, getRevenueData, getProjectDistribution, getRecentActivity, getUrgentTasks, getClientDashboardData, getEmployeeDashboardData } from "@/lib/actions";

import { MetricCard } from "@/components/dashboard/MetricCard";
import { RevenueChart, ProjectDistributionChart } from "@/components/dashboard/Charts";
import { RecentActivityList } from "@/components/dashboard/RecentActivityList";
import { UrgentTasksList } from "@/components/dashboard/UrgentTasksList";
import { EmployeeTasksList } from "@/components/dashboard/EmployeeTasksList";
import { Banknote, Briefcase, FileText, Activity as ActivityIcon, CheckCircle2, Clock, Users, Calendar } from "lucide-react";
import { formatCurrency } from "@/lib/currency";
import { getDefaultCurrency } from "@/lib/actions/super-admin";
import { ClientDashboard } from "@/components/dashboard/ClientDashboard";
import { ExportReportButton } from "@/components/dashboard/ExportReportButton";
import Link from "next/link";

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
        const [metrics, revenueData, projectDist, activities, urgentTasks, currency] = await Promise.all([
            getDashboardMetrics(),
            getRevenueData(),
            getProjectDistribution(),
            getRecentActivity(),
            getUrgentTasks(),
            getDefaultCurrency()
        ]);

        return (
            <div className="flex-1 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between space-y-4 sm:space-y-0">
                    <div>
                        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">Overview</h2>
                        <p className="text-muted-foreground hidden sm:block">Welcome back, {currentUser.name}</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="hidden md:flex h-9 items-center rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm whitespace-nowrap">
                            <span className="text-muted-foreground">{fmtDateShort(new Date(new Date().getFullYear(), new Date().getMonth(), 1), currentUser.timezone || 'UTC', getLocaleForTimezone(currentUser.timezone || 'UTC'))} — {fmtDateShort(new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0), currentUser.timezone || 'UTC', getLocaleForTimezone(currentUser.timezone || 'UTC'))}</span>
                        </div>
                        <ExportReportButton />
                    </div>
                </div>

                <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
                    <MetricCard
                        title="Total Revenue"
                        value={formatCurrency(metrics?.revenue, currency)}
                        description={`${(metrics?.growth ?? 0) > 0 ? '+' : ''}${metrics?.growth ?? 0}% from last month`}
                        icon={Banknote}
                        trend={(metrics?.growth ?? 0) > 0 ? 'up' : (metrics?.growth ?? 0) < 0 ? 'down' : 'neutral'}
                        href="/dashboard/finance?tab=overview"
                    />
                    <MetricCard
                        title="Active Projects"
                        value={metrics?.activeProjects ?? 0}
                        description={`High priority: ${metrics?.highPriorityCount ?? 0}`}
                        icon={Briefcase}
                        href="/dashboard/projects"
                    />
                    <MetricCard
                        title="Pending Invoices"
                        value={formatCurrency(metrics?.pending, currency)}
                        description={`${metrics?.overdueCount ?? 0} invoices overdue`}
                        icon={FileText}
                        href="/dashboard/finance?tab=invoices"
                    />
                    <MetricCard
                        title="Team Members"
                        value={`${metrics?.assignedMembers ?? 0}/${metrics?.totalMembers ?? 0}`}
                        description="Members assigned right now"
                        icon={Users}
                        href="/dashboard/team"
                    />
                </div>

                {/* Pending Leave Requests Alert */}
                {(metrics?.pendingLeaveCount ?? 0) > 0 && (
                    <Link href="/dashboard/team" className="block">
                        <div className="flex items-center gap-3 rounded-lg border border-amber-500/30 bg-amber-500/5 px-4 py-3 hover:bg-amber-500/10 transition-colors">
                            <Calendar className="h-4 w-4 text-amber-500 shrink-0" />
                            <p className="text-sm text-amber-600 dark:text-amber-400 font-medium">
                                {metrics?.pendingLeaveCount} leave request{(metrics?.pendingLeaveCount ?? 0) > 1 ? 's' : ''} pending approval
                            </p>
                            <span className="ml-auto text-xs text-amber-500 hover:underline">Review →</span>
                        </div>
                    </Link>
                )}

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
    const myProjects = data.projects;
    const myLeaves = data.leaveRequests ?? [];

    // Upcoming deadlines: tasks not done, due within next 3 days
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const threeDaysLater = new Date(now);
    threeDaysLater.setDate(now.getDate() + 3);

    const upcomingDeadlines = myTasks
        .filter((t: Task) => {
            if (t.status === 'Done') return false;
            const due = new Date((t as any).dueDate);
            due.setHours(0, 0, 0, 0);
            return due >= now && due <= threeDaysLater;
        })
        .sort((a: Task, b: Task) => new Date((a as any).dueDate).getTime() - new Date((b as any).dueDate).getTime())
        .slice(0, 3);

    // Most recent leave request for status card
    const latestLeave = myLeaves[0];
    const pendingLeave = myLeaves.find((l: any) => l.status === 'Pending');

    return (
        <div className="flex-1 space-y-4">
            <div className="flex flex-col space-y-2">
                <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">My Dashboard</h2>
                <p className="text-muted-foreground">Welcome back, {currentUser.name}</p>
            </div>

            <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-5">
                <MetricCard
                    title="Active Tasks"
                    value={myTasks?.filter((t: Task) => t.status === 'In Progress').length || 0}
                    description="Currently in progress"
                    icon={ActivityIcon}
                    href="/dashboard/projects"
                />
                <MetricCard
                    title="Pending Tasks"
                    value={myTasks?.filter((t: Task) => t.status === 'Todo').length || 0}
                    description="Waiting for you"
                    icon={Clock}
                    href="/dashboard/projects"
                />
                <MetricCard
                    title="Done This Week"
                    value={myTasks?.filter((t: Task) => {
                        if (t.status !== 'Done') return false;
                        const weekAgo = new Date();
                        weekAgo.setDate(weekAgo.getDate() - 7);
                        return new Date((t as any).createdAt || 0) >= weekAgo;
                    }).length || 0}
                    description="Completed this week"
                    icon={CheckCircle2}
                    href="/dashboard/projects"
                />
                <MetricCard
                    title="My Projects"
                    value={myProjects?.length || 0}
                    description="Projects involved in"
                    icon={Briefcase}
                    href="/dashboard/projects"
                />
                {/* Leave Status Card */}
                <Link href="/dashboard/team" className="col-span-1 block">
                    <div className={`h-full rounded-lg border p-4 hover:border-primary/50 transition-colors cursor-pointer ${pendingLeave ? 'border-amber-500/40 bg-amber-500/5' :
                        latestLeave?.status === 'Approved' ? 'border-emerald-500/40 bg-emerald-500/5' :
                            latestLeave?.status === 'Rejected' ? 'border-red-500/40 bg-red-500/5' :
                                'border-border'
                        }`}>
                        <p className="text-xs font-medium text-muted-foreground mb-1">My Leave</p>
                        {latestLeave ? (
                            <>
                                <p className={`text-lg font-bold ${latestLeave.status === 'Pending' ? 'text-amber-500' :
                                    latestLeave.status === 'Approved' ? 'text-emerald-500' : 'text-red-500'
                                    }`}>{latestLeave.status}</p>
                                <p className="text-xs text-muted-foreground truncate mt-0.5">{(latestLeave as any).leaveType || 'Leave'}</p>
                            </>
                        ) : (
                            <>
                                <p className="text-lg font-bold">None</p>
                                <p className="text-xs text-muted-foreground">No requests</p>
                            </>
                        )}
                    </div>
                </Link>
            </div>

            {/* Upcoming Deadlines Alert */}
            {upcomingDeadlines.length > 0 && (
                <div className="rounded-lg border border-red-500/20 bg-red-500/5 px-4 py-3 space-y-2">
                    <p className="text-xs font-semibold text-red-500 uppercase tracking-wide">⚠ Deadlines in the next 3 days</p>
                    <div className="flex flex-wrap gap-2">
                        {upcomingDeadlines.map((t: Task) => {
                            const due = new Date((t as any).dueDate);
                            due.setHours(0, 0, 0, 0);
                            const daysLeft = Math.round((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
                            const project = myProjects.find((p: any) => p.id === (t as any).projectId);
                            return (
                                <Link
                                    key={t.id}
                                    href={`/dashboard/projects/${(project as any)?.slug || (t as any).projectId}?task=${t.id}`}
                                    className="flex items-center gap-2 rounded-md border border-red-500/20 bg-background px-3 py-1.5 text-xs hover:bg-muted transition-colors"
                                >
                                    <span className="font-medium truncate max-w-[150px]">{t.title}</span>
                                    <span className={`shrink-0 font-semibold ${daysLeft === 0 ? 'text-red-500' : 'text-amber-500'}`}>
                                        {daysLeft === 0 ? 'Today' : `${daysLeft}d`}
                                    </span>
                                </Link>
                            );
                        })}
                    </div>
                </div>
            )}

            <div className="grid gap-4 grid-cols-1 md:grid-cols-3">
                {/* My Active Tasks List */}
                <div className="col-span-2">
                    <EmployeeTasksList
                        initialTasks={myTasks?.filter((t: Task) => t.status === 'In Progress' || t.status === 'Todo').slice(0, 5) || []}
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


import { Project, Invoice, Notification as AppNotification, Transaction, Task, Asset, User } from "@/lib/types";
import { db } from "@/lib/db";

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
        const data = await db.get();
        
        // Filter data in memory (fast) instead of calling action functions (slow)
        const clientProjects = data.projects.filter((p: Project) => p.clientId === currentUser.id);
        const clientProjectIds = new Set(clientProjects.map((p: Project) => p.id));
        
        // Filter invoices for client's projects
        const clientInvoices = data.invoices.filter((i: Invoice) => clientProjectIds.has(i.projectId));
        
        // Filter notifications (auto-cleanup old ones)
        const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
        const clientNotifications = data.notifications
            .filter((n: AppNotification) => n.userId === currentUser.id && n.timestamp > oneDayAgo)
            .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        
        // Filter other data
        const clientTransactions = data.transactions.filter((t: Transaction) => t.projectId && clientProjectIds.has(t.projectId));
        const clientTasks = data.tasks.filter((t: Task) => clientProjectIds.has(t.projectId));
        const clientAssets = data.assets.filter((a: Asset) => clientProjectIds.has(a.projectId));

        // Calculate metrics
        const activeProjectsCount = clientProjects.filter((p: Project) => p.status === 'Active').length;
        const completedProjectsCount = clientProjects.filter((p: Project) => p.status === 'Completed').length;
        const pendingInvoices = clientInvoices.filter((i: Invoice) => i.status === 'Pending' || i.status === 'Overdue');
        const totalDue = pendingInvoices.reduce((acc: number, inv: Invoice) => acc + inv.amount, 0);
        const unreadNotificationsCount = clientNotifications.filter((n: AppNotification) => !n.read).length;
        
        // Financial metrics
        const totalPaid = clientTransactions
            .filter((t: Transaction) => t.type === 'income' && t.status === 'completed')
            .reduce((sum: number, t: Transaction) => sum + t.amount, 0);
        
        const totalRefunded = clientTransactions
            .filter((t: Transaction) => t.category === 'Refund' && t.status === 'completed')
            .reduce((sum: number, t: Transaction) => sum + t.amount, 0);
        
        const totalSpent = totalPaid - totalRefunded;
        const totalBudget = clientProjects.reduce((sum: number, p: Project) => sum + (p.budget || 0), 0);

        // Task metrics
        const totalTasks = clientTasks.length;
        const completedTasks = clientTasks.filter((t: Task) => t.status === 'Done').length;

        const clientMetrics = {
            activeProjects: activeProjectsCount,
            completedProjects: completedProjectsCount,
            pendingInvoicesCount: pendingInvoices.length,
            totalDue: totalDue,
            unreadNotificationsCount: unreadNotificationsCount,
            totalSpent,
            totalBudget,
            totalTasks,
            completedTasks
        };

        return (
            <ClientDashboard
                initialProjects={clientProjects.slice(0, 5)}
                initialNotifications={clientNotifications.slice(0, 5)}
                clientName={currentUser.name}
                clientId={currentUser.id}
                metrics={clientMetrics}
                transactions={clientTransactions}
                tasks={clientTasks}
                invoices={clientInvoices}
                assets={clientAssets}
            />
        );
    }

    // Admin/Employee Dashboard View
    const isAdmin = currentUser.role === 'admin' || currentUser.role === 'manager';
    const userId = currentUser.id;

    const data = await db.get();

    if (isAdmin) {
        // Calculate all metrics inline
        const currentYear = new Date().getFullYear();
        const currentMonth = new Date().getMonth();
        
        // Revenue & Growth
        const allTransactions = data.transactions || [];
        const incomeTransactions = allTransactions.filter(t => t.type === 'income' && t.status === 'completed');
        const totalIncome = incomeTransactions.reduce((acc, curr) => acc + curr.amount, 0);
        const refundTransactions = allTransactions.filter(t => t.category === 'Refund' && t.status === 'completed');
        const totalRefunds = refundTransactions.reduce((acc, curr) => acc + curr.amount, 0);
        const totalRevenue = totalIncome - totalRefunds;
        
        // Growth calculation
        const currentMonthRevenue = incomeTransactions
            .filter(t => {
                const d = new Date(t.date);
                return d.getFullYear() === currentYear && d.getMonth() === currentMonth;
            })
            .reduce((acc, curr) => acc + curr.amount, 0);
        
        const prevMonthDate = new Date();
        prevMonthDate.setMonth(currentMonth - 1);
        const prevMonth = prevMonthDate.getMonth();
        const prevMonthYear = prevMonthDate.getFullYear();
        
        const prevMonthRevenue = incomeTransactions
            .filter(t => {
                const d = new Date(t.date);
                return d.getFullYear() === prevMonthYear && d.getMonth() === prevMonth;
            })
            .reduce((acc, curr) => acc + curr.amount, 0);
        
        let growthPercentage = 0;
        if (prevMonthRevenue > 0) {
            growthPercentage = Math.round(((currentMonthRevenue - prevMonthRevenue) / prevMonthRevenue) * 100);
        } else if (currentMonthRevenue > 0) {
            growthPercentage = 100;
        }
        
        // Pending Invoices
        const pendingInvoicesList = data.invoices.filter(i => i.status === 'Pending' || i.status === 'Overdue' || i.status === 'Processing');
        const pendingInvoicesAmount = pendingInvoicesList.reduce((acc, curr) => acc + curr.amount, 0);
        const todayStr = new Date().toISOString().split('T')[0];
        const overdueCount = pendingInvoicesList.filter(i => (i.date < todayStr && i.status !== 'Paid') || i.status === 'Overdue').length;
        
        // Active Projects
        const activeProjectsList = data.projects.filter(p => p.status === 'Active');
        const activeProjects = activeProjectsList.length;
        const activeProjectIds = new Set(activeProjectsList.map(p => p.id));
        const highPriorityTaskProjects = new Set(
            data.tasks
                .filter(t => t.status !== 'Done' && t.priority === 'High' && activeProjectIds.has(t.projectId))
                .map(t => t.projectId)
        );
        const highPriorityCount = highPriorityTaskProjects.size;
        
        // Team Utilization
        const totalTasks = data.tasks.length;
        const activeTasks = data.tasks.filter(t => t.status === 'In Progress').length;
        const utilization = totalTasks > 0 ? Math.round((activeTasks / totalTasks) * 100) : 0;
        
        const metrics = {
            revenue: totalRevenue,
            growth: growthPercentage,
            pending: pendingInvoicesAmount,
            overdueCount: overdueCount,
            activeProjects,
            highPriorityCount,
            utilization,
            activeTasksCount: activeTasks
        };
        
        // Revenue Data (last 6 months)
        const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        const revenueData: any[] = [];
        for (let i = 5; i >= 0; i--) {
            const d = new Date();
            d.setMonth(d.getMonth() - i);
            const monthIndex = d.getMonth();
            const year = d.getFullYear();
            revenueData.push({
                name: months[monthIndex],
                revenue: 0,
                expenses: 0,
                monthIndex,
                year
            });
        }
        
        allTransactions.forEach(t => {
            const tDate = new Date(t.date);
            const tMonth = tDate.getMonth();
            const tYear = tDate.getFullYear();
            const monthData = revenueData.find(r => r.monthIndex === tMonth && r.year === tYear);
            if (monthData) {
                if (t.type === 'income') monthData.revenue += t.amount;
                if (t.type === 'expense') monthData.expenses += t.amount;
            }
        });
        
        const finalRevenueData = revenueData.map(({ name, revenue, expenses }) => ({ name, revenue, expenses }));
        
        // Project Distribution
        const distribution: Record<string, number> = {};
        data.projects.forEach(p => {
            p.services.forEach(svc => {
                const serviceObj = data.services.find(s => s.id === svc || s.name === svc);
                const name = serviceObj ? serviceObj.name : svc;
                distribution[name] = (distribution[name] || 0) + 1;
            });
        });
        const projectDist = Object.entries(distribution).map(([name, value]) => ({ name, value }));
        
        // Recent Activity & Urgent Tasks
        const activities = data.activities.slice(0, 5);
        const urgentTasks = data.tasks
            .filter(t => t.status !== 'Done' && t.priority === 'High')
            .slice(0, 5);

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
                    <RevenueChart data={finalRevenueData || []} />
                    <ProjectDistributionChart data={projectDist || []} />
                </div>

                <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-7">
                    <UrgentTasksList initialTasks={urgentTasks || []} />
                    <RecentActivityList initialActivities={activities || []} />
                </div>
            </div>
        );
    }


    // EMPLOYEE VIEW - Use data already loaded above
    const myTasks = data.tasks.filter(t => t.assigneeId === userId);
    const myActivity = data.activities
        .filter(a => {
            const user = data.users.find(u => u.id === userId);
            return user && a.user === user.name;
        })
        .slice(0, 20);
    
    const projectIds = new Set(myTasks.map(t => t.projectId));
    const myProjects = data.projects.filter(p => projectIds.has(p.id));

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
                        allProjects={data.projects}
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

import { getSystemAnalytics } from "@/lib/actions/super-admin";
import { fmtDate, getLocaleForTimezone } from "@/lib/date-utils";
import Link from "next/link";
import { Building2, Users, FolderKanban, DollarSign, TrendingUp, AlertCircle } from "lucide-react";

export default async function SuperAdminDashboard() {
    const analytics = await getSystemAnalytics();

    const stats = [
        {
            name: "Total Agencies",
            value: analytics.totalAgencies,
            icon: Building2,
            color: "bg-blue-500",
            href: "/super-admin/agencies"
        },
        {
            name: "Active Agencies",
            value: analytics.activeAgencies,
            icon: TrendingUp,
            color: "bg-green-500",
            href: "/super-admin/agencies?status=active"
        },
        {
            name: "Suspended",
            value: analytics.suspendedAgencies,
            icon: AlertCircle,
            color: "bg-red-500",
            href: "/super-admin/agencies?status=suspended"
        },
        {
            name: "Total System Users",
            value: analytics.totalUsers,
            icon: Users,
            color: "bg-purple-500",
            href: "/super-admin/users"
        },
    ];

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold text-foreground">Super Admin Dashboard</h1>
                <p className="text-muted-foreground mt-1">System overview and management</p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {stats.map((stat) => {
                    const Icon = stat.icon;
                    return (
                        <Link
                            key={stat.name}
                            href={stat.href}
                            className="bg-card border border-border rounded-lg shadow p-6 hover:bg-muted/50 transition-all"
                        >
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-muted-foreground">{stat.name}</p>
                                    <p className="text-3xl font-bold text-foreground mt-2">{stat.value}</p>
                                </div>
                                <div className={`${stat.color} p-3 rounded-lg`}>
                                    <Icon className="w-6 h-6 text-white" />
                                </div>
                            </div>
                        </Link>
                    );
                })}
            </div>

            {/* Agencies by Plan */}
            <div className="bg-card border border-border rounded-lg shadow p-6">
                <h2 className="text-xl font-bold text-foreground mb-4">Agencies by Plan</h2>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div className="text-center p-4 bg-muted rounded-lg">
                        <p className="text-2xl font-bold text-foreground">{analytics.agenciesByPlan.free || 0}</p>
                        <p className="text-sm text-muted-foreground mt-1">Free Plan</p>
                    </div>
                    <div className="text-center p-4 bg-emerald-500/10 rounded-lg">
                        <p className="text-2xl font-bold text-emerald-500">{analytics.agenciesByPlan.starter || 0}</p>
                        <p className="text-sm text-emerald-400 mt-1">Starter Plan</p>
                    </div>
                    <div className="text-center p-4 bg-blue-500/10 rounded-lg">
                        <p className="text-2xl font-bold text-blue-500">{analytics.agenciesByPlan.pro || 0}</p>
                        <p className="text-sm text-blue-400 mt-1">Pro Plan</p>
                    </div>
                    <div className="text-center p-4 bg-purple-500/10 rounded-lg">
                        <p className="text-2xl font-bold text-purple-500">{analytics.agenciesByPlan.enterprise || 0}</p>
                        <p className="text-sm text-purple-400 mt-1">Enterprise Plan</p>
                    </div>
                </div>
            </div>

            {/* Recent Agencies */}
            <div className="bg-card border border-border rounded-lg shadow">
                <div className="p-6 border-b border-border">
                    <h2 className="text-xl font-bold text-foreground">Recent Agencies</h2>
                </div>
                <div className="divide-y divide-border">
                    {analytics.recentAgencies.map((agency: any) => (
                        <Link
                            key={agency.id}
                            href={`/super-admin/agencies/${agency.id}`}
                            className="p-6 hover:bg-muted/50 transition-colors block"
                        >
                            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                                <div>
                                    <h3 className="font-semibold text-foreground">{agency.name}</h3>
                                    <p className="text-sm text-muted-foreground mt-1">
                                        Created {fmtDate(agency.createdAt, 'UTC', 'en-US')}
                                    </p>
                                </div>
                                <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${agency.plan === 'enterprise' ? 'bg-purple-500/10 text-purple-500' :
                                        agency.plan === 'pro' ? 'bg-blue-500/10 text-blue-500' :
                                            agency.plan === 'starter' ? 'bg-emerald-500/10 text-emerald-500' :
                                                'bg-muted text-muted-foreground'
                                        }`}>
                                        {agency.plan.toUpperCase()}
                                    </span>
                                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${agency.status === 'active' ? 'bg-green-500/10 text-green-500' :
                                        'bg-red-500/10 text-red-500'
                                        }`}>
                                        {agency.status}
                                    </span>
                                </div>
                            </div>
                        </Link>
                    ))}
                </div>
            </div>
        </div>
    );
}

import { getSystemAnalytics } from "@/lib/actions/super-admin";
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
                <h1 className="text-3xl font-bold text-gray-900">Super Admin Dashboard</h1>
                <p className="text-gray-600 mt-1">System overview and management</p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {stats.map((stat) => {
                    const Icon = stat.icon;
                    return (
                        <Link
                            key={stat.name}
                            href={stat.href}
                            className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow"
                        >
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-gray-600">{stat.name}</p>
                                    <p className="text-3xl font-bold text-gray-900 mt-2">{stat.value}</p>
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
            <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4">Agencies by Plan</h2>
                <div className="grid grid-cols-3 gap-4">
                    <div className="text-center p-4 bg-gray-50 rounded-lg">
                        <p className="text-2xl font-bold text-gray-900">{analytics.agenciesByPlan.free || 0}</p>
                        <p className="text-sm text-gray-600 mt-1">Free Plan</p>
                    </div>
                    <div className="text-center p-4 bg-blue-50 rounded-lg">
                        <p className="text-2xl font-bold text-blue-900">{analytics.agenciesByPlan.pro || 0}</p>
                        <p className="text-sm text-blue-600 mt-1">Pro Plan</p>
                    </div>
                    <div className="text-center p-4 bg-purple-50 rounded-lg">
                        <p className="text-2xl font-bold text-purple-900">{analytics.agenciesByPlan.enterprise || 0}</p>
                        <p className="text-sm text-purple-600 mt-1">Enterprise Plan</p>
                    </div>
                </div>
            </div>

            {/* Recent Agencies */}
            <div className="bg-white rounded-lg shadow">
                <div className="p-6 border-b border-gray-200">
                    <h2 className="text-xl font-bold text-gray-900">Recent Agencies</h2>
                </div>
                <div className="divide-y divide-gray-200">
                    {analytics.recentAgencies.map((agency: any) => (
                        <Link
                            key={agency.id}
                            href={`/super-admin/agencies/${agency.id}`}
                            className="p-6 hover:bg-gray-50 transition-colors block"
                        >
                            <div className="flex items-center justify-between">
                                <div>
                                    <h3 className="font-semibold text-gray-900">{agency.name}</h3>
                                    <p className="text-sm text-gray-600 mt-1">
                                        Created {new Date(agency.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                                    </p>
                                </div>
                                <div className="flex items-center gap-3">
                                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${agency.plan === 'enterprise' ? 'bg-purple-100 text-purple-800' :
                                            agency.plan === 'pro' ? 'bg-blue-100 text-blue-800' :
                                                'bg-gray-100 text-gray-800'
                                        }`}>
                                        {agency.plan.toUpperCase()}
                                    </span>
                                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${agency.status === 'active' ? 'bg-green-100 text-green-800' :
                                            'bg-red-100 text-red-800'
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

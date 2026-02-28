import { getSystemAnalytics } from "@/lib/actions/super-admin";
import { Users, Building2 } from "lucide-react";

export default async function AnalyticsPage() {
    const analytics = await getSystemAnalytics();

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold text-foreground">System Analytics</h1>
                <p className="text-muted-foreground mt-1">Overview of system-wide metrics and trends</p>
            </div>

            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
                <div className="bg-card rounded-lg shadow border border-border p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-muted-foreground">Total Agencies</p>
                            <p className="text-3xl font-bold text-foreground mt-2">{analytics.totalAgencies}</p>
                        </div>
                        <Building2 className="w-10 h-10 text-blue-500" />
                    </div>
                </div>

                <div className="bg-card rounded-lg shadow border border-border p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-muted-foreground">Total System Users</p>
                            <p className="text-3xl font-bold text-foreground mt-2">{analytics.totalUsers}</p>
                        </div>
                        <Users className="w-10 h-10 text-purple-500" />
                    </div>
                </div>
            </div>

            {/* Plan Distribution */}
            <div className="bg-card rounded-lg shadow border border-border p-6">
                <h2 className="text-xl font-bold text-foreground mb-6">Agency Distribution by Plan</h2>
                <div className="grid grid-cols-3 gap-6">
                    <div className="text-center">
                        <div className="w-32 h-32 mx-auto bg-muted rounded-full flex items-center justify-center">
                            <div className="text-center">
                                <p className="text-3xl font-bold text-foreground">{analytics.agenciesByPlan.free || 0}</p>
                                <p className="text-sm text-muted-foreground">Free</p>
                            </div>
                        </div>
                        <p className="text-sm text-muted-foreground mt-3">
                            {((analytics.agenciesByPlan.free || 0) / analytics.totalAgencies * 100).toFixed(1)}%
                        </p>
                    </div>

                    <div className="text-center">
                        <div className="w-32 h-32 mx-auto bg-blue-500/10 rounded-full flex items-center justify-center">
                            <div className="text-center">
                                <p className="text-3xl font-bold text-blue-500">{analytics.agenciesByPlan.pro || 0}</p>
                                <p className="text-sm text-blue-400">Pro</p>
                            </div>
                        </div>
                        <p className="text-sm text-muted-foreground mt-3">
                            {((analytics.agenciesByPlan.pro || 0) / analytics.totalAgencies * 100).toFixed(1)}%
                        </p>
                    </div>

                    <div className="text-center">
                        <div className="w-32 h-32 mx-auto bg-purple-500/10 rounded-full flex items-center justify-center">
                            <div className="text-center">
                                <p className="text-3xl font-bold text-purple-500">{analytics.agenciesByPlan.enterprise || 0}</p>
                                <p className="text-sm text-purple-400">Enterprise</p>
                            </div>
                        </div>
                        <p className="text-sm text-muted-foreground mt-3">
                            {((analytics.agenciesByPlan.enterprise || 0) / analytics.totalAgencies * 100).toFixed(1)}%
                        </p>
                    </div>
                </div>
            </div>

            {/* Status Overview */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-card rounded-lg shadow border border-border p-6">
                    <h3 className="text-lg font-bold text-foreground mb-4">Agency Status</h3>
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <span className="text-muted-foreground">Active</span>
                            <div className="flex items-center gap-3">
                                <div className="w-48 bg-muted rounded-full h-2">
                                    <div
                                        className="bg-green-500 h-2 rounded-full"
                                        style={{ width: `${(analytics.activeAgencies / analytics.totalAgencies * 100)}%` }}
                                    />
                                </div>
                                <span className="font-bold text-foreground w-12 text-right">{analytics.activeAgencies}</span>
                            </div>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-muted-foreground">Suspended</span>
                            <div className="flex items-center gap-3">
                                <div className="w-48 bg-muted rounded-full h-2">
                                    <div
                                        className="bg-red-500 h-2 rounded-full"
                                        style={{ width: `${(analytics.suspendedAgencies / analytics.totalAgencies * 100)}%` }}
                                    />
                                </div>
                                <span className="font-bold text-foreground w-12 text-right">{analytics.suspendedAgencies}</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="bg-card rounded-lg shadow border border-border p-6">
                    <h3 className="text-lg font-bold text-foreground mb-4">Quick Stats</h3>
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <span className="text-muted-foreground">Avg Users per Agency</span>
                            <span className="font-bold text-foreground">
                                {(analytics.totalUsers / analytics.totalAgencies).toFixed(1)}
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

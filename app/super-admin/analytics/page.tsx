import { getSystemAnalytics } from "@/lib/actions/super-admin";
import { Users, Building2 } from "lucide-react";

export default async function AnalyticsPage() {
    const analytics = await getSystemAnalytics();
    
    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold text-gray-900">System Analytics</h1>
                <p className="text-gray-600 mt-1">Overview of system-wide metrics and trends</p>
            </div>
            
            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
                <div className="bg-white rounded-lg shadow p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-600">Total Agencies</p>
                            <p className="text-3xl font-bold text-gray-900 mt-2">{analytics.totalAgencies}</p>
                        </div>
                        <Building2 className="w-10 h-10 text-blue-500" />
                    </div>
                </div>
                
                <div className="bg-white rounded-lg shadow p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-600">Total System Users</p>
                            <p className="text-3xl font-bold text-gray-900 mt-2">{analytics.totalUsers}</p>
                        </div>
                        <Users className="w-10 h-10 text-purple-500" />
                    </div>
                </div>
            </div>
            
            {/* Plan Distribution */}
            <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-6">Agency Distribution by Plan</h2>
                <div className="grid grid-cols-3 gap-6">
                    <div className="text-center">
                        <div className="w-32 h-32 mx-auto bg-gray-100 rounded-full flex items-center justify-center">
                            <div className="text-center">
                                <p className="text-3xl font-bold text-gray-900">{analytics.agenciesByPlan.free || 0}</p>
                                <p className="text-sm text-gray-600">Free</p>
                            </div>
                        </div>
                        <p className="text-sm text-gray-600 mt-3">
                            {((analytics.agenciesByPlan.free || 0) / analytics.totalAgencies * 100).toFixed(1)}%
                        </p>
                    </div>
                    
                    <div className="text-center">
                        <div className="w-32 h-32 mx-auto bg-blue-100 rounded-full flex items-center justify-center">
                            <div className="text-center">
                                <p className="text-3xl font-bold text-blue-900">{analytics.agenciesByPlan.pro || 0}</p>
                                <p className="text-sm text-blue-600">Pro</p>
                            </div>
                        </div>
                        <p className="text-sm text-gray-600 mt-3">
                            {((analytics.agenciesByPlan.pro || 0) / analytics.totalAgencies * 100).toFixed(1)}%
                        </p>
                    </div>
                    
                    <div className="text-center">
                        <div className="w-32 h-32 mx-auto bg-purple-100 rounded-full flex items-center justify-center">
                            <div className="text-center">
                                <p className="text-3xl font-bold text-purple-900">{analytics.agenciesByPlan.enterprise || 0}</p>
                                <p className="text-sm text-purple-600">Enterprise</p>
                            </div>
                        </div>
                        <p className="text-sm text-gray-600 mt-3">
                            {((analytics.agenciesByPlan.enterprise || 0) / analytics.totalAgencies * 100).toFixed(1)}%
                        </p>
                    </div>
                </div>
            </div>
            
            {/* Status Overview */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white rounded-lg shadow p-6">
                    <h3 className="text-lg font-bold text-gray-900 mb-4">Agency Status</h3>
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <span className="text-gray-600">Active</span>
                            <div className="flex items-center gap-3">
                                <div className="w-48 bg-gray-200 rounded-full h-2">
                                    <div
                                        className="bg-green-500 h-2 rounded-full"
                                        style={{ width: `${(analytics.activeAgencies / analytics.totalAgencies * 100)}%` }}
                                    />
                                </div>
                                <span className="font-bold text-gray-900 w-12 text-right">{analytics.activeAgencies}</span>
                            </div>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-gray-600">Suspended</span>
                            <div className="flex items-center gap-3">
                                <div className="w-48 bg-gray-200 rounded-full h-2">
                                    <div
                                        className="bg-red-500 h-2 rounded-full"
                                        style={{ width: `${(analytics.suspendedAgencies / analytics.totalAgencies * 100)}%` }}
                                    />
                                </div>
                                <span className="font-bold text-gray-900 w-12 text-right">{analytics.suspendedAgencies}</span>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div className="bg-white rounded-lg shadow p-6">
                    <h3 className="text-lg font-bold text-gray-900 mb-4">Quick Stats</h3>
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <span className="text-gray-600">Avg Users per Agency</span>
                            <span className="font-bold text-gray-900">
                                {(analytics.totalUsers / analytics.totalAgencies).toFixed(1)}
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

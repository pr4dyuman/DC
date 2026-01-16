import { getAllAgenciesWithStats } from "@/lib/actions/super-admin";
import Link from "next/link";

export default async function BillingPage() {
    const agencies = await getAllAgenciesWithStats();
    
    const totalRevenue = agencies.reduce((sum: number, a: any) => sum + (a.stats?.revenue || 0), 0);
    const proAgencies = agencies.filter((a: any) => a.plan === 'pro').length;
    const enterpriseAgencies = agencies.filter((a: any) => a.plan === 'enterprise').length;
    
    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold text-gray-900">Billing & Revenue</h1>
                <p className="text-gray-600 mt-1">Manage subscriptions and revenue</p>
            </div>
            
            {/* Revenue Overview */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white rounded-lg shadow p-6">
                    <p className="text-sm text-gray-600">Total Revenue</p>
                    <p className="text-3xl font-bold text-gray-900 mt-2">
                        ${totalRevenue.toLocaleString()}
                    </p>
                    <p className="text-sm text-green-600 mt-2">All-time</p>
                </div>
                
                <div className="bg-white rounded-lg shadow p-6">
                    <p className="text-sm text-gray-600">Pro Subscriptions</p>
                    <p className="text-3xl font-bold text-blue-900 mt-2">{proAgencies}</p>
                    <p className="text-sm text-gray-600 mt-2">Active agencies</p>
                </div>
                
                <div className="bg-white rounded-lg shadow p-6">
                    <p className="text-sm text-gray-600">Enterprise Subscriptions</p>
                    <p className="text-3xl font-bold text-purple-900 mt-2">{enterpriseAgencies}</p>
                    <p className="text-sm text-gray-600 mt-2">Active agencies</p>
                </div>
            </div>
            
            {/* Agency Revenue List */}
            <div className="bg-white rounded-lg shadow">
                <div className="p-6 border-b border-gray-200">
                    <h2 className="text-xl font-bold text-gray-900">Revenue by Agency</h2>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-gray-50 border-b border-gray-200">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                    Agency
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                    Plan
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                    Revenue
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                    Projects
                                </th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                                    Actions
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {agencies
                                .sort((a: any, b: any) => (b.stats?.revenue || 0) - (a.stats?.revenue || 0))
                                .map((agency: any) => (
                                    <tr key={agency.id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="font-medium text-gray-900">{agency.name}</div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                                                agency.plan === 'enterprise' ? 'bg-purple-100 text-purple-800' :
                                                agency.plan === 'pro' ? 'bg-blue-100 text-blue-800' :
                                                'bg-gray-100 text-gray-800'
                                            }`}>
                                                {agency.plan.toUpperCase()}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                            ${(agency.stats?.revenue || 0).toLocaleString()}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                            {agency.stats?.projects || 0}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                                            <Link
                                                href={`/super-admin/agencies/${agency.id}`}
                                                className="text-blue-600 hover:text-blue-900"
                                            >
                                                View Details
                                            </Link>
                                        </td>
                                    </tr>
                                ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

import { getAllAgenciesWithStats } from "@/lib/actions/super-admin";
import Link from "next/link";
import { Plus, Search } from "lucide-react";
import AgencyTable from "@/components/super-admin/AgencyTable";

export default async function AgenciesPage() {
    const agencies = await getAllAgenciesWithStats();
    
    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Agencies</h1>
                    <p className="text-gray-600 mt-1">Manage all agencies in the system</p>
                </div>
                <Link
                    href="/super-admin/agencies/new"
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                    <Plus className="w-5 h-5" />
                    <span>Create Agency</span>
                </Link>
            </div>
            
            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white rounded-lg shadow p-4">
                    <p className="text-sm text-gray-600">Total Agencies</p>
                    <p className="text-2xl font-bold text-gray-900 mt-1">{agencies.length}</p>
                </div>
                <div className="bg-white rounded-lg shadow p-4">
                    <p className="text-sm text-gray-600">Active</p>
                    <p className="text-2xl font-bold text-green-600 mt-1">
                        {agencies.filter((a: any) => a.status === 'active').length}
                    </p>
                </div>
                <div className="bg-white rounded-lg shadow p-4">
                    <p className="text-sm text-gray-600">Suspended</p>
                    <p className="text-2xl font-bold text-red-600 mt-1">
                        {agencies.filter((a: any) => a.status === 'suspended').length}
                    </p>
                </div>
                <div className="bg-white rounded-lg shadow p-4">
                    <p className="text-sm text-gray-600">Total Revenue</p>
                    <p className="text-2xl font-bold text-gray-900 mt-1">
                        ${agencies.reduce((sum: number, a: any) => sum + (a.stats?.revenue || 0), 0).toLocaleString()}
                    </p>
                </div>
            </div>
            
            {/* Agency Table */}
            <AgencyTable agencies={agencies} />
        </div>
    );
}

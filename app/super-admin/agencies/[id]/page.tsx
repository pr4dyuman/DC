import { getAgencyDetails } from "@/lib/actions/super-admin";
import Link from "next/link";
import { ArrowLeft, Users, FolderKanban, UserCircle, DollarSign } from "lucide-react";
import AgencyActions from "@/components/super-admin/AgencyActions";

export default async function AgencyDetailsPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const data = await getAgencyDetails(id);
    const { agency, stats, users } = data;
    
    return (
        <div className="space-y-6">
            <div>
                <Link
                    href="/super-admin/agencies"
                    className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
                >
                    <ArrowLeft className="w-4 h-4" />
                    <span>Back to Agencies</span>
                </Link>
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">{agency.name}</h1>
                        <p className="text-gray-600 mt-1">{agency.slug}</p>
                    </div>
                    <AgencyActions agency={agency} />
                </div>
            </div>
            
            {/* Status Badges */}
            <div className="flex items-center gap-3">
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                    agency.plan === 'enterprise' ? 'bg-purple-100 text-purple-800' :
                    agency.plan === 'pro' ? 'bg-blue-100 text-blue-800' :
                    'bg-gray-100 text-gray-800'
                }`}>
                    {agency.plan.toUpperCase()} Plan
                </span>
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                    agency.status === 'active' ? 'bg-green-100 text-green-800' :
                    'bg-red-100 text-red-800'
                }`}>
                    {agency.status}
                </span>
            </div>
            
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="bg-white rounded-lg shadow p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-600">Users</p>
                            <p className="text-2xl font-bold text-gray-900 mt-1">{stats.users}</p>
                            <p className="text-xs text-gray-500 mt-1">
                                Limit: {agency.limits.maxUsers === -1 ? 'Unlimited' : agency.limits.maxUsers}
                            </p>
                        </div>
                        <Users className="w-8 h-8 text-blue-500" />
                    </div>
                </div>
                
                <div className="bg-white rounded-lg shadow p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-600">Projects</p>
                            <p className="text-2xl font-bold text-gray-900 mt-1">{stats.projects}</p>
                            <p className="text-xs text-gray-500 mt-1">
                                Limit: {agency.limits.maxProjects === -1 ? 'Unlimited' : agency.limits.maxProjects}
                            </p>
                        </div>
                        <FolderKanban className="w-8 h-8 text-purple-500" />
                    </div>
                </div>
                
                <div className="bg-white rounded-lg shadow p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-600">Clients</p>
                            <p className="text-2xl font-bold text-gray-900 mt-1">{stats.clients}</p>
                            <p className="text-xs text-gray-500 mt-1">
                                Limit: {agency.limits.maxClients === -1 ? 'Unlimited' : agency.limits.maxClients}
                            </p>
                        </div>
                        <UserCircle className="w-8 h-8 text-orange-500" />
                    </div>
                </div>
            </div>
            
            {/* Users List */}
            <div className="bg-white rounded-lg shadow">
                <div className="p-6 border-b border-gray-200">
                    <h2 className="text-xl font-bold text-gray-900">Users ({users.length})</h2>
                </div>
                <div className="divide-y divide-gray-200">
                    {users.slice(0, 10).map((user: any) => (
                        <div key={user.id} className="p-6 flex items-center justify-between">
                            <div>
                                <p className="font-medium text-gray-900">{user.name}</p>
                                <p className="text-sm text-gray-600">{user.email}</p>
                            </div>
                            <span className="px-3 py-1 bg-gray-100 text-gray-800 rounded-full text-sm">
                                {user.role}
                            </span>
                        </div>
                    ))}
                </div>
            </div>
            

        </div>
    );
}

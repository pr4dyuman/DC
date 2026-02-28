import { getAgencyDetails } from "@/lib/actions/super-admin";
import Link from "next/link";
import { ArrowLeft, Users, FolderKanban, UserCircle, DollarSign, Brain } from "lucide-react";
import AgencyActions from "@/components/super-admin/AgencyActions";

export default async function AgencyDetailsPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const rawData = await getAgencyDetails(id);
    // Ensure clean serialization — strip MongoDB _id/buffer for client components
    const data = JSON.parse(JSON.stringify(rawData));
    const { agency, stats, users } = data;

    return (
        <div className="space-y-6">
            <div>
                <Link
                    href="/super-admin/agencies"
                    className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-4"
                >
                    <ArrowLeft className="w-4 h-4" />
                    <span>Back to Agencies</span>
                </Link>
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold text-foreground">{agency.name}</h1>
                        <p className="text-muted-foreground mt-1">{agency.slug}</p>
                    </div>
                    <AgencyActions agency={agency} />
                </div>
            </div>

            {/* Status Badges */}
            <div className="flex items-center gap-3">
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${agency.plan === 'enterprise' ? 'bg-purple-500/10 text-purple-500' :
                    agency.plan === 'pro' ? 'bg-blue-500/10 text-blue-500' :
                        'bg-muted text-muted-foreground'
                    }`}>
                    {agency.plan.toUpperCase()} Plan
                </span>
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${agency.status === 'active' ? 'bg-green-500/10 text-green-500' :
                    'bg-red-500/10 text-red-500'
                    }`}>
                    {agency.status}
                </span>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="bg-card rounded-lg shadow border border-border p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-muted-foreground">Users</p>
                            <p className="text-2xl font-bold text-foreground mt-1">{stats.users}</p>
                            <p className="text-xs text-muted-foreground mt-1">
                                Limit: {agency.limits.maxUsers === -1 ? 'Unlimited' : agency.limits.maxUsers}
                            </p>
                        </div>
                        <Users className="w-8 h-8 text-blue-500" />
                    </div>
                </div>

                <div className="bg-card rounded-lg shadow border border-border p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-muted-foreground">Projects</p>
                            <p className="text-2xl font-bold text-foreground mt-1">{stats.projects}</p>
                            <p className="text-xs text-muted-foreground mt-1">
                                Limit: {agency.limits.maxProjects === -1 ? 'Unlimited' : agency.limits.maxProjects}
                            </p>
                        </div>
                        <FolderKanban className="w-8 h-8 text-purple-500" />
                    </div>
                </div>

                <div className="bg-card rounded-lg shadow border border-border p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-muted-foreground">Clients</p>
                            <p className="text-2xl font-bold text-foreground mt-1">{stats.clients}</p>
                            <p className="text-xs text-muted-foreground mt-1">
                                Limit: {agency.limits.maxClients === -1 ? 'Unlimited' : agency.limits.maxClients}
                            </p>
                        </div>
                        <UserCircle className="w-8 h-8 text-orange-500" />
                    </div>
                </div>
            </div>

            {/* Singularity AI Configuration */}
            <Link
                href={`/super-admin/agencies/${agency.id}/ai`}
                className="block bg-gradient-to-r from-purple-500/10 to-indigo-500/10 rounded-lg shadow p-6 border border-purple-500/20 hover:shadow-md transition-shadow group"
            >
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 text-white shadow">
                            <Brain className="w-5 h-5" />
                        </div>
                        <div>
                            <h3 className="font-semibold text-foreground">Singularity AI</h3>
                            <p className="text-sm text-muted-foreground">
                                {(agency as any).aiConfig
                                    ? `${((agency as any).aiConfig?.provider || '').toUpperCase()} — ${(agency as any).aiConfig?.model || ''}`
                                    : "Not configured"}
                            </p>
                        </div>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${(agency as any).aiConfig ? 'bg-green-500/10 text-green-500' : 'bg-amber-500/10 text-amber-500'}`}>
                        {(agency as any).aiConfig ? "Active" : "Setup Required"}
                    </span>
                </div>
            </Link>

            {/* Users List */}
            <div className="bg-card rounded-lg shadow border border-border">
                <div className="p-6 border-b border-border">
                    <h2 className="text-xl font-bold text-foreground">Users ({users.length})</h2>
                </div>
                <div className="divide-y divide-border">
                    {users.slice(0, 10).map((user: any) => (
                        <div key={user.id} className="p-6 flex items-center justify-between">
                            <div>
                                <p className="font-medium text-foreground">{user.name}</p>
                                <p className="text-sm text-muted-foreground">{user.email}</p>
                            </div>
                            <span className="px-3 py-1 bg-muted text-muted-foreground rounded-full text-sm">
                                {user.role}
                            </span>
                        </div>
                    ))}
                </div>
            </div>


        </div>
    );
}

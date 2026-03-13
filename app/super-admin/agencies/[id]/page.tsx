import { getAgencyDetails } from "@/lib/actions/super-admin";
import Link from "next/link";
import { ArrowLeft, Users, FolderKanban, UserCircle, Brain, AlertTriangle, Shield } from "lucide-react";
import AgencyActions from "@/components/super-admin/AgencyActions";

function UsageBar({ used, limit, label }: { used: number; limit: number; label: string }) {
    const isUnlimited = limit === -1;
    const pct = isUnlimited ? 0 : limit > 0 ? Math.min((used / limit) * 100, 100) : 0;
    const color = pct >= 90 ? 'bg-red-500' : pct >= 70 ? 'bg-amber-500' : 'bg-primary';
    return (
        <div className="mt-2">
            <div className="flex justify-between text-xs text-muted-foreground mb-1">
                <span>{used} / {isUnlimited ? '∞' : limit} {label}</span>
                {!isUnlimited && <span>{Math.round(pct)}%</span>}
            </div>
            {!isUnlimited && (
                <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                    <div className={`h-full rounded-full ${color} transition-all`} style={{ width: `${pct}%` }} />
                </div>
            )}
        </div>
    );
}

const statusBadge = (status: string) => {
    const map: Record<string, string> = {
        active: 'bg-green-500/10 text-green-500',
        trial: 'bg-blue-500/10 text-blue-500',
        suspended: 'bg-red-500/10 text-red-500',
        cancelled: 'bg-muted text-muted-foreground',
    };
    return map[status] || 'bg-muted text-muted-foreground';
};

export default async function AgencyDetailsPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const { agency, stats, users } = JSON.parse(JSON.stringify(await getAgencyDetails(id)));

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
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <div>
                        <h1 className="text-3xl font-bold text-foreground">{agency.name}</h1>
                        <p className="text-muted-foreground mt-1">{agency.slug}</p>
                    </div>
                    <AgencyActions agency={agency} />
                </div>
            </div>

            {/* Suspension Banner */}
            {agency.status === 'suspended' && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                    <div>
                        <p className="font-medium text-red-500">Agency Suspended</p>
                        {agency.suspensionReason && (
                            <p className="text-sm text-red-400 mt-1">Reason: {agency.suspensionReason}</p>
                        )}
                        {agency.suspendedAt && (
                            <p className="text-xs text-muted-foreground mt-1">
                                Suspended on {new Date(agency.suspendedAt).toLocaleDateString()}
                            </p>
                        )}
                    </div>
                </div>
            )}

            {/* Status Badges */}
            <div className="flex items-center gap-3 flex-wrap">
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${agency.plan === 'enterprise' ? 'bg-purple-500/10 text-purple-500' :
                    agency.plan === 'pro' ? 'bg-blue-500/10 text-blue-500' :
                        agency.plan === 'starter' ? 'bg-emerald-500/10 text-emerald-500' :
                            'bg-muted text-muted-foreground'
                    }`}>
                    {agency.plan.toUpperCase()} Plan
                </span>
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${statusBadge(agency.status)}`}>
                    {agency.status}
                </span>
                {agency.planDuration && (
                    <span className="px-3 py-1 rounded-full text-sm font-medium bg-cyan-500/10 text-cyan-500">
                        {agency.planDuration === 'lifetime' ? '∞ Lifetime' :
                         agency.planDuration === 'monthly' ? '1 Month' :
                         agency.planDuration === '3months' ? '3 Months' :
                         agency.planDuration === '6months' ? '6 Months' :
                         agency.planDuration === 'yearly' ? '1 Year' : agency.planDuration}
                    </span>
                )}
                {agency.planExpiresAt && (
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                        new Date(agency.planExpiresAt) < new Date() ? 'bg-red-500/10 text-red-500' : 'bg-muted text-muted-foreground'
                    }`}>
                        {new Date(agency.planExpiresAt) < new Date() ? 'Expired' : 'Expires'}: {new Date(agency.planExpiresAt).toLocaleDateString()}
                    </span>
                )}
                {agency.status === 'trial' && agency.trialEndsAt && (
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                        new Date(agency.trialEndsAt) < new Date() ? 'bg-red-500/10 text-red-500' : 'bg-muted text-muted-foreground'
                    }`}>
                        Trial {new Date(agency.trialEndsAt) < new Date() ? 'ended' : 'ends'}: {new Date(agency.trialEndsAt).toLocaleDateString()}
                    </span>
                )}
            </div>

            {/* Stats Grid with Usage Bars */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="bg-card rounded-lg shadow border border-border p-6">
                    <div className="flex items-center justify-between">
                        <div className="flex-1">
                            <p className="text-sm text-muted-foreground">Users</p>
                            <p className="text-2xl font-bold text-foreground mt-1">{stats.users}</p>
                        </div>
                        <Users className="w-8 h-8 text-blue-500" />
                    </div>
                    <UsageBar used={stats.users} limit={agency.limits.maxUsers} label="users" />
                </div>

                <div className="bg-card rounded-lg shadow border border-border p-6">
                    <div className="flex items-center justify-between">
                        <div className="flex-1">
                            <p className="text-sm text-muted-foreground">Projects</p>
                            <p className="text-2xl font-bold text-foreground mt-1">{stats.projects}</p>
                        </div>
                        <FolderKanban className="w-8 h-8 text-purple-500" />
                    </div>
                    <UsageBar used={stats.projects} limit={agency.limits.maxProjects} label="projects" />
                </div>

                <div className="bg-card rounded-lg shadow border border-border p-6">
                    <div className="flex items-center justify-between">
                        <div className="flex-1">
                            <p className="text-sm text-muted-foreground">Clients</p>
                            <p className="text-2xl font-bold text-foreground mt-1">{stats.clients}</p>
                        </div>
                        <UserCircle className="w-8 h-8 text-orange-500" />
                    </div>
                    <UsageBar used={stats.clients} limit={agency.limits.maxClients} label="clients" />
                </div>
            </div>

            {/* Singularity AI Configuration */}
            <Link
                href={`/super-admin/settings/ai/${agency.id}`}
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
                {users.length === 0 ? (
                    <div className="p-8 text-center text-muted-foreground">No users found</div>
                ) : (
                    <div className="divide-y divide-border">
                        {users.map((user: any) => (
                            <div key={user.id} className="p-4 sm:p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                                <div className="flex items-center gap-2">
                                    {user.role === 'admin' && <Shield className="w-4 h-4 text-blue-500" />}
                                    <div>
                                        <p className="font-medium text-foreground">{user.name}</p>
                                        <p className="text-sm text-muted-foreground">{user.email}</p>
                                    </div>
                                </div>
                                <span className={`px-3 py-1 rounded-full text-sm ${
                                    user.role === 'admin' ? 'bg-blue-500/10 text-blue-500' : 'bg-muted text-muted-foreground'
                                }`}>
                                    {user.role}
                                </span>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

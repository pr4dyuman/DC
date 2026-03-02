import { getAllAgenciesWithStats } from "@/lib/actions/super-admin";
import Link from "next/link";
import { Users, Building2, Shield, User } from "lucide-react";

export default async function SystemUsersPage() {
    const agencies = await getAllAgenciesWithStats();

    const totalUsers = agencies.reduce((sum: number, a: any) => sum + (a.stats?.users || 0), 0);
    const totalAdmins = agencies.length; // Each agency has at least one admin (owner)

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold text-foreground">System Users</h1>
                <p className="text-muted-foreground mt-1">Overview of all users across all agencies</p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-card rounded-lg shadow border border-border p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-muted-foreground">Total Users</p>
                            <p className="text-3xl font-bold text-foreground mt-2">{totalUsers}</p>
                        </div>
                        <Users className="w-10 h-10 text-purple-500" />
                    </div>
                </div>

                <div className="bg-card rounded-lg shadow border border-border p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-muted-foreground">Total Agencies</p>
                            <p className="text-3xl font-bold text-foreground mt-2">{agencies.length}</p>
                        </div>
                        <Building2 className="w-10 h-10 text-blue-500" />
                    </div>
                </div>

                <div className="bg-card rounded-lg shadow border border-border p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-muted-foreground">Agency Admins</p>
                            <p className="text-3xl font-bold text-foreground mt-2">{totalAdmins}</p>
                            <p className="text-xs text-muted-foreground mt-1">One owner per agency</p>
                        </div>
                        <Shield className="w-10 h-10 text-green-500" />
                    </div>
                </div>
            </div>

            {/* Users by Agency */}
            <div className="bg-card rounded-lg shadow border border-border">
                <div className="p-6 border-b border-border">
                    <h2 className="text-xl font-bold text-foreground">Users by Agency</h2>
                    <p className="text-sm text-muted-foreground mt-1">
                        Click an agency to view its individual users
                    </p>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-muted border-b border-border">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Agency</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Plan</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Status</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Users</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">User Limit</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {agencies
                                .sort((a: any, b: any) => (b.stats?.users || 0) - (a.stats?.users || 0))
                                .map((agency: any) => {
                                    const userCount = agency.stats?.users || 0;
                                    const userLimit = agency.limits?.maxUsers === -1 ? null : agency.limits?.maxUsers;
                                    const usagePct = userLimit ? Math.min((userCount / userLimit) * 100, 100) : null;

                                    return (
                                        <tr key={agency.id} className="hover:bg-muted/50 transition-colors">
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                                                        <Building2 className="w-4 h-4 text-muted-foreground" />
                                                    </div>
                                                    <div>
                                                        <p className="font-medium text-foreground text-sm">{agency.name}</p>
                                                        <p className="text-xs text-muted-foreground">{agency.slug}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className={`px-2 py-1 text-xs font-medium rounded-full ${agency.plan === "enterprise"
                                                        ? "bg-purple-500/10 text-purple-500"
                                                        : agency.plan === "pro"
                                                            ? "bg-blue-500/10 text-blue-500"
                                                            : "bg-muted text-muted-foreground"
                                                    }`}>
                                                    {agency.plan.toUpperCase()}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className={`px-2 py-1 text-xs font-medium rounded-full ${agency.status === "active"
                                                        ? "bg-green-500/10 text-green-500"
                                                        : "bg-red-500/10 text-red-500"
                                                    }`}>
                                                    {agency.status}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex items-center gap-2">
                                                    <User className="w-4 h-4 text-muted-foreground" />
                                                    <span className="font-medium text-foreground text-sm">{userCount}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                {userLimit ? (
                                                    <div className="space-y-1">
                                                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                                                            <span>{userCount} / {userLimit}</span>
                                                            <span>{usagePct?.toFixed(0)}%</span>
                                                        </div>
                                                        <div className="w-24 bg-muted rounded-full h-1.5">
                                                            <div
                                                                className={`h-1.5 rounded-full transition-all ${(usagePct || 0) >= 90
                                                                        ? "bg-red-500"
                                                                        : (usagePct || 0) >= 70
                                                                            ? "bg-yellow-500"
                                                                            : "bg-green-500"
                                                                    }`}
                                                                style={{ width: `${usagePct}%` }}
                                                            />
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <span className="text-xs text-muted-foreground">Unlimited</span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-right">
                                                <Link
                                                    href={`/super-admin/agencies/${agency.id}`}
                                                    className="text-sm text-blue-500 hover:text-blue-400 font-medium"
                                                >
                                                    View Agency →
                                                </Link>
                                            </td>
                                        </tr>
                                    );
                                })}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

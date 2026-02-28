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
                <h1 className="text-3xl font-bold text-foreground">Billing & Revenue</h1>
                <p className="text-muted-foreground mt-1">Manage subscriptions and revenue</p>
            </div>

            {/* Revenue Overview */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-card rounded-lg shadow border border-border p-6">
                    <p className="text-sm text-muted-foreground">Total Revenue</p>
                    <p className="text-3xl font-bold text-foreground mt-2">
                        ${totalRevenue.toLocaleString()}
                    </p>
                    <p className="text-sm text-green-500 mt-2">All-time</p>
                </div>

                <div className="bg-card rounded-lg shadow border border-border p-6">
                    <p className="text-sm text-muted-foreground">Pro Subscriptions</p>
                    <p className="text-3xl font-bold text-blue-500 mt-2">{proAgencies}</p>
                    <p className="text-sm text-muted-foreground mt-2">Active agencies</p>
                </div>

                <div className="bg-card rounded-lg shadow border border-border p-6">
                    <p className="text-sm text-muted-foreground">Enterprise Subscriptions</p>
                    <p className="text-3xl font-bold text-purple-500 mt-2">{enterpriseAgencies}</p>
                    <p className="text-sm text-muted-foreground mt-2">Active agencies</p>
                </div>
            </div>

            {/* Agency Revenue List */}
            <div className="bg-card rounded-lg shadow border border-border">
                <div className="p-6 border-b border-border">
                    <h2 className="text-xl font-bold text-foreground">Revenue by Agency</h2>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-muted border-b border-border">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Agency</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Plan</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Revenue</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Projects</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {agencies
                                .sort((a: any, b: any) => (b.stats?.revenue || 0) - (a.stats?.revenue || 0))
                                .map((agency: any) => (
                                    <tr key={agency.id} className="hover:bg-muted/50">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="font-medium text-foreground">{agency.name}</div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`px-2 py-1 text-xs font-medium rounded-full ${agency.plan === 'enterprise' ? 'bg-purple-500/10 text-purple-500' :
                                                    agency.plan === 'pro' ? 'bg-blue-500/10 text-blue-500' :
                                                        'bg-muted text-muted-foreground'
                                                }`}>
                                                {agency.plan.toUpperCase()}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground">
                                            ${(agency.stats?.revenue || 0).toLocaleString()}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground">
                                            {agency.stats?.projects || 0}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                                            <Link
                                                href={`/super-admin/agencies/${agency.id}`}
                                                className="text-blue-500 hover:text-blue-400"
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

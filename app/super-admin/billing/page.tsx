import { getAllAgenciesWithStats } from "@/lib/actions/super-admin";
import Link from "next/link";

const PLAN_PRICING: Record<string, number> = {
    free: 0,
    starter: 29,
    pro: 79,
    enterprise: 199,
};

export default async function BillingPage() {
    const agencies = await getAllAgenciesWithStats();

    const starterAgencies = agencies.filter((a: any) => a.plan === 'starter').length;
    const proAgencies = agencies.filter((a: any) => a.plan === 'pro').length;
    const enterpriseAgencies = agencies.filter((a: any) => a.plan === 'enterprise').length;
    const estimatedMRR = agencies.reduce((sum: number, a: any) => sum + (PLAN_PRICING[a.plan] || 0), 0);

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold text-foreground">Billing & Subscriptions</h1>
                <p className="text-muted-foreground mt-1">Subscription overview and plan distribution</p>
            </div>

            {/* Revenue Overview */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-card rounded-lg shadow border border-border p-6">
                    <p className="text-sm text-muted-foreground">Estimated MRR</p>
                    <p className="text-3xl font-bold text-foreground mt-2">
                        ${estimatedMRR.toLocaleString()}
                    </p>
                    <p className="text-sm text-muted-foreground mt-2">Based on plan pricing</p>
                </div>

                <div className="bg-card rounded-lg shadow border border-border p-6">
                    <p className="text-sm text-muted-foreground">Starter Subscriptions</p>
                    <p className="text-3xl font-bold text-emerald-500 mt-2">{starterAgencies}</p>
                    <p className="text-sm text-muted-foreground mt-2">${PLAN_PRICING.starter}/mo each</p>
                </div>

                <div className="bg-card rounded-lg shadow border border-border p-6">
                    <p className="text-sm text-muted-foreground">Pro Subscriptions</p>
                    <p className="text-3xl font-bold text-blue-500 mt-2">{proAgencies}</p>
                    <p className="text-sm text-muted-foreground mt-2">${PLAN_PRICING.pro}/mo each</p>
                </div>

                <div className="bg-card rounded-lg shadow border border-border p-6">
                    <p className="text-sm text-muted-foreground">Enterprise Subscriptions</p>
                    <p className="text-3xl font-bold text-purple-500 mt-2">{enterpriseAgencies}</p>
                    <p className="text-sm text-muted-foreground mt-2">${PLAN_PRICING.enterprise}/mo each</p>
                </div>
            </div>

            {/* Agency Subscription List */}
            <div className="bg-card rounded-lg shadow border border-border">
                <div className="p-6 border-b border-border">
                    <h2 className="text-xl font-bold text-foreground">Subscriptions by Agency</h2>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-muted border-b border-border">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Agency</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Plan</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Monthly Rate</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Status</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Users</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {agencies
                                .sort((a: any, b: any) => (PLAN_PRICING[b.plan] || 0) - (PLAN_PRICING[a.plan] || 0))
                                .map((agency: any) => (
                                    <tr key={agency.id} className="hover:bg-muted/50">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="font-medium text-foreground">{agency.name}</div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`px-2 py-1 text-xs font-medium rounded-full ${agency.plan === 'enterprise' ? 'bg-purple-500/10 text-purple-500' :
                                                    agency.plan === 'pro' ? 'bg-blue-500/10 text-blue-500' :
                                                        agency.plan === 'starter' ? 'bg-emerald-500/10 text-emerald-500' :
                                                            'bg-muted text-muted-foreground'
                                                }`}>
                                                {agency.plan.toUpperCase()}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground">
                                            ${PLAN_PRICING[agency.plan] || 0}/mo
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`px-2 py-1 text-xs font-medium rounded-full ${agency.status === 'active' ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
                                                {agency.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground">
                                            {agency.stats?.users || 0}
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

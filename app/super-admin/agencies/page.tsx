import { getAllAgenciesWithStats } from "@/lib/actions/super-admin";
import Link from "next/link";
import { Plus, Search } from "lucide-react";
import AgencyTable from "@/components/super-admin/AgencyTable";

export default async function AgenciesPage() {
    // JSON round-trip needed because AgencyTable is a client component
    const agencies = JSON.parse(JSON.stringify(await getAllAgenciesWithStats()));

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div>
                    <h1 className="text-3xl font-bold text-foreground">Agencies</h1>
                    <p className="text-muted-foreground mt-1">Manage all agencies in the system</p>
                </div>
                <Link
                    href="/super-admin/agencies/new"
                    className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
                >
                    <Plus className="w-5 h-5" />
                    <span>Create Agency</span>
                </Link>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-card rounded-lg shadow border border-border p-4">
                    <p className="text-sm text-muted-foreground">Total Agencies</p>
                    <p className="text-2xl font-bold text-foreground mt-1">{agencies.length}</p>
                </div>
                <div className="bg-card rounded-lg shadow border border-border p-4">
                    <p className="text-sm text-muted-foreground">Active</p>
                    <p className="text-2xl font-bold text-green-500 mt-1">
                        {agencies.filter((a: any) => a.status === 'active').length}
                    </p>
                </div>
                <div className="bg-card rounded-lg shadow border border-border p-4">
                    <p className="text-sm text-muted-foreground">Suspended</p>
                    <p className="text-2xl font-bold text-red-500 mt-1">
                        {agencies.filter((a: any) => a.status === 'suspended').length}
                    </p>
                </div>
                <div className="bg-card rounded-lg shadow border border-border p-4">
                    <p className="text-sm text-muted-foreground">Total Users</p>
                    <p className="text-2xl font-bold text-foreground mt-1">
                        {agencies.reduce((sum: number, a: any) => sum + (a.stats?.users || 0), 0)}
                    </p>
                </div>
            </div>

            {/* Agency Table */}
            <AgencyTable agencies={agencies} />
        </div>
    );
}

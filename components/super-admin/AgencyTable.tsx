"use client";

import Link from "next/link";
import { Eye, Edit, Ban, CheckCircle, Trash2, Loader2 } from "lucide-react";
import { suspendAgency, activateAgency, deleteAgency } from "@/lib/actions/super-admin";
import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useProgressiveList } from "@/hooks/use-infinite-scroll";
import { useDateFormat } from "@/context/TimezoneContext";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

export default function AgencyTable({ agencies }: { agencies: any[] }) {
    const fmt = useDateFormat();
    const router = useRouter();
    const [filter, setFilter] = useState<string>("all");
    const [search, setSearch] = useState("");
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
    const [deletePassword, setDeletePassword] = useState("");
    const [deleteError, setDeleteError] = useState("");
    const [deleting, setDeleting] = useState(false);
    const passwordRef = useRef<HTMLInputElement>(null);

    const filteredAgencies = agencies.filter((agency) => {
        const matchesFilter = filter === "all" || agency.status === filter || agency.plan === filter;
        const matchesSearch = agency.name.toLowerCase().includes(search.toLowerCase());
        return matchesFilter && matchesSearch;
    });

    const { visibleCount, sentinelRef, hasMore } = useProgressiveList(filteredAgencies.length, 20, [filter, search]);

    const handleSuspend = async (agencyId: string) => {
        if (!confirm("Are you sure you want to suspend this agency?")) return;
        await suspendAgency(agencyId, "Suspended by super admin");
        router.refresh();
    };

    const handleActivate = async (agencyId: string) => {
        await activateAgency(agencyId);
        router.refresh();
    };

    const handleDelete = (agencyId: string) => {
        if (!confirm("⚠️ WARNING: This will permanently delete the agency and ALL its data. This cannot be undone. Are you absolutely sure?")) return;
        setDeleteTargetId(agencyId);
        setDeletePassword("");
        setDeleteError("");
        setDeleteDialogOpen(true);
        setTimeout(() => passwordRef.current?.focus(), 100);
    };

    const handleDeleteConfirm = async () => {
        if (!deleteTargetId || !deletePassword) return;
        setDeleting(true);
        setDeleteError("");
        try {
            await deleteAgency(deleteTargetId, deletePassword);
            setDeleteDialogOpen(false);
            router.refresh();
        } catch (err: any) {
            setDeleteError(err.message || 'Failed to delete agency');
        } finally {
            setDeleting(false);
        }
    };

    return (
        <div className="bg-card rounded-lg shadow border border-border">
            <div className="p-6 border-b border-border">
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4">
                    <input
                        type="text"
                        placeholder="Search agencies..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="flex-1 px-4 py-2 border border-border rounded-lg bg-background text-foreground focus:ring-2 focus:ring-primary focus:border-transparent placeholder:text-muted-foreground"
                    />
                    <select
                        value={filter}
                        onChange={(e) => setFilter(e.target.value)}
                        className="px-4 py-2 border border-border rounded-lg bg-background text-foreground focus:ring-2 focus:ring-primary focus:border-transparent"
                    >
                        <option value="all">All Agencies</option>
                        <option value="active">Active</option>
                        <option value="suspended">Suspended</option>
                        <option value="free">Free Plan</option>
                        <option value="pro">Pro Plan</option>
                        <option value="enterprise">Enterprise Plan</option>
                    </select>
                </div>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full">
                    <thead className="bg-muted border-b border-border">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Agency</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Plan</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Status</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Users</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Projects</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Revenue</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Created</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="bg-card divide-y divide-border">
                        {filteredAgencies.slice(0, visibleCount).map((agency) => (
                            <tr key={agency.id} className="hover:bg-muted/50">
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <div>
                                        <div className="font-medium text-foreground">{agency.name}</div>
                                        <div className="text-sm text-muted-foreground">{agency.slug}</div>
                                    </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${agency.plan === 'enterprise' ? 'bg-purple-500/10 text-purple-500' :
                                        agency.plan === 'pro' ? 'bg-blue-500/10 text-blue-500' :
                                            'bg-muted text-muted-foreground'
                                        }`}>
                                        {agency.plan.toUpperCase()}
                                    </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${agency.status === 'active' ? 'bg-green-500/10 text-green-500' :
                                        'bg-red-500/10 text-red-500'
                                        }`}>
                                        {agency.status}
                                    </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground">
                                    {agency.stats?.users || 0}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground">
                                    {agency.stats?.projects || 0}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground">
                                    ${(agency.stats?.revenue || 0).toLocaleString()}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                                    {fmt.date(agency.createdAt)}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                    <div className="flex items-center justify-end gap-2">
                                        <Link
                                            href={`/super-admin/agencies/${agency.id}`}
                                            className="text-blue-500 hover:text-blue-400"
                                            title="View Details"
                                        >
                                            <Eye className="w-4 h-4" />
                                        </Link>
                                        {agency.status === 'active' ? (
                                            <button
                                                onClick={() => handleSuspend(agency.id)}
                                                className="text-red-500 hover:text-red-400"
                                                title="Suspend"
                                            >
                                                <Ban className="w-4 h-4" />
                                            </button>
                                        ) : (
                                            <button
                                                onClick={() => handleActivate(agency.id)}
                                                className="text-green-500 hover:text-green-400"
                                                title="Activate"
                                            >
                                                <CheckCircle className="w-4 h-4" />
                                            </button>
                                        )}
                                        <button
                                            onClick={() => handleDelete(agency.id)}
                                            className="text-red-500 hover:text-red-400"
                                            title="Delete"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {hasMore && (
                <div ref={sentinelRef} className="flex justify-center py-4">
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
            )}

            {filteredAgencies.length === 0 && (
                <div className="text-center py-12">
                    <p className="text-muted-foreground">No agencies found</p>
                </div>
            )}

            <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Confirm Deletion</DialogTitle>
                        <DialogDescription>
                            Enter your super-admin password to confirm permanent deletion.
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={(e) => { e.preventDefault(); handleDeleteConfirm(); }}>
                        <Input
                            ref={passwordRef}
                            type="password"
                            placeholder="Super-admin password"
                            value={deletePassword}
                            onChange={(e) => setDeletePassword(e.target.value)}
                            autoComplete="current-password"
                        />
                        {deleteError && (
                            <p className="text-sm text-red-500 mt-2">{deleteError}</p>
                        )}
                        <DialogFooter className="mt-4">
                            <button
                                type="button"
                                onClick={() => setDeleteDialogOpen(false)}
                                className="px-4 py-2 text-sm border border-border rounded-md hover:bg-muted"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={!deletePassword || deleting}
                                className="px-4 py-2 text-sm bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50"
                            >
                                {deleting ? 'Deleting...' : 'Delete Agency'}
                            </button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
}

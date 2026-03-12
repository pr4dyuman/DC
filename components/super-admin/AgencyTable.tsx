"use client";

import Link from "next/link";
import { Eye, Ban, CheckCircle, Trash2, Loader2 } from "lucide-react";
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
    const [suspendDialogOpen, setSuspendDialogOpen] = useState(false);
    const [suspendTargetId, setSuspendTargetId] = useState<string | null>(null);
    const [suspendPassword, setSuspendPassword] = useState("");
    const [suspendReason, setSuspendReason] = useState("");
    const [suspendError, setSuspendError] = useState("");
    const [suspending, setSuspending] = useState(false);
    const [activatingId, setActivatingId] = useState<string | null>(null);
    const passwordRef = useRef<HTMLInputElement>(null);
    const suspendPasswordRef = useRef<HTMLInputElement>(null);

    const filteredAgencies = agencies.filter((agency) => {
        const matchesFilter = filter === "all" || agency.status === filter || agency.plan === filter;
        const q = search.toLowerCase();
        const matchesSearch = !q || agency.name.toLowerCase().includes(q)
            || (agency.slug || '').toLowerCase().includes(q)
            || (agency.billing?.billingEmail || '').toLowerCase().includes(q);
        return matchesFilter && matchesSearch;
    });

    const { visibleCount, sentinelRef, hasMore } = useProgressiveList(filteredAgencies.length, 20, [filter, search]);

    const handleSuspend = (agencyId: string) => {
        setSuspendTargetId(agencyId);
        setSuspendPassword("");
        setSuspendReason("");
        setSuspendError("");
        setSuspendDialogOpen(true);
        setTimeout(() => suspendPasswordRef.current?.focus(), 100);
    };

    const handleSuspendConfirm = async () => {
        if (!suspendTargetId || !suspendPassword) return;
        setSuspending(true);
        setSuspendError("");
        try {
            await suspendAgency(suspendTargetId, suspendPassword, suspendReason || "Suspended by super admin");
            setSuspendDialogOpen(false);
            router.refresh();
        } catch (err: any) {
            setSuspendError(err.message || 'Failed to suspend agency');
        } finally {
            setSuspending(false);
        }
    };

    const handleActivate = async (agencyId: string) => {
        if (activatingId) return;
        setActivatingId(agencyId);
        try {
            await activateAgency(agencyId);
            router.refresh();
        } catch {
            // handled by server
        } finally {
            setActivatingId(null);
        }
    };

    const handleDelete = (agencyId: string) => {
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

    const statusBadge = (status: string) => {
        const map: Record<string, string> = {
            active: 'bg-green-500/10 text-green-500',
            trial: 'bg-blue-500/10 text-blue-500',
            suspended: 'bg-red-500/10 text-red-500',
            cancelled: 'bg-muted text-muted-foreground',
        };
        return map[status] || 'bg-muted text-muted-foreground';
    };

    const filters = [
        { value: 'all', label: 'All' },
        { value: 'active', label: 'Active' },
        { value: 'trial', label: 'Trial' },
        { value: 'suspended', label: 'Suspended' },
        { value: 'cancelled', label: 'Cancelled' },
        { value: 'free', label: 'Free' },
        { value: 'starter', label: 'Starter' },
        { value: 'pro', label: 'Pro' },
        { value: 'enterprise', label: 'Enterprise' },
    ];

    return (
        <div className="bg-card rounded-lg shadow border border-border">
            <div className="p-4 sm:p-6 border-b border-border space-y-3">
                <input
                    type="text"
                    placeholder="Search by name, slug, or email..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full px-4 py-2 border border-border rounded-lg bg-background text-foreground focus:ring-2 focus:ring-primary focus:border-transparent placeholder:text-muted-foreground"
                />
                <div className="flex flex-wrap gap-1.5">
                    {filters.map((f) => (
                        <button
                            key={f.value}
                            onClick={() => setFilter(f.value)}
                            className={`px-3 py-1 text-xs font-medium rounded-full transition-colors ${filter === f.value
                                ? 'bg-primary text-primary-foreground'
                                : 'bg-muted text-muted-foreground hover:bg-muted/80'
                            }`}
                        >
                            {f.label}
                            {f.value !== 'all' && (
                                <span className="ml-1 opacity-60">
                                    {agencies.filter(a => a.status === f.value || a.plan === f.value).length}
                                </span>
                            )}
                        </button>
                    ))}
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
                            <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Clients</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Created</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="bg-card divide-y divide-border">
                        {filteredAgencies.slice(0, visibleCount).map((agency) => (
                            <tr key={agency.id} className="hover:bg-muted/50 cursor-pointer" onClick={() => router.push(`/super-admin/agencies/${agency.id}`)}>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <div>
                                        <div className="font-medium text-foreground">{agency.name}</div>
                                        <div className="text-sm text-muted-foreground">{agency.slug}</div>
                                    </div>
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
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${statusBadge(agency.status)}`}>
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
                                    {agency.stats?.clients || 0}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                                    {fmt.date(agency.createdAt)}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium" onClick={(e) => e.stopPropagation()}>
                                    <div className="flex items-center justify-end gap-2">
                                        <Link
                                            href={`/super-admin/agencies/${agency.id}`}
                                            className="text-blue-500 hover:text-blue-400"
                                            title="View Details"
                                        >
                                            <Eye className="w-4 h-4" />
                                        </Link>
                                        {agency.status === 'active' || agency.status === 'trial' ? (
                                            <button
                                                onClick={() => handleSuspend(agency.id)}
                                                className="text-amber-500 hover:text-amber-400"
                                                title="Suspend"
                                            >
                                                <Ban className="w-4 h-4" />
                                            </button>
                                        ) : (
                                            <button
                                                onClick={() => handleActivate(agency.id)}
                                                disabled={activatingId === agency.id}
                                                className="text-green-500 hover:text-green-400 disabled:opacity-50"
                                                title="Activate"
                                            >
                                                {activatingId === agency.id ? (
                                                    <Loader2 className="w-4 h-4 animate-spin" />
                                                ) : (
                                                    <CheckCircle className="w-4 h-4" />
                                                )}
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

            {/* Suspend Dialog */}
            <Dialog open={suspendDialogOpen} onOpenChange={setSuspendDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Suspend Agency</DialogTitle>
                        <DialogDescription>
                            This will disable access for all users in this agency.
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={(e) => { e.preventDefault(); handleSuspendConfirm(); }} className="space-y-3">
                        <div>
                            <label className="text-sm text-muted-foreground mb-1 block">Reason (optional)</label>
                            <Input
                                placeholder="e.g. Non-payment, TOS violation..."
                                value={suspendReason}
                                onChange={(e) => setSuspendReason(e.target.value)}
                            />
                        </div>
                        <div>
                            <label className="text-sm text-muted-foreground mb-1 block">Super-admin password *</label>
                            <Input
                                ref={suspendPasswordRef}
                                type="password"
                                placeholder="Enter your password"
                                value={suspendPassword}
                                onChange={(e) => setSuspendPassword(e.target.value)}
                                autoComplete="current-password"
                            />
                        </div>
                        {suspendError && (
                            <p className="text-sm text-red-500">{suspendError}</p>
                        )}
                        <DialogFooter className="mt-4">
                            <button
                                type="button"
                                onClick={() => setSuspendDialogOpen(false)}
                                className="px-4 py-2 text-sm border border-border rounded-md hover:bg-muted"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={!suspendPassword || suspending}
                                className="px-4 py-2 text-sm bg-amber-600 text-white rounded-md hover:bg-amber-700 disabled:opacity-50"
                            >
                                {suspending ? 'Suspending...' : 'Suspend Agency'}
                            </button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Delete Dialog */}
            <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Delete Agency</DialogTitle>
                        <DialogDescription>
                            This action is permanent. All agency data will be deleted.
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={(e) => { e.preventDefault(); handleDeleteConfirm(); }} className="space-y-3">
                        <div>
                            <label className="text-sm text-muted-foreground mb-1 block">Super-admin password *</label>
                            <Input
                                ref={passwordRef}
                                type="password"
                                placeholder="Enter your password"
                                value={deletePassword}
                                onChange={(e) => setDeletePassword(e.target.value)}
                                autoComplete="current-password"
                            />
                        </div>
                        {deleteError && (
                            <p className="text-sm text-red-500">{deleteError}</p>
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

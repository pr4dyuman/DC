"use client";

import { Loader2 } from "lucide-react";
import { suspendAgency, activateAgency, deleteAgency } from "@/lib/actions/super-admin";
import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useProgressiveList } from "@/hooks/use-infinite-scroll";
import { useDateFormat } from "@/context/TimezoneContext";
import { AgencyTableDeleteDialog } from "./AgencyTableDeleteDialog";
import { AgencyTableFilters } from "./AgencyTableFilters";
import { AgencyTableRow } from "./AgencyTableRow";
import { AgencyTableSuspendDialog } from "./AgencyTableSuspendDialog";
import type { AgencyTableRowData } from "./agency-table-shared";

export default function AgencyTable({ agencies }: { agencies: AgencyTableRowData[] }) {
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

    const getErrorMessage = (error: unknown, fallback: string) => {
        return error instanceof Error ? error.message : fallback;
    };

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
        } catch (error: unknown) {
            setSuspendError(getErrorMessage(error, 'Failed to suspend agency'));
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
        } catch (error: unknown) {
            setDeleteError(getErrorMessage(error, 'Failed to delete agency'));
        } finally {
            setDeleting(false);
        }
    };

    const filterCounts = agencies.reduce<Record<string, number>>((counts, agency) => {
        counts[agency.status] = (counts[agency.status] || 0) + 1;
        counts[agency.plan] = (counts[agency.plan] || 0) + 1;
        return counts;
    }, {});

    return (
        <div className="bg-card rounded-lg shadow border border-border">
            <AgencyTableFilters
                search={search}
                setSearch={setSearch}
                filter={filter}
                setFilter={setFilter}
                filterCounts={filterCounts}
            />

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
                            <AgencyTableRow
                                key={agency.id}
                                agency={agency}
                                createdAtLabel={fmt.date(agency.createdAt)}
                                activating={activatingId === agency.id}
                                onNavigate={(agencyId) => router.push(`/super-admin/agencies/${agencyId}`)}
                                onSuspend={handleSuspend}
                                onActivate={handleActivate}
                                onDelete={handleDelete}
                            />
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

            <AgencyTableSuspendDialog
                open={suspendDialogOpen}
                onOpenChange={setSuspendDialogOpen}
                suspendReason={suspendReason}
                setSuspendReason={setSuspendReason}
                suspendPassword={suspendPassword}
                setSuspendPassword={setSuspendPassword}
                suspendError={suspendError}
                suspending={suspending}
                suspendPasswordRef={suspendPasswordRef}
                onSubmit={handleSuspendConfirm}
            />

            <AgencyTableDeleteDialog
                open={deleteDialogOpen}
                onOpenChange={setDeleteDialogOpen}
                deletePassword={deletePassword}
                setDeletePassword={setDeletePassword}
                deleteError={deleteError}
                deleting={deleting}
                passwordRef={passwordRef}
                onSubmit={handleDeleteConfirm}
            />
        </div>
    );
}

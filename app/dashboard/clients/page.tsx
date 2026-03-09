"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { getClients, getArchivedClients, unarchiveClient, deleteClient } from "@/lib/actions";
import { Client } from "@/lib/types";
import { ClientCard } from "@/components/clients/ClientCard";
import { EditClientDialog } from "@/components/clients/EditClientDialog";
import { Plus, Archive, ArchiveRestore, Search } from "lucide-react";
import { ClientsSkeleton } from "@/components/clients/ClientsSkeleton";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useProgressiveList } from "@/hooks/use-infinite-scroll";
import { Loader2 } from "lucide-react";

export default function ClientsPage() {
    const [clients, setClients] = useState<Client[]>([]);
    const [loading, setLoading] = useState(true);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingClient, setEditingClient] = useState<Client | null>(null);
    const [showArchived, setShowArchived] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");

    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            const data = showArchived ? await getArchivedClients() : await getClients();
            setClients(data);
        } catch (error) {
            console.error("Failed to load clients", error);
            toast.error("Failed to load clients");
        } finally {
            setLoading(false);
        }
    }, [showArchived]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const filteredClients = useMemo(() => {
        if (!searchQuery.trim()) return clients;
        const q = searchQuery.toLowerCase();
        return clients.filter(c =>
            c.name.toLowerCase().includes(q) ||
            c.companyName.toLowerCase().includes(q) ||
            c.email.toLowerCase().includes(q) ||
            (c.phone && c.phone.includes(q))
        );
    }, [clients, searchQuery]);

    const { visibleCount, sentinelRef, hasMore } = useProgressiveList(filteredClients.length, 12, [searchQuery, showArchived]);

    const handleOpenDialog = (client?: Client) => {
        setEditingClient(client || null);
        setIsDialogOpen(true);
    };

    const handleUnarchive = async (clientId: string, clientName: string) => {
        try {
            await unarchiveClient(clientId);
            toast.success(`${clientName} restored successfully`);
            loadData();
        } catch (error) {
            console.error("Failed to unarchive client", error);
            toast.error("Failed to restore client");
        }
    };

    const handleDelete = async (clientId: string, clientName: string) => {
        if (confirm(`Are you sure you want to archive "${clientName}"? All financial data will be preserved.`)) {
            try {
                await deleteClient(clientId);
                toast.success(`${clientName} archived successfully`);
                loadData();
            } catch (error) {
                console.error("Failed to archive client", error);
                toast.error("Failed to archive client");
            }
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between space-y-4 sm:space-y-0">
                <h1 className="text-2xl sm:text-3xl font-bold">
                    {showArchived ? "Archived Clients" : "Clients"}
                </h1>
                <div className="flex gap-2">
                    <Button
                        variant={showArchived ? "default" : "outline"}
                        onClick={() => setShowArchived(!showArchived)}
                        className="w-full sm:w-auto"
                    >
                        {showArchived ? (
                            <>
                                <ArchiveRestore className="mr-2 h-4 w-4" />
                                Show Active
                            </>
                        ) : (
                            <>
                                <Archive className="mr-2 h-4 w-4" />
                                Show Archived
                            </>
                        )}
                    </Button>
                    {!showArchived && (
                        <button
                            onClick={() => handleOpenDialog()}
                            className="w-full sm:w-auto inline-flex items-center justify-center rounded-md text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2"
                        >
                            <Plus className="mr-2 h-4 w-4" /> Add Client
                        </button>
                    )}
                </div>
            </div>

            {/* Search bar */}
            <div className="relative max-w-md">
                <Search className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
                <input
                    type="text"
                    placeholder="Search by name, company, email..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-secondary border border-border rounded-lg py-2 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 text-foreground placeholder:text-muted-foreground"
                />
            </div>

            {loading ? (
                <ClientsSkeleton />
            ) : filteredClients.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                    {searchQuery.trim()
                        ? `No clients match "${searchQuery}".`
                        : showArchived
                            ? "No archived clients found."
                            : "No clients found. Click \"Add Client\" to get started."
                    }
                </div>
            ) : (
                <>
                    <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                        {filteredClients.slice(0, visibleCount).map(client => (
                            <ClientCard
                                key={client.id}
                                client={client}
                                onEdit={handleOpenDialog}
                                onUnarchive={showArchived ? handleUnarchive : undefined}
                                onDelete={!showArchived ? handleDelete : undefined}
                                isArchived={showArchived}
                            />
                        ))}
                    </div>
                    {hasMore && (
                        <div ref={sentinelRef} className="flex justify-center py-6">
                            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                        </div>
                    )}
                </>
            )}

            <EditClientDialog
                client={editingClient}
                open={isDialogOpen}
                onOpenChange={setIsDialogOpen}
                onSuccess={loadData}
            />
        </div>
    );
}

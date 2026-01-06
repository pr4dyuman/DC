"use client";

import { useState, useEffect } from "react";
import { getClients, getArchivedClients, unarchiveClient, deleteClient } from "@/lib/actions";
import { Client } from "@/lib/types";
import { ClientCard } from "@/components/clients/ClientCard";
import { EditClientDialog } from "@/components/clients/EditClientDialog";
import { Plus, Loader2, Archive, ArchiveRestore } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export default function ClientsPage() {
    const [clients, setClients] = useState<Client[]>([]);
    const [loading, setLoading] = useState(true);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingClient, setEditingClient] = useState<Client | null>(null);
    const [showArchived, setShowArchived] = useState(false);

    useEffect(() => {
        loadData();
    }, [showArchived]);

    const loadData = async () => {
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
    };

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

            {loading ? (
                <div className="flex justify-center p-8"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
            ) : clients.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                    {showArchived 
                        ? "No archived clients found."
                        : "No clients found. Click \"Add Client\" to get started."
                    }
                </div>
            ) : (
                <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                    {clients.map(client => (
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


"use client";

import { useState, useEffect } from "react";
import { getClients } from "@/lib/actions";
import { Client } from "@/lib/types";
import { ClientCard } from "@/components/clients/ClientCard";
import { EditClientDialog } from "@/components/clients/EditClientDialog";
import { Plus, Loader2 } from "lucide-react";

export default function ClientsPage() {
    const [clients, setClients] = useState<Client[]>([]);
    const [loading, setLoading] = useState(true);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingClient, setEditingClient] = useState<Client | null>(null);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const data = await getClients();
            setClients(data);
        } catch (error) {
            console.error("Failed to load clients", error);
        } finally {
            setLoading(false);
        }
    };

    const handleOpenDialog = (client?: Client) => {
        setEditingClient(client || null);
        setIsDialogOpen(true);
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between space-y-4 sm:space-y-0">
                <h1 className="text-2xl sm:text-3xl font-bold">Clients</h1>
                <button
                    onClick={() => handleOpenDialog()}
                    className="w-full sm:w-auto inline-flex items-center justify-center rounded-md text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2"
                >
                    <Plus className="mr-2 h-4 w-4" /> Add Client
                </button>
            </div>

            {loading ? (
                <div className="flex justify-center p-8"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
            ) : clients.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                    No clients found. Click "Add Client" to get started.
                </div>
            ) : (
                <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                    {clients.map(client => (
                        <ClientCard
                            key={client.id}
                            client={client}
                            onEdit={handleOpenDialog}
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

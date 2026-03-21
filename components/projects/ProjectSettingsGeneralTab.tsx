"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import type { Client, Project } from "@/lib/types";
import { Check, ExternalLink, Mail, Pencil, Plus, ShieldAlert, Users } from "lucide-react";
import Link from "next/link";

interface ProjectSettingsGeneralTabProps {
    status: Project["status"] | "";
    statusLoading: boolean;
    statusError: string;
    name: string;
    isEditingSelection: boolean;
    selectedClientIds: string[];
    clients: Client[];
    clientLoading: boolean;
    onUpdateStatus: (status: Project["status"]) => void;
    onNameChange: (value: string) => void;
    onUpdateName: () => void;
    onStartEditingSelection: () => void;
    onAssignClients: (clientIds: string[]) => void;
}

export function ProjectSettingsGeneralTab({
    status,
    statusLoading,
    statusError,
    name,
    isEditingSelection,
    selectedClientIds,
    clients,
    clientLoading,
    onUpdateStatus,
    onNameChange,
    onUpdateName,
    onStartEditingSelection,
    onAssignClients,
}: ProjectSettingsGeneralTabProps) {
    return (
        <div className="flex-1 overflow-y-auto p-6 space-y-6 mt-0">
            <div className="space-y-3 p-4 rounded-lg bg-muted/30 border border-border/50">
                <label className="text-sm font-medium">Project Status</label>
                <div className="flex flex-col gap-2">
                    <div className="flex gap-2">
                        {(["Active", "On Hold", "Completed"] as const).map((nextStatus) => (
                            <Button
                                key={nextStatus}
                                type="button"
                                size="sm"
                                variant={status === nextStatus ? "default" : "outline"}
                                onClick={() => onUpdateStatus(nextStatus)}
                                disabled={statusLoading}
                                className={status === nextStatus ? "bg-indigo-600 hover:bg-indigo-700" : ""}
                            >
                                {status === nextStatus && <Check className="w-3 h-3 mr-1" />}
                                {nextStatus}
                            </Button>
                        ))}
                    </div>
                    {statusError && (
                        <p className="text-xs text-red-600 flex items-center gap-1">
                            <ShieldAlert className="w-3 h-3" />
                            {statusError}
                        </p>
                    )}
                    <p className="text-xs text-muted-foreground">
                        Marking as <strong>Completed</strong> requires all tasks to be finished.
                    </p>
                </div>
            </div>

            <div className="space-y-2">
                <label className="text-sm font-medium">Project Name</label>
                <div className="flex gap-2">
                    <input
                        className="flex h-9 w-full rounded-md border border-input px-3 py-1 text-sm bg-muted/50"
                        value={name}
                        onChange={(event) => onNameChange(event.target.value)}
                        placeholder="Project Name"
                    />
                    <Button size="sm" onClick={onUpdateName} disabled={!name}>
                        Save
                    </Button>
                </div>
                <p className="text-xs text-muted-foreground">Changes project name and URL. You will be redirected.</p>
            </div>

            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Assigned Clients</h3>
                    {selectedClientIds.length > 0 && !isEditingSelection && (
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={onStartEditingSelection}
                            className="h-8 gap-2 text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50"
                        >
                            <Pencil className="h-3 w-3" />
                            Edit
                        </Button>
                    )}
                </div>

                {!isEditingSelection && selectedClientIds.length > 0 ? (
                    <div className="space-y-2">
                        {clients
                            .filter((c) => selectedClientIds.includes(c.id))
                            .map((c) => (
                                <div key={c.id} className="bg-primary/10 border border-primary/20 rounded-xl p-4 flex items-start gap-3">
                                    <Avatar className="h-12 w-12 border-2 border-background shadow-sm">
                                        <AvatarImage src={`https://api.dicebear.com/7.x/initials/svg?seed=${c.companyName}`} />
                                        <AvatarFallback className="bg-primary/20 text-primary font-bold text-lg">
                                            {c.companyName.substring(0, 2).toUpperCase()}
                                        </AvatarFallback>
                                    </Avatar>
                                    <div className="space-y-0.5">
                                        <h4 className="text-base font-semibold text-foreground">{c.companyName}</h4>
                                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                            <Users className="h-3 w-3" />
                                            {c.name}
                                        </div>
                                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                            <Mail className="h-3 w-3" />
                                            {c.email}
                                        </div>
                                    </div>
                                </div>
                            ))}
                    </div>
                ) : (
                    <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
                        <div className="space-y-3">
                            <div className="grid gap-2">
                                <label className="text-sm font-medium">Select Clients</label>
                                <div className="max-h-48 overflow-y-auto rounded-md border border-input bg-background p-2 space-y-1">
                                    {clients.length === 0 && (
                                        <p className="text-sm text-muted-foreground px-1">No clients yet</p>
                                    )}
                                    {clients.map((client) => {
                                        const isChecked = selectedClientIds.includes(client.id);
                                        return (
                                            <label
                                                key={client.id}
                                                className="flex items-center gap-2 cursor-pointer rounded px-2 py-1.5 hover:bg-muted text-sm"
                                            >
                                                <input
                                                    type="checkbox"
                                                    checked={isChecked}
                                                    disabled={clientLoading}
                                                    className="rounded border-input"
                                                    onChange={() => {
                                                        const next = isChecked
                                                            ? selectedClientIds.filter((id) => id !== client.id)
                                                            : [...selectedClientIds, client.id];
                                                        onAssignClients(next);
                                                    }}
                                                />
                                                <span className="font-medium">{client.companyName}</span>
                                                <span className="text-muted-foreground">({client.name})</span>
                                            </label>
                                        );
                                    })}
                                </div>
                                {selectedClientIds.length > 0 && (
                                    <p className="text-xs text-muted-foreground">{selectedClientIds.length} client(s) selected</p>
                                )}
                            </div>
                            <div className="relative">
                                <div className="absolute inset-0 flex items-center">
                                    <span className="w-full border-t" />
                                </div>
                                <div className="relative flex justify-center text-xs uppercase">
                                    <span className="bg-background px-2 text-muted-foreground">Or</span>
                                </div>
                            </div>
                            <Link href="/dashboard/clients" target="_blank">
                                <Button variant="outline" className="w-full gap-2 border-dashed" type="button">
                                    <Plus className="h-4 w-4" />
                                    Create New Client
                                    <ExternalLink className="h-3 w-3 ml-auto opacity-50" />
                                </Button>
                            </Link>
                            <p className="text-xs text-muted-foreground text-center">
                                Create the client on the Clients page, then come back and select them here.
                            </p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

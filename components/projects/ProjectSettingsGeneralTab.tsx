"use client";

import { useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import type { Client, Project } from "@/lib/types";
import { Check, ExternalLink, Mail, Pencil, Plus, ShieldAlert, Users, CalendarDays, Loader2, Search, X } from "lucide-react";
import Link from "next/link";

interface ProjectSettingsGeneralTabProps {
    status: Project["status"] | "";
    statusLoading: boolean;
    statusError: string;
    name: string;
    dueDate: string;
    dueDateLoading: boolean;
    isEditingSelection: boolean;
    selectedClientIds: string[];
    clients: Client[];
    clientLoading: boolean;
    onUpdateStatus: (status: Project["status"]) => void;
    onNameChange: (value: string) => void;
    onUpdateName: () => void;
    onDueDateChange: (value: string) => void;
    onUpdateDueDate: () => void;
    onStartEditingSelection: () => void;
    onAssignClients: (clientIds: string[]) => void;
}

export function ProjectSettingsGeneralTab({
    status, statusLoading, statusError,
    name,
    dueDate, dueDateLoading,
    isEditingSelection, selectedClientIds, clients, clientLoading,
    onUpdateStatus, onNameChange, onUpdateName,
    onDueDateChange, onUpdateDueDate,
    onStartEditingSelection, onAssignClients,
}: ProjectSettingsGeneralTabProps) {
    const [clientSearch, setClientSearch] = useState("");

    const filteredClients = clients.filter((c) =>
        c.companyName.toLowerCase().includes(clientSearch.toLowerCase()) ||
        c.name.toLowerCase().includes(clientSearch.toLowerCase())
    );

    return (
        <div className="flex-1 overflow-y-auto p-6 space-y-6 mt-0">
            {/* Status */}
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
                            <ShieldAlert className="w-3 h-3" />{statusError}
                        </p>
                    )}
                    <p className="text-xs text-muted-foreground">
                        Marking as <strong>Completed</strong> requires all tasks to be finished.
                    </p>
                </div>
            </div>

            {/* Project Name */}
            <div className="space-y-2">
                <label className="text-sm font-medium">Project Name</label>
                <div className="flex gap-2">
                    <input
                        className="flex h-9 w-full rounded-md border border-input px-3 py-1 text-sm bg-muted/50"
                        value={name}
                        onChange={(e) => onNameChange(e.target.value)}
                        placeholder="Project Name"
                    />
                    <Button size="sm" onClick={onUpdateName} disabled={!name}>Save</Button>
                </div>
                <p className="text-xs text-muted-foreground">Changes project name and URL. You will be redirected.</p>
            </div>

            {/* Due Date */}
            <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-2">
                    <CalendarDays className="w-4 h-4 text-muted-foreground" />Due Date
                </label>
                <div className="flex gap-2">
                    <input
                        type="date"
                        className="flex h-9 w-full rounded-md border border-input px-3 py-1 text-sm bg-muted/50"
                        value={dueDate}
                        onChange={(e) => onDueDateChange(e.target.value)}
                    />
                    <Button size="sm" onClick={onUpdateDueDate} disabled={!dueDate || dueDateLoading}>
                        {dueDateLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : "Save"}
                    </Button>
                </div>
                <p className="text-xs text-muted-foreground">Set or update the project deadline.</p>
            </div>

            {/* Assigned Clients */}
            <div className="space-y-3">
                <div className="flex items-center justify-between">
                    <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Assigned Clients</h3>
                    {selectedClientIds.length > 0 && !isEditingSelection && (
                        <Button variant="ghost" size="sm" onClick={onStartEditingSelection} className="h-8 gap-2 text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 dark:hover:bg-indigo-950">
                            <Pencil className="h-3 w-3" />Edit
                        </Button>
                    )}
                </div>

                {/* View mode — show assigned client cards */}
                {!isEditingSelection && selectedClientIds.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {clients.filter((c) => selectedClientIds.includes(c.id)).map((c) => (
                            <div key={c.id} className="bg-primary/10 border border-primary/20 rounded-xl p-3 sm:p-4 flex items-start gap-3">
                                <Avatar className="h-10 w-10 sm:h-12 sm:w-12 shrink-0 border-2 border-background shadow-sm">
                                    <AvatarImage src={`https://api.dicebear.com/7.x/initials/svg?seed=${c.companyName}`} />
                                    <AvatarFallback className="bg-primary/20 text-primary font-bold text-base">
                                        {c.companyName.substring(0, 2).toUpperCase()}
                                    </AvatarFallback>
                                </Avatar>
                                <div className="min-w-0 space-y-0.5">
                                    <h4 className="text-sm sm:text-base font-semibold text-foreground truncate">{c.companyName}</h4>
                                    <div className="flex items-center gap-1.5 text-xs sm:text-sm text-muted-foreground">
                                        <Users className="h-3 w-3 shrink-0" />
                                        <span className="truncate">{c.name}</span>
                                    </div>
                                    <div className="flex items-center gap-1.5 text-xs sm:text-sm text-muted-foreground">
                                        <Mail className="h-3 w-3 shrink-0" />
                                        <span className="truncate">{c.email}</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    /* Edit mode — searchable client picker */
                    <div className="space-y-3 animate-in fade-in slide-in-from-top-2">

                        {/* Selected badges */}
                        {selectedClientIds.length > 0 && (
                            <div className="flex flex-wrap gap-1.5">
                                {clients
                                    .filter((c) => selectedClientIds.includes(c.id))
                                    .map((c) => (
                                        <span
                                            key={c.id}
                                            className="inline-flex items-center gap-1 pl-2 pr-1 py-0.5 rounded-full text-xs font-medium bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border border-indigo-500/20"
                                        >
                                            {c.companyName}
                                            <button
                                                type="button"
                                                disabled={clientLoading}
                                                onClick={() => onAssignClients(selectedClientIds.filter((id) => id !== c.id))}
                                                className="ml-0.5 rounded-full p-0.5 hover:bg-indigo-500/20 transition-colors disabled:opacity-50"
                                                aria-label={`Remove ${c.companyName}`}
                                            >
                                                <X className="h-2.5 w-2.5" />
                                            </button>
                                        </span>
                                    ))}
                            </div>
                        )}

                        {/* Search input */}
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                            <input
                                type="text"
                                placeholder="Search clients…"
                                value={clientSearch}
                                onChange={(e) => setClientSearch(e.target.value)}
                                className="w-full h-9 pl-9 pr-3 rounded-md border border-input bg-muted/50 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                            />
                        </div>

                        {/* Client list */}
                        <div className="max-h-56 sm:max-h-64 overflow-y-auto rounded-md border border-input bg-background divide-y divide-border">
                            {clients.length === 0 && (
                                <p className="text-sm text-muted-foreground px-4 py-3">No clients yet.</p>
                            )}
                            {filteredClients.length === 0 && clients.length > 0 && (
                                <p className="text-sm text-muted-foreground px-4 py-3">No clients match &ldquo;{clientSearch}&rdquo;</p>
                            )}
                            {filteredClients.map((client) => {
                                const isChecked = selectedClientIds.includes(client.id);
                                return (
                                    <label
                                        key={client.id}
                                        className={`flex items-center gap-3 px-3 py-2.5 cursor-pointer transition-colors hover:bg-muted/60 ${
                                            isChecked ? "bg-indigo-500/5" : ""
                                        }`}
                                    >
                                        {/* Custom checkbox */}
                                        <span className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border-2 transition-colors ${
                                            isChecked
                                                ? "bg-indigo-600 border-indigo-600"
                                                : "border-muted-foreground/40"
                                        }`}>
                                            {isChecked && <Check className="h-2.5 w-2.5 text-white" strokeWidth={3} />}
                                        </span>
                                        <input
                                            type="checkbox"
                                            checked={isChecked}
                                            disabled={clientLoading}
                                            className="sr-only"
                                            onChange={() => {
                                                const next = isChecked
                                                    ? selectedClientIds.filter((id) => id !== client.id)
                                                    : [...selectedClientIds, client.id];
                                                onAssignClients(next);
                                            }}
                                        />
                                        {/* Avatar */}
                                        <Avatar className="h-8 w-8 shrink-0">
                                            <AvatarImage src={`https://api.dicebear.com/7.x/initials/svg?seed=${client.companyName}`} />
                                            <AvatarFallback className="bg-muted text-muted-foreground text-xs font-bold">
                                                {client.companyName.substring(0, 2).toUpperCase()}
                                            </AvatarFallback>
                                        </Avatar>
                                        {/* Info */}
                                        <div className="min-w-0 flex-1">
                                            <p className="text-sm font-medium truncate">{client.companyName}</p>
                                            <p className="text-xs text-muted-foreground truncate">{client.name}</p>
                                        </div>
                                        {clientLoading && isChecked && (
                                            <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground shrink-0" />
                                        )}
                                    </label>
                                );
                            })}
                        </div>

                        {/* Divider + create link */}
                        <div className="relative">
                            <div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div>
                            <div className="relative flex justify-center text-xs uppercase">
                                <span className="bg-background px-2 text-muted-foreground">Or</span>
                            </div>
                        </div>
                        <Link href="/dashboard/clients" target="_blank">
                            <Button variant="outline" className="w-full gap-2 border-dashed text-sm" type="button">
                                <Plus className="h-4 w-4" />Create New Client<ExternalLink className="h-3 w-3 ml-auto opacity-50" />
                            </Button>
                        </Link>
                        <p className="text-xs text-muted-foreground text-center">
                            Create the client on the Clients page, then come back and select them here.
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}

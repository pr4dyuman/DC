"use client";

import type { FormEvent } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import type { Client, Project } from "@/lib/types";
import { Check, Mail, Pencil, Plus, ShieldAlert, Users } from "lucide-react";

type NewClientDraft = {
    name: string;
    email: string;
    companyName: string;
    password: string;
};

interface ProjectSettingsGeneralTabProps {
    status: Project["status"] | "";
    statusLoading: boolean;
    statusError: string;
    name: string;
    currentClient?: Client;
    isEditingSelection: boolean;
    isCreatingClient: boolean;
    selectedClientId: string;
    clients: Client[];
    newClient: NewClientDraft;
    clientLoading: boolean;
    onUpdateStatus: (status: Project["status"]) => void;
    onNameChange: (value: string) => void;
    onUpdateName: () => void;
    onStartEditingSelection: () => void;
    onAssignClient: (clientId: string) => void;
    onStartCreatingClient: () => void;
    onCancelCreatingClient: () => void;
    onCreateClient: (event: FormEvent<HTMLFormElement>) => void;
    onNewClientFieldChange: (field: keyof NewClientDraft, value: string) => void;
}

export function ProjectSettingsGeneralTab({
    status,
    statusLoading,
    statusError,
    name,
    currentClient,
    isEditingSelection,
    isCreatingClient,
    selectedClientId,
    clients,
    newClient,
    clientLoading,
    onUpdateStatus,
    onNameChange,
    onUpdateName,
    onStartEditingSelection,
    onAssignClient,
    onStartCreatingClient,
    onCancelCreatingClient,
    onCreateClient,
    onNewClientFieldChange,
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
                    <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Assigned Client</h3>
                    {currentClient && !isEditingSelection && (
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={onStartEditingSelection}
                            className="h-8 gap-2 text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50"
                        >
                            <Pencil className="h-3 w-3" />
                            Change
                        </Button>
                    )}
                </div>

                {!isEditingSelection && currentClient ? (
                    <div className="bg-primary/10 border border-primary/20 rounded-xl p-5 flex items-start gap-4">
                        <Avatar className="h-16 w-16 border-2 border-background shadow-sm">
                            <AvatarImage src={`https://api.dicebear.com/7.x/initials/svg?seed=${currentClient.companyName}`} />
                            <AvatarFallback className="bg-primary/20 text-primary font-bold text-xl">
                                {currentClient.companyName.substring(0, 2).toUpperCase()}
                            </AvatarFallback>
                        </Avatar>
                        <div className="space-y-1">
                            <h4 className="text-lg font-semibold text-foreground">{currentClient.companyName}</h4>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <Users className="h-3 w-3" />
                                {currentClient.name}
                            </div>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <Mail className="h-3 w-3" />
                                {currentClient.email}
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
                        {!isCreatingClient ? (
                            <div className="space-y-3">
                                <div className="grid gap-2">
                                    <label className="text-sm font-medium">Select Existing Client</label>
                                    <select
                                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                        value={selectedClientId}
                                        onChange={(event) => onAssignClient(event.target.value)}
                                    >
                                        <option value="">Select a Client...</option>
                                        {clients.map((client) => (
                                            <option key={client.id} value={client.id}>
                                                {client.companyName} ({client.name})
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div className="relative">
                                    <div className="absolute inset-0 flex items-center">
                                        <span className="w-full border-t" />
                                    </div>
                                    <div className="relative flex justify-center text-xs uppercase">
                                        <span className="bg-background px-2 text-muted-foreground">Or</span>
                                    </div>
                                </div>
                                <Button variant="outline" className="w-full gap-2 border-dashed" onClick={onStartCreatingClient}>
                                    <Plus className="h-4 w-4" />
                                    Add New Client
                                </Button>
                            </div>
                        ) : (
                            <form onSubmit={onCreateClient} className="space-y-4 bg-muted/30 p-4 rounded-lg border border-border/50">
                                <div className="flex items-center justify-between">
                                    <h4 className="font-medium">New Client Details</h4>
                                    <Button variant="ghost" size="sm" onClick={onCancelCreatingClient}>
                                        Cancel
                                    </Button>
                                </div>
                                <div className="grid gap-2">
                                    <input
                                        required
                                        className="flex h-9 w-full rounded-md border border-input px-3 py-1"
                                        placeholder="Company Name"
                                        value={newClient.companyName}
                                        onChange={(event) => onNewClientFieldChange("companyName", event.target.value)}
                                    />
                                    <input
                                        required
                                        className="flex h-9 w-full rounded-md border border-input px-3 py-1"
                                        placeholder="Contact Name"
                                        value={newClient.name}
                                        onChange={(event) => onNewClientFieldChange("name", event.target.value)}
                                    />
                                    <input
                                        type="email"
                                        required
                                        className="flex h-9 w-full rounded-md border border-input px-3 py-1"
                                        placeholder="Email"
                                        value={newClient.email}
                                        onChange={(event) => onNewClientFieldChange("email", event.target.value)}
                                    />
                                    <input
                                        type="password"
                                        required
                                        className="flex h-9 w-full rounded-md border border-input px-3 py-1"
                                        placeholder="Password"
                                        value={newClient.password}
                                        onChange={(event) => onNewClientFieldChange("password", event.target.value)}
                                    />
                                </div>
                                <Button type="submit" disabled={clientLoading} className="w-full">
                                    {clientLoading ? "Creating..." : "Create & Assign"}
                                </Button>
                            </form>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

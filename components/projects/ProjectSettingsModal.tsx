"use client";

import { useState, useEffect, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Settings, ShieldAlert, Plus, Users, Mail, Pencil, Sparkles, Check, FileText, Code, ImageIcon, Brain } from "lucide-react";
import { getClients, createClient, updateProject, deleteProject, getProjectAssets, toggleAssetAI, getProject, getAgencyAIConfig } from "@/lib/actions";
import { Client, Asset, Project } from "@/lib/types";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";

interface ProjectSettingsModalProps {
    projectId: string;
    currentSlug?: string;
    currentClientId?: string;
    currentUserId?: string;
}

export function ProjectSettingsModal({ projectId, currentSlug, currentClientId }: ProjectSettingsModalProps) {
    const router = useRouter();
    const [open, setOpen] = useState(false);
    const [status, setStatus] = useState<Project["status"] | "">("");
    const [statusLoading, setStatusLoading] = useState(false);
    const [statusError, setStatusError] = useState("");

    // Client State
    const [clients, setClients] = useState<Client[]>([]);
    const [selectedClientId, setSelectedClientId] = useState(currentClientId || "");
    const [name, setName] = useState("");
    const [isCreatingClient, setIsCreatingClient] = useState(false);
    const [isEditingSelection, setIsEditingSelection] = useState(!currentClientId);
    const [newClient, setNewClient] = useState({ name: "", email: "", companyName: "", password: "" });
    const [clientLoading, setClientLoading] = useState(false);

    // AI State
    const [assets, setAssets] = useState<Asset[]>([]);
    const [aiConfigured, setAiConfigured] = useState(false);

    // Delete State
    const [deletePassword, setDeletePassword] = useState("");
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [deleteError, setDeleteError] = useState("");
    const [deleteLoading, setDeleteLoading] = useState(false);

    const loadData = useCallback(async () => {
        const [clientsData, assetsData, projectData, aiConfig] = await Promise.all([
            getClients(),
            getProjectAssets(projectId),
            getProject(projectId),
            getAgencyAIConfig()
        ]);
        setClients(clientsData);
        setAssets(assetsData);
        if (projectData) {
            setStatus(projectData.status);
            setName(projectData.name);
        }
        setAiConfigured(!!aiConfig);
    }, [projectId]);

    useEffect(() => {
        if (open) {
            loadData();
        }
    }, [open, loadData]);

    useEffect(() => {
        setSelectedClientId(currentClientId || "");
    }, [currentClientId]);

    // --- Client Handlers ---
    const handleAssignClient = async (clientId: string) => {
        setClientLoading(true);
        await updateProject(projectId, { clientId });
        setSelectedClientId(clientId);
        setIsEditingSelection(false);
        setClientLoading(false);
        router.refresh();
    };

    const handleUpdateName = async () => {
        if (!name) return;

        // Auto-generate safe slug
        const newSlug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

        // Update both name and slug
        await updateProject(projectId, { name, slug: newSlug });
        if (newSlug !== currentSlug) {
            router.push(`/dashboard/projects/${newSlug}`);
        } else {
            router.refresh();
        }
    };


    const handleUpdateStatus = async (newStatus: Project["status"]) => {
        setStatusError("");
        setStatusLoading(true);
        try {
            await updateProject(projectId, { status: newStatus });
            setStatus(newStatus);
            router.refresh();
        } catch (error) {
            console.error(error);
            setStatusError(error instanceof Error ? error.message : "Failed to update status");
        } finally {
            setStatusLoading(false);
        }
    };

    const handleCreateClient = async (e: React.FormEvent) => {
        e.preventDefault();
        setClientLoading(true);
        const created = await createClient(newClient);
        setClients([...clients, created]);
        await handleAssignClient(created.id);
        setIsCreatingClient(false);
        setNewClient({ name: "", email: "", companyName: "", password: "" });
    };



    const handleToggleAsset = async (assetId: string, currentState: boolean | undefined) => {
        if (!aiConfigured) return;

        // Optimistic update
        setAssets(prev => prev.map(a => a.id === assetId ? { ...a, aiEnabled: !currentState } : a));
        try {
            await toggleAssetAI(assetId, !currentState);
        } catch {
            // Revert on error
            setAssets(prev => prev.map(a => a.id === assetId ? { ...a, aiEnabled: currentState } : a));
        }
    };



    const getAssetIcon = (type: string) => {
        switch (type) {
            case 'image': return <ImageIcon className="h-4 w-4 text-purple-500" />;
            case 'code': return <Code className="h-4 w-4 text-blue-500" />;
            case 'file': return <FileText className="h-4 w-4 text-orange-500" />;
            default: return <FileText className="h-4 w-4" />;
        }
    };

    // --- Delete Handlers ---
    const handleDeleteProject = async () => {
        setDeleteError("");
        setDeleteLoading(true);
        try {
            await deleteProject(projectId, deletePassword);
            setOpen(false);
            router.push('/dashboard/projects');
        } catch {
            setDeleteError("Invalid Admin Password");
        } finally {
            setDeleteLoading(false);
        }
    };

    const currentClient = clients.find(c => c.id === selectedClientId);

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                    <Settings className="h-4 w-4" />
                    <span className="hidden sm:inline">Settings</span>
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-[95vw] sm:max-w-[700px] gap-0 p-0 overflow-hidden max-h-[85dvh] flex flex-col">
                <DialogHeader className="px-6 py-4 border-b shrink-0">
                    <DialogTitle className="text-xl">Project Settings</DialogTitle>
                </DialogHeader>

                <Tabs defaultValue="ai" className="flex-1 flex flex-col min-h-0">
                    <div className="px-6 pt-2 shrink-0">
                        <TabsList className="w-full justify-start border-b rounded-none h-auto p-0 bg-transparent">
                            <TabsTrigger value="general" className="rounded-none border-b-2 border-transparent data-[state=active]:border-indigo-600 data-[state=active]:bg-transparent px-4 py-2">
                                General
                            </TabsTrigger>
                            <TabsTrigger value="ai" className="rounded-none border-b-2 border-transparent data-[state=active]:border-indigo-600 data-[state=active]:bg-transparent px-4 py-2 gap-2">
                                <Sparkles className="h-3 w-3" />
                                Intelligence
                            </TabsTrigger>
                            <TabsTrigger value="danger" className="rounded-none border-b-2 border-transparent data-[state=active]:border-red-600 data-[state=active]:bg-transparent px-4 py-2 text-red-600">
                                Danger Zone
                            </TabsTrigger>
                        </TabsList>
                    </div>

                    {/* GENERAL TAB */}
                    <TabsContent value="general" className="flex-1 overflow-y-auto p-6 space-y-6 mt-0">
                        {/* Status Selector */}
                        <div className="space-y-3 p-4 rounded-lg bg-muted/30 border border-border/50">
                            <label className="text-sm font-medium">Project Status</label>
                            <div className="flex flex-col gap-2">
                                <div className="flex gap-2">
                                    {(['Active', 'On Hold', 'Completed'] as const).map((s) => (
                                        <Button
                                            key={s}
                                            type="button"
                                            size="sm"
                                            variant={status === s ? "default" : "outline"}
                                            onClick={() => handleUpdateStatus(s)}
                                            disabled={statusLoading}
                                            className={status === s ? "bg-indigo-600 hover:bg-indigo-700" : ""}
                                        >
                                            {status === s && <Check className="w-3 h-3 mr-1" />}
                                            {s}
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

                        {/* Name Editor (Auto-Updates Slug) */}
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Project Name</label>
                            <div className="flex gap-2">
                                <input
                                    className="flex h-9 w-full rounded-md border border-input px-3 py-1 text-sm bg-muted/50"
                                    value={name}
                                    onChange={e => setName(e.target.value)}
                                    placeholder="Project Name"
                                />
                                <Button size="sm" onClick={handleUpdateName} disabled={!name}>
                                    Save
                                </Button>
                            </div>
                            <p className="text-xs text-muted-foreground">Changes project name and URL. You will be redirected.</p>
                        </div>

                        {/* Current Client Display logic (Existing) */}
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Assigned Client</h3>
                                {currentClient && !isEditingSelection && (
                                    <Button variant="ghost" size="sm" onClick={() => setIsEditingSelection(true)} className="h-8 gap-2 text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50">
                                        <Pencil className="h-3 w-3" /> Change
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
                                            <Users className="h-3 w-3" /> {currentClient.name}
                                        </div>
                                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                            <Mail className="h-3 w-3" /> {currentClient.email}
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
                                                    onChange={(e) => handleAssignClient(e.target.value)}
                                                >
                                                    <option value="">Select a Client...</option>
                                                    {clients.map(c => (
                                                        <option key={c.id} value={c.id}>{c.companyName} ({c.name})</option>
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
                                            <Button variant="outline" className="w-full gap-2 border-dashed" onClick={() => setIsCreatingClient(true)}>
                                                <Plus className="h-4 w-4" /> Add New Client
                                            </Button>
                                        </div>
                                    ) : (
                                        <form onSubmit={handleCreateClient} className="space-y-4 bg-muted/30 p-4 rounded-lg border border-border/50">
                                            {/* Client Create Form - simplified for brevity, same fields as before */}
                                            <div className="flex items-center justify-between">
                                                <h4 className="font-medium">New Client Details</h4>
                                                <Button variant="ghost" size="sm" onClick={() => setIsCreatingClient(false)}>Cancel</Button>
                                            </div>
                                            <div className="grid gap-2">
                                                <input required className="flex h-9 w-full rounded-md border border-input px-3 py-1" placeholder="Company Name" value={newClient.companyName} onChange={e => setNewClient({ ...newClient, companyName: e.target.value })} />
                                                <input required className="flex h-9 w-full rounded-md border border-input px-3 py-1" placeholder="Contact Name" value={newClient.name} onChange={e => setNewClient({ ...newClient, name: e.target.value })} />
                                                <input type="email" required className="flex h-9 w-full rounded-md border border-input px-3 py-1" placeholder="Email" value={newClient.email} onChange={e => setNewClient({ ...newClient, email: e.target.value })} />
                                                <input type="password" required className="flex h-9 w-full rounded-md border border-input px-3 py-1" placeholder="Password" value={newClient.password} onChange={e => setNewClient({ ...newClient, password: e.target.value })} />
                                            </div>
                                            <Button type="submit" disabled={clientLoading} className="w-full">{clientLoading ? "Creating..." : "Create & Assign"}</Button>
                                        </form>
                                    )}
                                </div>
                            )}
                        </div>
                    </TabsContent>

                    {/* AI INTELLIGENCE TAB */}
                    <TabsContent value="ai" className="flex-1 overflow-y-auto p-6 space-y-6 mt-0">
                        {/* Singularity Status */}
                        <div className="p-4 rounded-xl bg-card border border-border">
                            <div className="flex items-start justify-between mb-2">
                                <div className="space-y-1">
                                    <h3 className="font-semibold text-indigo-900 dark:text-indigo-100 flex items-center gap-2">
                                        <Brain className="h-4 w-4 text-indigo-500" />
                                        Singularity AI
                                    </h3>
                                    <p className="text-xs text-muted-foreground max-w-[400px]">
                                        {aiConfigured
                                            ? "AI is configured for your organization. Select which assets to include in AI context below."
                                            : "AI is not configured. Contact your system administrator to set up Singularity."}
                                    </p>
                                </div>
                                <div className="flex items-center gap-1.5 px-2 py-1 bg-secondary rounded-md border border-border">
                                    {aiConfigured ? <Check className="h-3 w-3 text-green-500" /> : <Brain className="h-3 w-3 text-amber-500" />}
                                    <span className="text-xs font-medium text-indigo-900 dark:text-indigo-100">
                                        {aiConfigured ? "Active" : "Not Configured"}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Context Manager */}
                        <div className={`space-y-4 ${!aiConfigured ? 'opacity-50 pointer-events-none grayscale' : ''}`}>
                            <div className="flex items-center justify-between">
                                <h3 className="font-medium flex items-center gap-2">
                                    Context Manager
                                    <Badge variant="secondary" className="text-[10px] font-normal">
                                        Select assets for AI understanding
                                    </Badge>
                                </h3>
                            </div>

                            <ScrollArea className="h-[300px] rounded-lg border bg-muted/20 p-4">
                                {assets.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center h-full text-muted-foreground space-y-2 opacity-60">
                                        <Code className="h-8 w-8" />
                                        <p className="text-sm">No assets uploaded yet.</p>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                        {assets.map((asset) => (
                                            <div
                                                key={asset.id}
                                                className={`
                                                    group relative cursor-pointer rounded-lg border p-3 transition-all
                                                    hover:shadow-md hover:border-indigo-300 dark:hover:border-indigo-700
                                                    ${asset.aiEnabled
                                                        ? "bg-indigo-50/50 dark:bg-indigo-900/20 border-indigo-200 dark:border-indigo-800 ring-1 ring-indigo-500/20"
                                                        : "bg-background border-border"
                                                    }
                                                `}
                                                onClick={() => handleToggleAsset(asset.id, asset.aiEnabled)}
                                            >
                                                <div className="flex items-start justify-between mb-2">
                                                    <div className="p-1.5 rounded-md bg-muted">
                                                        {getAssetIcon(asset.type)}
                                                    </div>
                                                    {asset.aiEnabled && (
                                                        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-indigo-600 text-[10px] text-white shadow-sm">
                                                            <Check className="h-3 w-3" />
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="space-y-1">
                                                    <p className="text-xs font-medium truncate" title={asset.name}>{asset.name}</p>
                                                    <p className="text-[10px] text-muted-foreground uppercase">{asset.type}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </ScrollArea>
                        </div>
                    </TabsContent>

                    {/* DANGER TAB */}
                    <TabsContent value="danger" className="flex-1 p-6 mt-0">
                        <div className="rounded-lg border border-destructive/20 bg-destructive/10 p-4">
                            <div className="flex items-center justify-between">
                                <div className="space-y-1">
                                    <h4 className="text-sm font-semibold text-red-900 flex items-center gap-2">
                                        <ShieldAlert className="h-4 w-4" /> Delete Project
                                    </h4>
                                    <p className="text-xs text-red-700">Irreversible action.</p>
                                </div>
                                {!showDeleteConfirm && (
                                    <Button variant="destructive" size="sm" onClick={() => setShowDeleteConfirm(true)}>Delete</Button>
                                )}
                            </div>

                            {showDeleteConfirm && (
                                <div className="mt-4 space-y-3">
                                    <input type="password" placeholder="Admin Password" className="flex h-9 w-full rounded-md border px-3 text-sm" value={deletePassword} onChange={e => setDeletePassword(e.target.value)} />
                                    <div className="flex gap-2">
                                        <Button variant="destructive" onClick={handleDeleteProject} disabled={deleteLoading || !deletePassword}>Confirm</Button>
                                        <Button variant="outline" onClick={() => setShowDeleteConfirm(false)}>Cancel</Button>
                                    </div>
                                    {deleteError && <p className="text-xs text-red-600 font-bold">{deleteError}</p>}
                                </div>
                            )}
                        </div>
                    </TabsContent>
                </Tabs>
            </DialogContent>
        </Dialog>
    );
}

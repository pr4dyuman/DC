"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Settings, ShieldAlert, Plus, Users, Mail, Phone, Pencil, Sparkles, Lock, Check, FileText, Code, ImageIcon, FileJson, X } from "lucide-react";
import { getClients, createClient, updateProject, deleteProject, getProjectAssets, toggleAssetAI, updateUser, getUsers } from "@/lib/actions";
import { Client, Asset } from "@/lib/db";
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
    aiEnabled?: boolean;
}

export function ProjectSettingsModal({ projectId, currentSlug, currentClientId, currentUserId, aiEnabled }: ProjectSettingsModalProps) {
    const router = useRouter();
    const [open, setOpen] = useState(false);

    // Client State
    const [clients, setClients] = useState<Client[]>([]);
    const [selectedClientId, setSelectedClientId] = useState(currentClientId || "");
    const [slug, setSlug] = useState(currentSlug || "");
    const [isCreatingClient, setIsCreatingClient] = useState(false);
    const [isEditingSelection, setIsEditingSelection] = useState(!currentClientId);
    const [newClient, setNewClient] = useState({ name: "", email: "", companyName: "", password: "" });
    const [clientLoading, setClientLoading] = useState(false);

    // AI State
    const [apiKey, setApiKey] = useState("");
    const [isKeyVisible, setIsKeyVisible] = useState(false);
    const [assets, setAssets] = useState<Asset[]>([]);
    const [aiLoading, setAiLoading] = useState(false);
    const [userHasKey, setUserHasKey] = useState(false);
    const [enabled, setEnabled] = useState(aiEnabled === undefined ? false : aiEnabled);

    useEffect(() => {
        setEnabled(aiEnabled !== false);
    }, [aiEnabled]);

    // Delete State
    const [deletePassword, setDeletePassword] = useState("");
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [deleteError, setDeleteError] = useState("");
    const [deleteLoading, setDeleteLoading] = useState(false);

    useEffect(() => {
        if (open) {
            loadData();
        }
    }, [open]);

    useEffect(() => {
        setSelectedClientId(currentClientId || "");
    }, [currentClientId]);

    const loadData = async () => {
        const [clientsData, assetsData, usersData] = await Promise.all([
            getClients(),
            getProjectAssets(projectId),
            getUsers()
        ]);
        setClients(clientsData);
        setAssets(assetsData);

        // Check if user has key
        if (currentUserId) {
            const user = usersData.find(u => u.id === currentUserId);
            if (user?.geminiApiKey) {
                setApiKey(user.geminiApiKey);
                setUserHasKey(true);
            }
        }
    };

    // --- Client Handlers ---
    const handleAssignClient = async (clientId: string) => {
        setClientLoading(true);
        await updateProject(projectId, { clientId });
        setSelectedClientId(clientId);
        setIsEditingSelection(false);
        setClientLoading(false);
        router.refresh();
    };

    const handleUpdateSlug = async () => {
        if (!slug || slug === currentSlug) return;
        await updateProject(projectId, { slug });
        router.push(`/dashboard/projects/${slug}`); // Navigate to new URL
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

    // --- AI Handlers ---
    const handleSaveApiKey = async () => {
        if (!currentUserId || !apiKey.trim()) return;
        setAiLoading(true);
        try {
            await updateUser(currentUserId, { geminiApiKey: apiKey.trim() });
            setUserHasKey(true);
        } catch (error) {
            console.error(error);
        } finally {
            setAiLoading(false);
        }
    };

    const handleToggleAsset = async (assetId: string, currentState: boolean | undefined) => {
        if (!userHasKey || !enabled) return;

        // Optimistic update
        setAssets(prev => prev.map(a => a.id === assetId ? { ...a, aiEnabled: !currentState } : a));
        try {
            await toggleAssetAI(assetId, !currentState);
        } catch (error) {
            // Revert on error
            setAssets(prev => prev.map(a => a.id === assetId ? { ...a, aiEnabled: currentState } : a));
        }
    };

    // Toggle Project AI
    const handleToggleProjectAI = async () => {
        const newState = !enabled;
        setEnabled(newState); // Optimistic
        try {
            await updateProject(projectId, { aiEnabled: newState });
            router.refresh();
        } catch (error) {
            console.error("Failed to toggle AI", error);
            setEnabled(!newState);
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
        } catch (err) {
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
            <DialogContent className="sm:max-w-[700px] gap-0 p-0 overflow-hidden h-[80vh] flex flex-col">
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
                        {/* Slug Editor */}
                        <div className="space-y-2">
                            <label className="text-sm font-medium">URL Slug</label>
                            <div className="flex gap-2">
                                <input
                                    className="flex h-9 w-full rounded-md border border-input px-3 py-1 text-sm bg-muted/50"
                                    value={slug}
                                    onChange={e => setSlug(e.target.value)}
                                    placeholder="project-slug"
                                />
                                <Button size="sm" onClick={handleUpdateSlug} disabled={!slug || slug === currentSlug}>
                                    Save
                                </Button>
                            </div>
                            <p className="text-xs text-muted-foreground">Changes project URL. You will be redirected.</p>
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
                        {/* API Key Section */}
                        <div className="p-4 rounded-xl bg-card border border-border">
                            <div className="flex items-start justify-between mb-4">
                                <div className="space-y-1">
                                    <h3 className="font-semibold text-indigo-900 dark:text-indigo-100 flex items-center gap-2">
                                        <Sparkles className="h-4 w-4 text-indigo-500" />
                                        Gemini API Configuration
                                    </h3>
                                    <p className="text-xs text-indigo-700 dark:text-indigo-300 max-w-[400px]">
                                        Add your API Key to unlock AI features. This key is stored securely to your user profile.
                                    </p>
                                </div>
                                <div className="flex items-center gap-1.5 px-2 py-1 bg-secondary rounded-md border border-border">
                                    {userHasKey ? <Check className="h-3 w-3 text-green-500" /> : <Lock className="h-3 w-3 text-amber-500" />}
                                    <span className="text-xs font-medium text-indigo-900 dark:text-indigo-100">
                                        {userHasKey ? "Active" : "Required"}
                                    </span>
                                </div>
                            </div>

                            <div className="flex gap-2">
                                <div className="relative flex-1">
                                    <input
                                        type={isKeyVisible ? "text" : "password"}
                                        placeholder="Enter your Gemini API Key..."
                                        className="w-full h-9 rounded-md border border-input bg-input px-3 pr-8 text-sm focus:ring-primary"
                                        value={apiKey}
                                        onChange={(e) => setApiKey(e.target.value)}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setIsKeyVisible(!isKeyVisible)}
                                        className="absolute right-2 top-2.5 text-indigo-400 hover:text-indigo-600"
                                    >
                                        {isKeyVisible ? <Settings className="h-4 w-4" /> : <Settings className="h-4 w-4" />} {/* Simplified icon toggle */}
                                    </button>
                                </div>
                                <Button onClick={handleSaveApiKey} disabled={aiLoading || !apiKey} size="sm" className="bg-primary hover:bg-primary/90 text-primary-foreground">
                                    {aiLoading ? "Saving..." : "Save Key"}
                                </Button>
                            </div>
                        </div>

                        {/* AI Enable Toggle */}
                        <div className="flex items-center justify-between p-4 rounded-xl border border-border bg-card">
                            <div className="space-y-0.5">
                                <h3 className="font-medium text-sm text-foreground">Enable AI Features</h3>
                                <p className="text-xs text-muted-foreground">
                                    Allow AI to explain tasks and analyze assets in this project.
                                </p>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className={`text-xs font-medium ${enabled ? 'text-indigo-600' : 'text-zinc-500'}`}>
                                    {enabled ? 'Enabled' : 'Disabled'}
                                </span>
                                <button
                                    onClick={handleToggleProjectAI}
                                    className={`
                                        relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:ring-offset-2
                                        ${enabled ? 'bg-indigo-600' : 'bg-zinc-200 dark:bg-zinc-700'}
                                    `}
                                >
                                    <span className="sr-only">Toggle AI</span>
                                    <span
                                        className={`
                                            pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out
                                            ${enabled ? 'translate-x-5' : 'translate-x-0'}
                                        `}
                                    />
                                </button>
                            </div>
                        </div>

                        {/* Context Manager */}
                        <div className={`space-y-4 ${(!userHasKey || !enabled) ? 'opacity-50 pointer-events-none grayscale' : ''}`}>
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

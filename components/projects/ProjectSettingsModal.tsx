"use client";

import { useState, useEffect, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Settings, Sparkles } from "lucide-react";
import { getClients, updateProject, deleteProject, getProjectAssets, toggleAssetAI, getProject, getAgencyAIConfig, syncProjectBudget } from "@/lib/actions";
import { Client, Asset, Project } from "@/lib/types";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ProjectSettingsGeneralTab } from "./ProjectSettingsGeneralTab";
import { ProjectSettingsAITab } from "./ProjectSettingsAITab";
import { ProjectSettingsDangerTab } from "./ProjectSettingsDangerTab";
import { toast } from "sonner";

interface ProjectSettingsModalProps {
    projectId: string;
    currentSlug?: string;
    currentClientId?: string;
    currentClientIds?: string[];
    currentUserId?: string;
}

export function ProjectSettingsModal({ projectId, currentSlug, currentClientId, currentClientIds }: ProjectSettingsModalProps) {
    const router = useRouter();
    const [open, setOpen] = useState(false);
    const [status, setStatus] = useState<Project["status"] | "">("");
    const [statusLoading, setStatusLoading] = useState(false);
    const [statusError, setStatusError] = useState("");

    const [clients, setClients] = useState<Client[]>([]);
    const buildInitialIds = () => {
        const ids = Array.from(new Set([
            ...(currentClientIds || []),
            ...(currentClientId ? [currentClientId] : []),
        ])).filter(Boolean);
        return ids;
    };
    const [selectedClientIds, setSelectedClientIds] = useState<string[]>(buildInitialIds);
    const [name, setName] = useState("");
    const [isEditingSelection, setIsEditingSelection] = useState(buildInitialIds().length === 0);
    const [clientLoading, setClientLoading] = useState(false);

    const [dueDate, setDueDate] = useState("");
    const [dueDateLoading, setDueDateLoading] = useState(false);

    const [budget, setBudget] = useState("");
    const [budgetLoading, setBudgetLoading] = useState(false);
    const [budgetError, setBudgetError] = useState("");

    const [assets, setAssets] = useState<Asset[]>([]);
    const [aiConfigured, setAiConfigured] = useState(false);

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
            if (projectData.dueDate) {
                const d = new Date(projectData.dueDate);
                if (!isNaN(d.getTime())) {
                    setDueDate(d.toISOString().split('T')[0]);
                }
            }
            setBudget(projectData.budget > 0 ? String(projectData.budget) : "");
        }
        setAiConfigured(!!aiConfig);
    }, [projectId]);

    useEffect(() => {
        if (open) loadData();
    }, [open, loadData]);

    useEffect(() => {
        setSelectedClientIds(buildInitialIds());
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentClientId, currentClientIds]);

    const handleAssignClients = async (clientIds: string[]) => {
        setClientLoading(true);
        await updateProject(projectId, { clientIds } as Parameters<typeof updateProject>[1]);
        setSelectedClientIds(clientIds);
        setIsEditingSelection(clientIds.length === 0);
        setClientLoading(false);
        router.refresh();
    };

    const handleUpdateName = async () => {
        if (!name) return;
        const newSlug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
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

    const handleUpdateDueDate = async () => {
        if (!dueDate) return;
        setDueDateLoading(true);
        try {
            await updateProject(projectId, { dueDate } as Parameters<typeof updateProject>[1]);
            toast.success("Due date updated");
            router.refresh();
        } catch (error) {
            console.error(error);
            toast.error("Failed to update due date");
        } finally {
            setDueDateLoading(false);
        }
    };

    const handleUpdateBudget = async () => {
        setBudgetError("");
        const parsed = parseFloat(budget);
        if (budget !== "0" && (isNaN(parsed) || parsed < 0)) {
            setBudgetError("Enter a valid amount (0 to clear)");
            return;
        }
        setBudgetLoading(true);
        try {
            await syncProjectBudget(projectId, isNaN(parsed) ? 0 : parsed);
            toast.success(parsed === 0 ? "Deal value cleared" : "Deal value updated");
            router.refresh();
        } catch (error) {
            const msg = error instanceof Error ? error.message : "Failed to update deal value";
            setBudgetError(msg);
            toast.error(msg);
        } finally {
            setBudgetLoading(false);
        }
    };

    const handleToggleAsset = async (assetId: string, currentState: boolean | undefined) => {
        if (!aiConfigured) return;
        setAssets(prev => prev.map(a => a.id === assetId ? { ...a, aiEnabled: !currentState } : a));
        try {
            await toggleAssetAI(assetId, !currentState);
        } catch {
            setAssets(prev => prev.map(a => a.id === assetId ? { ...a, aiEnabled: currentState } : a));
        }
    };

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

                    <TabsContent value="general" className="mt-0 flex-1 min-h-0">
                        <ProjectSettingsGeneralTab
                            status={status}
                            statusLoading={statusLoading}
                            statusError={statusError}
                            name={name}
                            dueDate={dueDate}
                            dueDateLoading={dueDateLoading}
                            budget={budget}
                            budgetLoading={budgetLoading}
                            budgetError={budgetError}
                            isEditingSelection={isEditingSelection}
                            selectedClientIds={selectedClientIds}
                            clients={clients}
                            clientLoading={clientLoading}
                            onUpdateStatus={handleUpdateStatus}
                            onNameChange={setName}
                            onUpdateName={handleUpdateName}
                            onDueDateChange={setDueDate}
                            onUpdateDueDate={handleUpdateDueDate}
                            onBudgetChange={setBudget}
                            onUpdateBudget={handleUpdateBudget}
                            onStartEditingSelection={() => setIsEditingSelection(true)}
                            onAssignClients={handleAssignClients}
                        />
                    </TabsContent>

                    <TabsContent value="ai" className="mt-0 flex-1 min-h-0">
                        <ProjectSettingsAITab
                            aiConfigured={aiConfigured}
                            assets={assets}
                            onToggleAsset={handleToggleAsset}
                        />
                    </TabsContent>

                    <TabsContent value="danger" className="mt-0 flex-1 min-h-0">
                        <ProjectSettingsDangerTab
                            showDeleteConfirm={showDeleteConfirm}
                            deletePassword={deletePassword}
                            deleteError={deleteError}
                            deleteLoading={deleteLoading}
                            onShowDeleteConfirm={() => setShowDeleteConfirm(true)}
                            onDeletePasswordChange={setDeletePassword}
                            onDeleteProject={handleDeleteProject}
                            onCancelDelete={() => setShowDeleteConfirm(false)}
                        />
                    </TabsContent>
                </Tabs>
            </DialogContent>
        </Dialog>
    );
}

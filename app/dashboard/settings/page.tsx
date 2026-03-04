"use client";

import { useState, useEffect, useCallback } from "react";
import { getServices, addService, deleteService, updateService, getAgencySettings, bulkEstimateTaskHours } from "@/lib/actions";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Dialog, DialogContent, DialogDescription, DialogFooter,
    DialogHeader, DialogTitle
} from "@/components/ui/dialog";
import {
    AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
    AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle
} from "@/components/ui/alert-dialog";
import {
    Loader2, Plus, Trash2, Edit2, Users, Briefcase,
    ChevronDown, ChevronRight, Settings, Shield, Palette,
    Sun, Moon, X, Lock, Clock
} from "lucide-react";
import { toast } from "sonner";
import PermissionSettings from "@/components/settings/PermissionSettings";
import { SecuritySettings } from "@/components/settings/SecuritySettings";
import { AgencySettings } from "@/components/settings/AgencySettings";
import { EmailSettings } from "@/components/settings/EmailSettings";
import { useTheme } from "@/components/providers/ThemeProvider";

type Job = { title: string; count: number };
type Service = { id: string; name: string; jobs: Job[] };

type AgencySettingsData = {
    name: string;
    logo: string;
    primaryColor?: string;
    secondaryColor?: string;
    emailNotificationsEnabled: boolean;
};

export default function SettingsPage() {
    const [services, setServices] = useState<Service[]>([]);
    const [loading, setLoading] = useState(true);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingService, setEditingService] = useState<Service | null>(null);
    const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);

    // Agency settings (shared between AgencySettings + EmailSettings)
    const [agencySettings, setAgencySettings] = useState<AgencySettingsData | null>(null);
    const [agencySettingsLoading, setAgencySettingsLoading] = useState(true);

    // Section Visibility State — first section auto-opens
    const [openSections, setOpenSections] = useState<Record<string, boolean>>(() => {
        if (typeof window !== 'undefined') {
            const url = new URL(window.location.href);
            const section = url.searchParams.get('section');
            if (section) {
                return { [section]: true };
            }
        }
        return { appearance: true };
    });

    const { theme, setTheme } = useTheme();

    // Form State
    const [name, setName] = useState("");
    const [jobs, setJobs] = useState<Job[]>([]);
    const [submitting, setSubmitting] = useState(false);

    const toggleSection = useCallback((key: string) => {
        setOpenSections(prev => {
            const newState = { ...prev, [key]: !prev[key] };
            // Update URL
            const url = new URL(window.location.href);
            const openKeys = Object.entries(newState).filter(([, v]) => v).map(([k]) => k);
            if (openKeys.length === 1) {
                url.searchParams.set('section', openKeys[0]);
            } else {
                url.searchParams.delete('section');
            }
            window.history.replaceState({}, '', url.pathname + url.search);
            return newState;
        });
    }, []);

    const loadServices = useCallback(async () => {
        try {
            const servicesData = await getServices();
            setServices(servicesData || []);
        } catch (error) {
            console.error("Failed to load services", error);
            toast.error("Failed to load services");
        } finally {
            setLoading(false);
        }
    }, []);

    const loadAgencySettings = useCallback(async () => {
        try {
            const settings = await getAgencySettings();
            setAgencySettings(settings ? {
                name: settings.name,
                logo: settings.logo,
                primaryColor: settings.primaryColor,
                secondaryColor: settings.secondaryColor,
                emailNotificationsEnabled: settings.emailNotificationsEnabled ?? true
            } : null);
        } catch (error) {
            console.error("Failed to load agency settings", error);
            toast.error("Failed to load agency settings");
        } finally {
            setAgencySettingsLoading(false);
        }
    }, []);

    useEffect(() => {
        loadServices();
        loadAgencySettings();
    }, [loadServices, loadAgencySettings]);

    const handleOpenDialog = (service?: Service) => {
        if (service) {
            setEditingService(service);
            setName(service.name);
            setJobs([...service.jobs]);
        } else {
            setEditingService(null);
            setName("");
            setJobs([{ title: "", count: 1 }]);
        }
        setIsDialogOpen(true);
    };

    const handleAddJob = () => {
        setJobs([...jobs, { title: "", count: 1 }]);
    };

    const handleRemoveJob = (index: number) => {
        setJobs(jobs.filter((_, i) => i !== index));
    };

    const handleJobChange = (index: number, field: keyof Job, value: string | number) => {
        const newJobs = [...jobs];
        newJobs[index] = { ...newJobs[index], [field]: value };
        setJobs(newJobs);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) return;

        setSubmitting(true);
        const validJobs = jobs.filter(j => j.title.trim() !== "");
        const previousServices = [...services]; // For revert

        try {
            if (editingService) {
                // Optimistic update
                setServices(prev => prev.map(s => s.id === editingService.id ? { ...s, name, jobs: validJobs } : s));
                await updateService(editingService.id, name, validJobs);
                toast.success("Service updated");
            } else {
                await addService(name, validJobs);
                toast.success("Service created");
            }
            setIsDialogOpen(false);
            loadServices();
        } catch (error) {
            console.error(error);
            toast.error("Failed to save service");
            // Revert optimistic update
            setServices(previousServices);
        } finally {
            setSubmitting(false);
        }
    };

    const handleConfirmDelete = async () => {
        if (!deleteTarget) return;
        const previousServices = [...services];
        setServices(prev => prev.filter(c => c.id !== deleteTarget.id)); // Optimistic
        setDeleteTarget(null);
        try {
            await deleteService(deleteTarget.id);
            toast.success(`"${deleteTarget.name}" deleted`);
        } catch {
            toast.error("Failed to delete service");
            setServices(previousServices); // Revert
        }
    };

    const totalEmployees = (serviceJobs: Job[]) => serviceJobs.reduce((acc, curr) => acc + (Number(curr.count) || 0), 0);

    return (
        <div className="space-y-6 p-2">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
                <p className="text-muted-foreground">Manage your agency services and system configurations.</p>
            </div>

            {/* Appearance Section */}
            <SectionAccordion
                title="Appearance"
                description="Customize the look and feel."
                icon={<Palette className="h-6 w-6 text-sky-500" />}
                iconBg="bg-sky-500/10"
                isOpen={!!openSections.appearance}
                onToggle={() => toggleSection('appearance')}
            >
                <Label className="text-sm font-medium mb-4 block">Theme</Label>
                <div className="grid grid-cols-2 gap-4 max-w-md">
                    {/* Dark Theme Card */}
                    <button
                        onClick={() => setTheme("dark")}
                        className={`relative flex flex-col items-center gap-3 p-6 rounded-xl border-2 transition-all duration-200 cursor-pointer hover:scale-[1.02] ${theme === "dark"
                            ? "border-primary bg-primary/5 shadow-lg shadow-primary/10"
                            : "border-border hover:border-muted-foreground/30"
                            }`}
                    >
                        <div className="w-full aspect-[4/3] rounded-lg bg-black border border-neutral-800 p-2 flex flex-col gap-1">
                            <div className="h-1.5 w-8 rounded bg-neutral-700" />
                            <div className="h-1.5 w-12 rounded bg-neutral-800" />
                            <div className="flex-1 rounded bg-neutral-900 mt-1" />
                        </div>
                        <div className="flex items-center gap-2">
                            <Moon className="h-4 w-4" />
                            <span className="text-sm font-medium">Dark</span>
                        </div>
                        {theme === "dark" && (
                            <div className="absolute top-2 right-2 h-2 w-2 rounded-full bg-primary" />
                        )}
                    </button>

                    {/* Light Theme Card */}
                    <button
                        onClick={() => setTheme("light")}
                        className={`relative flex flex-col items-center gap-3 p-6 rounded-xl border-2 transition-all duration-200 cursor-pointer hover:scale-[1.02] ${theme === "light"
                            ? "border-primary bg-primary/5 shadow-lg shadow-primary/10"
                            : "border-border hover:border-muted-foreground/30"
                            }`}
                    >
                        <div className="w-full aspect-[4/3] rounded-lg bg-gray-100 border border-gray-200 p-2 flex flex-col gap-1">
                            <div className="h-1.5 w-8 rounded bg-gray-300" />
                            <div className="h-1.5 w-12 rounded bg-gray-200" />
                            <div className="flex-1 rounded bg-white mt-1 border border-gray-200" />
                        </div>
                        <div className="flex items-center gap-2">
                            <Sun className="h-4 w-4" />
                            <span className="text-sm font-medium">Light</span>
                        </div>
                        {theme === "light" && (
                            <div className="absolute top-2 right-2 h-2 w-2 rounded-full bg-primary" />
                        )}
                    </button>
                </div>
                <p className="text-xs text-muted-foreground mt-3">Your preference is saved automatically.</p>
            </SectionAccordion>

            {/* Service Management Section */}
            <SectionAccordion
                title="Service Management"
                description="Define services and resource allocation."
                icon={<Briefcase className="h-6 w-6 text-yellow-500" />}
                iconBg="bg-yellow-500/10"
                isOpen={!!openSections.services}
                onToggle={() => toggleSection('services')}
            >
                <div className="flex justify-end mb-4">
                    <Button onClick={(e) => { e.stopPropagation(); handleOpenDialog(); }} className="bg-primary text-primary-foreground hover:bg-primary/90">
                        <Plus className="mr-2 h-4 w-4" /> Add Service
                    </Button>
                </div>

                {loading ? (
                    <div className="flex items-center justify-center py-12">
                        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                    </div>
                ) : (
                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                        {services.map(service => (
                            <div key={service.id} className="border rounded-lg p-4 bg-background/50 hover:bg-background/80 transition-all border-border hover:border-primary/50 group relative">
                                <div className="flex justify-between items-start mb-3">
                                    <div className="flex items-center gap-2 font-semibold">
                                        {service.name}
                                    </div>
                                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleOpenDialog(service)}>
                                            <Edit2 className="h-3 w-3" />
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-7 w-7 text-red-500 hover:text-red-600 hover:bg-red-50"
                                            onClick={() => setDeleteTarget({ id: service.id, name: service.name })}
                                        >
                                            <Trash2 className="h-3 w-3" />
                                        </Button>
                                    </div>
                                </div>

                                <div className="text-sm text-muted-foreground mb-4 flex items-center">
                                    <Users className="mr-1.5 h-3.5 w-3.5" />
                                    {totalEmployees(service.jobs)} Employees
                                </div>

                                <div className="space-y-2">
                                    {service.jobs.length > 0 ? service.jobs.map((job, idx) => (
                                        <div key={idx} className="flex justify-between items-center text-xs bg-muted/50 p-1.5 rounded">
                                            <span>{job.title}</span>
                                            <span className="font-mono bg-yellow-500/10 text-yellow-600 px-1.5 rounded">{job.count}</span>
                                        </div>
                                    )) : (
                                        <div className="text-xs text-muted-foreground italic">No roles defined</div>
                                    )}
                                </div>
                            </div>
                        ))}

                        {services.length === 0 && (
                            <div className="col-span-full text-center py-8 text-muted-foreground text-sm">
                                No services found.
                            </div>
                        )}
                    </div>
                )}
            </SectionAccordion>

            {/* Permission Management Section */}
            <SectionAccordion
                title="Permission Management"
                description="Configure user access and roles."
                icon={<Shield className="h-6 w-6 text-purple-500" />}
                iconBg="bg-purple-500/10"
                isOpen={!!openSections.permissions}
                onToggle={() => toggleSection('permissions')}
            >
                <PermissionSettings />
            </SectionAccordion>

            {/* Security Section (separated from General) */}
            <SectionAccordion
                title="Security"
                description="Manage passwords and account security."
                icon={<Lock className="h-6 w-6 text-red-500" />}
                iconBg="bg-red-500/10"
                isOpen={!!openSections.security}
                onToggle={() => toggleSection('security')}
            >
                <SecuritySettings />
            </SectionAccordion>

            {/* General Settings Section */}
            <SectionAccordion
                title="General Settings"
                description="Agency branding and system configuration."
                icon={<Settings className="h-6 w-6 text-muted-foreground" />}
                iconBg="bg-gray-500/10"
                isOpen={!!openSections.general}
                onToggle={() => toggleSection('general')}
            >
                <div className="space-y-6">
                    <AgencySettings
                        initialSettings={agencySettings}
                        loading={agencySettingsLoading}
                        onSaved={loadAgencySettings}
                    />
                    <EmailSettings
                        initialEnabled={agencySettings?.emailNotificationsEnabled ?? true}
                        loading={agencySettingsLoading}
                    />
                </div>
            </SectionAccordion>

            {/* Admin Tools Section */}
            <SectionAccordion
                title="Admin Tools"
                description="Utilities and bulk operations."
                icon={<Settings className="h-6 w-6 text-cyan-500" />}
                iconBg="bg-cyan-500/10"
                isOpen={!!openSections.tools}
                onToggle={() => toggleSection('tools')}
            >
                <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 rounded-lg border border-border bg-muted/30">
                        <div>
                            <h4 className="font-medium text-foreground">Bulk Estimate Task Hours</h4>
                            <p className="text-sm text-muted-foreground mt-0.5">
                                Automatically estimate hours for all tasks that don't have hours set, using smart heuristics based on task title, description, priority, and subtasks.
                            </p>
                        </div>
                        <Button
                            variant="outline"
                            className="shrink-0 ml-4 border-cyan-500/30 text-cyan-500 hover:bg-cyan-500/10"
                            disabled={submitting}
                            onClick={async () => {
                                setSubmitting(true);
                                try {
                                    // Assuming bulkEstimateTaskHours is imported or defined elsewhere
                                    const result = await bulkEstimateTaskHours();
                                    toast.success(result.message);
                                } catch (e: any) {
                                    toast.error(e.message || 'Failed to estimate hours');
                                } finally {
                                    setSubmitting(false);
                                }
                            }}
                        >
                            {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Clock className="h-4 w-4 mr-2" />}
                            Estimate Hours
                        </Button>
                    </div>
                </div>
            </SectionAccordion>

            {/* Delete Confirmation Dialog */}
            <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete Service</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to delete <strong>"{deleteTarget?.name}"</strong>? This action cannot be undone.
                            All job roles under this service will be removed.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleConfirmDelete}
                            className="bg-red-600 hover:bg-red-700 text-white"
                        >
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Add/Edit Service Dialog */}
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                        <DialogTitle>{editingService ? "Edit Service" : "Add New Service"}</DialogTitle>
                        <DialogDescription>
                            Configure the service and its resource requirements.
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleSubmit} className="space-y-6 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="name">Service Name</Label>
                            <Input
                                id="name"
                                value={name}
                                onChange={e => setName(e.target.value)}
                                placeholder="e.g. Web Development"
                                required
                            />
                        </div>

                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <Label>Job Roles & Headcount</Label>
                                <Button type="button" variant="outline" size="sm" onClick={handleAddJob} className="h-7 text-xs">
                                    <Plus className="mr-1 h-3 w-3" /> Add Role
                                </Button>
                            </div>

                            <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
                                {jobs.map((job, index) => (
                                    <div key={index} className="flex gap-2 items-start">
                                        <div className="flex-1 space-y-1">
                                            <Input
                                                placeholder="Job Title"
                                                value={job.title}
                                                onChange={e => handleJobChange(index, "title", e.target.value)}
                                                className="h-9"
                                            />
                                        </div>
                                        <div className="w-20 space-y-1">
                                            <Input
                                                type="number"
                                                min="0"
                                                placeholder="Qty"
                                                value={job.count}
                                                onChange={e => handleJobChange(index, "count", parseInt(e.target.value) || 0)}
                                                className="h-9"
                                            />
                                        </div>
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon"
                                            className="h-9 w-9 text-muted-foreground hover:text-red-500"
                                            onClick={() => handleRemoveJob(index)}
                                        >
                                            <X className="h-4 w-4" />
                                        </Button>
                                    </div>
                                ))}
                                {jobs.length === 0 && (
                                    <p className="text-sm text-muted-foreground text-center py-2">No roles added yet.</p>
                                )}
                            </div>
                        </div>

                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                            <Button type="submit" disabled={submitting} className="bg-primary text-primary-foreground hover:bg-primary/90">
                                {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                {editingService ? "Save Changes" : "Create Service"}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
}

// Reusable collapsible section component
function SectionAccordion({
    title, description, icon, iconBg, isOpen, onToggle, children
}: {
    title: string;
    description: string;
    icon: React.ReactNode;
    iconBg: string;
    isOpen: boolean;
    onToggle: () => void;
    children: React.ReactNode;
}) {
    return (
        <div className="border rounded-lg bg-card text-card-foreground shadow-sm">
            <div
                onClick={onToggle}
                className="flex flex-row items-center justify-between p-6 cursor-pointer hover:bg-accent/50 transition-colors"
            >
                <div className="flex items-center gap-4">
                    <div className={`p-2 ${iconBg} rounded-full`}>
                        {icon}
                    </div>
                    <div>
                        <h2 className="text-lg font-semibold">{title}</h2>
                        <p className="text-sm text-muted-foreground">{description}</p>
                    </div>
                </div>
                {isOpen ? <ChevronDown className="h-5 w-5 text-muted-foreground" /> : <ChevronRight className="h-5 w-5 text-muted-foreground" />}
            </div>

            <div className={`grid transition-[grid-template-rows] duration-300 ease-in-out ${isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}>
                <div className="overflow-hidden">
                    <div className="p-6 pt-0">
                        {children}
                    </div>
                </div>
            </div>
        </div>
    );
}

"use client";

import { useState, useEffect, useCallback } from "react";
import { getServices, addService, deleteService, updateService, getAgencySettings, getCurrentUser, getProjects, getUsers } from "@/lib/actions";
import { useRouter } from "next/navigation";
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
    Sun, Moon, X, Lock, Bot, FolderOpen, Check
} from "lucide-react";
import { toast } from "sonner";
import PermissionSettings from "@/components/settings/PermissionSettings";
import { SecuritySettings } from "@/components/settings/SecuritySettings";
import { AgencySettings } from "@/components/settings/AgencySettings";
import { EmailSettings } from "@/components/settings/EmailSettings";
import { useTheme } from "@/components/providers/ThemeProvider";
import { AISettings } from "@/components/settings/AISettings";

type Job = { title: string; employees: string[] };
type Service = { id: string; name: string; projectId?: string; jobs: Job[] };
type ProjectItem = { id: string; name: string; slug?: string };
type UserItem = { id: string; name: string; role?: string; jobTitle?: string };

type AgencySettingsData = {
    name: string;
    logo: string;
    primaryColor?: string;
    secondaryColor?: string;
    emailNotificationsEnabled: boolean;
    emailCategories?: Record<string, any>;
};

export default function SettingsPage() {
    const router = useRouter();
    const [authorized, setAuthorized] = useState(false);
    const [services, setServices] = useState<Service[]>([]);
    const [projects, setProjects] = useState<ProjectItem[]>([]);
    const [users, setUsers] = useState<UserItem[]>([]);
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
    const [projectId, setProjectId] = useState("");
    const [jobs, setJobs] = useState<Job[]>([]);
    const [submitting, setSubmitting] = useState(false);
    const [employeeDropdownOpen, setEmployeeDropdownOpen] = useState<number | null>(null);

    const toggleSection = useCallback((key: string) => {
        setOpenSections(prev => {
            const newState = { ...prev, [key]: !prev[key] };
            // Defer URL update to avoid side effects inside setState updater
            // (calling history.replaceState during render triggers React Router re-render)
            queueMicrotask(() => {
                const url = new URL(window.location.href);
                const openKeys = Object.entries(newState).filter(([, v]) => v).map(([k]) => k);
                if (openKeys.length === 1) {
                    url.searchParams.set('section', openKeys[0]);
                } else {
                    url.searchParams.delete('section');
                }
                window.history.replaceState({}, '', url.pathname + url.search);
            });
            return newState;
        });
    }, []);

    const loadServices = useCallback(async () => {
        try {
            const [servicesData, projectsData, usersData] = await Promise.all([
                getServices(),
                getProjects(),
                getUsers(),
            ]);
            setServices(servicesData || []);
            setProjects((projectsData || []).map((p: any) => ({ id: p.id, name: p.name, slug: p.slug })));
            setUsers((usersData || []).map((u: any) => ({ id: u.id, name: u.name, role: u.role, jobTitle: u.jobTitle })));
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
                emailNotificationsEnabled: settings.emailNotificationsEnabled ?? true,
                emailCategories: settings.emailCategories || {}
            } : null);
        } catch (error) {
            console.error("Failed to load agency settings", error);
            toast.error("Failed to load agency settings");
        } finally {
            setAgencySettingsLoading(false);
        }
    }, []);

    // C6 fix: Role guard — only admin/manager can access settings
    useEffect(() => {
        getCurrentUser().then(user => {
            if (!user || (user.role !== 'admin' && user.role !== 'manager')) {
                router.replace('/dashboard');
            } else {
                setAuthorized(true);
            }
        });
    }, [router]);

    useEffect(() => {
        if (!authorized) return;
        loadServices();
        loadAgencySettings();
    }, [authorized, loadServices, loadAgencySettings]);

    const handleOpenDialog = (service?: Service) => {
        if (service) {
            setEditingService(service);
            setName(service.name);
            setProjectId(service.projectId || "");
            setJobs([...service.jobs]);
        } else {
            setEditingService(null);
            setName("");
            setProjectId("");
            setJobs([{ title: "", employees: [] }]);
        }
        setEmployeeDropdownOpen(null);
        setIsDialogOpen(true);
    };

    const handleAddJob = () => {
        setJobs([...jobs, { title: "", employees: [] }]);
    };

    const handleRemoveJob = (index: number) => {
        setJobs(jobs.filter((_, i) => i !== index));
    };

    const handleJobChange = (index: number, field: keyof Job, value: string | string[]) => {
        const newJobs = [...jobs];
        newJobs[index] = { ...newJobs[index], [field]: value };
        setJobs(newJobs);
    };

    const toggleEmployee = (jobIndex: number, userId: string) => {
        const currentEmployees = [...(jobs[jobIndex].employees || [])];
        const idx = currentEmployees.indexOf(userId);
        if (idx >= 0) {
            currentEmployees.splice(idx, 1);
        } else {
            currentEmployees.push(userId);
        }
        handleJobChange(jobIndex, 'employees', currentEmployees);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) return;
        if (!projectId) {
            toast.error("Please select a project");
            return;
        }

        setSubmitting(true);
        const validJobs = jobs.filter(j => j.title.trim() !== "");
        const previousServices = [...services]; // For revert

        try {
            if (editingService) {
                // Optimistic update
                setServices(prev => prev.map(s => s.id === editingService.id ? { ...s, name, projectId, jobs: validJobs } : s));
                await updateService(editingService.id, name, projectId, validJobs);
                toast.success("Service updated");
            } else {
                await addService(name, projectId, validJobs);
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

    const totalEmployees = (serviceJobs: Job[]) => {
        const uniqueIds = new Set<string>();
        for (const j of serviceJobs) {
            for (const e of (j.employees || [])) uniqueIds.add(e);
        }
        return uniqueIds.size;
    };

    const getProjectName = (pid?: string) => {
        if (!pid) return "No project";
        return projects.find(p => p.id === pid)?.name || "Unknown project";
    };

    const getUserName = (uid: string) => {
        return users.find(u => u.id === uid)?.name || uid;
    };

    // Block render until role is verified
    if (!authorized) return null;

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
                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 animate-pulse">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="border border-border rounded-lg p-4 space-y-3">
                                <div className="h-5 w-32 bg-muted rounded" />
                                <div className="h-3 w-20 bg-muted/60 rounded" />
                                <div className="space-y-2">
                                    <div className="h-7 w-full bg-muted/40 rounded" />
                                    <div className="h-7 w-full bg-muted/40 rounded" />
                                </div>
                            </div>
                        ))}
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

                                <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground mb-3">
                                    <span className="flex items-center gap-1 bg-primary/10 text-primary px-2 py-0.5 rounded text-xs font-medium">
                                        <FolderOpen className="h-3 w-3" />
                                        {getProjectName(service.projectId)}
                                    </span>
                                    <span className="flex items-center gap-1">
                                        <Users className="h-3.5 w-3.5" />
                                        {totalEmployees(service.jobs)} Employee{totalEmployees(service.jobs) !== 1 ? 's' : ''}
                                    </span>
                                </div>

                                <div className="space-y-2">
                                    {service.jobs.length > 0 ? service.jobs.map((job, idx) => (
                                        <div key={idx} className="text-xs bg-muted/50 p-2 rounded space-y-1">
                                            <div className="font-medium text-foreground">{job.title}</div>
                                            {(job.employees || []).length > 0 ? (
                                                <div className="flex flex-wrap gap-1">
                                                    {job.employees.map(empId => (
                                                        <span key={empId} className="bg-yellow-500/10 text-yellow-600 px-1.5 py-0.5 rounded text-[10px]">
                                                            {getUserName(empId)}
                                                        </span>
                                                    ))}
                                                </div>
                                            ) : (
                                                <span className="text-muted-foreground italic">No employees assigned</span>
                                            )}
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

            {/* AI Settings Section */}
            <SectionAccordion
                title="AI Settings"
                description="Control Singularity permissions and capabilities."
                icon={<Bot className="h-6 w-6 text-violet-500" />}
                iconBg="bg-violet-500/10"
                isOpen={!!openSections.ai}
                onToggle={() => toggleSection('ai')}
            >
                <AISettings />
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
                        initialCategories={agencySettings?.emailCategories}
                        loading={agencySettingsLoading}
                    />
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
                            <Label htmlFor="project">Project <span className="text-red-500">*</span></Label>
                            <select
                                id="project"
                                value={projectId}
                                onChange={e => setProjectId(e.target.value)}
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                required
                            >
                                <option value="">Select a project...</option>
                                {projects.map(p => (
                                    <option key={p.id} value={p.id}>{p.name}</option>
                                ))}
                            </select>
                        </div>

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
                                <Label>Job Roles & Employees</Label>
                                <Button type="button" variant="outline" size="sm" onClick={handleAddJob} className="h-7 text-xs">
                                    <Plus className="mr-1 h-3 w-3" /> Add Role
                                </Button>
                            </div>

                            <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
                                {jobs.map((job, index) => (
                                    <div key={index} className="border border-border rounded-lg p-3 space-y-2">
                                        <div className="flex gap-2 items-center">
                                            <Input
                                                placeholder="Job Title (e.g. Designer)"
                                                value={job.title}
                                                onChange={e => handleJobChange(index, "title", e.target.value)}
                                                className="h-9 flex-1"
                                            />
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="icon"
                                                className="h-9 w-9 text-muted-foreground hover:text-red-500 shrink-0"
                                                onClick={() => handleRemoveJob(index)}
                                            >
                                                <X className="h-4 w-4" />
                                            </Button>
                                        </div>
                                        {/* Employee multi-select dropdown */}
                                        <div className="relative">
                                            <button
                                                type="button"
                                                onClick={() => setEmployeeDropdownOpen(employeeDropdownOpen === index ? null : index)}
                                                className="flex items-center justify-between w-full h-9 px-3 rounded-md border border-input bg-background text-sm text-left hover:bg-accent/50 transition-colors"
                                            >
                                                <span className={job.employees.length > 0 ? "text-foreground" : "text-muted-foreground"}>
                                                    {job.employees.length > 0
                                                        ? `${job.employees.length} employee${job.employees.length > 1 ? 's' : ''} selected`
                                                        : "Select employees..."}
                                                </span>
                                                <ChevronDown className={`h-3.5 w-3.5 text-muted-foreground transition-transform ${employeeDropdownOpen === index ? 'rotate-180' : ''}`} />
                                            </button>
                                            {employeeDropdownOpen === index && (
                                                <>
                                                    <div className="fixed inset-0 z-[60]" onClick={() => setEmployeeDropdownOpen(null)} />
                                                    <div className="absolute top-full left-0 right-0 z-[70] mt-1 max-h-40 overflow-y-auto border border-border rounded-lg bg-popover shadow-lg">
                                                        {users.length > 0 ? users.map(user => {
                                                            const isSelected = job.employees.includes(user.id);
                                                            return (
                                                                <button
                                                                    key={user.id}
                                                                    type="button"
                                                                    onClick={() => toggleEmployee(index, user.id)}
                                                                    className={`w-full flex items-center gap-2 px-3 py-2 text-sm text-left hover:bg-accent/50 transition-colors ${isSelected ? 'bg-primary/5' : ''}`}
                                                                >
                                                                    <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${isSelected ? 'bg-primary border-primary' : 'border-input'}`}>
                                                                        {isSelected && <Check className="w-3 h-3 text-primary-foreground" />}
                                                                    </div>
                                                                    <div className="flex-1 min-w-0">
                                                                        <span className="font-medium">{user.name}</span>
                                                                        {user.jobTitle && <span className="text-muted-foreground ml-1">• {user.jobTitle}</span>}
                                                                    </div>
                                                                </button>
                                                            );
                                                        }) : (
                                                            <div className="px-3 py-2 text-sm text-muted-foreground">No employees found</div>
                                                        )}
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                        {/* Show selected employee chips */}
                                        {job.employees.length > 0 && (
                                            <div className="flex flex-wrap gap-1">
                                                {job.employees.map(empId => (
                                                    <span
                                                        key={empId}
                                                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs"
                                                    >
                                                        {getUserName(empId)}
                                                        <button type="button" onClick={() => toggleEmployee(index, empId)} className="hover:text-red-500">
                                                            <X className="h-3 w-3" />
                                                        </button>
                                                    </span>
                                                ))}
                                            </div>
                                        )}
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

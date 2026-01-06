"use client";

import { useState, useEffect } from "react";
import { getServices, addService, deleteService, updateService, getUser, getUsers, updateUser } from "@/lib/actions";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Loader2, Plus, Trash2, Edit2, Users, Briefcase, ChevronDown, ChevronRight, Settings, Shield } from "lucide-react";
import { X } from "lucide-react";
import PermissionSettings from "@/components/settings/PermissionSettings";

type Job = { title: string; count: number };
type Service = { id: string; name: string; jobs: Job[] };

export default function SettingsPage() {
    const [services, setServices] = useState<Service[]>([]);
    const [loading, setLoading] = useState(true);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingService, setEditingService] = useState<Service | null>(null);

    // Section Visibility State
    const [isServicesOpen, setIsServicesOpen] = useState(false);
    const [isGeneralOpen, setIsGeneralOpen] = useState(false);
    const [isPermissionsOpen, setIsPermissionsOpen] = useState(false);

    // Form State
    const [name, setName] = useState("");
    const [jobs, setJobs] = useState<Job[]>([]);
    const [submitting, setSubmitting] = useState(false);

    // Password State
    const [currentUser, setCurrentUser] = useState<any>(null);
    const [passwords, setPasswords] = useState({ current: "", new: "", confirm: "" });
    const [passSubmitting, setPassSubmitting] = useState(false);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        const [servicesData, usersData] = await Promise.all([getServices(), getUsers()]);
        setServices(servicesData || []);
        // Mock current user as first user for now
        if (usersData && usersData.length > 0) {
            setCurrentUser(usersData[0]);
        }
        setLoading(false);
    };

    const handlePasswordChange = async (e: React.FormEvent) => {
        e.preventDefault();
        if (passwords.new !== passwords.confirm) {
            alert("New passwords do not match");
            return;
        }
        if (!currentUser) return;

        setPassSubmitting(true);
        try {
            await updateUser(currentUser.id, { password: passwords.new }, passwords.current);
            setPasswords({ current: "", new: "", confirm: "" });
            alert("Password updated successfully");
        } catch (error: any) {
            alert(error.message);
        } finally {
            setPassSubmitting(false);
        }
    };

    const handleOpenDialog = (service?: Service) => {
        if (service) {
            setEditingService(service);
            setName(service.name);
            setJobs([...service.jobs]); // Clone
        } else {
            setEditingService(null);
            setName("");
            setJobs([{ title: "", count: 1 }]); // Default one empty job
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
        // Filter out empty jobs
        const validJobs = jobs.filter(j => j.title.trim() !== "");

        try {
            if (editingService) {
                // Optimistic Update
                setServices(prev => prev.map(s => s.id === editingService.id ? { ...s, name, jobs: validJobs } : s));
                await updateService(editingService.id, name, validJobs);
            } else {
                // For add, we need to wait for ID or just reload. Let's wait/reload for simplicity.
                await addService(name, validJobs);
            }
            setIsDialogOpen(false);
            loadData();
        } catch (error) {
            console.error(error);
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Are you sure you want to delete this service?")) return;
        setServices(prev => prev.filter(c => c.id !== id)); // Optimistic
        await deleteService(id);
        loadData();
    };

    const totalEmployees = (serviceJobs: Job[]) => serviceJobs.reduce((acc, curr) => acc + (Number(curr.count) || 0), 0);

    return (
        <div className="space-y-6 p-2">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
                <p className="text-muted-foreground">Manage your agency services and system configurations.</p>
            </div>

            {/* Service Management Section */}
            <div className="border rounded-lg bg-card text-card-foreground shadow-sm">
                <div
                    onClick={() => setIsServicesOpen(!isServicesOpen)}
                    className="flex flex-row items-center justify-between p-6 cursor-pointer hover:bg-accent/50 transition-colors"
                >
                    <div className="flex items-center gap-4">
                        <div className="p-2 bg-yellow-500/10 rounded-full">
                            <Briefcase className="h-6 w-6 text-yellow-500" />
                        </div>
                        <div>
                            <h2 className="text-lg font-semibold">Service Management</h2>
                            <p className="text-sm text-muted-foreground">Define services and resource allocation.</p>
                        </div>
                    </div>
                    {isServicesOpen ? <ChevronDown className="h-5 w-5 text-muted-foreground" /> : <ChevronRight className="h-5 w-5 text-muted-foreground" />}
                </div>

                <div className={`grid transition-[grid-template-rows] duration-300 ease-in-out ${isServicesOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}>
                    <div className="overflow-hidden">
                        <div className="p-6 pt-0">
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
                                        <div key={service.id} className="border rounded-lg p-4 bg-background/50 hover:bg-background/80 transition-all border-neutral-800 hover:border-yellow-500/50 group relative">
                                            <div className="flex justify-between items-start mb-3">
                                                <div className="flex items-center gap-2 font-semibold">
                                                    {service.name}
                                                </div>
                                                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleOpenDialog(service)}>
                                                        <Edit2 className="h-3 w-3" />
                                                    </Button>
                                                    <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500 hover:text-red-600 hover:bg-red-50" onClick={() => handleDelete(service.id)}>
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
                        </div>
                    </div>
                </div>
            </div>

            {/* Permission Management Section */}
            <div className="border rounded-lg bg-card text-card-foreground shadow-sm">
                <div
                    onClick={() => setIsPermissionsOpen(!isPermissionsOpen)}
                    className="flex flex-row items-center justify-between p-6 cursor-pointer hover:bg-accent/50 transition-colors"
                >
                    <div className="flex items-center gap-4">
                        <div className="p-2 bg-purple-500/10 rounded-full">
                            <Shield className="h-6 w-6 text-purple-500" />
                        </div>
                        <div>
                            <h2 className="text-lg font-semibold">Permission Management</h2>
                            <p className="text-sm text-muted-foreground">Configure user access and roles.</p>
                        </div>
                    </div>
                    {isPermissionsOpen ? <ChevronDown className="h-5 w-5 text-muted-foreground" /> : <ChevronRight className="h-5 w-5 text-muted-foreground" />}
                </div>

                <div className={`grid transition-[grid-template-rows] duration-300 ease-in-out ${isPermissionsOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}>
                    <div className="overflow-hidden">
                        <div className="p-6 pt-0">
                            <PermissionSettings />
                        </div>
                    </div>
                </div>
            </div>

            {/* General Settings Section */}
            <div className="border rounded-lg bg-card text-card-foreground shadow-sm">
                <div
                    onClick={() => setIsGeneralOpen(!isGeneralOpen)}
                    className="flex flex-row items-center justify-between p-6 cursor-pointer hover:bg-accent/50 transition-colors"
                >
                    <div className="flex items-center gap-4">
                        <div className="p-2 bg-gray-500/10 rounded-full">
                            <Settings className="h-6 w-6 text-gray-500" />
                        </div>
                        <div>
                            <h2 className="text-lg font-semibold">General Settings</h2>
                            <p className="text-sm text-muted-foreground">App-wide configuration.</p>
                        </div>
                    </div>
                    {isGeneralOpen ? <ChevronDown className="h-5 w-5 text-muted-foreground" /> : <ChevronRight className="h-5 w-5 text-muted-foreground" />}
                </div>

                <div className={`grid transition-[grid-template-rows] duration-300 ease-in-out ${isGeneralOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}>
                    <div className="overflow-hidden">
                        <div className="p-6 pt-0">
                            <div className="space-y-6">
                                <h3 className="text-lg font-medium">Change Password</h3>
                                <form onSubmit={handlePasswordChange} className="space-y-4 max-w-md">
                                    <div className="space-y-2">
                                        <Label htmlFor="current-password">Current Password</Label>
                                        <Input
                                            id="current-password"
                                            type="password"
                                            value={passwords.current}
                                            onChange={e => setPasswords({ ...passwords, current: e.target.value })}
                                            required
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="new-password">New Password</Label>
                                        <Input
                                            id="new-password"
                                            type="password"
                                            value={passwords.new}
                                            onChange={e => setPasswords({ ...passwords, new: e.target.value })}
                                            required
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="confirm-password">Confirm New Password</Label>
                                        <Input
                                            id="confirm-password"
                                            type="password"
                                            value={passwords.confirm}
                                            onChange={e => setPasswords({ ...passwords, confirm: e.target.value })}
                                            required
                                        />
                                    </div>
                                    <div className="flex justify-end pt-2">
                                        <Button type="submit" disabled={passSubmitting} className="bg-primary text-primary-foreground hover:bg-primary/90">
                                            {passSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                            Update Password
                                        </Button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Add/Edit Dialog */}
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

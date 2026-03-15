"use client";

import { useState, useCallback, useEffect } from "react";
import { addService, deleteService, updateService, getProjectServices } from "@/lib/actions";
import { User } from "@/lib/types";
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
import { Plus, Trash2, Edit2, Users, Loader2, X, ChevronDown, Check } from "lucide-react";
import { toast } from "sonner";

type ServiceItem = {
    id: string;
    name: string;
    projectId?: string;
    employees?: string[];
};

type Props = {
    projectId: string;
    users: User[];
};

export function ProjectServices({ projectId, users }: Props) {
    const [services, setServices] = useState<ServiceItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editing, setEditing] = useState<ServiceItem | null>(null);
    const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);

    // Form state
    const [name, setName] = useState("");
    const [selectedEmployees, setSelectedEmployees] = useState<string[]>([]);
    const [submitting, setSubmitting] = useState(false);
    const [dropdownOpen, setDropdownOpen] = useState(false);

    const loadServices = useCallback(async () => {
        try {
            const data = await getProjectServices(projectId);
            setServices((data || []).map((s: any) => ({
                id: s.id,
                name: s.name,
                projectId: s.projectId,
                employees: Array.isArray(s.employees) ? s.employees : [],
            })));
        } catch (err) {
            console.error("Failed to load services", err);
            toast.error("Failed to load services");
        } finally {
            setLoading(false);
        }
    }, [projectId]);

    useEffect(() => {
        loadServices();
    }, [loadServices]);

    const handleOpenDialog = (service?: ServiceItem) => {
        if (service) {
            setEditing(service);
            setName(service.name);
            setSelectedEmployees([...(service.employees || [])]);
        } else {
            setEditing(null);
            setName("");
            setSelectedEmployees([]);
        }
        setDropdownOpen(false);
        setIsDialogOpen(true);
    };

    const toggleEmployee = (userId: string) => {
        setSelectedEmployees(prev => {
            const idx = prev.indexOf(userId);
            if (idx >= 0) return prev.filter(id => id !== userId);
            return [...prev, userId];
        });
    };

    const getUserName = (uid: string) => {
        return users.find(u => u.id === uid)?.name || uid;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) return;

        setSubmitting(true);
        try {
            if (editing) {
                await updateService(editing.id, name.trim(), projectId, selectedEmployees);
                toast.success("Service updated");
            } else {
                await addService(name.trim(), projectId, selectedEmployees);
                toast.success("Service created");
            }
            setIsDialogOpen(false);
            loadServices();
        } catch (error: any) {
            toast.error(error?.message || "Failed to save service");
        } finally {
            setSubmitting(false);
        }
    };

    const handleConfirmDelete = async () => {
        if (!deleteTarget) return;
        try {
            await deleteService(deleteTarget.id);
            toast.success(`"${deleteTarget.name}" deleted`);
            loadServices();
        } catch (error: any) {
            toast.error(error?.message || "Failed to delete service");
        } finally {
            setDeleteTarget(null);
        }
    };

    // Only show non-client users in the employee dropdown
    const employeeUsers = users.filter(u => u.role !== 'client');

    if (loading) {
        return (
            <div className="space-y-4 p-1">
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 animate-pulse">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="border border-border rounded-lg p-4 space-y-3">
                            <div className="h-5 w-32 bg-muted rounded" />
                            <div className="h-3 w-20 bg-muted/60 rounded" />
                            <div className="h-7 w-full bg-muted/40 rounded" />
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-4 p-1">
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Services</h3>
                </div>
                <Button onClick={() => handleOpenDialog()} size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90">
                    <Plus className="mr-1.5 h-3.5 w-3.5" /> Add Service
                </Button>
            </div>

            {/* Service Cards */}
            {services.length > 0 ? (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {services.map(service => (
                        <div key={service.id} className="border rounded-lg p-4 bg-background/50 hover:bg-background/80 transition-all border-border hover:border-primary/50 group relative">
                            <div className="flex justify-between items-start mb-3">
                                <div className="font-semibold text-sm">{service.name}</div>
                                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleOpenDialog(service)}>
                                        <Edit2 className="h-3 w-3" />
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-7 w-7 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                                        onClick={() => setDeleteTarget({ id: service.id, name: service.name })}
                                    >
                                        <Trash2 className="h-3 w-3" />
                                    </Button>
                                </div>
                            </div>

                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-3">
                                <Users className="h-3.5 w-3.5" />
                                {(service.employees || []).length} Employee{(service.employees || []).length !== 1 ? 's' : ''}
                            </div>

                            {(service.employees || []).length > 0 ? (
                                <div className="flex flex-wrap gap-1">
                                    {(service.employees || []).map(empId => (
                                        <span key={empId} className="bg-primary/10 text-primary px-2 py-0.5 rounded-full text-[11px] font-medium">
                                            {getUserName(empId)}
                                        </span>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-xs text-muted-foreground italic">No employees assigned</div>
                            )}
                        </div>
                    ))}
                </div>
            ) : (
                <div className="text-center py-12 text-muted-foreground text-sm border border-dashed border-border rounded-lg">
                    <Users className="h-8 w-8 mx-auto mb-2 opacity-30" />
                    No services added yet. Click "Add Service" to get started.
                </div>
            )}

            {/* Delete Confirmation */}
            <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete Service</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to delete <strong>&quot;{deleteTarget?.name}&quot;</strong>? This action cannot be undone.
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
                <DialogContent className="sm:max-w-[480px]">
                    <DialogHeader>
                        <DialogTitle>{editing ? "Edit Service" : "Add New Service"}</DialogTitle>
                        <DialogDescription>
                            {editing ? "Update the service name and assigned employees." : "Create a new service and assign employees."}
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleSubmit} className="space-y-5 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="svc-name">Service Name <span className="text-red-500">*</span></Label>
                            <Input
                                id="svc-name"
                                value={name}
                                onChange={e => setName(e.target.value)}
                                placeholder="e.g. UI/UX Design, Web Development"
                                required
                                autoFocus
                            />
                        </div>

                        {/* Employee multi-select */}
                        <div className="space-y-2">
                            <Label>Assign Employees</Label>
                            <div className="relative">
                                <button
                                    type="button"
                                    onClick={() => setDropdownOpen(!dropdownOpen)}
                                    className="flex items-center justify-between w-full h-10 px-3 rounded-md border border-input bg-background text-sm text-left hover:bg-accent/50 transition-colors"
                                >
                                    <span className={selectedEmployees.length > 0 ? "text-foreground" : "text-muted-foreground"}>
                                        {selectedEmployees.length > 0
                                            ? `${selectedEmployees.length} employee${selectedEmployees.length > 1 ? 's' : ''} selected`
                                            : "Select employees..."}
                                    </span>
                                    <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
                                </button>
                                {dropdownOpen && (
                                    <>
                                        <div className="fixed inset-0 z-[60]" onClick={() => setDropdownOpen(false)} />
                                        <div className="absolute top-full left-0 right-0 z-[70] mt-1 max-h-48 overflow-y-auto border border-border rounded-lg bg-popover shadow-lg">
                                            {employeeUsers.length > 0 ? employeeUsers.map(user => {
                                                const isSelected = selectedEmployees.includes(user.id);
                                                return (
                                                    <button
                                                        key={user.id}
                                                        type="button"
                                                        onClick={() => toggleEmployee(user.id)}
                                                        className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-left hover:bg-accent/50 transition-colors ${isSelected ? 'bg-primary/5' : ''}`}
                                                    >
                                                        <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${isSelected ? 'bg-primary border-primary' : 'border-input'}`}>
                                                            {isSelected && <Check className="w-3 h-3 text-primary-foreground" />}
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <span className="font-medium">{user.name}</span>
                                                            {user.jobTitle && <span className="text-muted-foreground ml-1.5 text-xs">• {user.jobTitle}</span>}
                                                        </div>
                                                    </button>
                                                );
                                            }) : (
                                                <div className="px-3 py-3 text-sm text-muted-foreground">No team members found</div>
                                            )}
                                        </div>
                                    </>
                                )}
                            </div>

                            {/* Selected employee chips */}
                            {selectedEmployees.length > 0 && (
                                <div className="flex flex-wrap gap-1.5 pt-1">
                                    {selectedEmployees.map(empId => (
                                        <span
                                            key={empId}
                                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-medium"
                                        >
                                            {getUserName(empId)}
                                            <button type="button" onClick={() => toggleEmployee(empId)} className="hover:text-red-500 transition-colors">
                                                <X className="h-3 w-3" />
                                            </button>
                                        </span>
                                    ))}
                                </div>
                            )}
                        </div>

                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                            <Button type="submit" disabled={submitting} className="bg-primary text-primary-foreground hover:bg-primary/90">
                                {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                {editing ? "Save Changes" : "Create Service"}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
}

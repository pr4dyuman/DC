"use client";

import { useState, useCallback, useEffect } from "react";
import { addService, deleteService, updateService, getProjectServices, getServiceTaskCount, getUsers } from "@/lib/actions";
import { User } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Plus, Users } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { ProjectServiceCard } from "./ProjectServiceCard";
import { ProjectServiceDeleteDialog } from "./ProjectServiceDeleteDialog";
import { ProjectServiceFormDialog } from "./ProjectServiceFormDialog";
import type { ServiceDirectoryUser, ServiceItem } from "./project-services-shared";

type Props = {
    projectId: string;
    users: User[];
};

export function ProjectServices({ projectId, users }: Props) {
    const router = useRouter();
    const [services, setServices] = useState<ServiceItem[]>([]);
    const [directoryUsers, setDirectoryUsers] = useState<ServiceDirectoryUser[]>(users.filter((user) => user.role !== "client"));
    const [loading, setLoading] = useState(true);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editing, setEditing] = useState<ServiceItem | null>(null);
    const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string; taskCount: number } | null>(null);
    const [checkingDelete, setCheckingDelete] = useState(false);

    const [name, setName] = useState("");
    const [selectedEmployees, setSelectedEmployees] = useState<string[]>([]);
    const [submitting, setSubmitting] = useState(false);
    const [dropdownOpen, setDropdownOpen] = useState(false);

    const getErrorMessage = useCallback((error: unknown, fallback: string) => {
        return error instanceof Error ? error.message : fallback;
    }, []);

    const loadServices = useCallback(async () => {
        try {
            const data = await getProjectServices(projectId);
            setServices((data || []).map((service) => ({
                id: service.id,
                name: service.name,
                projectId: service.projectId,
                employees: Array.isArray(service.employees) ? service.employees : [],
            })));
        } catch (error) {
            console.error("Failed to load services", error);
            toast.error("Failed to load services");
        } finally {
            setLoading(false);
        }
    }, [projectId]);

    useEffect(() => {
        void loadServices();
    }, [loadServices]);

    useEffect(() => {
        setDirectoryUsers(users.filter((user) => user.role !== "client"));
    }, [users]);

    useEffect(() => {
        if (!isDialogOpen) return;

        let cancelled = false;
        getUsers()
            .then((loadedUsers) => {
                if (!cancelled) {
                    setDirectoryUsers(loadedUsers.filter((user) => user.role !== "client"));
                }
            })
            .catch((error) => {
                console.error("Failed to load assignable users", error);
                toast.error("Failed to load team members");
            });

        return () => {
            cancelled = true;
        };
    }, [isDialogOpen]);

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
        setSelectedEmployees((previous) => {
            const index = previous.indexOf(userId);
            if (index >= 0) return previous.filter((id) => id !== userId);
            return [...previous, userId];
        });
    };

    const getUserName = (userId: string) => {
        return directoryUsers.find((user) => user.id === userId)?.name ||
            users.find((user) => user.id === userId)?.name ||
            userId;
    };

    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault();
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
            await loadServices();
            router.refresh();
        } catch (error: unknown) {
            toast.error(getErrorMessage(error, "Failed to save service"));
        } finally {
            setSubmitting(false);
        }
    };

    const handleDeleteClick = async (service: ServiceItem) => {
        setCheckingDelete(true);
        try {
            const count = await getServiceTaskCount(projectId, service.name);
            setDeleteTarget({ id: service.id, name: service.name, taskCount: count });
        } catch {
            toast.error("Failed to check service usage");
        } finally {
            setCheckingDelete(false);
        }
    };

    const handleConfirmDelete = async () => {
        if (!deleteTarget || deleteTarget.taskCount > 0) return;
        try {
            await deleteService(deleteTarget.id);
            toast.success(`"${deleteTarget.name}" deleted`);
            await loadServices();
            router.refresh();
        } catch (error: unknown) {
            toast.error(getErrorMessage(error, "Failed to delete service"));
        } finally {
            setDeleteTarget(null);
        }
    };

    const employeeUsers = directoryUsers;

    if (loading) {
        return (
            <div className="space-y-4 p-1">
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 animate-pulse">
                    {[1, 2, 3].map((index) => (
                        <div key={index} className="border border-border rounded-lg p-4 space-y-3">
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

            {services.length > 0 ? (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {services.map((service) => (
                        <ProjectServiceCard
                            key={service.id}
                            service={service}
                            isCheckingDelete={checkingDelete}
                            getUserName={getUserName}
                            onEdit={handleOpenDialog}
                            onDelete={handleDeleteClick}
                        />
                    ))}
                </div>
            ) : (
                <div className="text-center py-12 text-muted-foreground text-sm border border-dashed border-border rounded-lg">
                    <Users className="h-8 w-8 mx-auto mb-2 opacity-30" />
                    No services added yet. Click Add Service to get started.
                </div>
            )}

            <ProjectServiceDeleteDialog
                deleteTarget={deleteTarget}
                onClose={() => setDeleteTarget(null)}
                onConfirm={handleConfirmDelete}
            />

            <ProjectServiceFormDialog
                open={isDialogOpen}
                editing={editing}
                name={name}
                selectedEmployees={selectedEmployees}
                employeeUsers={employeeUsers}
                dropdownOpen={dropdownOpen}
                submitting={submitting}
                onOpenChange={setIsDialogOpen}
                onNameChange={setName}
                onToggleEmployee={toggleEmployee}
                onDropdownToggle={() => setDropdownOpen((previous) => !previous)}
                onDropdownClose={() => setDropdownOpen(false)}
                onSubmit={handleSubmit}
                getUserName={getUserName}
            />
        </div>
    );
}

"use client";

import { useState, useEffect } from "react";
import { User } from "@/lib/db";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Loader2, Trash2, AlertTriangle } from "lucide-react";
import { createUser, updateUser, deleteUser, adminResetPassword, getServices } from "@/lib/actions";
import { useRouter } from "next/navigation";

interface EditUserDialogProps {
    user?: User | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess?: () => void;
    currentUserRole?: string;
}

export function EditUserDialog({ user, open, onOpenChange, onSuccess, currentUserRole }: EditUserDialogProps) {
    const router = useRouter();
    const [submitting, setSubmitting] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [deletePassword, setDeletePassword] = useState("");
    const [deleting, setDeleting] = useState(false);
    const [services, setServices] = useState<any[]>([]);
    const [loadingRoles, setLoadingRoles] = useState(false);

    const isAdmin = currentUserRole === 'admin';
    const isManager = currentUserRole === 'manager';
    const canManageFinances = isAdmin || isManager;

    const [formData, setFormData] = useState<Omit<User, "id">>({
        name: "",
        email: "",
        role: "employee",
        jobTitle: "",
        salary: 0,
        avatar: "",
        password: ""
    });

    useEffect(() => {
        if (open) {
            loadServices();
            if (user) {
                setFormData({
                    name: user.name,
                    email: user.email,
                    role: user.role,
                    jobTitle: user.jobTitle || "",
                    salary: user.salary || 0,
                    avatar: user.avatar || "",
                    password: "" // Don't show existing hash
                });
            } else {
                setFormData({
                    name: "",
                    email: "",
                    role: "employee",
                    jobTitle: "",
                    salary: 0,
                    avatar: "",
                    password: ""
                });
            }
            setShowDeleteConfirm(false);
            setDeletePassword("");
        }
    }, [user, open]);

    const loadServices = async () => {
        setLoadingRoles(true);
        try {
            const data = await getServices();
            setServices(data || []);
        } catch (error) {
            console.error("Failed to load services", error);
        } finally {
            setLoadingRoles(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            if (user) {
                // If password field is filled, we assume Admin Reset (no old password needed)
                if (formData.password) {
                    await adminResetPassword(user.id, formData.password);
                    // Remove password from formData for the general update to avoid "Old password required" error
                    const { password, ...updateData } = formData;
                    await updateUser(user.id, updateData);
                } else {
                    await updateUser(user.id, formData);
                }
            } else {
                await createUser(formData as any);
            }
            if (onSuccess) onSuccess();
            onOpenChange(false);
        } catch (error: any) {
            alert(error.message);
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async () => {
        if (!user) return;
        setDeleting(true);
        try {
            await deleteUser(user.id, deletePassword);
            if (window.location.pathname.includes(user.id)) {
                router.push('/dashboard/team');
            }

            if (onSuccess) onSuccess();
            onOpenChange(false);
        } catch (error: any) {
            alert(error.message);
        } finally {
            setDeleting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[600px] bg-card border-border">
                <DialogHeader>
                    <DialogTitle>{user ? 'Edit Profile' : 'Add New Member'}</DialogTitle>
                    <DialogDescription>
                        {user ? 'Update user details or manage account settings.' : 'Create a new account for a team member.'}
                    </DialogDescription>
                </DialogHeader>

                {!showDeleteConfirm ? (
                    <form onSubmit={handleSubmit} className="space-y-6 py-4">
                        <div className="flex flex-col md:flex-row gap-6">
                            {/* Avatar Section */}
                            <div className="flex flex-col items-center space-y-3">
                                <Avatar className="h-24 w-24 border-2 border-border shadow-md">
                                    <AvatarImage src={formData.avatar} />
                                    <AvatarFallback className="text-2xl bg-muted">
                                        {formData.name ? formData.name.substring(0, 2).toUpperCase() : "IMG"}
                                    </AvatarFallback>
                                </Avatar>
                                <div className="text-center">
                                    <label htmlFor="avatar-upload" className="cursor-pointer text-xs font-medium text-primary hover:text-primary/80 transition-colors">
                                        Change Photo
                                        <input
                                            id="avatar-upload"
                                            type="file"
                                            accept="image/*"
                                            className="hidden"
                                            onChange={(e) => {
                                                const file = e.target.files?.[0];
                                                if (file) {
                                                    const reader = new FileReader();
                                                    reader.onloadend = () => {
                                                        setFormData({ ...formData, avatar: reader.result as string });
                                                    };
                                                    reader.readAsDataURL(file);
                                                }
                                            }}
                                        />
                                    </label>
                                </div>
                            </div>

                            {/* Fields Section */}
                            <div className="flex-1 space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">Full Name</label>
                                        <input required value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })}
                                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:ring-2 focus:ring-primary/20" placeholder="John Doe" />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">Email</label>
                                        <input required type="email" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })}
                                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:ring-2 focus:ring-primary/20" placeholder="john@agency.com" />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">Role</label>
                                        <select
                                            value={formData.role}
                                            onChange={e => setFormData({ ...formData, role: e.target.value as any })}
                                            disabled={!isAdmin}
                                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:ring-2 focus:ring-primary/20 disabled:opacity-50 disabled:cursor-not-allowed">
                                            <option value="employee">Employee</option>
                                            <option value="manager">Manager</option>
                                            <option value="specialist">Specialist</option>
                                            <option value="admin">Admin</option>
                                        </select>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">Job Title</label>
                                        <div className="relative">
                                            <input
                                                list="job-titles"
                                                value={formData.jobTitle}
                                                onChange={e => setFormData({ ...formData, jobTitle: e.target.value })}
                                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:ring-2 focus:ring-primary/20"
                                                placeholder={loadingRoles ? "Loading roles..." : "Select or type role"}
                                            />
                                            <datalist id="job-titles">
                                                {services.map(service => (
                                                    service.jobs.map((job: any, idx: number) => (
                                                        <option key={`${service.id}-${idx}`} value={job.title}>{service.name} - {job.title}</option>
                                                    ))
                                                ))}
                                            </datalist>
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    {canManageFinances && (
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium">Salary (Monthly)</label>
                                            <input type="number" value={formData.salary} onChange={e => setFormData({ ...formData, salary: parseInt(e.target.value) || 0 })}
                                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:ring-2 focus:ring-primary/20" />
                                        </div>
                                    )}
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">Password</label>
                                        <input
                                            type="password"
                                            placeholder={user ? "Unchanged" : "New Password"}
                                            value={formData.password || ""}
                                            onChange={e => setFormData({ ...formData, password: e.target.value })}
                                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:ring-2 focus:ring-primary/20"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-between items-center pt-4 border-t border-border mt-4">
                            {user && isAdmin ? (
                                <button
                                    type="button"
                                    onClick={() => setShowDeleteConfirm(true)}
                                    className="flex items-center gap-2 text-sm font-medium text-red-500 hover:text-red-600 transition-colors"
                                >
                                    <Trash2 className="h-4 w-4" />
                                    Delete User
                                </button>
                            ) : <div></div>}

                            <div className="flex gap-2">
                                <button type="button" onClick={() => onOpenChange(false)} className="px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-muted rounded-md transition-colors">
                                    Cancel
                                </button>
                                <button disabled={submitting} type="submit" className="inline-flex items-center justify-center rounded-md text-sm font-medium bg-primary text-primary-foreground h-10 px-6 hover:bg-primary/90 transition-colors">
                                    {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : (user ? "Save Changes" : "Create Account")}
                                </button>
                            </div>
                        </div>
                    </form>
                ) : (
                    <div className="py-4 space-y-4">
                        <div className="flex items-center gap-3 p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-500">
                            <AlertTriangle className="h-5 w-5" />
                            <p className="text-sm font-medium">Warning: This action is permanent and cannot be undone.</p>
                        </div>

                        <div className="space-y-2">
                            <p className="text-sm text-muted-foreground">
                                Please enter the <strong className="text-foreground">Admin Password</strong> to confirm the deletion of <strong>{user?.name}</strong>.
                            </p>
                            <input
                                type="password"
                                placeholder="Admin Password"
                                value={deletePassword}
                                onChange={(e) => setDeletePassword(e.target.value)}
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-red-500"
                                autoFocus
                            />
                        </div>

                        <DialogFooter className="flex justify-end gap-2 pt-2">
                            <button
                                onClick={() => setShowDeleteConfirm(false)}
                                className="px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-muted rounded-md transition-colors"
                            >
                                Back
                            </button>
                            <button
                                onClick={handleDelete}
                                disabled={!deletePassword || deleting}
                                className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                            >
                                {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                                {deleting ? "Deleting..." : "Confirm Delete"}
                            </button>
                        </DialogFooter>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}

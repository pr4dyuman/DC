"use client";

import { useState, useEffect } from "react";
import { User } from "@/lib/types";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Loader2, Trash2, AlertTriangle } from "lucide-react";
import { createUser, updateUser, deleteUser, adminResetPassword, getServices, approveDocumentUpdate } from "@/lib/actions";
import { useRouter } from "next/navigation";
import { DocumentManager } from "./DocumentManager";

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
    const [showDocumentManager, setShowDocumentManager] = useState(false);

    const isAdmin = currentUserRole === 'admin';
    const isManager = currentUserRole === 'manager';
    const canManageFinances = isAdmin || isManager;

    const [formData, setFormData] = useState<Omit<User, "id">>({
        name: "",
        username: "",
        email: "",
        role: "employee",
        jobTitle: "",
        salary: 0,
        avatar: "",
        password: "",
        employmentType: "Salary" as 'Salary' | 'Project Based',
        contactNumber: "",
        adharCardImage: "",
        panCardImage: ""
    });

    useEffect(() => {
        if (open) {
            loadServices();
            if (user) {
                setFormData({
                    name: user.name,
                    username: user.username || "",
                    email: user.email,
                    role: user.role,
                    jobTitle: user.jobTitle || "",
                    salary: user.salary || 0,
                    avatar: user.avatar || "",

                    employmentType: user.employmentType || "Salary",
                    contactNumber: user.contactNumber || "",
                    adharCardImage: user.adharCardImage || "",
                    panCardImage: user.panCardImage || "",
                    password: "" // Don't show existing hash
                });
            } else {
                setFormData({
                    name: "",
                    username: "",
                    email: "",
                    role: "employee",
                    jobTitle: "",
                    salary: 0,
                    avatar: "",

                    employmentType: "Salary",
                    contactNumber: "",
                    adharCardImage: "",
                    panCardImage: "",
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

                // Redirect if username changed and we are likely on the profile page
                if (formData.username && user.username && formData.username !== user.username) {
                    const currentPath = window.location.pathname;
                    if (currentPath.includes(user.username) || currentPath.includes(user.id)) {
                        // We are viewing the profile, so redirect
                        router.push(`/dashboard/team/${formData.username}`);
                        router.refresh();
                        // Don't call onSuccess immediately to avoid stale data fetch, the redirect will handle it.
                        // But we should close dialog.
                        onOpenChange(false);
                        setSubmitting(false);
                        return;
                    }
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
        <>
            <Dialog open={open} onOpenChange={onOpenChange}>
                <DialogContent className="sm:max-w-[550px] bg-card border-border p-6">
                    <DialogHeader className="pr-10 pb-0 mb-4">
                        <DialogTitle>{user ? 'Edit Profile' : 'Add New Member'}</DialogTitle>
                        <DialogDescription>
                            {user ? 'Update details or manage settings.' : 'Create new account.'}
                        </DialogDescription>
                    </DialogHeader>

                    {!showDeleteConfirm ? (
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="flex flex-col md:flex-row gap-5">
                                {/* Avatar Section */}
                                <div className="flex flex-col items-center space-y-3 pt-1">
                                    <Avatar className="h-20 w-20 border-2 border-border shadow-sm">
                                        <AvatarImage src={formData.avatar} />
                                        <AvatarFallback className="text-xl bg-muted">
                                            {formData.name ? formData.name.substring(0, 2).toUpperCase() : "IMG"}
                                        </AvatarFallback>
                                    </Avatar>
                                    <label htmlFor="avatar-upload" className="cursor-pointer text-xs font-medium text-primary hover:text-primary/80 transition-colors bg-primary/10 px-3 py-1 rounded-md">
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

                                {/* Fields Section */}
                                <div className="flex-1 space-y-3">
                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="space-y-1.5">
                                            <label className="text-xs font-medium text-muted-foreground">Full Name</label>
                                            <input required value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })}
                                                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm focus:ring-1 focus:ring-primary" placeholder="John Doe" />
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-xs font-medium text-muted-foreground">Username</label>
                                            <input required value={formData.username} onChange={e => setFormData({ ...formData, username: e.target.value })}
                                                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm focus:ring-1 focus:ring-primary" placeholder="johndoe" />
                                        </div>
                                        <div className="col-span-2 space-y-1.5">
                                            <label className="text-xs font-medium text-muted-foreground">Email</label>
                                            <input required type="email" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })}
                                                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm focus:ring-1 focus:ring-primary" placeholder="john@agency.com" />
                                        </div>
                                    </div>

                                    {formData.role !== 'client' && (
                                        <div className="grid grid-cols-2 gap-3">
                                            <div className="space-y-1.5">
                                                <label className="text-xs font-medium text-muted-foreground">Role</label>
                                                <select
                                                    value={formData.role}
                                                    onChange={e => setFormData({ ...formData, role: e.target.value as any })}
                                                    disabled={!isAdmin}
                                                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm focus:ring-1 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed">
                                                    <option value="employee">Employee</option>
                                                    <option value="manager">Manager</option>
                                                    <option value="specialist">Specialist</option>
                                                    <option value="admin">Admin</option>
                                                </select>
                                            </div>
                                            <div className="space-y-1.5">
                                                <label className="text-xs font-medium text-muted-foreground">Job Title</label>
                                                <div className="relative">
                                                    <input
                                                        list="job-titles"
                                                        value={formData.jobTitle}
                                                        onChange={e => setFormData({ ...formData, jobTitle: e.target.value })}
                                                        disabled={!canManageFinances}
                                                        className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm focus:ring-1 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed"
                                                        placeholder={loadingRoles ? "Loading..." : "Select role"}
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
                                    )}

                                    <div className="grid grid-cols-2 gap-3">
                                        {formData.role !== 'client' && (
                                            <div className="space-y-1.5">
                                                <label className="text-xs font-medium text-muted-foreground">Employment</label>
                                                <select
                                                    value={formData.employmentType}
                                                    onChange={e => setFormData({ ...formData, employmentType: e.target.value as any })}
                                                    disabled={!canManageFinances}
                                                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm focus:ring-1 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed">
                                                    <option value="Salary">On Salary</option>
                                                    <option value="Project Based">Project Based</option>
                                                </select>
                                            </div>
                                        )}
                                        {canManageFinances && formData.employmentType === 'Salary' && formData.role !== 'client' && (
                                            <div className="space-y-1.5 animate-in fade-in slide-in-from-top-1">
                                                <label className="text-xs font-medium text-muted-foreground">Salary (₹)</label>
                                                <input type="number" value={formData.salary} onChange={e => setFormData({ ...formData, salary: parseInt(e.target.value) || 0 })}
                                                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm focus:ring-1 focus:ring-primary" />
                                            </div>
                                        )}
                                    </div>

                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="space-y-1.5">
                                            <label className="text-xs font-medium text-muted-foreground">Password</label>
                                            <input
                                                type="password"
                                                placeholder={user ? "Unchanged" : "New Password"}
                                                value={formData.password || ""}
                                                onChange={e => setFormData({ ...formData, password: e.target.value })}
                                                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm focus:ring-1 focus:ring-primary"
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-xs font-medium text-muted-foreground">Contact</label>
                                            <input value={formData.contactNumber} onChange={e => setFormData({ ...formData, contactNumber: e.target.value })}
                                                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm focus:ring-1 focus:ring-primary" placeholder="+91..." />
                                        </div>
                                    </div>

                                    <div className="space-y-3 pt-2">
                                        <div className="flex items-center justify-between border-b border-border pb-2">
                                            <h4 className="text-sm font-semibold text-muted-foreground">Identity & Documents</h4>
                                            {!formData.role.includes('client') && (
                                                <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
                                                    {(
                                                        (user?.adharCardImage || user?.pendingAdharCardImage ? 1 : 0) +
                                                        (user?.panCardImage || user?.pendingPanCardImage ? 1 : 0) +
                                                        (user?.contracts?.length || 0) +
                                                        (user?.otherDocuments?.length || 0)
                                                    )} Documents
                                                </span>
                                            )}
                                        </div>

                                        <div className="py-2.5 px-4 bg-muted/20 border border-border rounded-lg flex flex-row items-center justify-between gap-4">
                                            <div className="flex gap-3 text-sm text-muted-foreground">
                                                <div className="flex items-center gap-1.5">
                                                    <div className={`w-2 h-2 rounded-full ${user?.adharCardImage ? 'bg-green-500' : 'bg-red-500'}`} /> Aadhar
                                                </div>
                                                <div className="flex items-center gap-1.5">
                                                    <div className={`w-2 h-2 rounded-full ${user?.panCardImage ? 'bg-green-500' : 'bg-red-500'}`} /> PAN
                                                </div>
                                                <div className="flex items-center gap-1.5">
                                                    <div className={`w-2 h-2 rounded-full ${user?.contracts?.length ? 'bg-green-500' : 'bg-muted'}`} /> Contracts
                                                </div>
                                            </div>

                                            <button
                                                type="button"
                                                onClick={() => setShowDocumentManager(true)}
                                                className="px-4 py-1.5 bg-primary text-primary-foreground hover:bg-primary/90 rounded-md text-xs font-medium transition-colors"
                                            >
                                                Manage Docs
                                            </button>
                                        </div>
                                        {(user?.pendingAdharCardImage || user?.pendingPanCardImage || user?.pendingContracts || user?.pendingOtherDocuments) && (
                                            <div className="text-xs text-yellow-600 dark:text-yellow-500 flex items-center justify-center gap-1.5 bg-yellow-500/10 px-3 py-1 rounded-full w-fit mx-auto">
                                                <AlertTriangle className="w-3 h-3" />
                                                Pending updates require review
                                            </div>
                                        )}
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

            {/* Document Manager */}
            {
                user && (
                    <DocumentManager
                        user={user}
                        open={showDocumentManager}
                        onOpenChange={setShowDocumentManager}
                        isAdmin={isAdmin}
                        onSuccess={onSuccess}
                    />
                )
            }
        </>
    );
}

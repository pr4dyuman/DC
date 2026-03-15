"use client";

import { useState, useEffect } from "react";
import { User } from "@/lib/types";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Loader2, Trash2, AlertTriangle, Archive } from "lucide-react";
import { toast } from "sonner";
import { createUser, updateUser, deleteUser, adminResetPassword, getServices, approveDocumentUpdate, permanentlyDeleteUser } from "@/lib/actions";
import { useRouter } from "next/navigation";
import { useCurrency } from "@/context/CurrencyContext";
import { DocumentManager } from "./DocumentManager";
import { PermanentDeleteDialog } from "@/components/PermanentDeleteDialog";

interface EditUserDialogProps {
    user?: User | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess?: () => void;
    currentUserRole?: string;
    isSelf?: boolean;
}

export function EditUserDialog({ user, open, onOpenChange, onSuccess, currentUserRole, isSelf }: EditUserDialogProps) {
    const router = useRouter();
    const { symbol } = useCurrency();
    const [submitting, setSubmitting] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [deletePassword, setDeletePassword] = useState("");
    const [deleting, setDeleting] = useState(false);
    const [archiving, setArchiving] = useState(false);
    const [showPermanentDelete, setShowPermanentDelete] = useState(false);
    const [services, setServices] = useState<any[]>([]);
    const [loadingRoles, setLoadingRoles] = useState(false);
    const [showDocumentManager, setShowDocumentManager] = useState(false);
    // Self password-change fields
    const [currentPassword, setCurrentPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [passwordError, setPasswordError] = useState("");

    const isAdmin = currentUserRole === 'admin';
    const isManager = currentUserRole === 'manager';
    const canManageFinances = isAdmin || isManager;

    const [formData, setFormData] = useState<Omit<User, "id" | "agencyId">>({
        name: "",
        username: "",
        email: "",
        role: "employee",
        jobTitle: "",
        salary: 0,
        avatar: "",
        password: "",
        employmentType: "Salary" as 'Salary' | 'Project Based' | 'Freelancer',
        gender: "Male" as "Male" | "Female" | "Other",
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
                    gender: user.gender || "Male",
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
                    gender: "Male",
                    contactNumber: "",
                    adharCardImage: "",
                    panCardImage: "",
                    password: "",
                    createdAt: new Date().toISOString().split('T')[0] // Default: today
                } as any);
            }
            setShowDeleteConfirm(false);
            setDeletePassword("");
            setCurrentPassword("");
            setNewPassword("");
            setConfirmPassword("");
            setPasswordError("");
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
        setPasswordError("");
        setSubmitting(true);
        try {
            if (user) {
                if (isSelf) {
                    // Self-editing: password change requires current password verification
                    if (newPassword) {
                        if (newPassword !== confirmPassword) {
                            setPasswordError("New passwords do not match");
                            setSubmitting(false);
                            return;
                        }
                        if (!currentPassword) {
                            setPasswordError("Current password is required to set a new password");
                            setSubmitting(false);
                            return;
                        }
                        // Use updateUser with currentPassword for verification
                        await updateUser(user.id, { ...formData, password: newPassword }, currentPassword);
                    } else {
                        await updateUser(user.id, formData);
                    }
                } else if (formData.password) {
                    // Admin force-reset (no old password needed)
                    await adminResetPassword(user.id, formData.password);
                    const { password, ...updateData } = formData;
                    await updateUser(user.id, updateData);
                } else {
                    await updateUser(user.id, formData);
                }

                // Redirect if username changed and we are likely on the profile page
                if (formData.username && user.username && formData.username !== user.username) {
                    const currentPath = window.location.pathname;
                    if (currentPath.includes(user.username) || currentPath.includes(user.id)) {
                        router.push(`/dashboard/team/${formData.username}`);
                        router.refresh();
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
            toast.success(user ? "Profile updated successfully" : "Member created successfully");
        } catch (error: any) {
            toast.error(error.message || "Something went wrong");
        } finally {
            setSubmitting(false);
        }
    };

    const handleArchive = async () => {
        if (!user) return;
        setArchiving(true);
        try {
            await deleteUser(user.id, deletePassword);
            if (window.location.pathname.includes(user.id)) {
                router.push('/dashboard/team');
            }
            if (onSuccess) onSuccess();
            onOpenChange(false);
            toast.success(`${user.name} has been deactivated (archived). They can be restored anytime.`);
        } catch (error: any) {
            toast.error(error.message || "Failed to archive user");
        } finally {
            setArchiving(false);
        }
    };

    const handlePermanentDelete = async (password: string) => {
        if (!user) return;
        await permanentlyDeleteUser(user.id, password);
        if (window.location.pathname.includes(user.id)) {
            router.push('/dashboard/team');
        }
        if (onSuccess) onSuccess();
        onOpenChange(false);
        toast.success(`${user.name} has been permanently deleted.`);
    };

    return (
        <>
            <Dialog open={open} onOpenChange={onOpenChange}>
                <DialogContent className="sm:max-w-[550px] bg-card border-border p-6 max-h-[85vh] overflow-y-auto">
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
                                                    if (file.size > 2 * 1024 * 1024) {
                                                        toast.error('Avatar must be under 2MB');
                                                        return;
                                                    }
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
                                                    <option value="Freelancer">Freelancer</option>
                                                    <option value="Project Based">Project Based</option>
                                                </select>
                                            </div>
                                        )}
                                        <div className="space-y-1.5">
                                            <label className="text-xs font-medium text-muted-foreground">Gender</label>
                                            <select
                                                value={formData.gender || "Male"}
                                                onChange={e => setFormData({ ...formData, gender: e.target.value as any })}
                                                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm focus:ring-1 focus:ring-primary">
                                                <option value="Male">Male</option>
                                                <option value="Female">Female</option>
                                                <option value="Other">Other</option>
                                            </select>
                                        </div>
                                        {canManageFinances && (formData.employmentType === 'Salary' || formData.employmentType === 'Freelancer') && formData.role !== 'client' && (
                                            <div className="space-y-1.5 animate-in fade-in slide-in-from-top-1">
                                                <label className="text-xs font-medium text-muted-foreground">
                                                    {formData.employmentType === 'Freelancer' ? `Rate (${symbol})` : `Salary (${symbol})`}
                                                </label>
                                                <input type="number" value={formData.salary} onChange={e => setFormData({ ...formData, salary: parseInt(e.target.value) || 0 })}
                                                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm focus:ring-1 focus:ring-primary" />
                                            </div>
                                        )}
                                    </div>

                                    {/* Join Date (backdate) — only on create */}
                                    {!user && (
                                        <div className="space-y-1.5">
                                            <label className="text-xs font-medium text-muted-foreground">Join Date</label>
                                            <input
                                                type="date"
                                                value={(formData as any).createdAt || new Date().toISOString().split('T')[0]}
                                                onChange={e => setFormData({ ...formData, createdAt: e.target.value } as any)}
                                                max={new Date().toISOString().split('T')[0]}
                                                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm focus:ring-1 focus:ring-primary"
                                            />
                                            <p className="text-[10px] text-muted-foreground">Set a past date for backdating</p>
                                        </div>
                                    )}

                                    {/* Password section — self gets secure change, admin gets force-reset */}
                                    {isSelf ? (
                                        <div className="space-y-3 pt-1 border-t border-border">
                                            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider pt-1">Change Password</h4>
                                            {passwordError && (
                                                <p className="text-xs text-red-500 bg-red-500/10 px-3 py-2 rounded-md">{passwordError}</p>
                                            )}
                                            <div className="space-y-1.5">
                                                <label className="text-xs font-medium text-muted-foreground">Current Password</label>
                                                <input
                                                    type="password"
                                                    placeholder="Required to set new password"
                                                    value={currentPassword}
                                                    onChange={e => setCurrentPassword(e.target.value)}
                                                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm focus:ring-1 focus:ring-primary"
                                                />
                                            </div>
                                            <div className="grid grid-cols-2 gap-3">
                                                <div className="space-y-1.5">
                                                    <label className="text-xs font-medium text-muted-foreground">New Password</label>
                                                    <input
                                                        type="password"
                                                        value={newPassword}
                                                        onChange={e => setNewPassword(e.target.value)}
                                                        className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm focus:ring-1 focus:ring-primary"
                                                    />
                                                </div>
                                                <div className="space-y-1.5">
                                                    <label className="text-xs font-medium text-muted-foreground">Confirm Password</label>
                                                    <input
                                                        type="password"
                                                        value={confirmPassword}
                                                        onChange={e => setConfirmPassword(e.target.value)}
                                                        className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm focus:ring-1 focus:ring-primary"
                                                    />
                                                </div>
                                            </div>
                                            <div className="space-y-1.5">
                                                <label className="text-xs font-medium text-muted-foreground">Contact Number</label>
                                                <input
                                                    value={formData.contactNumber}
                                                    onChange={e => setFormData({ ...formData, contactNumber: e.target.value })}
                                                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm focus:ring-1 focus:ring-primary"
                                                    placeholder="+91..."
                                                />
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="grid grid-cols-2 gap-3">
                                            <div className="space-y-1.5">
                                                <label className="text-xs font-medium text-muted-foreground">Reset Password</label>
                                                <input
                                                    type="password"
                                                    placeholder={user ? "Force reset" : "New Password"}
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
                                    )}


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
                                            <div className="text-xs text-amber-500 flex items-center justify-center gap-1.5 bg-amber-500/10 px-3 py-1 rounded-full w-fit mx-auto">
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
                            <div className="flex items-center gap-3 p-4 bg-amber-500/10 border border-amber-500/20 rounded-lg text-amber-500">
                                <AlertTriangle className="h-5 w-5" />
                                <p className="text-sm font-medium">Choose how to handle this account</p>
                            </div>

                            {/* Archive option */}
                            <div className="p-4 border border-border rounded-lg space-y-3">
                                <div className="flex items-start gap-3">
                                    <Archive className="h-5 w-5 text-amber-500 mt-0.5" />
                                    <div>
                                        <p className="text-sm font-semibold text-foreground">Deactivate (Archive)</p>
                                        <p className="text-xs text-muted-foreground mt-1">
                                            Account is disabled but all data (tasks, transactions, history) is preserved. Can be restored anytime.
                                        </p>
                                    </div>
                                </div>
                                <div className="space-y-2 pl-8">
                                    <input
                                        type="password"
                                        placeholder="Admin Password"
                                        value={deletePassword}
                                        onChange={(e) => setDeletePassword(e.target.value)}
                                        className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                                    />
                                    <button
                                        onClick={handleArchive}
                                        disabled={!deletePassword || archiving}
                                        className="w-full px-4 py-2 text-sm font-medium text-amber-700 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/30 rounded-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                    >
                                        {archiving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Archive className="h-4 w-4" />}
                                        {archiving ? "Archiving..." : "Archive User"}
                                    </button>
                                </div>
                            </div>

                            {/* Permanent delete option */}
                            <div className="p-4 border border-red-500/30 rounded-lg bg-red-500/5 space-y-3">
                                <div className="flex items-start gap-3">
                                    <Trash2 className="h-5 w-5 text-red-500 mt-0.5" />
                                    <div>
                                        <p className="text-sm font-semibold text-red-500">Permanently Delete</p>
                                        <p className="text-xs text-muted-foreground mt-1">
                                            <strong className="text-red-400">Irreversible.</strong> Removes user account and all associated data including transactions, leave requests, and notifications.
                                        </p>
                                    </div>
                                </div>
                                <div className="pl-8">
                                    <button
                                        onClick={() => { setShowDeleteConfirm(false); setShowPermanentDelete(true); }}
                                        className="w-full px-4 py-2 text-sm font-medium text-red-500 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 rounded-md flex items-center justify-center gap-2"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                        Delete Permanently...
                                    </button>
                                </div>
                            </div>

                            <DialogFooter className="flex justify-end pt-2">
                                <button
                                    onClick={() => setShowDeleteConfirm(false)}
                                    className="px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-muted rounded-md transition-colors"
                                >
                                    Back
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
            {/* Permanent Delete Dialog */}
            {user && (
                <PermanentDeleteDialog
                    open={showPermanentDelete}
                    onOpenChange={setShowPermanentDelete}
                    entityName={user.name}
                    entityType="user"
                    warningItems={[
                        "User account and login credentials",
                        "All salary/payment transactions linked to this user",
                        "Leave requests and attendance records",
                        "Notifications",
                        "Tasks will be unassigned (not deleted)",
                    ]}
                    onConfirm={handlePermanentDelete}
                />
            )}
        </>
    );
}

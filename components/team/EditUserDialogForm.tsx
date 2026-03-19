"use client";

import type { Dispatch, FormEvent, SetStateAction } from "react";
import { User, Service } from "@/lib/types";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { AlertTriangle, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";

type UserFormData = Omit<User, "id" | "agencyId">;

type EditUserDialogFormProps = {
    user?: User | null;
    formData: UserFormData;
    setFormData: Dispatch<SetStateAction<UserFormData>>;
    services: Service[];
    loadingRoles: boolean;
    symbol: string;
    isAdmin: boolean;
    canManageFinances: boolean;
    isSelf?: boolean;
    currentPassword: string;
    setCurrentPassword: Dispatch<SetStateAction<string>>;
    newPassword: string;
    setNewPassword: Dispatch<SetStateAction<string>>;
    confirmPassword: string;
    setConfirmPassword: Dispatch<SetStateAction<string>>;
    passwordError: string;
    submitting: boolean;
    onSubmit: (event: FormEvent<HTMLFormElement>) => void;
    onCancel: () => void;
    onRequestDelete: () => void;
    onOpenDocumentManager: () => void;
};

export function EditUserDialogForm({
    user,
    formData,
    setFormData,
    services,
    loadingRoles,
    symbol,
    isAdmin,
    canManageFinances,
    isSelf,
    currentPassword,
    setCurrentPassword,
    newPassword,
    setNewPassword,
    confirmPassword,
    setConfirmPassword,
    passwordError,
    submitting,
    onSubmit,
    onCancel,
    onRequestDelete,
    onOpenDocumentManager,
}: EditUserDialogFormProps) {
    return (
        <form onSubmit={onSubmit} className="space-y-4">
            <div className="flex flex-col md:flex-row gap-5">
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
                            onChange={(event) => {
                                const file = event.target.files?.[0];
                                if (file) {
                                    if (file.size > 2 * 1024 * 1024) {
                                        toast.error("Avatar must be under 2MB");
                                        return;
                                    }
                                    const reader = new FileReader();
                                    reader.onloadend = () => {
                                        setFormData((previous) => ({ ...previous, avatar: reader.result as string }));
                                    };
                                    reader.readAsDataURL(file);
                                }
                            }}
                        />
                    </label>
                </div>

                <div className="flex-1 space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                            <label className="text-xs font-medium text-muted-foreground">Full Name</label>
                            <input
                                required
                                value={formData.name}
                                onChange={(event) => setFormData((previous) => ({ ...previous, name: event.target.value }))}
                                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm focus:ring-1 focus:ring-primary"
                                placeholder="John Doe"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-xs font-medium text-muted-foreground">Username</label>
                            <input
                                required
                                value={formData.username}
                                onChange={(event) => setFormData((previous) => ({ ...previous, username: event.target.value }))}
                                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm focus:ring-1 focus:ring-primary"
                                placeholder="johndoe"
                            />
                        </div>
                        <div className="col-span-2 space-y-1.5">
                            <label className="text-xs font-medium text-muted-foreground">Email</label>
                            <input
                                required
                                type="email"
                                value={formData.email}
                                onChange={(event) => setFormData((previous) => ({ ...previous, email: event.target.value }))}
                                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm focus:ring-1 focus:ring-primary"
                                placeholder="john@agency.com"
                            />
                        </div>
                    </div>

                    {formData.role !== "client" && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <label className="text-xs font-medium text-muted-foreground">Role</label>
                                <select
                                    value={formData.role}
                                    onChange={(event) => setFormData((previous) => ({ ...previous, role: event.target.value as User["role"] }))}
                                    disabled={!isAdmin}
                                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm focus:ring-1 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed"
                                >
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
                                        onChange={(event) => setFormData((previous) => ({ ...previous, jobTitle: event.target.value }))}
                                        disabled={!canManageFinances}
                                        className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm focus:ring-1 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed"
                                        placeholder={loadingRoles ? "Loading..." : "Select role"}
                                    />
                                    <datalist id="job-titles">
                                        {services.map((service) => (
                                            (service.jobs || []).map((job, index) => (
                                                <option key={`${service.id}-${index}`} value={job.title}>
                                                    {service.name} - {job.title}
                                                </option>
                                            ))
                                        ))}
                                    </datalist>
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {formData.role !== "client" && (
                            <div className="space-y-1.5">
                                <label className="text-xs font-medium text-muted-foreground">Employment</label>
                                <select
                                    value={formData.employmentType}
                                    onChange={(event) => setFormData((previous) => ({ ...previous, employmentType: event.target.value as NonNullable<User["employmentType"]> }))}
                                    disabled={!canManageFinances}
                                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm focus:ring-1 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed"
                                >
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
                                onChange={(event) => setFormData((previous) => ({ ...previous, gender: event.target.value as NonNullable<User["gender"]> }))}
                                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm focus:ring-1 focus:ring-primary"
                            >
                                <option value="Male">Male</option>
                                <option value="Female">Female</option>
                                <option value="Other">Other</option>
                            </select>
                        </div>
                        {canManageFinances && (formData.employmentType === "Salary" || formData.employmentType === "Freelancer") && formData.role !== "client" && (
                            <div className="space-y-1.5 animate-in fade-in slide-in-from-top-1">
                                <label className="text-xs font-medium text-muted-foreground">
                                    {formData.employmentType === "Freelancer" ? `Rate (${symbol})` : `Salary (${symbol})`}
                                </label>
                                <input
                                    type="number"
                                    value={formData.salary}
                                    onChange={(event) => setFormData((previous) => ({ ...previous, salary: parseInt(event.target.value, 10) || 0 }))}
                                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm focus:ring-1 focus:ring-primary"
                                />
                            </div>
                        )}
                    </div>

                    {!user && (
                        <div className="space-y-1.5">
                            <label className="text-xs font-medium text-muted-foreground">Join Date</label>
                            <input
                                type="date"
                                value={formData.createdAt || new Date().toISOString().split("T")[0]}
                                onChange={(event) => setFormData((previous) => ({ ...previous, createdAt: event.target.value }))}
                                max={new Date().toISOString().split("T")[0]}
                                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm focus:ring-1 focus:ring-primary"
                            />
                            <p className="text-[10px] text-muted-foreground">Set a past date for backdating</p>
                        </div>
                    )}

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
                                    onChange={(event) => setCurrentPassword(event.target.value)}
                                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm focus:ring-1 focus:ring-primary"
                                />
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div className="space-y-1.5">
                                    <label className="text-xs font-medium text-muted-foreground">New Password</label>
                                    <input
                                        type="password"
                                        value={newPassword}
                                        onChange={(event) => setNewPassword(event.target.value)}
                                        className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm focus:ring-1 focus:ring-primary"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-medium text-muted-foreground">Confirm Password</label>
                                    <input
                                        type="password"
                                        value={confirmPassword}
                                        onChange={(event) => setConfirmPassword(event.target.value)}
                                        className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm focus:ring-1 focus:ring-primary"
                                    />
                                </div>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-medium text-muted-foreground">Contact Number</label>
                                <input
                                    value={formData.contactNumber}
                                    onChange={(event) => setFormData((previous) => ({ ...previous, contactNumber: event.target.value }))}
                                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm focus:ring-1 focus:ring-primary"
                                    placeholder="+91..."
                                />
                            </div>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <label className="text-xs font-medium text-muted-foreground">Reset Password</label>
                                <input
                                    type="password"
                                    placeholder={user ? "Force reset" : "New Password"}
                                    value={formData.password || ""}
                                    onChange={(event) => setFormData((previous) => ({ ...previous, password: event.target.value }))}
                                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm focus:ring-1 focus:ring-primary"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-medium text-muted-foreground">Contact</label>
                                <input
                                    value={formData.contactNumber}
                                    onChange={(event) => setFormData((previous) => ({ ...previous, contactNumber: event.target.value }))}
                                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm focus:ring-1 focus:ring-primary"
                                    placeholder="+91..."
                                />
                            </div>
                        </div>
                    )}

                    <div className="space-y-3 pt-2">
                        <div className="flex items-center justify-between border-b border-border pb-2">
                            <h4 className="text-sm font-semibold text-muted-foreground">Identity & Documents</h4>
                            {!formData.role.includes("client") && (
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
                                    <div className={`w-2 h-2 rounded-full ${user?.adharCardImage ? "bg-green-500" : "bg-red-500"}`} /> Aadhar
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <div className={`w-2 h-2 rounded-full ${user?.panCardImage ? "bg-green-500" : "bg-red-500"}`} /> PAN
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <div className={`w-2 h-2 rounded-full ${user?.contracts?.length ? "bg-green-500" : "bg-muted"}`} /> Contracts
                                </div>
                            </div>

                            <button
                                type="button"
                                onClick={onOpenDocumentManager}
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
                        onClick={onRequestDelete}
                        className="flex items-center gap-2 text-sm font-medium text-red-500 hover:text-red-600 transition-colors"
                    >
                        <Trash2 className="h-4 w-4" />
                        Delete User
                    </button>
                ) : <div />}

                <div className="flex gap-2">
                    <button type="button" onClick={onCancel} className="px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-muted rounded-md transition-colors">
                        Cancel
                    </button>
                    <button disabled={submitting} type="submit" className="inline-flex items-center justify-center rounded-md text-sm font-medium bg-primary text-primary-foreground h-10 px-6 hover:bg-primary/90 transition-colors">
                        {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : (user ? "Save Changes" : "Create Account")}
                    </button>
                </div>
            </div>
        </form>
    );
}

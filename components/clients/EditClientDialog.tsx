
"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { Client } from "@/lib/types";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Eye, EyeOff, KeyRound, Loader2 } from "lucide-react";
import { createClient, updateClient } from "@/lib/actions";
import { toast } from "sonner";

function getErrorMessage(error: unknown, fallback: string) {
    return error instanceof Error ? error.message : fallback;
}

interface EditClientDialogProps {
    client?: Client | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess?: () => void;
}

type ClientFormData = Omit<Client, "id" | "agencyId"> & { password?: string };

export function EditClientDialog({ client, open, onOpenChange, onSuccess }: EditClientDialogProps) {
    const [submitting, setSubmitting] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [passwordError, setPasswordError] = useState("");
    const [changePasswordMode, setChangePasswordMode] = useState(false);

    const [formData, setFormData] = useState<ClientFormData>({
        name: "",
        username: "",
        email: "",
        companyName: "",
        role: "client",
        phone: "",
        address: "",
        logo: "",
        adharCardImage: "",
        panCardImage: ""
    });

    useEffect(() => {
        if (open) {
            setPassword("");
            setConfirmPassword("");
            setPasswordError("");
            setChangePasswordMode(false);
            setShowPassword(false);
            setShowConfirm(false);
            if (client) {
                setFormData({
                    name: client.name,
                    username: client.username || "",
                    email: client.email,
                    companyName: client.companyName,
                    role: "client",
                    phone: client.phone || "",
                    address: client.address || "",
                    logo: client.logo || "",
                    adharCardImage: client.adharCardImage || "",
                    panCardImage: client.panCardImage || "",
                });
            } else {
                setFormData({
                    name: "",
                    username: "",
                    email: "",
                    companyName: "",
                    role: "client",
                    phone: "",
                    address: "",
                    logo: "",
                    adharCardImage: "",
                    panCardImage: ""
                });
            }
        }
    }, [client, open]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setPasswordError("");

        // --- Password validation ---
        const isCreating = !client;
        const isChangingPassword = isCreating || (changePasswordMode && password);

        if (isCreating && !password) {
            setPasswordError("Password is required to create a client account.");
            return;
        }
        if (isChangingPassword && password) {
            if (password.length < 8) {
                setPasswordError("Password must be at least 8 characters.");
                return;
            }
            if (password !== confirmPassword) {
                setPasswordError("Passwords do not match.");
                return;
            }
        }

        setSubmitting(true);
        try {
            if (client) {
                const updates: Partial<Client> = { ...formData };
                if (changePasswordMode && password) {
                    updates.password = password;
                }
                await updateClient(client.id, updates);
            } else {
                await createClient({ ...formData, password });
            }
            if (onSuccess) onSuccess();
            onOpenChange(false);
        } catch (error) {
            toast.error(getErrorMessage(error, "An error occurred"));
        } finally {
            setSubmitting(false);
        }
    };

    const isCreating = !client;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[620px] bg-card border-border max-h-[90dvh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>{client ? "Edit Client" : "Add New Client"}</DialogTitle>
                    <DialogDescription>
                        {client ? "Update client details." : "Create a new client account. They will be able to log in using their email and password."}
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-6 py-4">
                    <div className="flex flex-col md:flex-row gap-6">
                        {/* Avatar Section */}
                        <div className="flex flex-col items-center space-y-3">
                            <Avatar className="h-24 w-24 border-2 border-border shadow-md">
                                <AvatarImage src={formData.logo} />
                                <AvatarFallback className="text-2xl bg-muted">
                                    {formData.companyName ? formData.companyName.substring(0, 2).toUpperCase() : "CO"}
                                </AvatarFallback>
                            </Avatar>
                            <div className="text-center">
                                <label htmlFor="logo-upload" className="cursor-pointer text-xs font-medium text-primary hover:text-primary/80 transition-colors">
                                    Change Logo
                                    <input
                                        id="logo-upload"
                                        type="file"
                                        accept="image/*"
                                        className="hidden"
                                        onChange={(e) => {
                                            const file = e.target.files?.[0];
                                            if (file) {
                                                if (file.size > 2 * 1024 * 1024) {
                                                    toast.error("Image must be under 2MB");
                                                    return;
                                                }
                                                const reader = new FileReader();
                                                reader.onloadend = () => setFormData({ ...formData, logo: reader.result as string });
                                                reader.readAsDataURL(file);
                                            }
                                        }}
                                    />
                                </label>
                            </div>
                        </div>

                        {/* Fields Section */}
                        <div className="flex-1 space-y-4">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Company Name</label>
                                    <input required value={formData.companyName} onChange={e => setFormData({ ...formData, companyName: e.target.value })}
                                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:ring-2 focus:ring-primary/20" placeholder="Acme Inc" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Contact Person</label>
                                    <input required value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })}
                                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:ring-2 focus:ring-primary/20" placeholder="John Doe" />
                                </div>
                                <div className="col-span-2 space-y-2">
                                    <label className="text-sm font-medium">Email</label>
                                    <input required type="email" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })}
                                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:ring-2 focus:ring-primary/20" placeholder="john@acme.com" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Contact Number</label>
                                    <input value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })}
                                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:ring-2 focus:ring-primary/20" placeholder="+1 234 567 890" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Address</label>
                                    <input value={formData.address} onChange={e => setFormData({ ...formData, address: e.target.value })}
                                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:ring-2 focus:ring-primary/20" placeholder="123 Business St, City" />
                                </div>
                            </div>

                            {/* ── Password section ── */}
                            {isCreating ? (
                                <div className="space-y-3 pt-3 border-t border-border">
                                    <h4 className="text-sm font-semibold flex items-center gap-2">
                                        <KeyRound className="h-4 w-4 text-muted-foreground" />
                                        Login Password
                                    </h4>
                                    <p className="text-xs text-muted-foreground">The client will use their email + this password to log in.</p>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        <div className="space-y-1">
                                            <label className="text-xs font-medium">Password <span className="text-red-500">*</span></label>
                                            <div className="relative">
                                                <input
                                                    required
                                                    type={showPassword ? "text" : "password"}
                                                    value={password}
                                                    onChange={e => setPassword(e.target.value)}
                                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 pr-10 py-2 text-sm focus:ring-2 focus:ring-primary/20"
                                                    placeholder="Min. 8 characters"
                                                />
                                                <button type="button" onClick={() => setShowPassword(v => !v)} className="absolute right-2 top-2.5 text-muted-foreground hover:text-foreground">
                                                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                                </button>
                                            </div>
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-xs font-medium">Confirm Password <span className="text-red-500">*</span></label>
                                            <div className="relative">
                                                <input
                                                    required
                                                    type={showConfirm ? "text" : "password"}
                                                    value={confirmPassword}
                                                    onChange={e => setConfirmPassword(e.target.value)}
                                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 pr-10 py-2 text-sm focus:ring-2 focus:ring-primary/20"
                                                    placeholder="Repeat password"
                                                />
                                                <button type="button" onClick={() => setShowConfirm(v => !v)} className="absolute right-2 top-2.5 text-muted-foreground hover:text-foreground">
                                                    {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                    {passwordError && <p className="text-xs text-red-500">{passwordError}</p>}
                                </div>
                            ) : (
                                // Edit mode: optional change password
                                <div className="space-y-3 pt-3 border-t border-border">
                                    <div className="flex items-center justify-between">
                                        <h4 className="text-sm font-semibold flex items-center gap-2">
                                            <KeyRound className="h-4 w-4 text-muted-foreground" />
                                            Change Password
                                        </h4>
                                        <button
                                            type="button"
                                            onClick={() => { setChangePasswordMode(v => !v); setPassword(""); setConfirmPassword(""); setPasswordError(""); }}
                                            className="text-xs text-primary hover:underline"
                                        >
                                            {changePasswordMode ? "Cancel" : "Change"}
                                        </button>
                                    </div>
                                    {changePasswordMode && (
                                        <div className="space-y-3 animate-in fade-in slide-in-from-top-1">
                                            <p className="text-xs text-muted-foreground">Leave blank to keep existing password.</p>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                <div className="space-y-1">
                                                    <label className="text-xs font-medium">New Password</label>
                                                    <div className="relative">
                                                        <input
                                                            type={showPassword ? "text" : "password"}
                                                            value={password}
                                                            onChange={e => setPassword(e.target.value)}
                                                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 pr-10 py-2 text-sm focus:ring-2 focus:ring-primary/20"
                                                            placeholder="Min. 8 characters"
                                                            autoComplete="new-password"
                                                        />
                                                        <button type="button" onClick={() => setShowPassword(v => !v)} className="absolute right-2 top-2.5 text-muted-foreground hover:text-foreground">
                                                            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                                        </button>
                                                    </div>
                                                </div>
                                                <div className="space-y-1">
                                                    <label className="text-xs font-medium">Confirm New Password</label>
                                                    <div className="relative">
                                                        <input
                                                            type={showConfirm ? "text" : "password"}
                                                            value={confirmPassword}
                                                            onChange={e => setConfirmPassword(e.target.value)}
                                                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 pr-10 py-2 text-sm focus:ring-2 focus:ring-primary/20"
                                                            placeholder="Repeat password"
                                                            autoComplete="new-password"
                                                        />
                                                        <button type="button" onClick={() => setShowConfirm(v => !v)} className="absolute right-2 top-2.5 text-muted-foreground hover:text-foreground">
                                                            {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                            {passwordError && <p className="text-xs text-red-500">{passwordError}</p>}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Legal Details */}
                            <div className="space-y-4 pt-2 border-t border-border">
                                <h4 className="text-sm font-semibold text-muted-foreground">Legal Details</h4>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">Aadhar Card</label>
                                        <div className="flex items-center gap-4">
                                            {formData.adharCardImage && (
                                                <div className="relative w-16 h-10 rounded border border-border overflow-hidden">
                                                    <Image src={formData.adharCardImage} alt="Aadhar" fill sizes="64px" className="object-cover" unoptimized />
                                                </div>
                                            )}
                                            <label className="flex-1 cursor-pointer">
                                                <div className="flex items-center justify-center w-full h-10 border border-input rounded-md hover:bg-muted transition-colors text-sm text-muted-foreground">
                                                    {formData.adharCardImage ? "Change" : "Upload Image"}
                                                </div>
                                                <input type="file" accept="image/*" className="hidden" onChange={(e) => {
                                                    const file = e.target.files?.[0];
                                                    if (file) {
                                                        if (file.size > 2 * 1024 * 1024) { toast.error("Image must be under 2MB"); return; }
                                                        const reader = new FileReader();
                                                        reader.onloadend = () => setFormData({ ...formData, adharCardImage: reader.result as string });
                                                        reader.readAsDataURL(file);
                                                    }
                                                }} />
                                            </label>
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">PAN Card</label>
                                        <div className="flex items-center gap-4">
                                            {formData.panCardImage && (
                                                <div className="relative w-16 h-10 rounded border border-border overflow-hidden">
                                                    <Image src={formData.panCardImage} alt="PAN" fill sizes="64px" className="object-cover" unoptimized />
                                                </div>
                                            )}
                                            <label className="flex-1 cursor-pointer">
                                                <div className="flex items-center justify-center w-full h-10 border border-input rounded-md hover:bg-muted transition-colors text-sm text-muted-foreground">
                                                    {formData.panCardImage ? "Change" : "Upload Image"}
                                                </div>
                                                <input type="file" accept="image/*" className="hidden" onChange={(e) => {
                                                    const file = e.target.files?.[0];
                                                    if (file) {
                                                        if (file.size > 2 * 1024 * 1024) { toast.error("Image must be under 2MB"); return; }
                                                        const reader = new FileReader();
                                                        reader.onloadend = () => setFormData({ ...formData, panCardImage: reader.result as string });
                                                        reader.readAsDataURL(file);
                                                    }
                                                }} />
                                            </label>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-end items-center pt-4 border-t border-border mt-4 gap-2">
                        <button type="button" onClick={() => onOpenChange(false)} className="px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-muted rounded-md transition-colors">
                            Cancel
                        </button>
                        <button disabled={submitting} type="submit" className="inline-flex items-center justify-center rounded-md text-sm font-medium bg-primary text-primary-foreground h-10 px-6 hover:bg-primary/90 transition-colors">
                            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : (client ? "Save Changes" : "Create Client")}
                        </button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}

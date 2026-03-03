"use client";

import { useState, useTransition, useRef, useEffect, useMemo } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { User } from "@/lib/types";
import { updateUser, getSystemSettings, updateSystemSettings } from "@/lib/actions";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Loader2, Upload, Lock, Shield, Camera, Building2, Phone, Briefcase, Eye, EyeOff, AtSign, Calendar, Clock } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";

interface ProfileModalProps {
    user: User;
    open: boolean;
    setOpen: (open: boolean) => void;
}

// Password validation helper
function validatePassword(password: string): string | null {
    if (password.length < 8) return "Password must be at least 8 characters";
    if (!/[A-Z]/.test(password)) return "Password must contain at least one uppercase letter";
    if (!/[0-9]/.test(password)) return "Password must contain at least one number";
    return null;
}

// Format date helper
function formatDate(dateStr?: string): string {
    if (!dateStr) return "—";
    try {
        return new Date(dateStr).toLocaleDateString("en-US", {
            year: "numeric", month: "short", day: "numeric"
        });
    } catch {
        return "—";
    }
}

// Relative time helper
function timeAgo(dateStr?: string): string {
    if (!dateStr) return "Never";
    try {
        const diff = Date.now() - new Date(dateStr).getTime();
        const mins = Math.floor(diff / 60000);
        if (mins < 1) return "Just now";
        if (mins < 60) return `${mins}m ago`;
        const hrs = Math.floor(mins / 60);
        if (hrs < 24) return `${hrs}h ago`;
        const days = Math.floor(hrs / 24);
        if (days < 30) return `${days}d ago`;
        return formatDate(dateStr);
    } catch {
        return "Never";
    }
}

const tabTriggerClass =
    "data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none h-full px-0 font-medium";

export function ProfileModal({ user, open, setOpen }: ProfileModalProps) {
    const [isLoading, startTransition] = useTransition();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const systemLogoRef = useRef<HTMLInputElement>(null);

    // Form State
    const [name, setName] = useState(user.name);
    const [email, setEmail] = useState(user.email);
    const [username, setUsername] = useState(user.username || "");
    const [avatar, setAvatar] = useState(user.avatar || "");
    const [jobTitle, setJobTitle] = useState(user.jobTitle || "");
    const [contactNumber, setContactNumber] = useState(user.contactNumber || "");

    // System State
    const [systemName, setSystemName] = useState("AgencyOS");
    const [systemLogo, setSystemLogo] = useState("");
    const [initialSystemName, setInitialSystemName] = useState("AgencyOS");
    const [initialSystemLogo, setInitialSystemLogo] = useState("");

    // Password State
    const [currentPassword, setCurrentPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [showCurrentPassword, setShowCurrentPassword] = useState(false);
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    // Separate errors per tab
    const [generalError, setGeneralError] = useState("");
    const [securityError, setSecurityError] = useState("");

    const isAdmin = user.role === 'admin';

    // Track dirty state for unsaved changes warning
    const isDirty = useMemo(() => {
        const profileChanged =
            name !== user.name ||
            email !== user.email ||
            (username || "") !== (user.username || "") ||
            avatar !== (user.avatar || "") ||
            jobTitle !== (user.jobTitle || "") ||
            contactNumber !== (user.contactNumber || "");
        const passwordChanged = currentPassword !== "" || newPassword !== "" || confirmPassword !== "";
        const systemChanged = isAdmin && (systemName !== initialSystemName || systemLogo !== initialSystemLogo);
        return profileChanged || passwordChanged || systemChanged;
    }, [name, email, username, avatar, jobTitle, contactNumber, currentPassword, newPassword, confirmPassword, systemName, systemLogo, user, initialSystemName, initialSystemLogo, isAdmin]);

    useEffect(() => {
        if (open) {
            if (isAdmin) {
                getSystemSettings()
                    .then(settings => {
                        if (settings) {
                            setSystemName(settings.systemName);
                            setSystemLogo(settings.logo);
                            setInitialSystemName(settings.systemName);
                            setInitialSystemLogo(settings.logo);
                        }
                    })
                    .catch(() => {
                        toast.error("Failed to load system settings");
                    });
            }
            // Reset fields
            setName(user.name);
            setEmail(user.email);
            setUsername(user.username || "");
            setAvatar(user.avatar || "");
            setJobTitle(user.jobTitle || "");
            setContactNumber(user.contactNumber || "");
            setCurrentPassword("");
            setNewPassword("");
            setConfirmPassword("");
            setShowCurrentPassword(false);
            setShowNewPassword(false);
            setShowConfirmPassword(false);
            setGeneralError("");
            setSecurityError("");
        }
    }, [open, user, isAdmin]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, setter: (s: string) => void) => {
        const file = e.target.files?.[0];
        if (file) {
            if (file.size > 2 * 1024 * 1024) {
                toast.error("Image size must be less than 2MB");
                return;
            }
            const reader = new FileReader();
            reader.onloadend = () => {
                setter(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleOpenChange = (newOpen: boolean) => {
        if (!newOpen && isDirty) {
            const confirmed = window.confirm("You have unsaved changes. Are you sure you want to close?");
            if (!confirmed) return;
        }
        setOpen(newOpen);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setGeneralError("");
        setSecurityError("");

        // Password validation
        if (newPassword) {
            if (!currentPassword) {
                setSecurityError("Current password is required to set a new password");
                return;
            }
            if (newPassword !== confirmPassword) {
                setSecurityError("New passwords do not match");
                return;
            }
            const strengthError = validatePassword(newPassword);
            if (strengthError) {
                setSecurityError(strengthError);
                return;
            }
        }

        startTransition(async () => {
            try {
                // Only update system settings if admin AND something changed
                if (isAdmin && (systemName !== initialSystemName || systemLogo !== initialSystemLogo)) {
                    await updateSystemSettings({ systemName, logo: systemLogo });
                }

                // Update User
                const updates: Partial<User> = {
                    name,
                    email,
                    username: username || undefined,
                    avatar,
                    jobTitle,
                    contactNumber,
                };

                if (newPassword) {
                    updates.password = newPassword;
                }

                await updateUser(user.id, updates, currentPassword);

                // Reset sensitive fields on success
                setCurrentPassword("");
                setNewPassword("");
                setConfirmPassword("");
                setShowCurrentPassword(false);
                setShowNewPassword(false);
                setShowConfirmPassword(false);
                toast.success("Profile updated successfully");
                setOpen(false);
            } catch (err: unknown) {
                const message = err instanceof Error ? err.message : "Failed to update profile";
                // Show error on appropriate tab
                if (message.toLowerCase().includes("password")) {
                    setSecurityError(message);
                    // Clear password fields on error so user can retry cleanly
                    setCurrentPassword("");
                    setNewPassword("");
                    setConfirmPassword("");
                } else {
                    setGeneralError(message);
                }
            }
        });
    };

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogContent className="sm:max-w-[550px] p-0 overflow-hidden gap-0 max-h-[85vh] flex flex-col">
                <DialogHeader className="p-6 pb-2">
                    <DialogTitle className="text-xl">Edit Profile{isAdmin ? ' & System' : ''}</DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
                    <Tabs defaultValue="general" className="w-full flex flex-col flex-1 overflow-hidden">
                        <div className="border-b px-6">
                            <TabsList className="bg-transparent h-12 p-0 space-x-6">
                                <TabsTrigger value="general" className={tabTriggerClass}>
                                    General
                                </TabsTrigger>
                                <TabsTrigger value="security" className={tabTriggerClass}>
                                    Security
                                </TabsTrigger>
                            </TabsList>
                        </div>

                        <div className="p-6 min-h-[350px] overflow-y-auto flex-1">
                            <TabsContent value="general" className="space-y-8 mt-0">
                                {generalError && (
                                    <div className="mb-4 p-3 text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-md">
                                        {generalError}
                                    </div>
                                )}

                                {/* User Avatar & Name */}
                                <div className="flex items-start gap-6">
                                    <div className="flex flex-col items-center gap-2">
                                        <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                                            <Avatar className="h-20 w-20 border-2 border-border shadow-sm">
                                                <AvatarImage src={avatar} className="object-cover" />
                                                <AvatarFallback className="text-xl bg-primary/10 text-primary">
                                                    {name ? name.substring(0, 2).toUpperCase() : "?"}
                                                </AvatarFallback>
                                            </Avatar>
                                            <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                <Camera className="h-6 w-6 text-white" />
                                            </div>
                                            <input
                                                type="file"
                                                ref={fileInputRef}
                                                className="hidden"
                                                accept="image/*"
                                                aria-label="Upload avatar image"
                                                onChange={(e) => handleFileChange(e, setAvatar)}
                                            />
                                        </div>
                                        <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">Avatar</span>
                                    </div>

                                    <div className="flex-1 space-y-4">
                                        <div className="grid gap-2">
                                            <Label htmlFor="name">Full Name</Label>
                                            <Input
                                                id="name"
                                                value={name}
                                                onChange={(e) => setName(e.target.value)}
                                                required
                                            />
                                        </div>
                                        <div className="grid gap-2">
                                            <Label htmlFor="email">Email Address</Label>
                                            <Input
                                                id="email"
                                                type="email"
                                                value={email}
                                                onChange={(e) => setEmail(e.target.value)}
                                                required
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="h-px bg-border/60" />

                                {/* Username, Job Title, Phone, Role, Employment Type */}
                                <div className="space-y-4">
                                    <div className="grid gap-2">
                                        <Label htmlFor="username" className="flex items-center gap-1.5">
                                            <AtSign className="h-3.5 w-3.5 text-muted-foreground" />
                                            Username
                                        </Label>
                                        <Input
                                            id="username"
                                            value={username}
                                            onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ""))}
                                            placeholder="e.g. john_doe"
                                        />
                                        <p className="text-xs text-muted-foreground">Lowercase letters, numbers, underscores and hyphens only.</p>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="grid gap-2">
                                            <Label htmlFor="jobTitle" className="flex items-center gap-1.5">
                                                <Briefcase className="h-3.5 w-3.5 text-muted-foreground" />
                                                Job Title
                                            </Label>
                                            <Input
                                                id="jobTitle"
                                                value={jobTitle}
                                                onChange={(e) => setJobTitle(e.target.value)}
                                                placeholder="e.g. Senior Developer"
                                            />
                                        </div>
                                        <div className="grid gap-2">
                                            <Label htmlFor="contactNumber" className="flex items-center gap-1.5">
                                                <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                                                Phone
                                            </Label>
                                            <Input
                                                id="contactNumber"
                                                value={contactNumber}
                                                onChange={(e) => setContactNumber(e.target.value)}
                                                placeholder="e.g. +91 9876543210"
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="grid gap-2">
                                            <Label className="text-muted-foreground">My Role</Label>
                                            <div className="text-sm font-medium text-foreground capitalize flex items-center gap-2">
                                                <Shield className="h-4 w-4 text-primary" />
                                                {user.role}
                                            </div>
                                        </div>
                                        {user.employmentType && (
                                            <div className="grid gap-2">
                                                <Label className="text-muted-foreground">Employment Type</Label>
                                                <div className="text-sm font-medium text-foreground flex items-center gap-2">
                                                    <Briefcase className="h-4 w-4 text-muted-foreground" />
                                                    {user.employmentType}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* System Branding — Admin only */}
                                {isAdmin && (
                                    <>
                                        <div className="h-px bg-border/60" />
                                        <div className="space-y-4">
                                            <h4 className="text-sm font-medium flex items-center gap-2 text-foreground/80">
                                                <Building2 className="h-4 w-4" /> System Branding
                                            </h4>

                                            <div className="flex items-start gap-6">
                                                <div className="flex flex-col items-center gap-2">
                                                    <div
                                                        className="h-20 w-20 border-2 border-dashed border-border rounded-lg flex items-center justify-center cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-colors relative group overflow-hidden"
                                                        onClick={() => systemLogoRef.current?.click()}
                                                    >
                                                        {systemLogo ? (
                                                            <img src={systemLogo} alt="System Logo" className="w-full h-full object-cover" />
                                                        ) : (
                                                            <Upload className="h-6 w-6 text-muted-foreground" />
                                                        )}
                                                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                            <Camera className="h-6 w-6 text-white" />
                                                        </div>
                                                        <input
                                                            type="file"
                                                            ref={systemLogoRef}
                                                            className="hidden"
                                                            accept="image/*"
                                                            aria-label="Upload system logo"
                                                            onChange={(e) => handleFileChange(e, setSystemLogo)}
                                                        />
                                                    </div>
                                                    <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">Logo</span>
                                                </div>

                                                <div className="flex-1">
                                                    <div className="grid gap-2">
                                                        <Label htmlFor="systemName">System Name</Label>
                                                        <Input
                                                            id="systemName"
                                                            value={systemName}
                                                            onChange={(e) => setSystemName(e.target.value)}
                                                            placeholder="e.g. AgencyOS"
                                                        />
                                                        <p className="text-xs text-muted-foreground">Appears in the sidebar and browser title.</p>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </>
                                )}
                            </TabsContent>

                            <TabsContent value="security" className="space-y-6 mt-0">
                                {securityError && (
                                    <div className="mb-4 p-3 text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-md">
                                        {securityError}
                                    </div>
                                )}

                                {/* Change Password */}
                                <div className="border-b pb-6">
                                    <h4 className="text-sm font-medium mb-4 flex items-center gap-2">
                                        <Lock className="h-4 w-4 text-muted-foreground" />
                                        Change Password
                                    </h4>
                                    <div className="space-y-4">
                                        <div className="grid gap-2">
                                            <Label htmlFor="current-password">Current Password</Label>
                                            <div className="relative">
                                                <Lock className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                                                <Input
                                                    id="current-password"
                                                    type={showCurrentPassword ? "text" : "password"}
                                                    value={currentPassword}
                                                    onChange={(e) => setCurrentPassword(e.target.value)}
                                                    className="pl-9 pr-9"
                                                    placeholder="Required to set new password"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                                                    className="absolute right-3 top-2.5 text-muted-foreground hover:text-foreground transition-colors"
                                                    aria-label={showCurrentPassword ? "Hide password" : "Show password"}
                                                >
                                                    {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                                </button>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="grid gap-2">
                                                <Label htmlFor="new-password">New Password</Label>
                                                <div className="relative">
                                                    <Input
                                                        id="new-password"
                                                        type={showNewPassword ? "text" : "password"}
                                                        value={newPassword}
                                                        onChange={(e) => setNewPassword(e.target.value)}
                                                        className="pr-9"
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={() => setShowNewPassword(!showNewPassword)}
                                                        className="absolute right-3 top-2.5 text-muted-foreground hover:text-foreground transition-colors"
                                                        aria-label={showNewPassword ? "Hide password" : "Show password"}
                                                    >
                                                        {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                                    </button>
                                                </div>
                                            </div>
                                            <div className="grid gap-2">
                                                <Label htmlFor="confirm-password">Confirm Password</Label>
                                                <div className="relative">
                                                    <Input
                                                        id="confirm-password"
                                                        type={showConfirmPassword ? "text" : "password"}
                                                        value={confirmPassword}
                                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                                        className="pr-9"
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                                        className="absolute right-3 top-2.5 text-muted-foreground hover:text-foreground transition-colors"
                                                        aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                                                    >
                                                        {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                        <p className="text-xs text-muted-foreground">
                                            Min 8 characters, at least 1 uppercase letter and 1 number.
                                        </p>
                                    </div>
                                </div>

                                {/* Account Info */}
                                <div className="space-y-4">
                                    <h4 className="text-sm font-medium flex items-center gap-2">
                                        <Shield className="h-4 w-4 text-muted-foreground" />
                                        Account Info
                                    </h4>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-1">
                                            <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                                                <Shield className="h-3 w-3" /> Role
                                            </p>
                                            <p className="text-sm font-medium capitalize">{user.role}</p>
                                        </div>
                                        {user.employmentType && (
                                            <div className="space-y-1">
                                                <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                                                    <Briefcase className="h-3 w-3" /> Employment
                                                </p>
                                                <p className="text-sm font-medium">{user.employmentType}</p>
                                            </div>
                                        )}
                                        <div className="space-y-1">
                                            <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                                                <Calendar className="h-3 w-3" /> Member Since
                                            </p>
                                            <p className="text-sm font-medium">{formatDate(user.createdAt)}</p>
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                                                <Clock className="h-3 w-3" /> Last Active
                                            </p>
                                            <p className="text-sm font-medium">{timeAgo(user.lastActiveAt)}</p>
                                        </div>
                                    </div>
                                </div>
                            </TabsContent>
                        </div>

                        <DialogFooter className="bg-muted/50 p-6">
                            <Button type="button" variant="ghost" onClick={() => handleOpenChange(false)}>Cancel</Button>
                            <Button type="submit" disabled={isLoading} className="bg-primary hover:bg-primary/90 gap-2">
                                {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                                Save Changes
                            </Button>
                        </DialogFooter>
                    </Tabs>
                </form>
            </DialogContent>
        </Dialog>
    );
}

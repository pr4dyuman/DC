"use client";

import { useState, useTransition, useRef, useEffect } from "react";
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
import { Loader2, Upload, Lock, User as UserIcon, Shield, Camera, Building2, Phone, Briefcase } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";

interface ProfileModalProps {
    user: User;
    open: boolean;
    setOpen: (open: boolean) => void;
}

export function ProfileModal({ user, open, setOpen }: ProfileModalProps) {
    const [isLoading, startTransition] = useTransition();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const systemLogoRef = useRef<HTMLInputElement>(null);

    // Form State
    const [name, setName] = useState(user.name);
    const [email, setEmail] = useState(user.email);
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

    const [error, setError] = useState("");

    const isAdmin = user.role === 'admin';

    useEffect(() => {
        if (open) {
            if (isAdmin) {
                getSystemSettings().then(settings => {
                    if (settings) {
                        setSystemName(settings.systemName);
                        setSystemLogo(settings.logo);
                        setInitialSystemName(settings.systemName);
                        setInitialSystemLogo(settings.logo);
                    }
                });
            }
            // Reset fields
            setName(user.name);
            setEmail(user.email);
            setAvatar(user.avatar || "");
            setJobTitle(user.jobTitle || "");
            setContactNumber(user.contactNumber || "");
            setError("");
        }
    }, [open, user, isAdmin]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, setter: (s: string) => void) => {
        const file = e.target.files?.[0];
        if (file) {
            if (file.size > 2 * 1024 * 1024) {
                setError("Image size must be less than 2MB");
                return;
            }
            const reader = new FileReader();
            reader.onloadend = () => {
                setter(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");

        if (newPassword && newPassword !== confirmPassword) {
            setError("New passwords do not match");
            return;
        }

        if (newPassword && !currentPassword) {
            setError("Current password is required to set a new password");
            return;
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
                toast.success("Profile updated successfully");
                setOpen(false);
            } catch (err: any) {
                setError(err.message || "Failed to update profile");
            }
        });
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogContent className="sm:max-w-[550px] p-0 overflow-hidden gap-0 max-h-[85vh] flex flex-col">
                <DialogHeader className="p-6 pb-2">
                    <DialogTitle className="text-xl">Edit Profile{isAdmin ? ' & System' : ''}</DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
                    <Tabs defaultValue="general" className="w-full flex flex-col flex-1 overflow-hidden">
                        <div className="border-b px-6">
                            <TabsList className="bg-transparent h-12 p-0 space-x-6">
                                <TabsTrigger
                                    value="general"
                                    className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none h-full px-0 font-medium"
                                >
                                    General
                                </TabsTrigger>
                                <TabsTrigger
                                    value="security"
                                    className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none h-full px-0 font-medium"
                                >
                                    Security
                                </TabsTrigger>
                            </TabsList>
                        </div>

                        <div className="p-6 min-h-[350px] overflow-y-auto flex-1">
                            {error && (
                                <div className="mb-4 p-3 text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-md">
                                    {error}
                                </div>
                            )}

                            <TabsContent value="general" className="space-y-8 mt-0">
                                {/* User Avatar & Name */}
                                <div className="flex items-start gap-6">
                                    <div className="flex flex-col items-center gap-2">
                                        <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                                            <Avatar className="h-20 w-20 border-2 border-border shadow-sm">
                                                <AvatarImage src={avatar} className="object-cover" />
                                                <AvatarFallback className="text-xl bg-primary/10 text-primary">
                                                    {name.substring(0, 2).toUpperCase()}
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

                                {/* Job Title, Phone, Role */}
                                <div className="space-y-4">
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
                                    <div className="grid gap-2">
                                        <Label className="text-muted-foreground">My Role</Label>
                                        <div className="text-sm font-medium text-foreground capitalize flex items-center gap-2">
                                            <Shield className="h-4 w-4 text-primary" />
                                            {user.role}
                                        </div>
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
                                <div className="border-b pb-4">
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
                                                    type="password"
                                                    value={currentPassword}
                                                    onChange={(e) => setCurrentPassword(e.target.value)}
                                                    className="pl-9"
                                                    placeholder="Required to set new password"
                                                />
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="grid gap-2">
                                                <Label htmlFor="new-password">New Password</Label>
                                                <Input
                                                    id="new-password"
                                                    type="password"
                                                    value={newPassword}
                                                    onChange={(e) => setNewPassword(e.target.value)}
                                                />
                                            </div>
                                            <div className="grid gap-2">
                                                <Label htmlFor="confirm-password">Confirm Password</Label>
                                                <Input
                                                    id="confirm-password"
                                                    type="password"
                                                    value={confirmPassword}
                                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </TabsContent>
                        </div>

                        <DialogFooter className="bg-muted/50 p-6">
                            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
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

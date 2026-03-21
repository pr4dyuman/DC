"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { User } from "@/lib/types";
import { getAgencyDashboardSettings, updateAgencyDashboardSettings, updateUser } from "@/lib/actions";
import { Loader2 } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { useDateFormat } from "@/context/TimezoneContext";
import { ProfileModalGeneralTab } from "./ProfileModalGeneralTab";
import { ProfileModalSecurityTab } from "./ProfileModalSecurityTab";
import { ProfileModalUnsavedAlert } from "./ProfileModalUnsavedAlert";

interface ProfileModalProps {
    user: User;
    open: boolean;
    setOpen: (open: boolean) => void;
}

function validatePassword(password: string): string | null {
    if (password.length < 8) return "Password must be at least 8 characters";
    if (!/[A-Z]/.test(password)) return "Password must contain at least one uppercase letter";
    if (!/[0-9]/.test(password)) return "Password must contain at least one number";
    return null;
}

const tabTriggerClass =
    "data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none h-full px-0 font-medium";

export function ProfileModal({ user, open, setOpen }: ProfileModalProps) {
    const fmt = useDateFormat();
    const [isLoading, startTransition] = useTransition();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const systemLogoRef = useRef<HTMLInputElement>(null);

    const [name, setName] = useState(user.name);
    const [email, setEmail] = useState(user.email);
    const [username, setUsername] = useState(user.username || "");
    const [avatar, setAvatar] = useState(user.avatar || "");
    const [jobTitle, setJobTitle] = useState(user.jobTitle || "");
    const [contactNumber, setContactNumber] = useState(user.contactNumber || "");

    const [systemName, setSystemName] = useState("AgencyOS");
    const [systemLogo, setSystemLogo] = useState("");
    const [initialSystemName, setInitialSystemName] = useState("AgencyOS");
    const [initialSystemLogo, setInitialSystemLogo] = useState("");

    const [currentPassword, setCurrentPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [showCurrentPassword, setShowCurrentPassword] = useState(false);
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    const [generalError, setGeneralError] = useState("");
    const [securityError, setSecurityError] = useState("");
    const [showUnsavedAlert, setShowUnsavedAlert] = useState(false);

    const isAdmin = user.role === "admin";

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
    }, [
        avatar,
        confirmPassword,
        contactNumber,
        currentPassword,
        email,
        initialSystemLogo,
        initialSystemName,
        isAdmin,
        jobTitle,
        name,
        newPassword,
        systemLogo,
        systemName,
        user,
        username,
    ]);

    /* eslint-disable react-hooks/set-state-in-effect */
    useEffect(() => {
        if (open) {
            if (isAdmin) {
                getAgencyDashboardSettings()
                    .then((settings) => {
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
    /* eslint-enable react-hooks/set-state-in-effect */

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>, setter: (value: string) => void) => {
        const file = event.target.files?.[0];
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

    const handleOpenChange = (nextOpen: boolean) => {
        if (!nextOpen && isDirty) {
            setShowUnsavedAlert(true);
            return;
        }
        setOpen(nextOpen);
    };

    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault();
        setGeneralError("");
        setSecurityError("");

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
                if (isAdmin && (systemName !== initialSystemName || systemLogo !== initialSystemLogo)) {
                    await updateAgencyDashboardSettings({ systemName, logo: systemLogo });
                }

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

                setCurrentPassword("");
                setNewPassword("");
                setConfirmPassword("");
                setShowCurrentPassword(false);
                setShowNewPassword(false);
                setShowConfirmPassword(false);
                toast.success("Profile updated successfully");
                setOpen(false);
            } catch (error: unknown) {
                const message = error instanceof Error ? error.message : "Failed to update profile";
                if (message.toLowerCase().includes("password")) {
                    setSecurityError(message);
                    setCurrentPassword("");
                    setNewPassword("");
                    setConfirmPassword("");
                } else {
                    setGeneralError(message);
                }
            }
        });
    };

    const memberSinceText = fmt.date(user.createdAt);
    const lastActiveText = fmt.relative(user.lastActiveAt);

    return (
        <>
            <Dialog open={open} onOpenChange={handleOpenChange}>
                <DialogContent className="w-[calc(100vw-2rem)] sm:max-w-[550px] p-0 overflow-hidden gap-0 max-h-[85vh] flex flex-col">
                    <DialogHeader className="p-6 pb-2">
                        <DialogTitle className="text-xl">Edit Profile{isAdmin ? " & System" : ""}</DialogTitle>
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
                                <TabsContent value="general" className="mt-0">
                                    <ProfileModalGeneralTab
                                        generalError={generalError}
                                        user={user}
                                        isAdmin={isAdmin}
                                        name={name}
                                        email={email}
                                        username={username}
                                        avatar={avatar}
                                        jobTitle={jobTitle}
                                        contactNumber={contactNumber}
                                        systemName={systemName}
                                        systemLogo={systemLogo}
                                        fileInputRef={fileInputRef}
                                        systemLogoRef={systemLogoRef}
                                        onNameChange={setName}
                                        onEmailChange={setEmail}
                                        onUsernameChange={(value) => setUsername(value.toLowerCase().replace(/[^a-z0-9_-]/g, ""))}
                                        onJobTitleChange={setJobTitle}
                                        onContactNumberChange={setContactNumber}
                                        onSystemNameChange={setSystemName}
                                        onAvatarFileChange={(event) => handleFileChange(event, setAvatar)}
                                        onSystemLogoFileChange={(event) => handleFileChange(event, setSystemLogo)}
                                    />
                                </TabsContent>

                                <TabsContent value="security" className="mt-0">
                                    <ProfileModalSecurityTab
                                        securityError={securityError}
                                        user={user}
                                        currentPassword={currentPassword}
                                        newPassword={newPassword}
                                        confirmPassword={confirmPassword}
                                        showCurrentPassword={showCurrentPassword}
                                        showNewPassword={showNewPassword}
                                        showConfirmPassword={showConfirmPassword}
                                        memberSinceText={memberSinceText}
                                        lastActiveText={lastActiveText}
                                        onCurrentPasswordChange={setCurrentPassword}
                                        onNewPasswordChange={setNewPassword}
                                        onConfirmPasswordChange={setConfirmPassword}
                                        onToggleCurrentPassword={() => setShowCurrentPassword((value) => !value)}
                                        onToggleNewPassword={() => setShowNewPassword((value) => !value)}
                                        onToggleConfirmPassword={() => setShowConfirmPassword((value) => !value)}
                                    />
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

            <ProfileModalUnsavedAlert
                open={showUnsavedAlert}
                onOpenChange={setShowUnsavedAlert}
                onDiscard={() => {
                    setShowUnsavedAlert(false);
                    setOpen(false);
                }}
            />
        </>
    );
}

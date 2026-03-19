"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Service, User } from "@/lib/types";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
    createUser,
    updateUser,
    deleteUser,
    adminResetPassword,
    getServices,
    permanentlyDeleteUser,
} from "@/lib/actions";
import { useCurrency } from "@/context/CurrencyContext";
import { DocumentManager } from "./DocumentManager";
import { PermanentDeleteDialog } from "@/components/PermanentDeleteDialog";
import { EditUserDialogForm } from "./EditUserDialogForm";
import { EditUserDialogDeletePanel } from "./EditUserDialogDeletePanel";

type UserFormData = Omit<User, "id" | "agencyId">;

function getErrorMessage(error: unknown, fallback: string) {
    return error instanceof Error ? error.message : fallback;
}

interface EditUserDialogProps {
    user?: User | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess?: () => void;
    currentUserRole?: string;
    isSelf?: boolean;
}

export function EditUserDialog({
    user,
    open,
    onOpenChange,
    onSuccess,
    currentUserRole,
    isSelf,
}: EditUserDialogProps) {
    const router = useRouter();
    const { symbol } = useCurrency();
    const [submitting, setSubmitting] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [deletePassword, setDeletePassword] = useState("");
    const [archiving, setArchiving] = useState(false);
    const [showPermanentDelete, setShowPermanentDelete] = useState(false);
    const [services, setServices] = useState<Service[]>([]);
    const [loadingRoles, setLoadingRoles] = useState(false);
    const [showDocumentManager, setShowDocumentManager] = useState(false);
    const [currentPassword, setCurrentPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [passwordError, setPasswordError] = useState("");

    const isAdmin = currentUserRole === "admin";
    const isManager = currentUserRole === "manager";
    const canManageFinances = isAdmin || isManager;

    const [formData, setFormData] = useState<UserFormData>({
        name: "",
        username: "",
        email: "",
        role: "employee",
        jobTitle: "",
        salary: 0,
        avatar: "",
        password: "",
        employmentType: "Salary" as "Salary" | "Project Based" | "Freelancer",
        gender: "Male" as "Male" | "Female" | "Other",
        contactNumber: "",
        adharCardImage: "",
        panCardImage: "",
    });

    useEffect(() => {
        if (open) {
            void loadServices();
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
                    password: "",
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
                    createdAt: new Date().toISOString().split("T")[0],
                });
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

    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault();
        setPasswordError("");
        setSubmitting(true);

        try {
            if (user) {
                if (isSelf) {
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
                        await updateUser(user.id, { ...formData, password: newPassword }, currentPassword);
                    } else {
                        await updateUser(user.id, formData);
                    }
                } else if (formData.password) {
                    await adminResetPassword(user.id, formData.password);
                    const updateData: Partial<typeof formData> = { ...formData };
                    delete updateData.password;
                    await updateUser(user.id, updateData);
                } else {
                    await updateUser(user.id, formData);
                }

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
                await createUser(formData);
            }

            if (onSuccess) onSuccess();
            onOpenChange(false);
            toast.success(user ? "Profile updated successfully" : "Member created successfully");
        } catch (error) {
            toast.error(getErrorMessage(error, "Something went wrong"));
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
                router.push("/dashboard/team");
            }
            if (onSuccess) onSuccess();
            onOpenChange(false);
            toast.success(`${user.name} has been deactivated (archived). They can be restored anytime.`);
        } catch (error) {
            toast.error(getErrorMessage(error, "Failed to archive user"));
        } finally {
            setArchiving(false);
        }
    };

    const handlePermanentDelete = async (password: string) => {
        if (!user) return;
        await permanentlyDeleteUser(user.id, password);
        if (window.location.pathname.includes(user.id)) {
            router.push("/dashboard/team");
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
                        <DialogTitle>{user ? "Edit Profile" : "Add New Member"}</DialogTitle>
                        <DialogDescription>
                            {user ? "Update details or manage settings." : "Create new account."}
                        </DialogDescription>
                    </DialogHeader>

                    {!showDeleteConfirm ? (
                        <EditUserDialogForm
                            user={user}
                            formData={formData}
                            setFormData={setFormData}
                            services={services}
                            loadingRoles={loadingRoles}
                            symbol={symbol}
                            isAdmin={isAdmin}
                            canManageFinances={canManageFinances}
                            isSelf={isSelf}
                            currentPassword={currentPassword}
                            setCurrentPassword={setCurrentPassword}
                            newPassword={newPassword}
                            setNewPassword={setNewPassword}
                            confirmPassword={confirmPassword}
                            setConfirmPassword={setConfirmPassword}
                            passwordError={passwordError}
                            submitting={submitting}
                            onSubmit={handleSubmit}
                            onCancel={() => onOpenChange(false)}
                            onRequestDelete={() => setShowDeleteConfirm(true)}
                            onOpenDocumentManager={() => setShowDocumentManager(true)}
                        />
                    ) : (
                        <EditUserDialogDeletePanel
                            deletePassword={deletePassword}
                            onDeletePasswordChange={setDeletePassword}
                            archiving={archiving}
                            onArchive={handleArchive}
                            onOpenPermanentDelete={() => {
                                setShowDeleteConfirm(false);
                                setShowPermanentDelete(true);
                            }}
                            onBack={() => setShowDeleteConfirm(false)}
                        />
                    )}
                </DialogContent>
            </Dialog>

            {user && (
                <DocumentManager
                    user={user}
                    open={showDocumentManager}
                    onOpenChange={setShowDocumentManager}
                    isAdmin={isAdmin}
                    onSuccess={onSuccess}
                />
            )}

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

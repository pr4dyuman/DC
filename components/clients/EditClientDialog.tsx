
"use client";

import { useState, useEffect } from "react";
import { Client } from "@/lib/types";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Loader2 } from "lucide-react";
import { createClient, updateClient } from "@/lib/actions";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

interface EditClientDialogProps {
    client?: Client | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess?: () => void;
}

export function EditClientDialog({ client, open, onOpenChange, onSuccess }: EditClientDialogProps) {
    const router = useRouter();
    const [submitting, setSubmitting] = useState(false);

    const [formData, setFormData] = useState<Omit<Client, "id" | "agencyId">>({
        name: "",
        username: "",
        email: "",
        companyName: "",
        role: "client", // Fixed role
        phone: "",
        address: "",
        logo: "",
        adharCardImage: "",
        panCardImage: ""
    });

    useEffect(() => {
        if (open) {
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
        setSubmitting(true);
        try {
            if (client) {
                await updateClient(client.id, formData);
            } else {
                await createClient(formData);
            }
            if (onSuccess) onSuccess();
            onOpenChange(false);
        } catch (error: any) {
            toast.error(error.message || 'An error occurred');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[600px] bg-card border-border">
                <DialogHeader>
                    <DialogTitle>{client ? 'Edit Client' : 'Add New Client'}</DialogTitle>
                    <DialogDescription>
                        {client ? 'Update client details.' : 'Add a new client to the system.'}
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
                                                    toast.error('Image must be under 2MB');
                                                    return;
                                                }
                                                const reader = new FileReader();
                                                reader.onloadend = () => {
                                                    setFormData({ ...formData, logo: reader.result as string });
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
                                <div className="col-span-2 space-y-2">
                                    <label className="text-sm font-medium">Address</label>
                                    <input value={formData.address} onChange={e => setFormData({ ...formData, address: e.target.value })}
                                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:ring-2 focus:ring-primary/20" placeholder="123 Business St, City" />
                                </div>
                            </div>

                            <div className="space-y-4 pt-2 border-t border-border">
                                <h4 className="text-sm font-semibold text-muted-foreground">Legal Details</h4>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">Aadhar Card</label>
                                        <div className="flex items-center gap-4">
                                            {formData.adharCardImage && (
                                                <div className="relative w-16 h-10 rounded border border-border overflow-hidden">
                                                    <img src={formData.adharCardImage} alt="Aadhar" className="w-full h-full object-cover" />
                                                </div>
                                            )}
                                            <label className="flex-1 cursor-pointer">
                                                <div className="flex items-center justify-center w-full h-10 border border-input rounded-md hover:bg-muted transition-colors text-sm text-muted-foreground">
                                                    {formData.adharCardImage ? "Change" : "Upload Image"}
                                                </div>
                                                <input type="file" accept="image/*" className="hidden" onChange={(e) => {
                                                    const file = e.target.files?.[0];
                                                    if (file) {
                                                        if (file.size > 2 * 1024 * 1024) {
                                                            toast.error('Image must be under 2MB');
                                                            return;
                                                        }
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
                                                    <img src={formData.panCardImage} alt="PAN" className="w-full h-full object-cover" />
                                                </div>
                                            )}
                                            <label className="flex-1 cursor-pointer">
                                                <div className="flex items-center justify-center w-full h-10 border border-input rounded-md hover:bg-muted transition-colors text-sm text-muted-foreground">
                                                    {formData.panCardImage ? "Change" : "Upload Image"}
                                                </div>
                                                <input type="file" accept="image/*" className="hidden" onChange={(e) => {
                                                    const file = e.target.files?.[0];
                                                    if (file) {
                                                        if (file.size > 2 * 1024 * 1024) {
                                                            toast.error('Image must be under 2MB');
                                                            return;
                                                        }
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
        </Dialog >
    );
}
